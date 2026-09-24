# Finite dynamic spawn verification

This suite compares seventeen fixed dynamic-spawn fixtures with an independent small-step oracle, then replays every new receipt in both runtimes. Two equal-digest occurrence mutations must be rejected by both real replayers. The exact matrix has 34 comparisons, 68 baseline replay checks, 4 negative replay checks and 88 supervised commands.

Run through the repository verification runner using the explicit `ALGAL_SPAWN_NATIVE_BIN`, `ALGAL_SPAWN_BUILD_MANIFEST` and `ALGAL_SPAWN_BUILD_MANIFEST_SHA256` selections. The imported producer returns evidence without writing progress or summaries to stdout, so the repository runner owns its JSON frame. The standalone CLI writes one final summary after admission. There is no artifact discovery or automatic build. The integration owner must establish the selected native build manifest's source/build correspondence.

The source definition includes this complete directory plus the repository verifier's governed inputs and runtime identity. After execution, `readmitArchive` reconstructs each fixture, oracle result, exact argv, raw immutable inputs, replay report and CAS object. The caller supplies the binding and recorded archive path selected before execution. Archived commands are never executed. This reader establishes internal consistency under that caller authority; fabricated but consistent records are not independent proof that an execution happened.

`archive-fixture.ts` creates synthetic archives solely to test rejection controls. It does not execute targets and cannot qualify a runtime. These tests never count as the 88 executed commands. Historical scratch archives use their frozen historical definition and reader; they cannot be relabeled as current-source evidence.

Read [SCOPE.md](SCOPE.md) for the supported domain and [PROGRESS.md](PROGRESS.md) for the finite transition argument. This suite leaves Phase 07 in progress and makes no universal refinement or whole-system correctness claim.
