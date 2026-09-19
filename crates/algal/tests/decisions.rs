use algal::{
    canonical::digest,
    contract::Manifest,
    decisions::{self, answer_schema, check_answer, check_questions, choice_question, serve},
    effects::Host,
    graph::Transports,
    runtime,
    store::Store,
};
use serde_json::{Value, json};

const QUESTIONS: &str = r#"{
    "keep": {"type":"noul","instructions":"is this still relevant?"},
    "lane": {"type":"choice","instructions":"pick a lane","criteria":{"x":null,"y":"the y lane"}},
    "rate": {"type":"score","instructions":"rate it","criteria":["1","2","3"]}
}"#;

fn questions() -> Value {
    serde_json::from_str(QUESTIONS).unwrap()
}

#[test]
fn question_maps_validate_all_three_types() {
    check_questions(&questions(), "q").unwrap();
    for (name, reject) in [
        ("empty map", json!({})),
        (
            "unknown key",
            json!({"q":{"type":"noul","instructions":"i","bogus":1}}),
        ),
        (
            "empty instructions",
            json!({"q":{"type":"noul","instructions":""}}),
        ),
        ("bad type", json!({"q":{"type":"chat","instructions":"i"}})),
        (
            "choice without criteria",
            json!({"q":{"type":"choice","instructions":"i"}}),
        ),
        (
            "empty choice criteria",
            json!({"q":{"type":"choice","instructions":"i","criteria":{}}}),
        ),
        (
            "score without criteria",
            json!({"q":{"type":"score","instructions":"i"}}),
        ),
        (
            "noul criteria wrong keys",
            json!({"q":{"type":"noul","instructions":"i","criteria":{"yes":"y"}}}),
        ),
    ] {
        assert!(
            check_questions(&reject, "q").is_err(),
            "{name} must be rejected"
        );
    }
}

#[test]
fn answer_schema_is_derived_from_question_types() {
    let schema = answer_schema(&questions());
    assert_eq!(schema["kind"], "json");
    let answers = &schema["schema"]["properties"]["answers"];
    let required: Vec<_> = answers["required"]
        .as_array()
        .unwrap()
        .iter()
        .map(Value::as_str)
        .collect::<Option<Vec<_>>>()
        .unwrap();
    assert_eq!(required, ["keep", "lane", "rate"]);
    assert!(
        answers["properties"]["keep"]["required"]
            .as_array()
            .unwrap()
            == &vec![json!("noul")]
    );
}

#[test]
fn choice_question_synthesizes_classifier_decisions() {
    let request = json!({
        "contract":"algal.effect.v1","cellId":"c","kind":"classifier",
        "prompt":"which lane?","context":{},
        "output":{"kind":"choice","labels":["a","b"]},
        "budget":{"maxContextBytes":1024,"maxOutputBytes":1024}
    });
    let q = choice_question(&request).unwrap();
    assert_eq!(q["answer"]["type"], "choice");
    assert_eq!(q["answer"]["instructions"], "which lane?");
    let keys: Vec<_> = q["answer"]["criteria"]
        .as_object()
        .unwrap()
        .keys()
        .collect();
    assert_eq!(keys, ["a", "b"]);
    let mut bad = request.clone();
    bad["output"] = json!({"kind":"text"});
    assert!(choice_question(&bad).is_err());
}

#[test]
fn answers_validate_strictly_against_question_types() {
    let noul = json!({"type":"noul","instructions":"i"});
    assert!(check_answer(&json!({"noul":0.4}), &noul, "q").is_ok());
    assert!(check_answer(&json!({"noul":"yes"}), &noul, "q").is_err());
    assert!(check_answer(&json!({"choice":"a"}), &noul, "q").is_err());
    let choice = json!({"type":"choice","instructions":"i","criteria":{"a":null}});
    let ok = check_answer(
        &json!({"choice":"a","confidence":0.9,"probabilities":{"a":0.9}}),
        &choice,
        "q",
    )
    .unwrap();
    assert_eq!(ok["choice"], "a");
    assert!(
        check_answer(
            &json!({"choice":"a","confidence":"hi","probabilities":{}}),
            &choice,
            "q"
        )
        .is_err()
    );
}

fn effect_request(kind: &str) -> Value {
    json!({
        "contract":"algal.effect.v1","cellId":"c","kind":kind,
        "prompt":"p","context":{},
        "output":{"kind":"choice","labels":["a","b"]},
        "budget":{"maxContextBytes":1024,"maxOutputBytes":1024}
    })
}

#[tokio::test]
async fn serve_refuses_gates_agents_and_questionless_decides() {
    // approval gates route to a human/policy executor, never a model
    let err = serve("jev-latest", "key", &effect_request("gate"), 1_000)
        .await
        .unwrap_err();
    assert_eq!(err.code, "EFFECT_UNBOUND");
    let err = serve("jev-latest", "key", &effect_request("agent"), 1_000)
        .await
        .unwrap_err();
    assert_eq!(err.code, "EFFECT_UNPARSEABLE");
    let mut decide = effect_request("decide");
    decide["output"] = json!({"kind":"json","schema":{}});
    assert!(serve("jev-latest", "key", &decide, 1_000).await.is_err());
}

