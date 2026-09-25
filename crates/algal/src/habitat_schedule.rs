//! Habitat schedules: several habitat activities (foundry runs and searches)
//! draw on one habitat work account, and a deterministic scheduler decides
//! which activity starts the next run.
//!
//! Activities run as interleaved coroutines. Each asks its view of the shared
//! account to admit one run at a time; the scheduler grants a request only
//! once every unfinished activity is waiting for one, then picks the next
//! activity after the last granted one in activity order (`round-robin`). At
//! most one activity computes at a time, so the order is a function of the
//! activities' own deterministic runs, and verification recomputes it from
//! the record. Each grant reserves the run's declared ceiling on the shared
//! account and charges what its receipt records, exactly as
//! `algal.habitat-budget.v1` does. The first refused reservation ends every
//! unfinished activity with the outcome `exhausted`; finished activities keep
//! their reports.
//!
//! The closed `algal.habitat-schedule.v1` record lists every charged run with
//! the activity it served, the shared account's totals and refusal, and each
//! activity's outcome and stored report digest. Reports produced inside a
//! schedule never embed an account of their own.
//!
//! A journal makes a schedule resumable. After each charged run the host
//! writes one immutable entry; a later invocation replays the activities from
//! the start and serves each journaled run from its stored receipt instead of
//! starting it again, provided the entry reconciles: same activity, manifest,
//! ceiling, arguments, and charge. Anything else is refused. Once the journal
//! is consumed, new runs start and are journaled in turn. Replaying a complete
//! journal writes the same record bytes without starting any run. No record
//! or journal entry carries a wall-clock value.
//!
//! Rust port note: the reference runtime holds one `Store`/`Host` object per
//! invocation. Here every activity holds a clone that aliases the same
//! filesystem store, and `Host`'s consumable scripted/replay queues are
//! `Arc`-shared, so clones consume one queue in grant order like the shared
//! object does. An in-memory `Store` cannot alias and is not supported for
//! schedules.
use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest, read_json},
    contract::Manifest,
    effects::Host,
    foundry,
    graph::Transports,
    habitat_budget::{self, Account, Ledger, Limits},
    runtime,
    store::{self, Store},
};
use serde_json::{Map, Value, json};
use std::{
    future::{Future, poll_fn},
    path::{Path, PathBuf},
    pin::Pin,
    sync::{Arc, Mutex, MutexGuard},
    task::{Context, Poll, Wake, Waker},
};

pub const SCHEDULE_CONTRACT: &str = "algal.habitat-schedule.v1";
pub const CONFIG_CONTRACT: &str = "algal.habitat-schedule.config.v1";
pub const JOURNAL_CONTRACT: &str = "algal.habitat-journal.v1";

/// Activities in one schedule.
pub const MAX_ACTIVITIES: usize = 8;
/// Characters in one activity config path.
pub const MAX_CONFIG_PATH: usize = 512;
/// Bytes of one journal file: the header or one run entry.
pub const MAX_JOURNAL_ENTRY_BYTES: usize = 4_096;

const KINDS: [&str; 2] = ["foundry", "search"];

fn fail(message: impl std::fmt::Display) -> Error {
    Error::invalid(format!("habitat schedule: {message}"))
}

fn mismatch(message: impl std::fmt::Display) -> Error {
    Error::new("RECEIPT_MISMATCH", format!("habitat journal: {message}"))
}

fn closed<'a>(value: &'a Value, fields: &[&str], at: &str) -> Result<&'a Map<String, Value>> {
    let record = value
        .as_object()
        .ok_or_else(|| fail(format!("{at} must be an object")))?;
    if let Some(key) = record.keys().find(|key| !fields.contains(&key.as_str())) {
        return Err(fail(format!("{at} has unknown field \"{key}\"")));
    }
    if let Some(key) = fields.iter().find(|key| !record.contains_key(**key)) {
        return Err(fail(format!("{at} is missing \"{key}\"")));
    }
    Ok(record)
}

fn count(value: &Value, min: u64, max: u64, at: &str) -> Result<u64> {
    value
        .as_u64()
        .filter(|n| (min..=max).contains(n))
        .ok_or_else(|| fail(format!("{at} must be an integer in {min}..{max}")))
}

fn reference(value: &Value, at: &str) -> Result<String> {
    value
        .as_str()
        .filter(|text| check_digest(text).is_ok())
        .map(str::to_owned)
        .ok_or_else(|| fail(format!("{at} must be a sha256 digest")))
}

fn order(value: &Value) -> Result<&'static str> {
    if *value == "round-robin" {
        Ok("round-robin")
    } else {
        Err(fail("order must be round-robin"))
    }
}

fn kind(value: &Value, at: &str) -> Result<&'static str> {
    value
        .as_str()
        .and_then(|kind| KINDS.into_iter().find(|known| *known == kind))
        .ok_or_else(|| fail(format!("{at}.kind must be foundry or search")))
}

fn activity_list<'a>(value: &'a Value, at: &str) -> Result<&'a Vec<Value>> {
    let list = value
        .as_array()
        .filter(|list| !list.is_empty() && list.len() <= MAX_ACTIVITIES);
    list.ok_or_else(|| fail(format!("{at} must list 1 to {MAX_ACTIVITIES} activities")))
}

