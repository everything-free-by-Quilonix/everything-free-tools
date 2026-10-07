# Adding a tool

A tool is four pieces: a registry entry, an engine, a workspace, and tests.

## 1. Registry entry

Add a `ToolDefinition` to [`src/tools/registry/definitions.ts`](../src/tools/registry/definitions.ts). The page, search, category listing, sitemap and privacy label all come from it.

- **processing / privacy.** `LOCAL` only if nothing the user provides ever leaves the browser. A `NETWORK` tool must set `privacy.network.destination` and `privacy.network.dataSent`, and the CSP's `connect-src` must be extended for that host, deliberately and in review.
- **capabilities.** `required` features gate the tool: without them the page explains what is missing instead of breaking. `optional` features are used when present.
- **limitations.** Real limits of the browser or the method, never quotas. If there are none worth stating, the tool probably isn't described precisely enough.
- **tasks and keywords.** What people type: "compress image", "pretty print json". Add a synonym to `lib/search.ts` only if a common word would otherwise miss.
- **dependencies.** Any third-party library the tool uses, with its licence. Prefer small, permissive, dependency-free packages, pinned to an exact version.

The build fails if the entry is inconsistent (see `validate.ts`).

## 2. Engine

Put processing code in `src/engines/<area>/<name>.ts`: pure functions, no React. Throw `ToolError(userMessage, technicalDetail)` for problems a person can act on; anything else becomes a generic message with the detail tucked under "Technical details".

Rules that apply to every engine:

- Never alter user data silently. If output differs from input in a way the user didn't ask for, say so in the result.
- Randomness comes from `crypto.getRandomValues`. `Math.random` fails `check:privacy`.
- No `eval`, `new Function` or HTML strings built from input (lint enforces the first two; render with React elements).
- Parsers must be real parsers (a CSV tool must handle quoted fields, not `split(",")`).
- Treat files as `File`/`Blob`; don't read them into React state.

If the work can take more than a frame or two on a large input, run it in a worker: add `src/workers/<name>.worker.ts` containing `exposeTask(handler)`, and call `runTask()` from the workspace with a literal `new Worker(new URL("../../workers/<name>.worker.ts", import.meta.url), { type: "module" })` and a lazy `fallback`.

## 3. Workspace

Create `src/tools/<slug>/workspace.tsx` (a default-exported client component) and add it to [`src/tools/workspaces.tsx`](../src/tools/workspaces.tsx). Use the shared pieces: `Panel`, `Field`/`TextArea`/`Select`/`Segmented`/`Checkbox`, `FileDropzone`, `CopyButton`, `DownloadLink`, `EmptyState`, `ErrorState`, `Notice`, `ProgressBar`, `StatList`, and `useTask` for cancellable work.

Every workspace shows exactly one of: nothing yet, working (cancellable if slow), error, or result. Downloads are object URLs (`DownloadLink` revokes them), named with `derivedFileName` so an original is never overwritten.

Also:

- Put one `Announcer` in the workspace and give it the outcome in one sentence ("Valid JSON. The formatted output is ready."). Don't put `role="status"` on panels that appear with the result; use `role="alert"` only for errors.
- Show long text results with `OutputText`, which caps what is displayed and keeps Copy and Download complete.
- If a button removes itself when pressed (Clear, Cancel, Remove), move focus back into the tool with `focusSoon`.
- Anything that finishes asynchronously must check that it is still the latest request before updating the screen (`useTask` does this; see the image and Base64 workspaces for hand-rolled versions).

## 4. Tests

- Unit tests for the engine in `tests/<name>.test.mts`, including the failure cases.
- Add a behaviour check to `scripts/browser-smoke.mjs` that uses the tool in Chrome and checks the result, and add the route to the route list so it gets the load, CSP, axe, metadata and overflow checks.
- Add the tool to `scripts/cross-browser.mjs` too, with anything engine-specific it relies on (file APIs, canvas, clipboard, downloads), so it is exercised in Chromium, Firefox and WebKit.
- If the tool has a heavy engine, add its marker to `ENGINES` in `scripts/check-bundle.mjs` so no other page can load it.

Then run `npm run verify:static && npm run test:browser && npm run test:cross-browser`.
