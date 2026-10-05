use algal::{
    Result,
    canonical::{canonical, digest},
    clef,
    effects::{Backend, Host},
};
use serde_json::{Value, json};

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    let fixture: Value = serde_json::from_str(include_str!("../../../scripts/fixtures/clef.json"))?;
    let account = fixture["accountId"].as_str().unwrap();
    let questions = &fixture["questions"];
    let mut cases = Vec::new();
    for item in fixture["cases"].as_array().unwrap() {
        let model = item["model"].as_str().unwrap();
        let mut envelope = fixture["response"].clone();
        for (path, value) in item["patch"].as_object().unwrap() {
            if let Some(target) = envelope.pointer_mut(path) {
                *target = value.clone();
            } else {
                let (parent, key) = path.rsplit_once('/').unwrap();
                envelope
                    .pointer_mut(parent)
                    .unwrap()
                    .as_object_mut()
                    .unwrap()
                    .insert(key.to_owned(), value.clone());
            }
        }
        let images = Value::Array(
            item["imageIndices"]
                .as_array()
                .unwrap()
                .iter()
                .map(|index| fixture["images"][index.as_u64().unwrap() as usize].clone())
                .collect(),
        );
        let configured = (item["source"] == "configured").then_some(&images);
        let mut request = json!({"contract":"algal.effect.v1","cellId":"probe","kind":"decide","prompt":"Evaluate the observation.","context":{"inputs":{"text":"東京 observation"},"turn":0},"output":{"kind":"json","schema":{}},"budget":{"maxContextBytes":4096,"maxOutputBytes":4096},"questions":questions});
        if item["source"] == "request" {
            request["images"] = images.clone();
        }
        let (body, _) = clef::prepare(model, &request, configured)?;
        let backend = Backend::Clef {
            model: model.to_owned(),
            account_id: account.to_owned(),
            images: configured.cloned(),
        };
        backend.validate()?;
        let configuration = serde_json::to_value(&backend)?;
        let configuration_digest = digest(&configuration)?;
        let mut receipt = json!({"requestDigest":digest(&request)?,"executor":clef::executor_id(model),"configurationDigest":configuration_digest});
        let parsed = match clef::response(&envelope, model, questions) {
            Ok((output, metadata)) => {
                assert!(
                    item.get("error").is_none(),
                    "{} accepted invalid envelope",
                    item["name"]
                );
                receipt["output"] = output.clone();
                receipt["usage"] = metadata["usage"].clone();
                json!({"answers":output["answers"],"usage":metadata["usage"]})
            }
            Err(error) => {
                assert_eq!(
                    item["error"], error.code,
                    "{} unexpected rejection",
                    item["name"]
                );
                receipt["error"] = json!({"code":error.code,"message":error.message});
                json!({"error":receipt["error"]})
            }
        };
        let replay = Host::replay(&json!([receipt.clone()]))?
            .effect(&request, 1000, None)
            .await?;
        cases.push(json!({"name":item["name"],"request":request,"body":body,"parsed":parsed,"configuration":configuration,"configurationDigest":configuration_digest,"cacheIdentity":backend.cache_identity("clef")?,"imageDigest":digest(&images)?,"receipt":receipt,"replay":replay}));
    }
    let invalid_images: Vec<bool> = fixture["invalidImages"]
        .as_array()
        .unwrap()
        .iter()
        .map(|images| clef::check_images(images).is_err())
        .collect();
    assert!(invalid_images.iter().all(|value| *value));
    println!(
        "{}",
        canonical(&json!({"cases":cases,"invalidImages":invalid_images}))?
    );
    Ok(())
}