fn limits_json(limits: &Limits) -> Value {
    json!({"work":limits.work,"attempts":limits.attempts,"runs":limits.runs})
}

/// `habitatCeiling` for a manifest's declared budgets: the reservation one
/// of its runs asks the shared account for. Manifest parse already bounds
/// both fields to the per-run ceiling limits.
fn ceiling(manifest: &Manifest) -> (u64, u64) {
    (
        manifest.budgets.max_work as u64,
        manifest.budgets.max_agent_calls as u64,
    )
}

/// One activity's `algal.foundry.config.v1` path, relative to the schedule.
pub struct ActivityConfig {
    pub kind: &'static str,
    pub config: String,
}

/// A parsed `algal.habitat-schedule.config.v1`.
pub struct Config {
    pub order: &'static str,
    pub budget: Limits,
    pub activities: Vec<ActivityConfig>,
}

/// `parseHabitatScheduleConfig`.
pub fn parse_config(value: &Value) -> Result<Config> {
    let v = closed(
        value,
        &["contract", "order", "budget", "activities"],
        "config",
    )?;
    if v["contract"] != CONFIG_CONTRACT {
        return Err(fail(format!("config.contract must be {CONFIG_CONTRACT}")));
    }
    let activities = activity_list(&v["activities"], "config.activities")?;
    let mut parsed = Vec::with_capacity(activities.len());
    for (i, raw) in activities.iter().enumerate() {
        let at = format!("config.activities[{i}]");
        let a = closed(raw, &["kind", "config"], &at)?;
        let path = a["config"]
            .as_str()
            .filter(|path| path.encode_utf16().count() <= MAX_CONFIG_PATH)
            .ok_or_else(|| fail(format!("{at}.config must be a path")))?;
        if path.is_empty() {
            return Err(fail(format!("{at}.config must be a path")));
        }
        parsed.push(ActivityConfig {
            kind: kind(&a["kind"], &at)?,
            config: path.to_owned(),
        });
    }
    Ok(Config {
        order: order(&v["order"])?,
        budget: habitat_budget::parse_limits(&v["budget"])?,
        activities: parsed,
    })
}

/// The activity the round-robin order grants next: the first waiting
/// activity after `last` in activity order, wrapping around.
fn next_turn(last: i64, waiting: impl Fn(usize) -> bool, activities: usize) -> Option<usize> {
    (1..=activities as i64).find_map(|step| {
        let activity = (last + step).rem_euclid(activities as i64) as usize;
        waiting(activity).then_some(activity)
    })
}

