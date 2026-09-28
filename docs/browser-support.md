# Browser support

Target: current versions of Chrome, Edge, Firefox and Safari on desktop and mobile.

Tools detect features instead of sniffing browsers. If a required feature is missing, the tool says which one rather than failing.

| Feature                           | Used by                          | Without it                                                    |
| --------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Web Workers                       | JSON Formatter, Image Compressor | The same engine runs on the page (slower on big inputs)       |
| OffscreenCanvas                   | Image Compressor (in a worker)   | Compression runs on the page with a `<canvas>`                |
| `createImageBitmap` + orientation | Image Compressor                 | Required: the tool explains it can't run                      |
| WebP encoding                     | Image Compressor                 | PNG is produced and the result says so                        |
| Web Crypto `getRandomValues`      | UUID Generator                   | Required: no insecure fallback                                |
| `crypto.randomUUID`               | UUID v4                          | v4 is built from `getRandomValues` instead                    |
| `Intl.Segmenter`                  | Word & Character Counter         | Regular-expression fallback; a notice says counts may differ  |
| Clipboard API                     | Copy buttons                     | The button reports that copying failed; text stays selectable |

Without JavaScript, every page renders, the tool list and category pages work, and tool pages explain what the tool does and that it needs JavaScript.

## What has been tested

Automated, on every CI run: headless Chrome (desktop 1366 px, mobile 390 px, narrow 320 px, and with JavaScript disabled). Locally also with Chrome on Windows.

Not yet tested: Firefox, Safari (macOS and iOS) and Android Chrome on real devices. The code avoids Chrome-only APIs and has fallbacks for everything above, but those browsers haven't been run against it.
