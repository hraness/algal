# Phase 00 toolchain compatibility smoke

Observed on 2026-09-23, macOS 26.5.1 (25F80), arm64, Python 3.14.6.
The working repository HEAD was 353a5cac4ea2b2ae40e00bf9c2805606265a5378.
The new fixture/runner inputs are individually hashed in the retained
[receipt](../../verify/toolchain-smoke/evidence/2026-09-23/receipt.json).

Result: all 13 required smoke classifications matched. This qualifies the
tools on these synthetic examples; it establishes no ALGAL production theorem,
runtime refinement relation, system correctness, or Linux qualification.

## Tool provenance and pins

Official GitHub release metadata was downloaded over HTTPS on 2026-09-23 after
the sandbox's DNS restriction was observed and reviewed download access was
granted. No existing Lean/Lake/Elan toolchain or JDK was found in the standard
local locations inspected. `/usr/bin/java` was only the macOS launcher stub.
Archives were verified before extraction into
`/private/tmp/algal-verification-tools`; no installer or global configuration
was used.

| Component | Stable release / observed version | Download and byte size | SHA-256 |
| --- | --- | --- | --- |
| TLC | [v1.7.4](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4), official latest stable at inspection; TLC 2.19, 08 August 2024, revision 5a47802 | [tla2tools.jar](https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar), 2,274,532 bytes | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` |
| Lean / Lake | [v4.34.0](https://github.com/leanprover/lean4/releases/tag/v4.34.0); Lean commit 293d5d0c0c3f3dded4688b3ccd6a33939ac5102b; bundled Lake 5.0.0-src+293d5d0 | [lean-4.34.0-darwin_aarch64.tar.zst](https://github.com/leanprover/lean4/releases/download/v4.34.0/lean-4.34.0-darwin_aarch64.tar.zst), 561,666,156 bytes | `69f263fa6e21bbc2466bbfb1affcd92479ee2714c883a07de548e099a5922932` |
| JDK | [Temurin 21.0.12.1+1](https://github.com/adoptium/temurin21-binaries/releases/tag/jdk-21.0.12.1%2B1), HotSpot LTS | [OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz](https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz), 200,073,404 bytes | `3623232f33a9c3baadf304480b2535f9a3cba8a58d42ecbb438ba267315d9998` |

Lean and JDK SHA-256 values matched the `digest` fields in the official release
asset API responses ([Lean](https://api.github.com/repos/leanprover/lean4/releases/tags/v4.34.0),
[Temurin](https://api.github.com/repos/adoptium/temurin21-binaries/releases/tags/jdk-21.0.12.1%2B1)).
The older TLC release has no API SHA-256 digest. Its downloaded jar matched the
publisher's release-page SHA-1
`bee4a54f3ee3d4afc347c3240ec2d9e93b075104`; its SHA-256 above was calculated
locally and is now an exact byte pin, not a publisher-signed SHA-256 attestation.
No release signature or build attestation was verified for these downloads.

The Java and Lean executables were both confirmed by `file` as Mach-O arm64.
TLC's startup text also prints an `x86_64` label after the JVM version; that
label is not evidence of the executable architecture. Lean's build target is
`arm64-apple-darwin24.6.0`.

## Provisioning and invocation

Metadata came from `https://api.github.com/repos/OWNER/REPO/releases/latest` for
`tlaplus/tlaplus`, `leanprover/lean4`, and `adoptium/temurin21-binaries`. Each
request used `/usr/bin/curl -fsSL --connect-timeout 15 --max-time 45 URL -o PATH`.
The three exact artifact URLs above used the same command with
`--max-time 300 --retry 2`. Local metadata and archives remain in the task root's
`metadata/` and `downloads/` directories. Python `hashlib.file_digest` compared
the complete downloaded files to the expected hashes before extraction.

```sh
/usr/bin/tar -xf /private/tmp/algal-verification-tools/downloads/lean-4.34.0-darwin_aarch64.tar.zst -C /private/tmp/algal-verification-tools
/usr/bin/tar -xzf /private/tmp/algal-verification-tools/downloads/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz -C /private/tmp/algal-verification-tools

python3 verify/toolchain-smoke/run.py \
  --java /private/tmp/algal-verification-tools/jdk-21.0.12.1+1/Contents/Home/bin/java \
  --tlc-jar /private/tmp/algal-verification-tools/downloads/tla2tools-v1.7.4.jar \
  --lean-bin /private/tmp/algal-verification-tools/lean-4.34.0-darwin_aarch64/bin \
  --output /private/tmp/algal-verification-tools/results/smoke-03
```