/// `parseHabitatSchedule`: parse a closed `algal.habitat-schedule.v1` record.
/// Recomputes the shared account's arithmetic, requires each activity's
/// outcome to agree with the refusal, and recomputes the round-robin order
/// from the number of runs each activity was charged: every unfinished
/// activity waits for a grant, a finished activity waits for nothing, and
/// the refused activity is the one whose turn came next. Returns the
/// normalized record.
pub fn parse(value: &Value) -> Result<Value> {
    let v = closed(
        value,
        &[
            "contract",
            "order",
            "limits",
            "activities",
            "runs",
            "charged",
            "outcome",
            "refused",
        ],
        "record",
    )?;
    if v["contract"] != SCHEDULE_CONTRACT {
        return Err(fail(format!("contract must be {SCHEDULE_CONTRACT}")));
    }
    let order = order(&v["order"])?;
    let raw_activities = activity_list(&v["activities"], "activities")?;
    let mut activities = Vec::with_capacity(raw_activities.len());
    for (i, raw) in raw_activities.iter().enumerate() {
        let at = format!("activities[{i}]");
        let a = closed(raw, &["kind", "outcome", "report"], &at)?;
        let kind = kind(&a["kind"], &at)?;
        match a["outcome"].as_str() {
            Some("complete") => activities.push(json!({
                "kind":kind,
                "outcome":"complete",
                "report":reference(&a["report"], &format!("habitat schedule {at}.report"))?,
            })),
            Some("exhausted") => {
                if !a["report"].is_null() {
                    return Err(fail(format!("{at}: an exhausted activity has no report")));
                }
                activities.push(json!({"kind":kind,"outcome":"exhausted","report":null}));
            }
            _ => return Err(fail(format!("{at}.outcome must be complete or exhausted"))),
        }
    }
    let n = activities.len();
    let limits = habitat_budget::parse_limits(&v["limits"])?;
    let raw_runs = v["runs"]
        .as_array()
        .filter(|runs| runs.len() as u64 <= limits.runs)
        .ok_or_else(|| fail("runs must be a list of at most limits.runs entries"))?;
    let mut turns = Vec::with_capacity(raw_runs.len());
    let mut account_runs = Vec::with_capacity(raw_runs.len());
    let mut runs = Vec::with_capacity(raw_runs.len());
    for (i, raw) in raw_runs.iter().enumerate() {
        let at = format!("runs[{i}]");
        let turn = count(
            &raw.as_object()
                .and_then(|run| run.get("activity"))
                .cloned()
                .unwrap_or(Value::Null),
            0,
            n as u64 - 1,
            &format!("{at}.activity"),
        )? as usize;
        let parsed = habitat_budget::parse_run(raw, &at, &["activity"])?;
        turns.push(turn);
        account_runs.push(parsed.clone());
        let mut run = parsed;
        run["activity"] = json!(turn as u64);
        runs.push(run);
    }
    let mut refused_activity = None;
    let mut refused = Value::Null;
    if !v["refused"].is_null() {
        let r = v["refused"]
            .as_object()
            .ok_or_else(|| fail("refused must be an object"))?;
        refused_activity = Some(count(
            r.get("activity").unwrap_or(&Value::Null),
            0,
            n as u64 - 1,
            "refused.activity",
        )? as usize);
        let mut rest = r.clone();
        rest.shift_remove("activity");
        refused = Value::Object(rest);
    }
    // The account arithmetic is the habitat budget's: each run fit when it
    // was admitted, the totals are the charges' sums, and a refusal names
    // exactly the limits it exceeds.
    let account = habitat_budget::parse(&json!({
        "contract":habitat_budget::CONTRACT,
        "activity":"foundry",
        "limits":v["limits"],
        "runs":account_runs,
        "charged":v["charged"],
        "outcome":v["outcome"],
        "refused":refused,
    }))?;
    let exhausted = activities
        .iter()
        .any(|activity| activity["outcome"] == "exhausted");
    if (account["outcome"] == "exhausted") != exhausted {
        return Err(fail(
            "the outcome must be exhausted exactly when an activity is",
        ));
    }
    if let Some(refused) = refused_activity
        && activities[refused]["outcome"] != "exhausted"
    {
        return Err(fail("the refused activity must be exhausted"));
    }
    let mut remaining: Vec<usize> = (0..n)
        .map(|i| turns.iter().filter(|turn| **turn == i).count())
        .collect();
    let mut last = -1i64;
    for (i, turn) in turns.iter().copied().enumerate() {
        let expected = next_turn(
            last,
            |j| remaining[j] > 0 || activities[j]["outcome"] == "exhausted",
            n,
        );
        if expected != Some(turn) || remaining[turn] == 0 {
            return Err(fail(format!("runs[{i}] is not the round-robin turn")));
        }
        remaining[turn] -= 1;
        last = turn as i64;
    }
    if let Some(refused) = refused_activity
        && next_turn(
            last,
            |j| remaining[j] > 0 || activities[j]["outcome"] == "exhausted",
            n,
        ) != Some(refused)
    {
        return Err(fail("the refused activity is not the round-robin turn"));
    }
    Ok(json!({
        "contract":SCHEDULE_CONTRACT,
        "order":order,
        "limits":account["limits"],
        "activities":activities,
        "runs":runs,
        "charged":account["charged"],
        "outcome":account["outcome"],
        "refused":match refused_activity {
            Some(activity) => {
                let mut refused = account["refused"].clone();
                refused["activity"] = json!(activity as u64);
                refused
            }
            None => Value::Null,
        },
    }))
}

/// One immutable journal entry: `{activity, manifest, receipt, ceiling,
/// charged}` normalized by the same parser used on read-back.
fn journal_run(value: &Value, at: &str) -> Result<Value> {
    let activity = count(
        &value
            .as_object()
            .and_then(|run| run.get("activity"))
            .cloned()
            .unwrap_or(Value::Null),
        0,
        MAX_ACTIVITIES as u64 - 1,
        &format!("habitat journal {at}.activity"),
    )?;
    let mut run = habitat_budget::parse_run(value, at, &["activity"])?;
    run["activity"] = json!(activity);
    Ok(run)
}

fn ordinal(n: usize) -> String {
    format!("{n:06}.json")
}

/// `hostRead`: a bounded JSON file, absent as `None`. Node/depth bounds come
/// from `read_json`.
fn host_read(path: &Path, max: usize) -> Result<Option<Value>> {
    let Some(file) = store::open_regular_file(path, max)? else {
        return Ok(None);
    };
    Ok(Some(read_json(file, max)?))
}

/// `hostDirectory`: create a directory chain that must resolve to a real
/// directory — a symlink anywhere final is refused.
fn host_directory(path: &Path) -> Result<()> {
    match std::fs::symlink_metadata(path) {
        Ok(meta) if meta.is_dir() && !meta.file_type().is_symlink() => return Ok(()),
        Ok(_) => {
            return Err(Error::new(
                "IO_FAILED",
                "host state directory must be a real directory",
            ));
        }
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => return Err(error.into()),
        _ => {}
    }
    if let Some(parent) = path.parent()
        && parent != path
    {
        host_directory(parent)?;
    }
    if let Err(error) = std::fs::create_dir(path)
        && error.kind() != std::io::ErrorKind::AlreadyExists
    {
        return Err(error.into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))?;
    }
    let meta = std::fs::symlink_metadata(path)?;
    if !meta.is_dir() || meta.file_type().is_symlink() {
        return Err(Error::new(
            "IO_FAILED",
            "host state directory must be a real directory",
        ));
    }
    Ok(())
}

