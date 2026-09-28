# Architecture

Everything.Free Tools is a statically exported Next.js application. There is no server runtime: every page is built ahead of time, and every tool runs in the visitor's browser.

```
src/
  app/                 Routes (all static): home, /tools, /tools/[tool], /categories/[category], about, privacy, accessibility
  tools/
    registry/          The tool model: types, 15 categories, definitions, validation
    <slug>/workspace.tsx  Each tool's interactive UI
    workspaces.tsx     slug → lazily loaded workspace
    use-task.ts        Cancellable task state for workspaces
  engines/             Pure processing code, no React: data/json, data/base64, text/count, crypto/uuid, image/compress, qr/*
  workers/             Worker protocol, page-side runner, and one entry file per worker
  components/          ui/ (buttons, fields, states, actions), tool/ (page shell, privacy notice, cards, search, dropzone), layout/
  lib/                 privacy wording, search, capabilities, errors, files, downloads, seo
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

## Bundles

Each workspace is loaded with `next/dynamic` from [`workspaces.tsx`](../src/tools/workspaces.tsx), so a tool page downloads only its own UI. Engines imported only by a worker or a lazy fallback are not downloaded until the tool runs. `npm run check:bundle` enforces this: it fails if a page loads another tool's engine up front, and reports each page's JavaScript size against a budget.

Measured on the current build (gzipped, excluding legacy `noModule` polyfills): about 137 kB on content pages, which is the Next.js and React runtime, and 146–152 kB on tool pages. The QR page includes `uqr`; no other page loads a tool engine up front.

## Static export and security headers

`npm run build:static` runs `next build` with `output: "export"` (which fails if any route needs a server), then [`scripts/csp.mjs`](../scripts/csp.mjs) writes a Content Security Policy meta tag into every page, because GitHub Pages can't send headers. Scripts are allowed by SHA-256 hash only; `connect-src 'self'` stops the page contacting any other host; `worker-src 'self'`, `frame-src 'none'`, `object-src 'none'`. Headers that only work as HTTP headers (`frame-ancestors`, `X-Frame-Options`) are not available on GitHub Pages.

## Accessibility

Native controls with visible labels (`Field` wires `label`, `aria-describedby` and `aria-invalid`); segmented choices are radio groups; file inputs always have a button; results and errors use `role="status"`/`role="alert"`; one focus style for everything; a skip link; reduced motion respected; zoom never disabled. The browser test runs axe-core (WCAG 2.1 A/AA, serious and critical) on every page and on tool results, and checks for horizontal overflow at 390 and 320 px. Automated checks are not a conformance claim; manual testing with assistive technology hasn't been done yet.

## Dependencies

Runtime: `next` 16.3.6 (MIT), `react` / `react-dom` 19.2.8 (MIT), `uqr` 0.1.3 (MIT, no dependencies; QR encoding). Development only: TypeScript, ESLint 9 with `eslint-config-next`, Prettier, Tailwind CSS 4, and `axe-core` 4.13.0 (MPL-2.0) for the browser test. All versions are pinned exactly.

ESLint 9 is used although npm flags it as deprecated, because `eslint-config-next`'s plugins don't yet declare support for ESLint 10.