The last command exited 0. It used reviewed host access because TLC's local
fingerprint-set implementation extends Java `UnicastRemoteObject` and opens
an ephemeral listener. An initial sandboxed run exited 255 with
`java.rmi.server.ExportException: Listen failed on port: 0` and
`java.net.SocketException: Operation not permitted`. That attempt was rejected
as an environment error and contributes no model evidence. Its retained
[log](../../verify/toolchain-smoke/evidence/2026-09-23/initial-tlc-environment-refusal.log)
documents the distinction.

All final child commands and their working directories are in the receipt.
The TLC command uses `-XX:+UseParallelGC -Xmx256m`, isolated JVM home/temp,
`tlc2.TLC -workers 1 -coverage 1 -seed 1 -fp 0 -metadir ... -config ... PublicationSmoke`.
Full breadth-first exploration is the pinned tool's default; no symmetry,
constraints, overrides, simulation, or depth cutoff is used. Each process has
a 45-second deadline; the runner joins it and kills only its own process group
on timeout. The bundled Lake builds a copied project under the output root.

## Actual outcomes

| Case | Exit | Required semantic evidence |
| --- | --- | --- |
| Java / Lean / Lake versions (three checks) | 0 each | Exact selected runtime versions reported |
| TLC good | 0 | Safety and liveness completed; 1 initial state, 6 generated, 3 distinct, empty queue; Init/Prepare/Publish action coverage each `1:1` |
| TLC unsafe publication | 12 | `PreparedBeforeCommit` violated with committed true and prepared false |
| TLC blocked publication | 13 | Temporal violation: prepared true, committed false, then stuttering |
| TLC preparation witness | 12 | `NeverPrepared` violated after the Prepare action |
| TLC publication witness | 12 | `NeverCommitted` violated after the Publish action |
| Lake build | 0 | Toy library built with only bundled standard-library dependencies |
| Lean axiom audit | 0 | All three named good theorems report no transitive axioms |
| Lean wrong proof | 1 | `decide` establishes that `1 < 1` is false; not a compiler crash |
| Lean hidden custom axiom | 0 | Audit exposes `ToolchainSmoke.uncheckedFalse`; that claim is refused |
| Lean transitive placeholder | 0 | Audit exposes `sorryAx` on the exported indirect theorem; that claim is refused |

The good TLC run's calculated optimistic fingerprint-collision estimate is
`4.9E-19`. This result is finite model checking with a hash-based state set,
not an unbounded theorem. The false-invariant witness runs are evidence of
reachable actions, not passing safety claims. Raw final logs are retained next
to the receipt and are each hashed there.

An earlier Lean negative fixture failed to synthesize a `Decidable` instance
before testing its false proposition. The runner rejected that outcome. The
fixture was corrected with an explicit `change (1 : Nat) < 1`; the final log
contains the intended semantic rejection. The initial diagnostic is retained
as [setup failure](../../verify/toolchain-smoke/evidence/2026-09-23/initial-lean-negative-setup.log).

## Authoritative semantics and remaining limits

- The [official TLC options](https://tla.msr-inria.inria.fr/tlatoolbox/doc/model/tlc-options-page.html)
  distinguish full model checking from simulation and describe action profiling
  and fingerprint estimates. The installed jar's `tlc2.TLC -help` confirmed
  the actual flags used.
- The [official symmetry documentation](https://tla.msr-inria.inria.fr/tlatoolbox/doc/model/model-values.html)
  warns that symmetry is not checked automatically and must not be used for
  liveness here. These fixtures use none.
- The [Lean proof-validation documentation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)
  explains theorem meaning and transitive axiom inspection. The fixture checks
  named theorems, not merely source-text absence of `sorry`.

This smoke trusts the downloaded tools, their bundled libraries, Python,
the operating system, JVM and Lean kernel. It does not qualify malicious Lean
elaborator/plugin code or an independent proof checker. No Aeneas, Charon,
Verus, Kani, mathlib, Linux toolchain, provider, or production code was exercised.
The integrator owns `verify/toolchains.json` and any CI policy. Future required
checks must rerun their exact current inputs; the retained receipt is not a
substitute for an integration/release gate. Task-local tools remain available
for subsequent owned phases and may be removed after the integration owner
finishes using them.