/// `hostWrite` with `immutable` set: canonical bytes under `max`, published
/// by link, never overwritten; an existing different file conflicts.
fn host_write(path: &Path, value: &Value, max: usize) -> Result<()> {
    let bytes = canonical(value)?;
    if bytes.len() > max {
        return Err(Error::limit("host state byte bound exceeded"));
    }
    let parent = path
        .parent()
        .ok_or_else(|| Error::invalid("host state parent"))?;
    host_directory(parent)?;
    if let Some(existing) = host_read(path, max)? {
        if canonical(&existing)? == bytes {
            return Ok(());
        }
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "immutable host state conflicts",
        ));
    }
    let temporary = parent.join(format!(".algal-journal-{}", std::process::id()));
    let temporary = temporary.with_extension(format!("{}", nano_nonce()));
    std::fs::write(&temporary, &bytes)?;
    std::fs::File::open(&temporary)?.sync_all()?;
    let result = std::fs::hard_link(&temporary, path);
    let _ = std::fs::remove_file(&temporary);
    match result {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            let winner = host_read(path, max)?;
            if winner.map(|value| canonical(&value).ok()) != Some(Some(bytes.clone())) {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "host state publication conflicts",
                ));
            }
        }
        Err(error) => return Err(error.into()),
    }
    if let Ok(directory) = std::fs::File::open(parent) {
        let _ = directory.sync_all();
    }
    Ok(())
}

fn nano_nonce() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}

/// `hostNames` for journal run entries: strict `NNNNNN.json` names only,
/// sorted, bounded at `max`.
fn host_names(dir: &Path, max: usize) -> Result<Vec<String>> {
    host_directory(dir)?;
    let mut names = Vec::new();
    let mut scanned = 0usize;
    for entry in std::fs::read_dir(dir)? {
        scanned += 1;
        if scanned > max * 2 + 16 {
            return Err(Error::limit("host state directory scan bound exceeded"));
        }
        let entry = entry?;
        if !entry.file_type()?.is_file() {
            return Err(Error::new("IO_FAILED", "unexpected host state entry type"));
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(".algal-journal-") {
            continue;
        }
        let valid = name.len() == 11
            && name[..6].bytes().all(|byte| byte.is_ascii_digit())
            && name.ends_with(".json");
        if !valid {
            return Err(Error::new("IO_FAILED", "unexpected host state entry"));
        }
        names.push(name);
        if names.len() > max {
            return Err(Error::limit("host state entry bound exceeded"));
        }
    }
    names.sort();
    Ok(names)
}

/// A durable, append-only journal of one schedule's charged runs.
pub struct Journal {
    dir: PathBuf,
    /// Runs journaled so far, in charge order.
    runs: Vec<Value>,
}

impl Journal {
    /// Runs journaled so far, in charge order.
    pub fn runs(&self) -> &[Value] {
        &self.runs
    }

    /// `openHabitatJournal`: `journal.json` binds the directory to one order
    /// and one set of limits, and `runs/<ordinal>.json` holds one immutable
    /// entry per charged run, with no gaps. A journal written under another
    /// order or other limits is refused.
    pub fn open(dir: &Path, order: &str, limits: &Limits) -> Result<Self> {
        let header = json!({
            "contract":JOURNAL_CONTRACT,
            "order":self::order(&json!(order))?,
            "limits":limits_json(&habitat_budget::parse_limits(&limits_json(limits))?),
        });
        let header_path = dir.join("journal.json");
        match host_read(&header_path, MAX_JOURNAL_ENTRY_BYTES)? {
            None => host_write(&header_path, &header, MAX_JOURNAL_ENTRY_BYTES)?,
            Some(existing) if canonical(&existing)? != canonical(&header)? => {
                return Err(mismatch(
                    "the journal belongs to another order or other limits",
                ));
            }
            _ => {}
        }
        let runs_dir = dir.join("runs");
        let names = host_names(&runs_dir, limits.runs as usize)?;
        let mut runs = Vec::with_capacity(names.len());
        for (i, name) in names.iter().enumerate() {
            if *name != ordinal(i) {
                return Err(mismatch(format!("entry {i} is missing")));
            }
            runs.push(journal_run(
                &host_read(&runs_dir.join(name), MAX_JOURNAL_ENTRY_BYTES)?
                    .ok_or_else(|| Error::new("IO_FAILED", "journal entry vanished"))?,
                &format!("run {i}"),
            )?);
        }
        Ok(Self {
            dir: runs_dir,
            runs,
        })
    }

    /// Durably record the next charged run.
    pub fn append(&mut self, run: &Value) -> Result<()> {
        let entry = journal_run(run, &format!("run {}", self.runs.len()))?;
        host_write(
            &self.dir.join(ordinal(self.runs.len())),
            &entry,
            MAX_JOURNAL_ENTRY_BYTES,
        )?;
        self.runs.push(entry);
        Ok(())
    }
}

/// One admitted run an activity asks its ledger for.
struct Request {
    manifest: String,
    ceiling: (u64, u64),
    args: Value,
}

/// The scheduler's shared state: one account, the journaled prefix, the
/// grant table, and each activity's parked waker.
struct Shared {
    account: Account,
    journaled: Vec<Value>,
    journal: Option<Journal>,
    kinds: Vec<&'static str>,
    turns: Vec<usize>,
    /// `pending[i]` while activity `i` waits for a grant.
    pending: Vec<bool>,
    granted: Option<usize>,
    done: Vec<bool>,
    refused_here: Vec<bool>,
    refused_activity: Option<usize>,
    failure: Option<Error>,
    reports: Vec<Option<Value>>,
    last: i64,
    wakers: Vec<Option<Waker>>,
}

fn lock(shared: &Arc<Mutex<Shared>>) -> Result<MutexGuard<'_, Shared>> {
    shared
        .lock()
        .map_err(|_| Error::new("INTERNAL", "habitat schedule lock poisoned"))
}

