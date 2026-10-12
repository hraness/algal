use algal::{
    Result,
    canonical::{canonical, read_json},
    event_loop_contract::summarize_event_loop_trace,
};
use serde_json::{Value, json};

fn main() -> Result<()> {
    // Task-owned offline vectors, never host or provider input. The script
    // passes the exact same JSON values to the TypeScript parser.
    let input = read_json(std::io::stdin().lock(), 4_194_304)?;
    let vectors = input
        .as_array()
        .filter(|items| !items.is_empty() && items.len() <= 64)
        .ok_or_else(|| algal::Error::invalid("expected 1..64 event-loop vectors"))?;
    let mut results = Vec::new();
    for item in vectors {
        let name = item["name"]
            .as_str()
            .filter(|name| !name.is_empty() && name.len() <= 64)
            .ok_or_else(|| algal::Error::invalid("invalid vector name"))?;
        let result = match summarize_event_loop_trace(&item["value"]) {
            Ok((digest, summary)) => json!({"digest":digest,"summary":summary}),
            Err(error) => json!({"code":error.code}),
        };
        results.push(json!({"name":name,"result":result}));
    }
    println!("{}", canonical(&Value::Array(results))?);
    Ok(())
}
