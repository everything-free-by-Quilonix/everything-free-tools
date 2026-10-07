# Architecture

Everything.Free Tools is a statically exported Next.js application. There is no server runtime: every page is built ahead of time, and every tool runs in the visitor's browser.

```
src/
  app/                 Routes (all static): home, /tools, /tools/[tool], /categories, /categories/[category], about, privacy, accessibility
  tools/
    registry/          The tool model: types, 15 categories, definitions, validation
    <slug>/workspace.tsx  Each tool's interactive UI
    workspaces.tsx     slug → lazily loaded workspace
    use-task.ts        Cancellable task state for workspaces
  engines/             Pure processing code, no React: data/json, data/base64, text/count, crypto/uuid, image/compress, qr/*
  workers/             Worker protocol, page-side runner, and one entry file per worker
  components/          ui/ (buttons, fields, states, actions, breadcrumbs, kbd), tool/ (page shell, privacy notice, cards, directory, dropzone),
                       search/ (home finder, command palette), layout/ (header, footer, theme)
  config/              site, deployment, navigation, discovery (the only curated lists)
  lib/                 privacy and processing wording, search, tool summaries, capabilities, errors, files, downloads, seo
scripts/               build-static, CSP, privacy check, bundle check, browser smoke test
tests/                 Unit tests (*.test.mts)
```

## The registry

A tool is a `ToolDefinition` ([types](../src/tools/registry/types.ts)): name, slug, category, processing mode (`LOCAL` or `NETWORK`), privacy fields, inputs, outputs, required and optional browser capabilities, limitations, how it works, search tasks and keywords, related tools, licence and third-party dependencies.

`findRegistryProblems` runs when the registry is imported, so an inconsistent definition fails the build: a LOCAL tool that says data leaves the device, a NETWORK tool that doesn't name where data goes, an unknown related tool, a missing limitation. Everything else reads the registry:

- the tool page shell (breadcrumb, title, explanation, privacy indicator, workspace, limitations, how it works, related tools);
- the privacy indicator, whose wording comes only from `privacyStatement()`;
- search, category pages (only populated categories get one), the sitemap and structured data.

## Search

[`lib/search.ts`](../src/lib/search.ts) is deterministic: the query is normalised, stopwords removed, and each word mapped through a small explicit synonym table ("pretty" → "format", "pic" → "image", "wi-fi" → "wifi"). A tool matches only if every word appears in its name, tasks, keywords, slug, category or description; matches are ranked by where the words were found. A query no tool can satisfy returns nothing, and the page says there isn't a tool for that yet rather than showing something unrelated.

## Processing

Engines are plain TypeScript functions with no React or DOM assumptions beyond what they need, so they are unit tested in Node and run unchanged in a worker or on the page.

Heavier work runs in a Web Worker ([protocol](../src/workers/protocol.ts)):

- one worker per task, terminated when it finishes; cancelling is `terminate()`;
- messages: `run` → zero or more `progress` → `result` or `error` (errors keep a user message and technical detail separately);
- `runTask()` falls back to running the same engine on the page if workers are unavailable or the worker fails to load;
- workers are created with a literal `new Worker(new URL("…", import.meta.url), { type: "module" })` so the bundler emits each as its own chunk.

Today the JSON formatter and image compressor use workers. The text counter, UUID, Base64 and QR tools are fast enough to run on the page.

