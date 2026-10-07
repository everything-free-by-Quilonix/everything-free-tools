# Browser support

Target: current versions of Chrome, Edge, Firefox and Safari on desktop and mobile. Tools detect features instead of sniffing browsers; if a required feature is missing, the tool names it instead of failing.

## What was tested

Results from the release-candidate pass (September 2026), on the static export served the way GitHub Pages serves it. Both suites run in CI on every push.

| Engine                        | Build                               | How                                       | Result                                            |
| ----------------------------- | ----------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Chromium                      | Chrome for Testing 153 (Playwright) | `npm run test:cross-browser`              | All checks pass                                   |
| Firefox                       | Firefox 155 (Playwright)            | `npm run test:cross-browser`              | All checks pass                                   |
| WebKit                        | WebKit 26.6 (Playwright, Windows)   | `npm run test:cross-browser`              | All checks pass; see notes                        |
| Chrome                        | installed Chrome, headless          | `npm run test:browser`                    | All checks pass, including axe-core on every page |
| Edge                          | installed Edge, headless            | `npm run test:browser` with `CHROME_PATH` | All checks pass (run locally, not in CI)          |
| Pixel 7                       | Chromium, device emulation          | cross-browser suite                       | All checks pass                                   |
| iPhone 13, iPhone SE (320 px) | WebKit, device emulation            | cross-browser suite                       | All checks pass                                   |

Each engine was checked for: every route loading with no errors or CSP violations; each tool used end to end; the real file chooser opened from the visible button; drag and drop; copy; downloads (saved and compared byte for byte, including the SVG); JSON number preservation; Base64 round trips and strict errors; UUID v4/v7 format, uniqueness and ordering; `Intl.Segmenter` counting; image decoding of PNG, JPEG, WebP, 1×1 and 1×3000 images, a corrupt file and a GIF (rejected); EXIF orientation; transparency; a result that grows; a 6 MB photo and a 24-megapixel PNG; cancel; workers created and terminated; object URLs released; the JSON and image tools with `Worker` removed and with `OffscreenCanvas` removed; keyboard focus order; eight deliberate CSP violations; and zero requests to any other origin.

**Not tested:** Apple's Safari itself, physical Android and iOS devices, and screen readers. Playwright's WebKit is the engine Safari uses, but it is not Safari: it is built for Windows here, has no OffscreenCanvas, and emulated phones don't reproduce real memory limits, camera file choosers or on-screen keyboards. These remain to be checked on real hardware.

## Measurements

|                                                                  | Chromium | Firefox | WebKit                           |
| ---------------------------------------------------------------- | -------- | ------- | -------------------------------- |
| JSON, small document, click to result (worker start-up included) | 18 ms    | 32 ms   | 68 ms                            |
| JSON, 2.8 MB document                                            | 298 ms   | 334 ms  | 303 ms                           |
| Image, 6.1 MB 3000×2000 JPEG                                     | 261 ms   | 210 ms  | 592 ms                           |
| — longest main-thread pause                                      | 27 ms    | 67 ms   | 291 ms                           |
| Image, 24 MP transparent PNG → WebP                              | 1.4 s    | 1.5 s   | 2.9 s                            |
| — longest main-thread pause                                      | 26 ms    | 93 ms   | 2.3 s                            |
| Image processing                                                 | worker   | worker  | on the page (no OffscreenCanvas) |

Single runs on one Windows machine; treat them as orders of magnitude.

## Browser-specific behaviour found

- **WebKit without OffscreenCanvas** (this build, and Safari before 16.4): the image compressor runs on the page. It works, including EXIF orientation and WebP output, but a very large image pauses the page while it is drawn and encoded (2.3 s for 24 MP), and a Cancel pressed during that pause takes effect after the current image. Safari 16.4 and later have OffscreenCanvas and should use the worker; unverified.
- **WebKit and `upgrade-insecure-requests`:** WebKit upgraded requests on `http://localhost` to HTTPS and the site failed to load when tested locally. The directive was removed; it had no effect on the HTTPS site because every source is already same-origin.
- **WebKit keyboard focus:** by default Tab moves between form controls only, as in Safari. Links are reachable with "Press Tab to highlight each item" (Safari settings). Every control it reaches shows a visible focus ring.
- **WebP encoding:** available in all three engines tested. Where a browser can't encode WebP, the result is PNG and says so.
- **Clipboard:** copying works in all three; the clipboard contents were read back and compared in Chromium only (the other engines don't grant read access to tests).
- **iOS text zoom:** form controls used 14 px text, which makes iOS Safari zoom the page on focus. They now use 16 px below the `sm` breakpoint.

## Features and fallbacks

| Feature                                     | Used by                          | Without it                                                |
| ------------------------------------------- | -------------------------------- | --------------------------------------------------------- |
| Web Workers                                 | JSON Formatter, Image Compressor | The same engine runs on the page (tested)                 |
| OffscreenCanvas                             | Image Compressor (in a worker)   | Compression runs on the page with a `<canvas>` (tested)   |
| `createImageBitmap` with `imageOrientation` | Image Compressor                 | Required: the tool explains it can't run                  |
| WebP encoding                               | Image Compressor                 | PNG is produced and the result says so                    |
| Web Crypto `getRandomValues`                | UUID Generator                   | Required: there is no insecure fallback                   |
| `crypto.randomUUID`                         | UUID v4                          | v4 is built from `getRandomValues` instead (unit tested)  |
| `Intl.Segmenter`                            | Word & Character Counter         | Regular-expression fallback, with a notice (unit tested)  |
| Clipboard API                               | Copy buttons                     | The button says copying failed; the text stays selectable |

Without JavaScript, every page renders, the tool list and category pages work, and tool pages explain what the tool does and that it needs JavaScript (tested in Chrome).

## Known limits by platform

- **iPhone and iPad:** Safari caps canvas memory, commonly cited as about 16.7 megapixels per canvas. Larger photos need Resize there; the tool reports the size problem rather than producing a blank image. Not verified on a device.
- **Very large inputs everywhere:** memory, not the site, is the limit. A decoded image costs 4 bytes per pixel; very large text is held in the page. Displayed results are capped at 100,000 characters (Copy and Download are complete).