/// `pump`: grant the next waiting activity once every unfinished activity is
/// waiting; the grantee's parked admit wakes and runs alone.
fn pump_locked(shared: &mut Shared) {
    if shared.granted.is_some() || shared.done.iter().all(|done| *done) {
        return;
    }
    let count = shared.pending.len();
    if (0..count).any(|i| !shared.done[i] && !shared.pending[i]) {
        return;
    }
    let pending: Vec<bool> = shared.pending.clone();
    let Some(activity) = next_turn(shared.last, |i| pending[i], count) else {
        return;
    };
    shared.pending[activity] = false;
    shared.granted = Some(activity);
    shared.last = activity as i64;
    if let Some(waker) = shared.wakers[activity].take() {
        waker.wake();
    }
}

/// Serve a journaled run from its stored receipt instead of starting it
/// again; anything other than an exact reconciliation is refused.
fn serve(
    shared: &Arc<Mutex<Shared>>,
    activity: usize,
    request: &Request,
    position: usize,
    store: &Store,
) -> Result<(Value, String)> {
    let entry = {
        let shared = lock(shared)?;
        shared
            .journaled
            .get(position)
            .cloned()
            .ok_or_else(|| mismatch(format!("run {position} is missing")))?
    };
    let at = format!("run {position}");
    if entry["activity"].as_u64() != Some(activity as u64) {
        return Err(mismatch(format!(
            "{at} served activity {}, the schedule granted activity {activity}",
            entry["activity"].as_u64().unwrap_or(0)
        )));
    }
    if entry["manifest"].as_str() != Some(request.manifest.as_str()) {
        return Err(mismatch(format!("{at} ran another manifest")));
    }
    if entry["ceiling"]["work"].as_u64() != Some(request.ceiling.0)
        || entry["ceiling"]["attempts"].as_u64() != Some(request.ceiling.1)
    {
        return Err(mismatch(format!("{at}: ceiling differs from its manifest")));
    }
    let receipt_digest = entry["receipt"].as_str().unwrap_or("");
    let Some(receipt) = store.get("runs", receipt_digest)? else {
        return Err(mismatch(format!("{at}: receipt {receipt_digest} missing")));
    };
    crate::receipt::validate(&receipt)?;
    if receipt["manifestDigest"].as_str() != Some(request.manifest.as_str()) {
        return Err(mismatch(format!("{at}: receipt ran another manifest")));
    }
    if canonical(&receipt["args"])? != canonical(&request.args)? {
        return Err(mismatch(format!(
            "{at}: receipt arguments differ from the run's"
        )));
    }
    if receipt["work"]["units"].as_u64() != entry["charged"]["work"].as_u64()
        || receipt["work"]["agentCalls"].as_u64() != entry["charged"]["attempts"].as_u64()
    {
        return Err(mismatch(format!("{at}: charge differs from its receipt")));
    }
    Ok((receipt, receipt_digest.to_owned()))
}

/// One activity's view of a schedule's shared account: `admit` registers the
/// run's pending request, parks until the scheduler grants it, then executes
/// the run (or serves a journaled receipt) alone.
pub struct ScheduledLedger {
    shared: Arc<Mutex<Shared>>,
    index: usize,
    kind: &'static str,
}

