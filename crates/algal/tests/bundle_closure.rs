use algal::{
    canonical::{MAX_DOCUMENT_BYTES, canonical, digest},
    contract::Manifest,
    store::{Store, pack, unpack},
};
use serde_json::{Value, json};

fn manifest(name: &str, cells: Vec<Value>) -> Manifest {
    Manifest::parse(&json!({"contract":"algal.organism.v1","key":format!("organism:{name}"),"name":name,"cells":cells})).unwrap()
}

fn bundle_for(root: &Manifest, values: Value) -> Value {
    json!({"contract":"algal.bundle.v1","root":root.digest().unwrap(),"manifests":{root.digest().unwrap():root.value},"values":values})
}

fn payload_fixture(value: &Value) -> (Store, Manifest, Value) {
    let mut source = Store::default();
    let reference = source.put("values", value).unwrap();
    let root = manifest(
        "payload",
        vec![
            json!({"id":"ref","kind":"const","outputs":{"value":{"type":"ref","value":reference}}}),
        ],
    );
    let bundle = bundle_for(&root, json!({reference:value}));
    (source, root, bundle)
}

fn nodes(value: &Value) -> usize {
    1 + match value {
        Value::Array(values) => values.iter().map(nodes).sum(),
        Value::Object(values) => values.values().map(nodes).sum(),
        _ => 0,
    }
}

