//! Exact child fixture used by the explicit Bun/native custody matrix driver.
//! No production CLI debug entry point or implicit runtime fallback.
use algal::{
    Result,
    application::{Admission, CommitContext, DispatchAdmission, Service},
};
use serde_json::{Value, json};
use std::{
    fs::{self, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    thread,
    time::{Duration, Instant},
};

fn read(path: &Path) -> Result<Value> {
    let mut bytes = Vec::new();
    fs::File::open(path)?.take(16_385).read_to_end(&mut bytes)?;
    if bytes.len() > 16_384 {
        return Err(algal::Error::invalid(
            "Custody fixture record exceeds bound",
        ));
    }
    serde_json::from_slice(&bytes).map_err(|error| algal::Error::invalid(error.to_string()))
}
fn write(path: &Path, value: &Value) -> Result<()> {
    let bytes =
        serde_json::to_vec(value).map_err(|error| algal::Error::invalid(error.to_string()))?;
    if bytes.len() > 16_384 {
        return Err(algal::Error::invalid(
            "Custody fixture record exceeds bound",
        ));
    }
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?
        .write_all(&bytes)?;
    Ok(())
}
struct Control {
    directory: PathBuf,
    actor: String,
    token: String,
}
impl Control {
    fn path(&self, phase: &str) -> PathBuf {
        self.directory
            .join("custody-control")
            .join(format!("{}.{phase}.json", self.actor))
    }
    fn pause(&self, phase: &str) -> Result<()> {
        write(
            &self.path(phase),
            &json!({"token":self.token,"actor":self.actor,"phase":phase,"pid":std::process::id()}),
        )?;
        let release = self.path(&format!("{phase}.release"));
        let deadline = Instant::now() + Duration::from_secs(30);
        loop {
            if let Ok(value) = read(&release) {
                if value != json!({"token":self.token,"actor":self.actor,"phase":phase}) {
                    return Err(algal::Error::invalid("Invalid custody release"));
                }
                return Ok(());
            }
            if Instant::now() >= deadline {
                return Err(algal::Error::invalid("Custody child barrier timed out"));
            }
            thread::sleep(Duration::from_millis(5));
        }
    }
}
impl Admission for Control {
    fn admit_commit(&self, _: &CommitContext) -> Result<()> {
        if self.actor == "live" {
            self.pause("admitted")?;
        }
        Ok(())
    }
    fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
        Err(algal::Error::invalid(
            "Custody fixture does not admit dispatch",
        ))
    }
}

#[test]
#[ignore = "owned child fixture; invoked by the required all-eight-runtime custody driver"]
fn application_custody_child() {
    let control = Control {
        directory: std::env::var_os("ALGAL_CUSTODY_DIRECTORY")
            .map(PathBuf::from)
            .expect("directory"),
        actor: std::env::var("ALGAL_CUSTODY_ACTOR").expect("actor"),
        token: std::env::var("ALGAL_CUSTODY_TOKEN").expect("token"),
    };
    assert!(["creator", "late", "live"].contains(&control.actor.as_str()));
    assert_eq!(control.token.len(), 48);
    assert!(control.token.bytes().all(|b| b.is_ascii_hexdigit()));
    let selected = || {
        if control.actor == "late" {
            control.pause("selected")?;
        }
        Ok(())
    };
    let mut service = Service::new(&control.directory, &control)
        .unwrap()
        .with_custody_hook(&selected);
    let scenario = read(&control.directory.join("custody-control/scenario.json")).unwrap();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let result = runtime.block_on(service.commit(&scenario[control.actor.as_str()]));
    let record = match result {
        Ok(snapshot) => {
            json!({"token":control.token,"actor":control.actor,"pid":std::process::id(),"ok":true,"digest":snapshot.digest,"previous":snapshot.state.previous,"sequence":snapshot.state.sequence})
        }
        Err(error) => {
            json!({"token":control.token,"actor":control.actor,"pid":std::process::id(),"ok":false,"message":error.message.chars().take(1024).collect::<String>()})
        }
    };
    write(&control.path("result"), &record).unwrap();
}