impl Ledger for ScheduledLedger {
    fn activity(&self) -> &'static str {
        self.kind
    }

    fn admit<'a>(
        &'a mut self,
        manifest: &'a Manifest,
        args: &'a Value,
        store: &'a mut Store,
        host: &'a mut Host,
        transports: &'a Transports,
    ) -> habitat_budget::AdmitFuture<'a> {
        Box::pin(async move {
            let index = self.index;
            let shared = self.shared.clone();
            let request = Request {
                manifest: manifest.digest()?,
                ceiling: ceiling(manifest),
                args: args.clone(),
            };
            {
                let mut shared = lock(&shared)?;
                shared.pending[index] = true;
                pump_locked(&mut shared);
            }
            // Park until this activity holds the grant; the waker is
            // re-registered on every repoll.
            poll_fn(|cx| {
                let mut shared = match lock(&shared) {
                    Ok(shared) => shared,
                    Err(error) => return Poll::Ready(Err(error)),
                };
                pump_locked(&mut shared);
                if shared.granted == Some(index) {
                    return Poll::Ready(Ok(()));
                }
                shared.wakers[index] = Some(cx.waker().clone());
                Poll::Pending
            })
            .await?;
            // Granted: another activity's failure short-circuits this run.
            let (position, live) = {
                let mut shared = lock(&shared)?;
                if shared.failure.is_some() {
                    shared.granted = None;
                    return Err(Error::new(
                        "INTERNAL",
                        "habitat schedule stopped after another activity failed",
                    ));
                }
                if let Err(error) = shared.account.reserve(manifest) {
                    if shared.refused_activity.is_none() && shared.account.exhausted() {
                        shared.refused_activity = Some(index);
                    }
                    if error.code == "BUDGET_EXHAUSTED" && shared.account.exhausted() {
                        shared.refused_here[index] = true;
                    }
                    shared.granted = None;
                    return Err(error);
                }
                (
                    shared.turns.len(),
                    shared.turns.len() >= shared.journaled.len(),
                )
            };
            let executed = if live {
                runtime::run(
                    manifest.clone(),
                    args.clone(),
                    store,
                    host,
                    transports,
                    None,
                )
                .await
                .and_then(|receipt| store.put("runs", &receipt).map(|digest| (receipt, digest)))
            } else {
                serve(&shared, index, &request, position, store)
            };
            let mut shared = lock(&shared)?;
            let outcome: Result<(Value, String)> = (|shared: &mut Shared| {
                let (receipt, receipt_digest) = match executed {
                    Ok(pair) => pair,
                    Err(error) => {
                        // No receipt to charge: release the reservation, keep
                        // the account.
                        shared.account.release()?;
                        return Err(error);
                    }
                };
                shared.account.charge(&receipt_digest, &receipt)?;
                shared.turns.push(index);
                if live && let Some(journal) = shared.journal.as_mut() {
                    journal.append(&json!({
                        "activity":index as u64,
                        "manifest":request.manifest,
                        "receipt":receipt_digest,
                        "ceiling":{"work":request.ceiling.0,"attempts":request.ceiling.1},
                        "charged":{
                            "work":receipt["work"]["units"],
                            "attempts":receipt["work"]["agentCalls"],
                        },
                    }))?;
                }
                Ok((receipt, receipt_digest))
            })(&mut shared);
            // However the admission settled, the grant is over and the pump
            // may move on; a refused reservation marks this activity
            // exhausted.
            shared.granted = None;
            if let Err(error) = &outcome
                && error.code == "BUDGET_EXHAUSTED"
                && shared.account.exhausted()
            {
                shared.refused_here[index] = true;
            }
            outcome
        })
    }

    fn standalone_record(&self) -> Result<Option<Value>> {
        // A report produced inside a schedule never carries an account of
        // its own.
        Ok(None)
    }
}

/// One scheduled activity: `runFoundryWithin` (after any generator) for a
/// foundry and `runFoundrySearch` for a search.
pub struct Activity {
    pub kind: &'static str,
    #[allow(clippy::type_complexity)]
    pub run: Box<
        dyn for<'a> FnOnce(
                &'a mut ScheduledLedger,
                &'a mut Store,
                &'a mut Host,
                &'a Transports,
            ) -> Pin<Box<dyn Future<Output = Result<Value>> + Send + 'a>>
            + Send,
    >,
}

/// A finished schedule: the closed record and each activity's report (or
/// `None` for an exhausted activity).
pub struct Outcome {
    pub schedule: Value,
    pub reports: Vec<Option<Value>>,
}

/// The runs a complete activity's report records, in admission order.
fn report_runs(kind: &str, report: &Value) -> Vec<(String, String)> {
    if kind == "search" {
        foundry::search_report_runs(report)
    } else {
        foundry::report_runs(report)
    }
}

/// A complete activity's report must record exactly the runs the schedule
/// charged to that activity, in order, and carry no account of its own.
fn binding_mismatches(schedule: &Value, activity: usize, report: &Value) -> Vec<String> {
    let at = format!("activity {activity}");
    let kind = schedule["activities"][activity]["kind"]
        .as_str()
        .unwrap_or("");
    let charged: Vec<&Value> = schedule["runs"]
        .as_array()
        .map(|runs| {
            runs.iter()
                .filter(|run| run["activity"].as_u64() == Some(activity as u64))
                .collect()
        })
        .unwrap_or_default();
    let recorded = report_runs(kind, report);
    let mut mismatches = Vec::new();
    if report.get("budget").is_some() {
        mismatches.push(format!("{at}: the report carries its own budget"));
    }
    if charged.len() != recorded.len() {
        mismatches.push(format!(
            "{at}: the schedule charges {} runs, the report records {}",
            charged.len(),
            recorded.len()
        ));
    }
    for (i, (run, want)) in charged.iter().zip(&recorded).enumerate() {
        if run["manifest"].as_str() != Some(want.0.as_str())
            || run["receipt"].as_str() != Some(want.1.as_str())
        {
            mismatches.push(format!("{at}: charged run {i} is not the report's run {i}"));
        }
    }
    mismatches
}

struct WakeOne {
    index: usize,
    wake: tokio::sync::mpsc::UnboundedSender<usize>,
}

impl Wake for WakeOne {
    fn wake(self: Arc<Self>) {
        let _ = self.wake.send(self.index);
    }
    fn wake_by_ref(self: &Arc<Self>) {
        let _ = self.wake.send(self.index);
    }
}

