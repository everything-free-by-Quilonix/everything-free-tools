# Security Policy

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through a [GitHub Security Advisory](https://github.com/everything-free-by-Quilonix/everything-free-tools/security/advisories/new).

Include what the issue is and what an attacker could achieve, steps to reproduce, and the affected commit or URL. You can expect an acknowledgement within a few days, and credit when the fix ships unless you'd rather stay anonymous.

## Security model

### Local-first, static

The site is a static export: HTML, CSS, JavaScript and fonts served by GitHub Pages. There is no server code, API, database, account system, analytics or third-party script. All six current tools are LOCAL: they process input with code running in the visitor's tab, and nothing they are given is transmitted or stored. [docs/privacy-model.md](docs/privacy-model.md) lists the layers that keep this true.

### File processing

- Files are read only through the `File` the visitor picks or drops. Nothing is uploaded, and the original is never modified; results are new `Blob`s.
- Files are accepted by MIME type, with the extension as a fallback, but the type is not trusted: images are decoded by the browser's own decoder (`createImageBitmap`), and a file that doesn't decode is reported as unreadable. SVG and GIF are not accepted by the image compressor.
- Heavy work (JSON, images) runs in a same-origin dedicated worker, one per task, terminated when it finishes or is cancelled. Messages carry only the task input and a result or a serialised error (name, message, detail), which the page renders as text.
- Results are offered through `<a download>` links to `blob:` URLs, revoked when the result is removed. Download names are built by `safeFileName`, which removes path separators, reserved and control characters, bidirectional overrides and invisible characters (which can disguise an extension), leading dots and trailing dots or spaces, and caps the length while keeping the extension.
- Decoded Base64 is shown as text only if it is valid UTF-8 without control characters; anything else is a download. A download's type is sniffed only for image, PDF and archive signatures, never HTML or SVG, so a decoded file opened from its `blob:` URL can't run script.

### XSS protections

- React renders all user input as text. Nothing in the app uses `innerHTML`, `document.write`, `eval` or `new Function`; lint forbids `eval`, implied eval, `new Function` and `dangerouslySetInnerHTML`, and `npm run check:privacy` forbids them again at source level.
- The one raw-HTML write is structured data (JSON-LD), built from the registry at build time, not from input, and serialised with `<` escaped.
- The QR SVG is built from numbers and `#rrggbb` colours only. The encoded content never appears in the markup (it becomes the pattern of squares), and colours are validated before use. Unit and browser tests encode hostile text (`<script>`, `<svg onload>`, `<img onerror>`, quotes, entities, Unicode) and require the output to match a strict pattern of one `rect` and one `path`.

### Content Security Policy

GitHub Pages can't send custom HTTP headers, so the policy is a `<meta http-equiv="Content-Security-Policy">` written into every page at build time ([scripts/csp.mjs](scripts/csp.mjs)):

```
default-src 'self'; script-src 'self' 'sha256-…'; worker-src 'self'; style-src 'self';
style-src-attr 'none'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self';
connect-src 'self'; manifest-src 'self'; frame-src 'none'; object-src 'none';
base-uri 'self'; form-action 'self'
```

- Scripts run only from the site's own origin or as the exact inline scripts present at build time, allowed by SHA-256 hash. There is no `'unsafe-inline'` or `'unsafe-eval'` anywhere in the policy.
- `connect-src 'self'` makes the browser refuse any request from the page to another host, and `worker-src 'self'` allows only the build's own workers (not `blob:` workers).
- The build fails if any page's policy loses one of these properties (`policyProblems`, with unit tests that try loosened versions), or if a page contains an inline event handler or `javascript:` URL.
- The cross-browser test attacks the policy in Chromium, Firefox and WebKit: an injected inline script, a string timer, a fetch to another origin, an external script, a `blob:` worker, an inline event handler, an inline style and `<style>` element, and an iframe must all be refused. They are.

### Limitation: GitHub Pages and HTTP headers

A policy delivered in a `<meta>` tag can't use `frame-ancestors`, `report-uri`/`report-to` or `sandbox`, and GitHub Pages can't add `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy` headers from the repository. Consequences:

- **Framing** (clickjacking) is not prevented; the pages hold no account or state worth hijacking, but a hostile site could embed a tool.
- **Violations aren't reported** anywhere; they are only enforced.
- The referrer policy is set with a `<meta name="referrer">` tag instead of a header.

Moving to a host that sets headers (for example Cloudflare Pages with a `_headers` file) would close these gaps without code changes. HTTPS itself is enforced by GitHub Pages.

### Dependencies

Runtime code is Next.js, React and `uqr` (QR encoding, MIT, no dependencies, loaded only on the QR page). Versions are pinned exactly and `npm audit` reports no known vulnerabilities at the time of writing. Development-only tools (TypeScript, ESLint, Prettier, Tailwind, axe-core, Playwright) never reach the browser. See [docs/architecture.md](docs/architecture.md#dependencies).

## Scope

Reports are particularly welcome on:

- **A privacy label that isn't true.** A LOCAL tool that transmits or stores user data is a security bug, and the most important kind here.
- **Script injection** through tool input or output: QR SVG, decoded Base64, file names, JSON display, error messages.
- **Bypassing the Content Security Policy**: running script the policy should block, or reaching another origin.
- **Unsafe file handling**, such as a crafted image that escapes the worker or makes one file's data appear in another's result.
- **Weak randomness** in the UUID generator.
- **Vulnerabilities in dependencies** (`next`, `react`, `uqr`) or in the GitHub Actions workflows.

### Out of scope

- The header limitations above, which are documented.
- A tab running out of memory on a very large file (a documented limitation), though a crash from a small crafted file is in scope.
- Automated scanner output without a described impact.

## Supported versions

Pre-1.0. Fixes are applied to `main`.
