# Privacy model

## The promise

For a tool marked **LOCAL**: "Processed locally in your browser. Your files don't leave your device." Nothing the user types or selects is transmitted, stored or logged.

For a tool marked **NETWORK** (none exist yet): "This tool requires a network service to process your data," followed by the destination and what is sent.

## How it is kept true

| Layer        | Mechanism                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Declaration  | Each tool's `processing` and `privacy` fields. `findRegistryProblems` fails the build if they contradict each other.      |
| Wording      | Pages never write their own privacy text. `privacyStatement()` derives it from the declaration.                           |
| Source       | `npm run check:privacy` fails on `fetch`, XHR, beacons, WebSocket, EventSource, storage, cookies, `eval`, remote imports. |
| Runtime      | The CSP on every page has `connect-src 'self'`, so the browser refuses requests to any other host.                        |
| Verification | The browser test records every request while each tool runs and fails if any goes to another origin.                      |

The only same-origin requests the app makes are for its own pages, scripts, fonts and navigation payloads. User data is never part of a URL or request body: tool state lives in page memory and results are `blob:` URLs created in the page.

The one exception to "nothing in the URL" is search: `/tools/?q=…` keeps the search words in the address so a search can be shared. That is a search for a tool, not tool input.

## What isn't covered

- **Hosting.** GitHub Pages receives ordinary request metadata (IP address, user agent) when pages load, as any host does.
- **Browser extensions** can read page content; that is outside the site's control.
- **The clipboard.** Copy buttons write to the system clipboard only when the user presses them.
- **Metadata in outputs.** The image compressor strips EXIF (including GPS) by re-encoding; this is stated as a limitation because some people want to keep it.

## Adding a network tool

It must be declared `NETWORK` with a named destination and data description, the CSP must be widened for exactly that host, and the review must confirm the page states both before any data is sent.
