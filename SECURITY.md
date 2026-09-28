# Security Policy

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through a [GitHub Security Advisory](https://github.com/everything-free-by-Quilonix/everything-free-tools/security/advisories/new).

Include what the issue is and what an attacker could achieve, steps to reproduce, and the affected commit or URL. You can expect an acknowledgement within a few days, and credit when the fix ships unless you'd rather stay anonymous.

## Scope

The site is fully static: no server, accounts, database or stored user data. Reports are particularly welcome on:

- **A privacy label that isn't true.** A LOCAL tool that transmits or stores user data is a security bug, and the most important kind here.
- **Script injection** through tool input or output: QR SVG output, decoded Base64, file names, JSON-LD.
- **Bypassing the Content Security Policy** (`scripts/csp.mjs`): running script the policy should block, or reaching another origin despite `connect-src 'self'`.
- **Unsafe handling of files**, such as a crafted image that escapes the worker or causes data from one file to appear in another's result.
- **Weak randomness** in the UUID generator.
- **Dependency vulnerabilities** in `next`, `react` or `uqr`, and the GitHub Actions workflows.

### Out of scope

- Missing HTTP-only headers (`frame-ancestors`, `X-Frame-Options`, HSTS): GitHub Pages can't send custom headers.
- A tab running out of memory on a very large file. That is a documented limitation, though a crash from a small crafted file is in scope.
- Automated scanner output without a described impact.

## Supported versions

Pre-1.0. Fixes are applied to `main`.
