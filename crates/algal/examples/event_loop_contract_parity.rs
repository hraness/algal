use algal::{
    Result,
    canonical::{canonical, read_json},
    event_loop_contract::summarize_event_loop_trace,
};
use serde_json::{Value, json};

const MAX_VECTORS: usize = 128;

fn valid_vector_count(count: usize) -> bool {
    (1..=MAX_VECTORS).contains(&count)
}

fn main() -> Result<()> {
    // Task-owned offline vectors, never host or provider input. The script
    // passes the exact same JSON values to the TypeScript parser.
    let input = read_json(std::io::stdin().lock(), 4_194_304)?;
    let vectors = input
        .as_array()
        .filter(|items| valid_vector_count(items.len()))
        .ok_or_else(|| algal::Error::invalid("expected 1..128 event-loop vectors"))?;
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

#[cfg(test)]
mod tests {
    use super::valid_vector_count;

    #[test]
    fn offline_vector_count_has_both_edges() {
        assert!(!valid_vector_count(0));
        assert!(valid_vector_count(1));
        assert!(valid_vector_count(128));
        assert!(!valid_vector_count(129));
    }
}
