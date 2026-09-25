//! Sampled Lean/Bun/native correspondence through the production canonical API.
//! This driver does not prove a source refinement or a general JSON codec law.
use algal::canonical::{canonical, read_json};
use serde_json::{Value, json};
use std::{error::Error, fs::File};

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() != 1 {
        return Err("usage: verification_lean_vectors <owned-vector-file>".into());
    }
    let file = File::open(&args[0])?;
    if !file.metadata()?.is_file() {
        return Err("vector input must be a regular file".into());
    }
    let input = read_json(file, 65_536)?;
    if input["contract"] == "algal.lean-string-vectors.v1" {
        if input.as_object().is_none_or(|fields| fields.len() != 2) {
            return Err("string vector input keys differ".into());
        }
        let strings = input["strings"]
            .as_array()
            .ok_or("strings array required")?;
        if strings.len() != 56 {
            return Err("string vector count differs".into());
        }
        let encoded = strings
            .iter()
            .map(|value| {
                if value
                    .as_object()
                    .is_none_or(|fields| fields.len() != 2 || !fields.contains_key("bytes"))
                {
                    return Err("string vector row keys differ".into());
                }
                let text = value["text"].as_str().ok_or("string text required")?;
                if text.len() > 256 {
                    return Err("string text byte bound".into());
                }
                let bytes = canonical(&Value::String(text.to_owned()))?.into_bytes();
                Ok::<_, Box<dyn Error>>(json!({"text":text,"bytes":bytes}))
            })
            .collect::<Result<Vec<_>, _>>()?;
        println!(
            "{}",
            json!({"contract":"algal.lean-native-string-vectors.v1","strings":encoded})
        );
        return Ok(());
    }
    if input["contract"] != "algal.lean-core-vectors.v1" {
        return Err("unknown vector contract".into());
    }
    let numbers = input["binary64"]
        .as_array()
        .ok_or("binary64 array required")?;
    let texts = input["texts"].as_array().ok_or("texts array required")?;
    let keys = input["keyIndices"].as_array().ok_or("key array required")?;
    let maps = input["ownMap"].as_array().ok_or("own-map array required")?;
    if (numbers.len(), texts.len(), keys.len(), maps.len()) != (9, 8, 17, 5) {
        return Err("vector count differs".into());
    }
    let canonical_numbers = numbers
        .iter()
        .map(|value| {
            let bits: u64 = value["bits"]
                .as_str()
                .ok_or("bits string required")?
                .parse()?;
            serde_json::Number::from_f64(f64::from_bits(bits))
                .map(|number| canonical(&Value::Number(number)))
                .transpose()
                .map_err(Box::<dyn Error>::from)
        })
        .collect::<Result<Vec<_>, _>>()?;
    let canonical_texts = texts
        .iter()
        .map(|value| {
            canonical(&Value::String(
                value["text"].as_str().ok_or("text required")?.to_owned(),
            ))
            .map_err(Box::<dyn Error>::from)
        })
        .collect::<Result<Vec<_>, _>>()?;
    let mut object = serde_json::Map::new();
    for value in keys {
        object.insert(
            value["key"].as_str().ok_or("key required")?.to_owned(),
            Value::Null,
        );
    }
    let canonical_keys = canonical(&Value::Object(object))?;
    let parsed: Value = serde_json::from_str(r#"{"__proto__":7,"x":1,"x":2,"present-null":null}"#)?;
    let own_map = maps
        .iter()
        .map(|value| {
            let key = value["key"].as_str().ok_or("own-map key required")?;
            Ok::<_, Box<dyn Error>>(match parsed.get(key) {
                Some(value) => json!({"key":key,"present":true,"value":value}),
                None => json!({"key":key,"present":false}),
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    println!(
        "{}",
        json!({"contract":"algal.lean-native-vectors.v1",
        "canonicalNumbers":canonical_numbers,"canonicalTexts":canonical_texts,
        "canonicalKeys":canonical_keys,"ownMap":own_map})
    );
    Ok(())
}