#[test]
fn decide_cells_parse_bound_and_serialize() {
    let manifest = json!({
        "contract":"algal.organism.v1","key":"organism:d","name":"D",
        "cells":[
            {"id":"in","kind":"input","outputs":{"diff":"text"}},
            {"id":"probe","kind":"decide","inputs":{"diff":"text"},
             "prompt":"triage","questions":questions_fixture(),
             "view":{"inputs":"*"}},
        ],
        "edges":[{"from":{"cell":"in","port":"diff"},"to":{"cell":"probe","port":"diff"}}]
    });
    let parsed = Manifest::parse(&manifest).unwrap();
    let cell = &parsed.cells[1];
    assert_eq!(cell["kind"], "decide");
    assert!(cell["questions"]["keep"].is_object());
    // question maps ride the canonical cell — digest input is data
    assert_eq!(
        Manifest::parse(&parsed.value).unwrap().digest().unwrap(),
        parsed.digest().unwrap()
    );
    for (name, bad) in [
        ("missing questions", json!({"id":"x","kind":"decide"})),
        (
            "tools rejected",
            json!({"id":"x","kind":"decide","questions":questions_fixture(),"tools":["f"]}),
        ),
        (
            "output rejected",
            json!({"id":"x","kind":"decide","questions":questions_fixture(),"output":{"kind":"text"}}),
        ),
        (
            "shadow rejected",
            json!({"id":"x","kind":"decide","questions":questions_fixture(),"shadow":{"take":null}}),
        ),
    ] {
        let mut m = manifest.clone();
        m["cells"] = json!([bad]);
        m["edges"] = json!([]);
        assert!(Manifest::parse(&m).is_err(), "{name} must be rejected");
    }
}

fn questions_fixture() -> Value {
    questions()
}

#[tokio::test]
async fn decide_cells_run_and_replay_through_the_effect_seam() {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:d","name":"D",
        "cells":[
            {"id":"in","kind":"input","outputs":{"diff":"text"}},
            {"id":"probe","kind":"decide","inputs":{"diff":"text"},
             "prompt":"triage this diff",
             "questions":{
                 "risk":{"type":"choice","instructions":"risk?",
                          "criteria":{"low":null,"high":null}},
                 "ready":{"type":"noul","instructions":"ready?"}
             },
             "view":{"inputs":"*"}}
        ],
        "edges":[{"from":{"cell":"in","port":"diff"},"to":{"cell":"probe","port":"diff"}}]
    }))
    .unwrap();
    let answers = json!({
        "answers":{
            "risk":{"type":"choice","choice":"low","confidence":0.9,
                    "probabilities":{"low":0.9,"high":0.1}},
            "ready":{"type":"noul","noul":0.8}
        }
    });
    let mut host = Host::scripted(json!({"probe":answers}));
    let mut store = Store::default();
    let receipt = runtime::run(
        manifest,
        json!({"in":{"diff":"+ fix"}}),
        &mut store,
        &mut host,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(receipt["outcome"], "complete");
    let out = &receipt["cells"]["probe"]["outputs"]["out"];
    assert_eq!(out["answers"]["risk"]["choice"], "low");
    let effects = receipt["effects"].as_array().unwrap();
    assert_eq!(effects.len(), 1);
    assert_eq!(effects[0]["executor"], "scripted");
    // the request digest covers the declared question map — a manifest
    // asking different questions is a different effect
    let request = json!({
        "contract":"algal.effect.v1","cellId":"probe","kind":"decide",
        "prompt":"triage this diff",
        "context":{"inputs":{"diff":"+ fix"},"turn":0},
        "output":answer_schema(&json!({
            "risk":{"type":"choice","instructions":"risk?",
                     "criteria":{"low":null,"high":null}},
            "ready":{"type":"noul","instructions":"ready?"}
        })),
        "budget":{"maxContextBytes":65536,"maxOutputBytes":65536},
        "questions":{
            "risk":{"type":"choice","instructions":"risk?",
                     "criteria":{"low":null,"high":null}},
            "ready":{"type":"noul","instructions":"ready?"}
        }
    });
    assert_eq!(effects[0]["requestDigest"], digest(&request).unwrap());
}

#[test]
fn executor_id_and_cache_identity_never_carry_credentials() {
    assert_eq!(decisions::executor_id(decisions::DEFAULT_MODEL), "jev");
    assert_eq!(decisions::executor_id("jev-pro-1"), "jev:jev-pro-1");
    let identity = decisions::cache_identity("jev-latest").unwrap();
    assert!(identity.starts_with("sha256:"));
    assert!(!identity.contains("TYPESAFE"));
}
