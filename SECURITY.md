# Security

ALGAL's boundary is the executor seam: effect requests go out, bounded
bytes come back, and outputs bind to declared contracts before they can feed
the graph. If you find a way for model output, a manifest, or a receipt to
cross a boundary it should not — authority, execution, unbounded resource use,
store tampering — please report it.

## Reporting

Open a private security advisory on the GitHub repository
(`hraness/algal`, Security → Advisories) or email the maintainers through
the contact listed on the organization profile. Please include a manifest or
receipt that demonstrates the issue where possible.

Do not open a public issue for an unpatched vulnerability.
