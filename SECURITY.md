# Security

ALGAL's boundary is the executor seam: effect requests go out, bounded
bytes come back, and outputs bind to declared contracts before they can feed
the graph. If you find a way for model output, a manifest, or a receipt to
cross a boundary it should not — authority, execution, unbounded resource use,
store tampering — please report it.

## Reporting

Open a private security advisory on the GitHub repository
(`hraness/algal`, Security → Advisories). That is the only reporting channel.
Please include a manifest or receipt that demonstrates the issue where possible.

Do not open a public issue for an unpatched vulnerability.

## Trusted input

Executor and tool configuration files are trusted input. `--executors`,
`--tools` (`cmd:` entries), `--executor-cmd`, and native `algal.host.v1`
records name shell commands that the CLI spawns through `sh -c` with the
invoking user's authority. Treat them like scripts: review them before use and
never load one from an untrusted source. Manifests, receipts, and model output
are untrusted and are bounded and checked at the executor seam.
