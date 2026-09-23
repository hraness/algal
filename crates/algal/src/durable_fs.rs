//! Local publication under explicit fsync, durable-root and stable-namespace
//! assumptions. Visibility alone never qualifies an ancestor or retained inode.
use crate::{Error, Result};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::Path,
};

const MAX_ANCESTORS: usize = 256;

#[cfg(test)]
#[derive(Clone, Debug)]
pub(crate) struct Event {
    pub step: &'static str,
    pub phase: &'static str,
    pub path: std::path::PathBuf,
    pub target: Option<std::path::PathBuf>,
    pub inode: Option<(u64, u64)>,
}

#[cfg(test)]
type Probe = std::rc::Rc<dyn Fn(&Event) -> Result<()>>;
#[cfg(test)]
thread_local! {
    static PROBE: std::cell::RefCell<Option<Probe>> = const { std::cell::RefCell::new(None) };
}

/// Test-only scoped observation/failure injection. No production bypass exists.
#[cfg(test)]
pub(crate) fn with_probe<T>(probe: Probe, action: impl FnOnce() -> T) -> T {
    struct Restore(Option<Probe>);
    impl Drop for Restore {
        fn drop(&mut self) {
            PROBE.with(|slot| *slot.borrow_mut() = self.0.take());
        }
    }
    let _restore = Restore(PROBE.with(|slot| slot.replace(Some(probe))));
    action()
}

fn step_fd<T>(
    step: &'static str,
    path: &Path,
    target: Option<&Path>,
    file: Option<&File>,
    action: impl FnOnce() -> Result<T>,
) -> Result<T> {
    #[cfg(test)]
    let probe = PROBE.with(|slot| slot.borrow().clone());
    #[cfg(test)]
    let mut event = Event {
        step,
        phase: "before",
        path: std::path::absolute(path)?,
        target: target.map(std::path::absolute).transpose()?,
        inode: {
            #[cfg(unix)]
            {
                use std::os::unix::fs::MetadataExt;
                file.map(|file| file.metadata().map(|m| (m.dev(), m.ino())))
                    .transpose()?
            }
            #[cfg(not(unix))]
            {
                let _ = file;
                None
            }
        },
    };
    #[cfg(not(test))]
    let _ = (step, path, target, file);
    #[cfg(test)]
    if let Some(probe) = &probe {
        probe(&event)?;
    }
    let result = action()?;
    #[cfg(test)]
    if let Some(probe) = &probe {
        event.phase = "after";
        probe(&event)?;
    }
    Ok(result)
}

pub(crate) fn step<T>(
    step: &'static str,
    path: &Path,
    target: Option<&Path>,
    action: impl FnOnce() -> Result<T>,
) -> Result<T> {
    step_fd(step, path, target, None, action)
}

fn real_directory(path: &Path) -> Result<()> {
    let metadata = fs::symlink_metadata(path)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err(Error::new(
            "IO_FAILED",
            "publication directory must be a real directory",
        ));
    }
    Ok(())
}

pub(crate) fn sync_directory(path: &Path) -> Result<()> {
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_DIRECTORY | libc::O_NONBLOCK);
    }
    let file = options.open(path)?;
    if !file.metadata()?.is_dir() {
        return Err(Error::new(
            "IO_FAILED",
            "publication directory descriptor is not a directory",
        ));
    }
    step_fd("dir-sync", path, None, Some(&file), || {
        file.sync_all()?;
        Ok(())
    })
}

fn sync_ancestors(path: &Path) -> Result<()> {
    real_directory(path)?;
    let mut current = path.canonicalize()?;
    for _ in 0..MAX_ANCESTORS {
        sync_directory(&current)?;
        let Some(parent) = current.parent() else {
            return Ok(());
        };
        current = parent.to_owned();
    }
    Err(Error::limit("publication ancestor bound"))
}