fn refused_without_writes(bundle: &Value) {
    let mut destination = Store::default();
    assert_eq!(
        unpack(bundle, &mut destination).unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
    assert!(
        destination
            .get("manifests", bundle["root"].as_str().unwrap())
            .unwrap()
            .is_none()
    );
}

#[test]
fn distinct_values_511_512_513_and_duplicate_references() {
    for count in [511, 512, 513] {
        let mut source = Store::default();
        let mut children = Vec::new();
        for start in (0..count).step_by(64) {
            let mut cells = Vec::new();
            for index in start..(start + 64).min(count) {
                let reference = source.put("values", &json!(index)).unwrap();
                cells.push(json!({"id":format!("v{index}"),"kind":"const","outputs":{"value":{"type":"ref","value":reference}}}));
            }
            let child = manifest(&format!("values-{start}"), cells);
            let reference = source.admit(&child).unwrap();
            children
                .push(json!({"id":format!("child{start}"),"kind":"organism","manifest":reference}));
        }
        children.push(json!({"id":"duplicate","kind":"const","outputs":{"value":{"type":"ref","value":digest(&json!(0)).unwrap()}}}));
        let root = manifest("values", children);
        if count > 512 {
            assert_eq!(pack(&root, &source).unwrap_err().code, "BUDGET_EXHAUSTED");
        } else {
            let bundle = pack(&root, &source).unwrap();
            assert_eq!(bundle["values"].as_object().unwrap().len(), count);
            assert_eq!(
                unpack(&bundle, &mut Store::default())
                    .unwrap()
                    .digest()
                    .unwrap(),
                root.digest().unwrap()
            );
        }
    }
    let mut source = Store::default();
    let reference = source.put("values", &json!({"stable":true})).unwrap();
    let child = manifest("shared", (0..64).map(|index| json!({"id":format!("v{index}"),"kind":"const","outputs":{"value":{"type":"ref","value":reference}}})).collect());
    let child_ref = source.admit(&child).unwrap();
    let root = manifest("duplicate", (0..64).map(|index| json!({"id":format!("child{index}"),"kind":"organism","manifest":child_ref})).collect());
    let bundle = pack(&root, &source).unwrap();
    assert_eq!(bundle["values"].as_object().unwrap().len(), 1);
    assert_eq!(bundle["manifests"].as_object().unwrap().len(), 2);
    unpack(&bundle, &mut Store::default()).unwrap();
}

#[test]
fn manifest_count_511_512_513() {
    fn tree(size: usize, identity: &mut usize, source: &mut Store) -> Manifest {
        let name = format!("tree-{identity}");
        *identity += 1;
        let children = 64.min(size - 1);
        let mut remaining = size - 1;
        let mut cells = Vec::new();
        for index in 0..children {
            let child_size = remaining.div_ceil(children - index);
            remaining -= child_size;
            let child = tree(child_size, identity, source);
            let reference = source.admit(&child).unwrap();
            cells
                .push(json!({"id":format!("child{index}"),"kind":"organism","manifest":reference}));
        }
        manifest(&name, cells)
    }
    for count in [511, 512, 513] {
        let mut source = Store::default();
        let root = tree(count, &mut 0, &mut source);
        if count > 512 {
            assert_eq!(pack(&root, &source).unwrap_err().code, "BUDGET_EXHAUSTED");
        } else {
            let bundle = pack(&root, &source).unwrap();
            assert_eq!(bundle["manifests"].as_object().unwrap().len(), count);
            unpack(&bundle, &mut Store::default()).unwrap();
        }
    }
}

#[test]
fn wrapper_depth_61_62_63_64() {
    for depth in [61, 62, 63, 64] {
        let mut value = Value::Null;
        for _ in 0..depth {
            value = json!([value]);
        }
        let (source, root, bundle) = payload_fixture(&value);
        if depth <= 62 {
            assert_eq!(pack(&root, &source).unwrap(), bundle);
            unpack(&bundle, &mut Store::default()).unwrap();
        } else {
            assert_eq!(pack(&root, &source).unwrap_err().code, "BUDGET_EXHAUSTED");
            refused_without_writes(&bundle);
        }
    }
}

#[test]
fn whole_envelope_node_triple() {
    let (_, _, empty) = payload_fixture(&json!([]));
    for total in [999_999, 1_000_000, 1_000_001] {
        let value = Value::Array(vec![Value::Null; total - nodes(&empty)]);
        let (source, root, bundle) = payload_fixture(&value);
        assert_eq!(nodes(&bundle), total);
        if total <= 1_000_000 {
            assert_eq!(pack(&root, &source).unwrap()["root"], bundle["root"]);
            unpack(&bundle, &mut Store::default()).unwrap();
        } else {
            assert_eq!(pack(&root, &source).unwrap_err().code, "BUDGET_EXHAUSTED");
            refused_without_writes(&bundle);
        }
    }
}

#[test]
fn whole_canonical_byte_triple_with_unicode_and_escapes() {
    let key = "é😀\"\\\n\u{1}";
    let prefix = "é😀\"\\\u{8}\t\n\u{c}\r\u{1}";
    let (_, _, empty) = payload_fixture(&json!({key:[prefix,""]}));
    let overhead = canonical(&empty).unwrap().len();
    for total in [
        MAX_DOCUMENT_BYTES - 1,
        MAX_DOCUMENT_BYTES,
        MAX_DOCUMENT_BYTES + 1,
    ] {
        let value = json!({key:[prefix,"x".repeat(total - overhead)]});
        let (source, root, bundle) = payload_fixture(&value);
        if total <= MAX_DOCUMENT_BYTES {
            assert_eq!(pack(&root, &source).unwrap()["root"], bundle["root"]);
            unpack(&bundle, &mut Store::default()).unwrap();
        } else {
            assert_eq!(pack(&root, &source).unwrap_err().code, "BUDGET_EXHAUSTED");
            refused_without_writes(&bundle);
        }
    }
}

#[test]
fn normalized_manifest_expansion_precedes_destination_writes() {
    let raw = json!({"contract":"algal.organism.v1","key":"organism:compact","name":"compact","cells":[]});
    let root = Manifest::parse(&raw).unwrap().digest().unwrap();
    for node_bound in [true, false] {
        let empty = if node_bound { json!([]) } else { json!("") };
        let base = json!({"contract":"algal.bundle.v1","root":root,"manifests":{&root:&raw},"values":{digest(&empty).unwrap():empty}});
        let value = if node_bound {
            Value::Array(vec![Value::Null; 1_000_000 - nodes(&base)])
        } else {
            json!("x".repeat(MAX_DOCUMENT_BYTES - canonical(&base).unwrap().len()))
        };
        let bundle = json!({"contract":"algal.bundle.v1","root":root,"manifests":{&root:&raw},"values":{digest(&value).unwrap():value}});
        assert!(canonical(&bundle).is_ok());
        refused_without_writes(&bundle);
    }
}

#[test]
fn partial_import_preserves_missing_static_dependencies() {
    let child = manifest("absent", vec![]);
    let child_ref = child.digest().unwrap();
    let value_ref = digest(&json!("absent")).unwrap();
    let root = manifest(
        "partial",
        vec![
            json!({"id":"child","kind":"organism","manifest":child_ref}),
            json!({"id":"ref","kind":"const","outputs":{"value":{"type":"ref","value":value_ref}}}),
        ],
    );
    let bundle = bundle_for(&root, json!({}));
    let mut destination = Store::default();
    unpack(&bundle, &mut destination).unwrap();
    assert!(destination.get("manifests", &child_ref).unwrap().is_none());
    assert!(destination.get("values", &value_ref).unwrap().is_none());
    assert_eq!(pack(&root, &destination).unwrap_err().code, "STORE_MISS");
    destination.admit(&child).unwrap();
    destination.put("values", &json!("absent")).unwrap();
    unpack(&bundle, &mut destination).unwrap();
    let complete = pack(&root, &destination).unwrap();
    assert_eq!(complete["manifests"].as_object().unwrap().len(), 2);
    assert_eq!(complete["values"].as_object().unwrap().len(), 1);
    unpack(&complete, &mut Store::default()).unwrap();
}
