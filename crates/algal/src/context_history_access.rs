use crate::{
    Error, Result,
    canonical::{check_digest, digest},
    context_history_contract::{
        MAX_GRANT_BYTES, MAX_REF_BYTES, MAX_TREE_NODES, context_history_digest,
        parse_context_history_access, parse_context_history_grant, parse_context_history_node,
        parse_context_history_ref, parse_context_history_view, validate_context_history_access,
        validate_context_history_delegation, validate_context_history_view,
    },
    contract::{keys, list},
};
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub fn context_history_selection(
    grant_input: &Value,
    access_input: &Value,
    request: &str,
) -> Result<String> {
    check_digest(request)?;
    let grant = parse_context_history_grant(grant_input)?;
    let access = parse_context_history_access(access_input)?;
    digest(&json!({
        "schema":"algal.context-history-selection.v1",
        "grant":context_history_digest(&grant)?,
        "access":context_history_digest(&access)?,
        "request":request,
    }))
}

pub fn validate_context_history_view_access(
    history: &Value,
    generation: &Value,
    view_input: &Value,
    nodes_input: &Value,
    summaries: &Value,
    authority: &Value,
    cursor: Option<&Value>,
) -> Result<()> {
    keys(authority, &["reference", "grant", "access", "request"])?;
    let reference = parse_context_history_ref(&authority["reference"])?;
    let grant = parse_context_history_grant(&authority["grant"])?;
    let access = parse_context_history_access(&authority["access"])?;
    let request = authority["request"]
        .as_str()
        .ok_or_else(|| Error::invalid("retained history request is required"))?;
    check_digest(request)?;
    if crate::canonical::canonical(authority)?.len() > MAX_GRANT_BYTES * 2 + MAX_REF_BYTES + 256 {
        return Err(Error::limit("history view authorization byte bound"));
    }
    let view = parse_context_history_view(view_input)?;
    let mut requested = grant.clone();
    requested["limits"] = view["limits"].clone();
    validate_context_history_delegation(&grant, &requested)?;
    if view["binding"]["selection"] != context_history_selection(&grant, &access, request)? {
        return Err(Error::new(
            "CAPABILITY_DENIED",
            "history view does not match current source selection and retained request",
        ));
    }
    let nodes = list(nodes_input, MAX_TREE_NODES)?;
    let pool = nodes
        .iter()
        .map(|value| {
            let node = parse_context_history_node(value)?;
            Ok((context_history_digest(&serde_json::to_value(&node)?)?, node))
        })
        .collect::<Result<BTreeMap<_, _>>>()?;
    let items = list(
        &view["items"],
        crate::context_history_contract::MAX_VIEW_ITEMS,
    )?;
    let reference = serde_json::to_value(reference)?;
    if items.is_empty() {
        validate_context_history_access(history, &reference, &grant, &access, None)?;
    }
    for item in items {
        let node = pool
            .get(item["node"].as_str().unwrap_or_default())
            .ok_or_else(|| Error::invalid("history view source node is unavailable"))?;
        validate_context_history_access(
            history,
            &reference,
            &grant,
            &access,
            Some(&serde_json::to_value(node)?),
        )?;
    }
    validate_context_history_view(history, generation, &view, nodes_input, summaries, cursor)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context_history_contract::context_history_ref;

    fn fixture() -> Value {
        serde_json::from_str(include_str!(
            "../../../scripts/fixtures/context-history.json"
        ))
        .unwrap()
    }

    fn validate(view: &Value, authority: &Value) -> Result<()> {
        let records = fixture()["records"].clone();
        let nodes = json!([
            records["leaf0"],
            records["leaf1"],
            records["leaf2"],
            records["leaf3"],
            records["left"],
            records["right"],
            records["root"]
        ]);
        let summaries = json!([
            records["summaryLeft"],
            records["summaryRight"],
            records["summaryRoot"]
        ]);
        validate_context_history_view_access(
            &records["history"],
            &records["generation"],
            view,
            &nodes,
            &summaries,
            authority,
            None,
        )
    }

    fn page(mut view: Value, grant: &Value, access: &Value, request: &str) -> Value {
        view["binding"]["selection"] =
            json!(context_history_selection(grant, access, request).unwrap());
        if !view["cursor"].is_null() {
            view["cursor"]["binding"] = view["binding"].clone();
        }
        view
    }

    fn authority(grant: &Value, access: &Value, request: &str) -> Value {
        json!({"reference":context_history_ref(grant).unwrap(),"grant":grant,"access":access,"request":request})
    }

    #[test]
    fn current_access_is_required_for_cached_bodies_and_metadata() {
        let records = fixture()["records"].clone();
        let request = digest(&json!({"op":"overview","keepRecent":1})).unwrap();
        let view = page(
            records["view"].clone(),
            &records["grant"],
            &records["access"],
            &request,
        );
        validate(
            &view,
            &authority(&records["grant"], &records["access"], &request),
        )
        .unwrap();
        let mut access = records["access"].clone();
        for state in ["revoked", "unavailable"] {
            access["state"] = json!(state);
            assert!(validate(&view, &authority(&records["grant"], &access, &request)).is_err());
            assert_eq!(
                validate(
                    &page(
                        records["view"].clone(),
                        &records["grant"],
                        &access,
                        &request
                    ),
                    &authority(&records["grant"], &access, &request)
                )
                .unwrap_err()
                .code,
                "CAPABILITY_DENIED"
            );
        }
        access["state"] = json!("active");
        access["indices"] = json!([0, 1]);
        validate(
            &page(
                records["view"].clone(),
                &records["grant"],
                &access,
                &request,
            ),
            &authority(&records["grant"], &access, &request),
        )
        .unwrap();
        access["indices"] = json!([0]);
        assert_eq!(
            validate(
                &page(
                    records["view"].clone(),
                    &records["grant"],
                    &access,
                    &request
                ),
                &authority(&records["grant"], &access, &request)
            )
            .unwrap_err()
            .code,
            "CAPABILITY_DENIED"
        );
        for kind in ["pending", "unavailable"] {
            let mut metadata = records["tail"].clone();
            metadata["start"] = json!(0);
            metadata["items"] = json!([{"kind":kind,"node":context_history_digest(&records["root"]).unwrap(),"start":0,"end":4,"reason":if kind == "pending" {"missing-summary"} else {"source-unavailable"}}]);
            metadata["status"] = json!(if kind == "pending" {
                "incomplete"
            } else {
                "unavailable"
            });
            metadata["reason"] = metadata["items"][0]["reason"].clone();
            metadata["usage"] = json!({"readBytes":0,"scanBytes":0,"nodeVisits":1,"work":1});
            assert_eq!(
                validate(
                    &page(metadata, &records["grant"], &access, &request),
                    &authority(&records["grant"], &access, &request)
                )
                .unwrap_err()
                .code,
                "CAPABILITY_DENIED"
            );
        }
    }

    #[test]
    fn current_access_and_request_change_the_selection_identity() {
        let fixture = fixture();
        let records = &fixture["records"];
        let request = digest(&json!({"op":"overview","keepRecent":1})).unwrap();
        let original =
            context_history_selection(&records["grant"], &records["access"], &request).unwrap();
        assert_eq!(request, fixture["selection"]["request"].as_str().unwrap());
        assert_eq!(original, fixture["selection"]["digest"].as_str().unwrap());
        let view = page(
            records["view"].clone(),
            &records["grant"],
            &records["access"],
            &request,
        );
        let mut access = records["access"].clone();
        access["revision"] = json!(1);
        assert_ne!(
            original,
            context_history_selection(&records["grant"], &access, &request).unwrap()
        );
        assert!(validate(&view, &authority(&records["grant"], &access, &request)).is_err());
        let changed = digest(&json!({"op":"search","query":"hidden"})).unwrap();
        assert_ne!(
            original,
            context_history_selection(&records["grant"], &records["access"], &changed).unwrap()
        );
        assert!(
            validate(
                &view,
                &authority(&records["grant"], &records["access"], &changed)
            )
            .is_err()
        );
    }

    #[test]
    fn every_view_limit_must_fit_the_current_grant() {
        let fixture = fixture();
        let records = &fixture["records"];
        let request = fixture["selection"]["request"].as_str().unwrap();
        for (name, _) in crate::context_history_contract::CONTEXT_HISTORY_READ_CEILINGS {
            let mut grant = records["grant"].clone();
            grant["limits"][name] = json!(grant["limits"][name].as_u64().unwrap() - 1);
            assert_eq!(
                validate(
                    &page(records["view"].clone(), &grant, &records["access"], request),
                    &authority(&grant, &records["access"], request)
                )
                .unwrap_err()
                .code,
                "CAPABILITY_DENIED"
            );
        }
    }

    #[test]
    fn unknown_authorization_fields_and_wrong_references_fail() {
        let fixture = fixture();
        let records = &fixture["records"];
        let request = fixture["selection"]["request"].as_str().unwrap();
        let view = page(
            records["view"].clone(),
            &records["grant"],
            &records["access"],
            request,
        );
        let mut invalid = authority(&records["grant"], &records["access"], request);
        invalid["extra"] = json!(true);
        assert!(validate(&view, &invalid).is_err());
        invalid.as_object_mut().unwrap().remove("extra");
        invalid["reference"]["history"] = json!(request);
        assert_eq!(
            validate(&view, &invalid).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
    }
}