pub(crate) fn directory(path: &Path) -> Result<()> {
    let absolute = std::path::absolute(path)?;
    let mut current = absolute.clone();
    let mut missing = Vec::new();
    loop {
        match fs::symlink_metadata(&current) {
            Ok(metadata) => {
                if current == absolute && (!metadata.is_dir() || metadata.file_type().is_symlink())
                {
                    return Err(Error::new(
                        "IO_FAILED",
                        "publication directory must be a real directory",
                    ));
                }
                break;
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                if missing.len() >= MAX_ANCESTORS {
                    return Err(Error::limit("publication ancestor bound"));
                }
                missing.push(
                    current
                        .file_name()
                        .ok_or_else(|| Error::invalid("publication directory component"))?
                        .to_owned(),
                );
                current = current
                    .parent()
                    .ok_or_else(|| Error::invalid("publication directory root"))?
                    .to_owned();
            }
            Err(error) => return Err(error.into()),
        }
    }
    // Existing ancestor aliases are permitted; managed roots and namespaces
    // retain their caller's symlink guards. Mount mappings must remain stable.
    current = current.canonicalize()?;
    real_directory(&current)?;
    for component in missing.into_iter().rev() {
        current.push(component);
        let mut builder = fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        let mut existed = false;
        let created = step("mkdir", &current, None, || {
            builder.create(&current).map_err(|error| {
                existed = error.kind() == std::io::ErrorKind::AlreadyExists;
                error.into()
            })
        });
        if !existed {
            created?;
        }
        real_directory(&current)?;
    }
    sync_ancestors(&current)
}

pub(crate) fn sync_file(file: &File, path: &Path) -> Result<()> {
    if !file.metadata()?.is_file() {
        return Err(Error::new(
            "IO_FAILED",
            "publication file descriptor is not regular",
        ));
    }
    step_fd("file-sync", path, None, Some(file), || {
        file.sync_all()?;
        Ok(())
    })
}

/// Validate first, while this exact descriptor remains open. Never create a
/// missing parent or replace a corrupt retained record in this path.
pub(crate) fn sync_retained(file: &File, path: &Path) -> Result<()> {
    sync_file(file, path)?;
    sync_ancestors(
        path.parent()
            .ok_or_else(|| Error::invalid("retained file parent"))?,
    )
}

/// False denotes an unadmitted existing winner, not successful publication.
/// The caller must validate and sync that winner through its opened descriptor.
pub(crate) fn publish(path: &Path, bytes: &[u8], replace: bool) -> Result<bool> {
    let path = std::path::absolute(path)?;
    let parent = path
        .parent()
        .ok_or_else(|| Error::invalid("publication parent"))?;
    directory(parent)?;
    match fs::symlink_metadata(&path) {
        Ok(metadata) if !metadata.is_file() || metadata.file_type().is_symlink() => {
            return Err(Error::new(
                "IO_FAILED",
                "publication target must be regular",
            ));
        }
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => return Err(error.into()),
        _ => (),
    }
    let mut random = [0u8; 24];
    getrandom::fill(&mut random)
        .map_err(|_| Error::new("IO_FAILED", "publication entropy unavailable"))?;
    let nonce: String = random.iter().map(|b| format!("{b:02x}")).collect();
    let temporary = parent.join(format!(".tmp-{nonce}"));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600).custom_flags(libc::O_NOFOLLOW);
    }
    let mut file = options.open(&temporary)?;
    let result = (|| {
        step("write-temp", &temporary, None, || {
            file.write_all(bytes)?;
            Ok(())
        })?;
        sync_file(&file, &temporary)?;
        let fresh = if replace {
            step("replace", &temporary, Some(&path), || {
                fs::rename(&temporary, &path)?;
                Ok(())
            })?;
            true
        } else {
            // Preserve EEXIST's meaning without converting observer failures
            // into a retained-winner success.
            let mut existed = false;
            let linked = step("link", &temporary, Some(&path), || {
                fs::hard_link(&temporary, &path).map_err(|error| {
                    existed = error.kind() == std::io::ErrorKind::AlreadyExists;
                    error.into()
                })
            });
            if existed {
                false
            } else {
                linked?;
                true
            }
        };
        if fresh {
            sync_directory(parent)?;
        }
        Ok(fresh)
    })();
    let cleanup = step("unlink-temp", &temporary, None, || {
        match fs::remove_file(&temporary) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error.into()),
        }
    });
    result.and_then(|fresh| cleanup.map(|()| fresh))
}