The image worker needs `OffscreenCanvas` to draw off the page. Without it (Safari before 16.4, and Playwright's WebKit build on Windows), the same engine runs on the page. It yields between images and between transparency-scan strips, but drawing and encoding one very large image is a single browser task: a 24-megapixel PNG paused the page for about 2.4 s in that WebKit build, against under 70 ms with a worker in Chromium and Firefox. A cancel is handled when that task ends; the image in progress may still finish, and nothing after it runs.

Memory: a decoded image costs 4 bytes per pixel. The engine holds one decoded bitmap and one canvas, releases the bitmap as soon as it is drawn, checks transparency in strips of about 1 megapixel instead of copying the whole image again, and shrinks the canvas to zero once the output exists. Result and thumbnail object URLs are revoked when a result is removed (the cross-browser test counts live URLs).

## Bundles

Each workspace is loaded with `next/dynamic` from [`workspaces.tsx`](../src/tools/workspaces.tsx), so a tool page downloads only its own UI. Engines imported only by a worker or a lazy fallback are not downloaded until the tool runs. `npm run check:bundle` enforces this: it fails if a page loads another tool's engine up front, and reports each page's JavaScript size against a budget.

Measured on the current build (gzipped, excluding legacy `noModule` polyfills): about 137 kB on content pages, which is the Next.js and React runtime, and 146–152 kB on tool pages. The QR page includes `uqr`; no other page loads a tool engine up front. The JSON page ships no JSON engine at all until Format is pressed (it arrives in the worker), and the image page ships neither the image engine nor `uqr`.

Result text is capped at 100,000 characters on screen ([`OutputText`](../src/components/ui/output-text.tsx)); Copy and Download use the full text. Laying out a 4.8-million-character result took 3.3 s in Chromium, against 0.25 s to produce it.

## Static export and security headers

`npm run build:static` runs `next build` with `output: "export"` (which fails if any route needs a server), then [`scripts/csp.mjs`](../scripts/csp.mjs) writes a Content Security Policy meta tag into every page, because GitHub Pages can't send headers. Scripts are allowed by SHA-256 hash only; styles only from stylesheets; `connect-src 'self'` stops the page contacting any other host; `worker-src 'self'`, `frame-src 'none'`, `object-src 'none'`. There is no `'unsafe-inline'` or `'unsafe-eval'`, and the build fails if a page's policy is ever loosened. `upgrade-insecure-requests` is deliberately absent: every source is `'self'`, `data:` or `blob:`, so it could never upgrade anything on the HTTPS site, and WebKit applies it to `http://localhost`, which made local testing impossible. Header-only protections (`frame-ancestors`, `X-Frame-Options`) aren't available on GitHub Pages; see [SECURITY.md](../SECURITY.md#limitation-github-pages-and-http-headers).

There are no API routes, route handlers other than the statically generated `sitemap.xml` and `robots.txt`, server actions, middleware, runtime environment variables or database. `NEXT_PUBLIC_SITE_URL` is optional and read at build time. The build fetches the Inter and Manrope fonts once (through `next/font`) and serves them from the site; nothing is fetched from another origin at runtime.

## Accessibility

Native controls with visible labels (`Field` wires `label`, `aria-describedby` and `aria-invalid`); segmented choices are radio groups; file inputs always have a button; one focus style for everything; a skip link; reduced motion respected; zoom never disabled; form text is 16 px on small screens so iOS doesn't zoom on focus.

Dynamic results are announced through one persistent polite live region per tool ([`Announcer`](../src/components/ui/announcer.tsx)), because a live region inserted together with its text is announced inconsistently by screen readers. The visible result panels carry no live role of their own, so nothing is read twice. Errors use `role="alert"`. The word counter announces only after typing pauses. Buttons that remove themselves (Clear, Cancel, Remove all, remove one image) move focus back into the tool instead of dropping it on the page body. There are no dialogs.

The browser tests run axe-core (WCAG 2.1 A/AA, serious and critical) on every page and on tool results, walk the focus order of a tool page in three engines checking that every stop has a visible indicator, and check for horizontal overflow at 320 to 412 px in both orientations. Automated checks are not a conformance claim; testing with real screen readers hasn't been done yet.

## Theming

Dark is the only theme. Every component colour is a semantic token (`bg`, `surface`, `fg`, `accent`, status colours), and a `.light` token set exists, so a light theme is mostly a token swap. Not yet done: the viewport `themeColor` and `colorScheme` are fixed to dark in `app/layout.tsx`; the light tokens haven't been contrast-checked with axe; there is no switch. A remembered preference would need storage, which the privacy page rules out, so a light theme should follow `prefers-color-scheme` instead. The `--slate` token is defined but unused.

## Dependencies

| Package                     | Licence | Purpose                                         | Browser alternative?                                                                  | Where it loads                                                    |
| --------------------------- | ------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `next` 16.3.6               | MIT     | Static site generation, routing, code splitting | —                                                                                     | Every page (runtime ~137 kB gz with React)                        |
| `react`, `react-dom` 19.2.8 | MIT     | UI                                              | —                                                                                     | Every page                                                        |
| `uqr` 0.1.3                 | MIT     | QR encoding (Reed–Solomon, masking, versions)   | None: where browsers have `BarcodeDetector` it only reads codes, it can't create them | QR page only: one chunk of 10.6 kB gz, including the QR workspace |

`uqr` has no dependencies, is maintained under the UnJS organisation (0.1.3 was published on 3 April 2026) and does one thing. It was chosen over `qrcode` (several dependencies) and `qrcode-generator` (larger). Everything else a tool needs (Base64, UUIDs, text segmentation, image decoding and encoding, JSON parsing) is either a browser API or code in this repository.

Development only, never shipped: TypeScript, ESLint 9 with `eslint-config-next`, Prettier, Tailwind CSS 4, `axe-core` 4.13.0 (MPL-2.0, accessibility checks) and `playwright` 1.63.0 (Apache-2.0, cross-browser tests). All versions are pinned exactly; `npm audit` reports no known vulnerabilities.

ESLint 9 stays although npm flags it as deprecated: `eslint-plugin-react` 7.37.5, `eslint-plugin-import` 2.32.0 and `eslint-plugin-jsx-a11y` 6.10.2, all required by `eslint-config-next`, still declare ESLint 9 as their newest supported version.
