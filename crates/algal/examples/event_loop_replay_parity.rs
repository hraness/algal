use algal::event_loop_replay::replay_event_loop_trace;
use serde_json::{Value, json};
use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let vectors: Vec<Value> = serde_json::from_str(&input).unwrap();
    let output: Vec<Value> = vectors
        .iter()
        .map(
            |row| match replay_event_loop_trace(&row["trace"], &row["behavior"]) {
                Ok((digest, summary)) => {
                    json!({"name":row["name"], "result":{"digest":digest, "summary":summary}})
                }
                Err(error) => json!({"name":row["name"], "result":{"code":error.code}}),
            },
        )
        .collect();
    println!("{}", serde_json::to_string(&output).unwrap());
}