pub(crate) fn unlink(path: &Path, kind: &'static str) -> Result<()> {
    step(kind, path, None, || {
        fs::remove_file(path)?;
        Ok(())
    })?;
    sync_directory(
        path.parent()
            .ok_or_else(|| Error::invalid("removed file parent"))?,
    )
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::{canonical::digest, mailbox::MailboxService, store::Store};
    use serde_json::json;
    use std::{
        cell::{Cell, RefCell},
        collections::{BTreeMap, BTreeSet},
        os::unix::fs::MetadataExt,
        path::PathBuf,
        rc::Rc,
    };

    #[derive(Clone)]
    struct Record {
        event: Event,
        content: Option<(String, Vec<u8>)>,
    }
    #[derive(Clone)]
    struct Entry {
        directory: bool,
        inode: String,
    }
    /// Independent directory bindings and inode contents. The fixture root is
    /// an explicit durable anchor; materialization is a modeled crash image,
    /// never an assertion about the persistence of this machine's actual disk.
    #[derive(Clone, Default)]
    struct Image {
        visible: BTreeMap<PathBuf, Entry>,
        content: BTreeMap<String, Vec<u8>>,
        durable: BTreeMap<PathBuf, Entry>,
        saved: BTreeMap<String, Vec<u8>>,
    }
    impl Image {
        fn snapshot(root: &Path, durable: bool) -> Self {
            fn walk(image: &mut Image, root: &Path, path: &Path) {
                for entry in fs::read_dir(path).unwrap() {
                    let entry = entry.unwrap();
                    let path = entry.path();
                    let metadata = entry.metadata().unwrap();
                    let inode = format!("{}:{}", metadata.dev(), metadata.ino());
                    image.visible.insert(
                        path.strip_prefix(root).unwrap().to_owned(),
                        Entry {
                            directory: metadata.is_dir(),
                            inode: inode.clone(),
                        },
                    );
                    if metadata.is_dir() {
                        walk(image, root, &path);
                    } else {
                        image.content.insert(inode, fs::read(path).unwrap());
                    }
                }
            }
            let mut image = Self::default();
            walk(&mut image, root, root);
            if durable {
                image.durable = image.visible.clone();
                image.saved = image.content.clone();
            }
            image
        }
        fn apply(&mut self, root: &Path, record: &Record) {
            let event = &record.event;
            let Ok(path) = event.path.strip_prefix(root) else {
                return;
            };
            match event.step {
                "mkdir" => {
                    self.visible.insert(
                        path.to_owned(),
                        Entry {
                            directory: true,
                            inode: path.display().to_string(),
                        },
                    );
                }
                "write-temp" | "create-lock" => {
                    let (inode, content) = record.content.as_ref().expect("real write observation");
                    self.visible.insert(
                        path.to_owned(),
                        Entry {
                            directory: false,
                            inode: inode.clone(),
                        },
                    );
                    self.content.insert(inode.clone(), content.clone());
                }
                "file-sync" => {
                    let (device, number) = event.inode.expect("opened descriptor identity");
                    let inode = format!("{device}:{number}");
                    self.saved.insert(
                        inode.clone(),
                        self.content
                            .get(&inode)
                            .expect("opened inode contents")
                            .clone(),
                    );
                }
                "link" | "replace" => {
                    let target = event.target.as_ref().unwrap().strip_prefix(root).unwrap();
                    self.visible.insert(
                        target.to_owned(),
                        self.visible
                            .get(path)
                            .expect("observed publication source")
                            .clone(),
                    );
                    if event.step == "replace" {
                        self.visible.remove(path);
                    }
                }
                "unlink-temp" | "unlink-pending" | "unlink-lock" => {
                    self.visible.remove(path);
                }
                "dir-sync" => {
                    self.durable.retain(|name, _| name.parent() != Some(path));
                    for (name, entry) in &self.visible {
                        if name.parent() == Some(path) {
                            self.durable.insert(name.clone(), entry.clone());
                        }
                    }
                }
                other => panic!("unknown observed step {other}"),
            }
        }
        fn background_binding(&mut self, path: &Path) {
            if let Some(entry) = self.visible.get(path) {
                self.durable.insert(path.to_owned(), entry.clone());
            } else {
                self.durable.remove(path);
            }
        }
        fn replay(&self, root: &Path, records: &[Record], omit: impl Fn(&Record) -> bool) -> Self {
            let mut result = self.clone();
            for record in records {
                if !omit(record) {
                    result.apply(root, record);
                }
            }
            result
        }
        fn materialize(&self) -> tempfile::TempDir {
            let root = tempfile::tempdir().unwrap();
            let mut reachable = BTreeSet::from([PathBuf::new()]);
            let mut entries: Vec<_> = self.durable.iter().collect();
            entries.sort_by_key(|(path, _)| path.components().count());
            for (path, entry) in entries {
                if !reachable.contains(path.parent().unwrap()) {
                    continue;
                }
                if entry.directory {
                    fs::create_dir(root.path().join(path)).unwrap();
                    reachable.insert(path.clone());
                } else {
                    fs::write(
                        root.path().join(path),
                        self.saved.get(&entry.inode).map_or(&[][..], Vec::as_slice),
                    )
                    .unwrap();
                }
            }
            root
        }
    }
    fn trace<T>(root: &Path, action: impl FnOnce() -> T) -> (T, Vec<Record>) {
        let root = root.to_owned();
        let records = Rc::new(RefCell::new(Vec::new()));
        let output = records.clone();
        let result = with_probe(
            Rc::new(move |event| {
                if event.phase == "after" && event.path.starts_with(&root) {
                    let content = if ["write-temp", "create-lock"].contains(&event.step) {
                        let metadata = fs::metadata(&event.path)?;
                        Some((
                            format!("{}:{}", metadata.dev(), metadata.ino()),
                            fs::read(&event.path)?,
                        ))
                    } else {
                        None
                    };
                    output.borrow_mut().push(Record {
                        event: event.clone(),
                        content,
                    });
                }
                Ok(())
            }),
            action,
        );
        (result, records.take())
    }

    #[test]
    fn acknowledged_dependencies_and_head_survive_images_and_missing_barriers_fail() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().canonicalize().unwrap();
        let dir = root.join("new/nested/store");
        let (key, records) = trace(&root, || {
            let key = Store::open(&dir, true)
                .unwrap()
                .put("values", &json!({"selected":1}))
                .unwrap();
            crate::lease::write(&dir.join("head.json"), &json!({"value":key}), true).unwrap();
            key
        });
        let check = |image: Image| {
            let cold = image.materialize();
            let dir = cold.path().join("new/nested/store");
            let store = Store::open(&dir, false).unwrap();
            store.get("values", &key).ok().flatten() == Some(json!({"selected":1}))
                && crate::lease::read(&dir.join("head.json"), 1024)
                    .ok()
                    .flatten()
                    == Some(json!({"value":key}))
        };
        assert!(check(Image::default().replay(&root, &records, |_| false)));
        for parent in [
            root.clone(),
            root.join("new"),
            root.join("new/nested"),
            dir.clone(),
            dir.join("values"),
        ] {
            assert!(
                records
                    .iter()
                    .any(|r| r.event.step == "dir-sync" && r.event.path == parent)
            );
            assert!(
                !check(
                    Image::default().replay(&root, &records, |r| r.event.step == "dir-sync"
                        && r.event.path == parent)
                ),
                "{}",
                parent.display()
            );
        }
        let source = &records
            .iter()
            .find(|r| r.event.step == "link")
            .unwrap()
            .event
            .path;
        assert!(!check(Image::default().replay(
            &root,
            &records,
            |r| r.event.step == "file-sync" && r.event.path == *source
        )));
    }

    #[test]
    fn visible_ancestors_and_actual_retained_inode_are_synchronized() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().canonicalize().unwrap();
        let dir = root.join("visible/store");
        fs::create_dir_all(dir.join("effects")).unwrap();
        let request = digest(&json!("retained request")).unwrap();
        let memo = Store::effect_key(&request, "memo identity").unwrap();
        let path = dir.join("effects").join(format!("{}.json", &memo[7..]));
        let first =
            json!({"requestDigest":request,"executor":"response executor","output":"first"});
        fs::write(&path, serde_json::to_vec(&first).unwrap()).unwrap();
        let metadata = fs::metadata(&path).unwrap();
        let initial = Image::snapshot(&root, false);
        let (_, records) = trace(&root, || {
            Store::open(&dir, true).unwrap().put_effect(&json!({"requestDigest":request,"executor":"response executor","output":"loser"}), "memo identity").unwrap();
        });
        let syncs: Vec<_> = records
            .iter()
            .filter(|r| r.event.step == "file-sync" && r.event.path == path)
            .collect();
        assert_eq!(syncs.len(), 1);
        assert_eq!(syncs[0].event.inode, Some((metadata.dev(), metadata.ino())));
        let cold = initial.replay(&root, &records, |_| false).materialize();
        assert_eq!(
            Store::open(&cold.path().join("visible/store"), false)
                .unwrap()
                .get_effect(&request, "memo identity")
                .unwrap(),
            Some(first)
        );
        let omitted = initial
            .replay(&root, &records, |r| {
                r.event.step == "file-sync" && r.event.path == path
            })
            .materialize();
        assert!(
            Store::open(&omitted.path().join("visible/store"), false)
                .unwrap()
                .get_effect(&request, "memo identity")
                .is_err()
        );
    }

    #[test]
    fn actual_io_failures_preserve_uncertainty_and_owned_cleanup() {
        for phase in ["before", "after"] {
            for kind in [
                "mkdir",
                "write-temp",
                "file-sync",
                "link",
                "dir-sync",
                "unlink-temp",
            ] {
                let temp = tempfile::tempdir().unwrap();
                let root = temp.path().canonicalize().unwrap();
                let dir = root.join("child/store");
                let unrelated = root.join(".tmp-unrelated");
                fs::write(&unrelated, "belongs to someone else").unwrap();
                let reached = Rc::new(Cell::new(false));
                let observed = reached.clone();
                let result = with_probe(
                    Rc::new(move |event| {
                        if !observed.get()
                            && event.phase == phase
                            && event.step == kind
                            && event.path.starts_with(&root)
                        {
                            observed.set(true);
                            return Err(Error::new("IO_FAILED", "injected publication fault"));
                        }
                        Ok(())
                    }),
                    || {
                        Store::open(&dir, true)
                            .unwrap()
                            .put("values", &json!("uncertain value"))
                    },
                );
                assert!(reached.get(), "{phase} {kind}");
                assert_eq!(result.unwrap_err().message, "injected publication fault");
                assert_eq!(
                    fs::read_to_string(&unrelated).unwrap(),
                    "belongs to someone else"
                );
                let value = Store::open(&dir, false)
                    .unwrap()
                    .get("values", &digest(&json!("uncertain value")).unwrap())
                    .unwrap();
                if kind == "unlink-temp" || (kind == "link" && phase == "after") {
                    assert_eq!(value, Some(json!("uncertain value")));
                } else {
                    assert!(value.is_none() || value == Some(json!("uncertain value")));
                }
            }
        }
    }

    #[test]
    fn mailbox_transfer_images_require_consumed_pending_and_release_barriers() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().canonicalize().unwrap();
        let service = MailboxService::open(&root);
        let config = service.create("transfer", 2, 64).unwrap();
        let key = digest(&json!("transfer key")).unwrap();
        let sent = service.send(&config.send, json!("payload"), &key).unwrap();
        let initial = Image::snapshot(&root, true);
        let (result, records) = trace(&root, || service.receive(&config.receive).unwrap());
        let consumed = root.join("mailboxes/transfer/consumed");
        let pending = root.join("mailboxes/transfer/pending");
        let mailbox = root.join("mailboxes/transfer");
        let linked = records
            .iter()
            .position(|r| {
                r.event.step == "link"
                    && r.event.target.as_ref().unwrap().parent() == Some(consumed.as_path())
            })
            .unwrap();
        let synced = records
            .iter()
            .enumerate()
            .position(|(index, r)| {
                index > linked && r.event.step == "dir-sync" && r.event.path == consumed
            })
            .unwrap();
        let removed = records
            .iter()
            .position(|r| r.event.step == "unlink-pending")
            .unwrap();
        let released = records
            .iter()
            .position(|r| r.event.step == "unlink-lock")
            .unwrap();
        assert!(linked < synced && synced < removed && removed < released);
        let cold = initial.replay(&root, &records, |_| false).materialize();
        let reopened = MailboxService::open(cold.path());
        assert!(!reopened.has_pending(&config.receive).unwrap());
        assert_eq!(
            reopened.send(&config.send, json!("payload"), &key).unwrap(),
            sent
        );
        let omitted = initial
            .replay(&root, &records, |r| {
                r.event.step == "dir-sync" && r.event.path == consumed
            })
            .materialize();
        let unsafe_image = MailboxService::open(omitted.path());
        unsafe_image
            .send(&config.send, json!("payload"), &key)
            .unwrap();
        assert_eq!(unsafe_image.receive(&config.receive).unwrap(), result);
        let duplicate = initial
            .replay(&root, &records, |r| {
                r.event.step == "dir-sync" && r.event.path == pending
            })
            .materialize();
        assert_eq!(
            MailboxService::open(duplicate.path())
                .has_pending(&config.receive)
                .unwrap_err()
                .code,
            "IO_FAILED"
        );
        let mut image = initial.clone();
        for (index, record) in records.iter().enumerate() {
            if !(index > released
                && record.event.step == "dir-sync"
                && record.event.path == mailbox)
            {
                image.apply(&root, record);
            }
        }
        let locked = image.materialize();
        assert_eq!(
            MailboxService::open(locked.path())
                .has_pending(&config.receive)
                .unwrap_err()
                .code,
            "IO_FAILED"
        );
        let source = &records[linked].event.path;
        let unsynced = initial
            .replay(&root, &records, |r| {
                r.event.step == "file-sync" && r.event.path == *source
            })
            .materialize();
        assert!(
            MailboxService::open(unsynced.path())
                .send(&config.send, json!("payload"), &key)
                .is_err()
        );
    }

    #[test]
    fn every_receive_prefix_preserves_evidence_with_independent_background_persistence() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().canonicalize().unwrap();
        let service = MailboxService::open(&root);
        let config = service.create("prefixes", 2, 64).unwrap();
        let key = digest(&json!("prefix message")).unwrap();
        service.send(&config.send, json!("payload"), &key).unwrap();
        let initial = Image::snapshot(&root, true);
        let (_, records) = trace(&root, || service.receive(&config.receive).unwrap());
        assert!(records.len() < 128);
        let pending = PathBuf::from(format!("mailboxes/prefixes/pending/{}.json", &key[7..]));
        let consumed = PathBuf::from(format!("mailboxes/prefixes/consumed/{}.json", &key[7..]));
        for background in [
            vec![],
            vec![&pending],
            vec![&consumed],
            vec![&pending, &consumed],
        ] {
            let mut image = initial.clone();
            for prefix in 0..=records.len() {
                let cold = image.materialize();
                let has_pending = cold.path().join(&pending).is_file();
                let has_consumed = cold.path().join(&consumed).is_file();
                let locked = cold.path().join("mailboxes/prefixes/.lock").is_file();
                assert!(has_pending || has_consumed, "prefix {prefix}");
                let observed = MailboxService::open(cold.path()).has_pending(&config.receive);
                if locked || (has_pending && has_consumed) {
                    assert_eq!(observed.unwrap_err().code, "IO_FAILED");
                } else {
                    assert_eq!(observed.unwrap(), has_pending);
                }
                if let Some(record) = records.get(prefix) {
                    image.apply(&root, record);
                    for path in &background {
                        image.background_binding(path);
                    }
                } else {
                    assert_eq!((has_pending, has_consumed, locked), (false, true, false));
                }
            }
        }
    }

    #[test]
    fn mutable_slot_acknowledges_the_replacement_and_required_barriers() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().canonicalize().unwrap();
        let mut store = Store::open(&root, true).unwrap();
        store.set_slot("memory", &json!("old")).unwrap();
        let initial = Image::snapshot(&root, true);
        let (_, records) = trace(&root, || store.set_slot("memory", &json!("new")).unwrap());
        let cold = initial.replay(&root, &records, |_| false).materialize();
        assert_eq!(
            Store::open(cold.path(), false)
                .unwrap()
                .get_slot("memory")
                .unwrap(),
            Some(json!("new"))
        );
        let old = initial
            .replay(&root, &records, |r| {
                r.event.step == "dir-sync" && r.event.path == root.join("slots")
            })
            .materialize();
        assert_eq!(
            Store::open(old.path(), false)
                .unwrap()
                .get_slot("memory")
                .unwrap(),
            Some(json!("old"))
        );
        let unsynced = initial
            .replay(&root, &records, |r| r.event.step == "file-sync")
            .materialize();
        assert!(
            Store::open(unsynced.path(), false)
                .unwrap()
                .get_slot("memory")
                .is_err()
        );
    }

    #[test]
    fn interrupted_transfer_retains_both_markers_and_release_is_disarmed_once() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().canonicalize().unwrap();
        let service = MailboxService::open(&root);
        let config = service.create("uncertain", 2, 64).unwrap();
        let key = digest(&json!("interrupted transfer")).unwrap();
        service.send(&config.send, json!("payload"), &key).unwrap();
        let reached = Rc::new(Cell::new(false));
        let observed = reached.clone();
        let result = with_probe(
            Rc::new(move |event| {
                if event.step == "unlink-pending" && event.phase == "before" {
                    observed.set(true);
                    return Err(Error::new("IO_FAILED", "injected before pending removal"));
                }
                Ok(())
            }),
            || service.receive(&config.receive),
        );
        assert!(reached.get());
        assert_eq!(
            result.unwrap_err().message,
            "injected before pending removal"
        );
        assert_eq!(
            service.has_pending(&config.receive).unwrap_err().code,
            "IO_FAILED"
        );
        for namespace in ["pending", "consumed"] {
            assert!(
                root.join("mailboxes/uncertain")
                    .join(namespace)
                    .join(format!("{}.json", &key[7..]))
                    .is_file()
            );
        }
        let next = service.create("release", 2, 64).unwrap();
        let lock = root.join("mailboxes/release/.lock");
        let successor = lock.clone();
        let released = Rc::new(Cell::new(false));
        let observed = released.clone();
        let result = with_probe(
            Rc::new(move |event| {
                if !observed.get()
                    && event.step == "unlink-lock"
                    && event.phase == "after"
                    && event.path == successor
                {
                    observed.set(true);
                    fs::write(&successor, "successor owns this lock")?;
                    return Err(Error::new("IO_FAILED", "injected after lock removal"));
                }
                Ok(())
            }),
            || service.has_pending(&next.receive),
        );
        assert!(released.get());
        assert_eq!(result.unwrap_err().message, "injected after lock removal");
        assert_eq!(
            fs::read_to_string(lock).unwrap(),
            "successor owns this lock"
        );
    }
}
