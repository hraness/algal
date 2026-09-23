//! Test driver for the public byte entry points, not a second evaluator.
use std::error::Error;
use std::fs::File;
use std::io::Read;

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() != 2 || !matches!(args[0].as_str(), "eval" | "check") {
        return Err("usage: verification_boundary <eval|check> <owned-fixture-file>".into());
    }
    let file = File::open(&args[1])?;
    if !file.metadata()?.is_file() {
        return Err("fixture must be a regular file".into());
    }
    let mut bytes = Vec::new();
    file.take(1_048_577).read_to_end(&mut bytes)?;
    if bytes.len() > 1_048_576 {
        return Err("fixture exceeds the driver byte bound".into());
    }
    println!(
        "{}",
        if args[0] == "eval" {
            algal_expr::eval_json(&bytes)
        } else {
            algal_expr::check_json(&bytes)
        }
    );
    Ok(())
}