/// `runHabitatSchedule`: run every activity against one shared account in
/// round-robin order, store each complete activity's report, and return the
/// closed record. With a journal, journaled runs are served from their
/// stored receipts first; an entry that does not reconcile stops the
/// schedule with `RECEIPT_MISMATCH`. An activity that fails for any reason
/// other than a refused reservation stops the schedule and rethrows that
/// error; the journal keeps every run charged so far.
pub async fn run(
    order: &str,
    limits: &Limits,
    activities: Vec<Activity>,
    store: &Store,
    host: &Host,
    transports: &Transports,
    journal: Option<Journal>,
) -> Result<Outcome> {
    let order = self::order(&json!(order))?;
    let limits = habitat_budget::parse_limits(&limits_json(limits))?;
    let count = activities.len();
    if count == 0 || count > MAX_ACTIVITIES {
        return Err(fail(format!(
            "activities must list 1 to {MAX_ACTIVITIES} activities"
        )));
    }
    for (i, activity) in activities.iter().enumerate() {
        kind(&json!(activity.kind), &format!("activities[{i}]"))?;
    }
    let journaled = journal
        .as_ref()
        .map(|journal| journal.runs.clone())
        .unwrap_or_default();
    if journaled.len() as u64 > limits.runs {
        return Err(mismatch(
            "the journal holds more runs than the limits allow",
        ));
    }
    for (i, run) in journaled.iter().enumerate() {
        if run["activity"].as_u64().unwrap_or(0) as usize >= count {
            return Err(mismatch(format!(
                "run {i} names activity {}",
                run["activity"].as_u64().unwrap_or(0)
            )));
        }
    }
    // The shared account's arithmetic; its activity label never leaves here.
    let shared = Arc::new(Mutex::new(Shared {
        account: Account::new("foundry", limits)?,
        journaled,
        journal,
        kinds: activities.iter().map(|activity| activity.kind).collect(),
        turns: Vec::new(),
        pending: vec![false; count],
        granted: None,
        done: vec![false; count],
        refused_here: vec![false; count],
        refused_activity: None,
        failure: None,
        reports: vec![None; count],
        last: -1,
        wakers: vec![None; count],
    }));
    let mut ledgers: Vec<ScheduledLedger> = activities
        .iter()
        .enumerate()
        .map(|(index, activity)| ScheduledLedger {
            shared: shared.clone(),
            index,
            kind: activity.kind,
        })
        .collect();
    let mut stores: Vec<Store> = (0..count).map(|_| store.clone()).collect();
    let mut hosts: Vec<Host> = (0..count).map(|_| host.clone()).collect();
    // Each activity future borrows its ledger, store, host, and the shared
    // transports, so the futures live only for this call.
    type ActivityFuture<'a> = Pin<Box<dyn Future<Output = Result<()>> + Send + 'a>>;
    let mut futures: Vec<Option<ActivityFuture<'_>>> = Vec::with_capacity(count);
    {
        let mut ledger_refs = ledgers.iter_mut();
        let mut store_refs = stores.iter_mut();
        let mut host_refs = hosts.iter_mut();
        for (index, activity) in activities.into_iter().enumerate() {
            let ledger = ledger_refs
                .next()
                .ok_or_else(|| Error::new("INTERNAL", "habitat schedule ledger count"))?;
            let activity_store = store_refs
                .next()
                .ok_or_else(|| Error::new("INTERNAL", "habitat schedule store count"))?;
            let activity_host = host_refs
                .next()
                .ok_or_else(|| Error::new("INTERNAL", "habitat schedule host count"))?;
            let shared = shared.clone();
            futures.push(Some(Box::pin(async move {
                let outcome =
                    (activity.run)(ledger, activity_store, activity_host, transports).await;
                let mut shared = lock(&shared)?;
                match outcome {
                    Ok(report) => shared.reports[index] = Some(report),
                    Err(error) => {
                        if !shared.refused_here[index] && shared.failure.is_none() {
                            shared.failure = Some(error);
                        }
                    }
                }
                shared.done[index] = true;
                pump_locked(&mut shared);
                Ok(())
            })));
        }
    }
    let (wake, mut woken) = tokio::sync::mpsc::unbounded_channel::<usize>();
    for index in 0..count {
        let _ = wake.send(index);
    }
    let mut finished = 0usize;
    while finished < count {
        let index = woken
            .recv()
            .await
            .ok_or_else(|| Error::new("INTERNAL", "habitat schedule stalled"))?;
        let Some(future) = futures[index].as_mut() else {
            continue;
        };
        let waker = Waker::from(Arc::new(WakeOne {
            index,
            wake: wake.clone(),
        }));
        let mut cx = Context::from_waker(&waker);
        match future.as_mut().poll(&mut cx) {
            Poll::Ready(result) => {
                futures[index] = None;
                finished += 1;
                if let Err(error) = result
                    && let Ok(mut shared) = shared.lock()
                    && shared.failure.is_none()
                {
                    shared.failure = Some(error);
                }
            }
            Poll::Pending => {}
        }
    }
    drop(wake);
    let mut shared = lock(&shared)?;
    if let Some(failure) = shared.failure.take() {
        return Err(failure);
    }
    if shared.turns.len() < shared.journaled.len() {
        return Err(mismatch(
            "the journal holds runs the schedule did not request",
        ));
    }
    let budget = shared.account.record()?;
    let mut records = Vec::with_capacity(count);
    let mut store = store.clone();
    let Shared {
        reports,
        refused_here,
        kinds,
        ..
    } = &mut *shared;
    for (index, report) in reports.iter_mut().enumerate() {
        if refused_here[index] || report.is_none() {
            *report = None;
            records.push(json!({
                "kind":kinds[index],
                "outcome":"exhausted",
                "report":null,
            }));
        } else {
            let digest = store.put("values", report.as_ref().unwrap_or(&Value::Null))?;
            records.push(json!({
                "kind":kinds[index],
                "outcome":"complete",
                "report":digest,
            }));
        }
    }
    let mut refused = budget["refused"].clone();
    if !refused.is_null() {
        refused["activity"] = json!(shared.refused_activity.unwrap_or(0) as u64);
    }
    let record = parse(&json!({
        "contract":SCHEDULE_CONTRACT,
        "order":order,
        "limits":budget["limits"],
        "activities":records,
        "runs":budget["runs"].as_array().map(|runs| runs.iter().zip(&shared.turns).map(|(run, turn)| {
            let mut run = run.clone();
            run["activity"] = json!(*turn as u64);
            run
        }).collect::<Vec<_>>()).unwrap_or_default(),
        "charged":budget["charged"],
        "outcome":budget["outcome"],
        "refused":refused,
    }))?;
    // Every complete report must record exactly its charged runs; anything
    // else is a host wiring error, and the record would not verify.
    let wiring: Vec<String> = shared
        .reports
        .iter()
        .enumerate()
        .flat_map(|(activity, report)| {
            report
                .as_ref()
                .map(|report| binding_mismatches(&record, activity, report))
                .unwrap_or_default()
        })
        .collect();
    if !wiring.is_empty() {
        return Err(Error::new(
            "INTERNAL",
            format!("habitat schedule: {}", wiring.join("; ")),
        ));
    }
    Ok(Outcome {
        schedule: record,
        reports: std::mem::take(&mut shared.reports),
    })
}

