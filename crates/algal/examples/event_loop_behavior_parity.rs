use algal::{
    Result,
    canonical::{canonical, read_json},
    event_loop_behavior::summarize_event_loop_behavior,
};
use serde_json::{Value, json};

fn main() -> Result<()> {
    let input = read_json(std::io::stdin().lock(), 4_194_304)?;
    let vectors = input
        .as_array()
        .filter(|items| !items.is_empty() && items.len() <= 64)
        .ok_or_else(|| algal::Error::invalid("expected 1..64 event-loop behavior vectors"))?;
    let mut results = Vec::new();
    for item in vectors {
        let data = item
            .as_object()
            .filter(|obj| {
                obj.len() == 3
                    && obj.contains_key("name")
                    && obj.contains_key("behavior")
                    && obj.contains_key("actor")
            })
            .ok_or_else(|| algal::Error::invalid("invalid behavior vector"))?;
        let name = data["name"]
            .as_str()
            .filter(|name| !name.is_empty() && name.len() <= 64)
            .ok_or_else(|| algal::Error::invalid("invalid vector name"))?;
        let result = match summarize_event_loop_behavior(&data["behavior"], &data["actor"]) {
            Ok(summary) => summary,
            Err(error) => json!({"code":error.code}),
        };
        results.push(json!({"name":name,"result":result}));
    }
    println!("{}", canonical(&Value::Array(results))?);
    Ok(())
}