/// `verifyHabitatSchedule`: verify a schedule record against a store — the
/// record's arithmetic and round-robin order, each complete activity's
/// report (verified as a foundry or search report, replaying its runs) and
/// its binding to the runs charged to that activity, every ceiling and
/// charge, and an offline replay of the runs of exhausted activities.
pub async fn verify(value: &Value, store: &Store, host: &Host) -> Result<Value> {
    let schedule = parse(value)?;
    let mut mismatches = Vec::new();
    let mut checked = 0u64;
    let activities = schedule["activities"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let runs = schedule["runs"].as_array().cloned().unwrap_or_default();
    for (activity, entry) in activities.iter().enumerate() {
        if entry["report"].is_null() {
            continue;
        }
        let at = format!("activity {activity}");
        let report_digest = entry["report"].as_str().unwrap_or("");
        let Some(report) = store.get("values", report_digest)? else {
            mismatches.push(format!("{at}: report {report_digest} missing"));
            continue;
        };
        let kind = entry["kind"].as_str().unwrap_or("");
        let contract = if kind == "search" {
            "algal.search.v1"
        } else {
            "algal.foundry.v1"
        };
        if !report.is_object() || report["contract"].as_str() != Some(contract) {
            mismatches.push(format!("{at}: report is not an {contract} report"));
            continue;
        }
        let verified = if kind == "search" {
            foundry::verify_search(&report, store, host).await
        } else {
            foundry::verify(&report, store, host).await
        };
        match verified {
            Ok(verified) => {
                checked += verified["checkedReceipts"].as_u64().unwrap_or(0);
                for problem in verified["mismatches"]
                    .as_array()
                    .map(Vec::as_slice)
                    .unwrap_or_default()
                {
                    mismatches.push(format!("{at}: {}", problem.as_str().unwrap_or("")));
                }
                mismatches.extend(binding_mismatches(&schedule, activity, &report));
            }
            Err(error) => mismatches.push(format!("{at}: {}", error.message)),
        }
    }
    // Only runs of exhausted activities replay here; a complete activity's
    // runs already replayed inside its own report verification.
    let exhausted = |i: usize| -> bool {
        runs.get(i)
            .and_then(|run| run["activity"].as_u64())
            .and_then(|a| activities.get(a as usize))
            .is_some_and(|a| a["outcome"] == "exhausted")
    };
    let (evidence, evidence_checked) = habitat_budget::check_runs_evidence(
        &runs,
        &schedule["refused"],
        store,
        Some(host),
        "schedule",
        Some(&exhausted),
    )
    .await?;
    mismatches.extend(evidence);
    checked += evidence_checked;
    Ok(json!({
        "ok":mismatches.is_empty(),
        "digest":digest(&schedule)?,
        "outcome":schedule["outcome"],
        "checkedReceipts":checked,
        "mismatches":mismatches,
    }))
}
