# Everything.Free Tools

Free tools. No account. Just get it done.

Everything.Free Tools by [Quilonix](https://github.com/everything-free-by-Quilonix) is a set of browser tools that do their work on your device. There is no server, no account, no analytics and no artificial limit. It's a static site on GitHub Pages and costs nothing to run.

Live site (once deployed): <https://everything-free-by-quilonix.github.io/everything-free-tools/>

## Tools

43 tools, all processed locally. The six launch tools are below; the [/tools/ directory](https://everything-free-by-quilonix.github.io/everything-free-tools/tools/) lists the rest. Everything is local: what you type or choose stays in your browser tab. The site's Content Security Policy makes the browser refuse any request to another host, and the browser tests confirm that using every tool makes no such request.

| Tool                     | Category     | Notes                                                                                                |
| ------------------------ | ------------ | ---------------------------------------------------------------------------------------------------- |
| JSON Formatter           | Developer    | Strict parser; changes only whitespace, so numbers and strings are never altered; line/column errors |
| Word & Character Counter | Text         | Grapheme-aware counts via `Intl.Segmenter`, with a fallback                                          |
| UUID Generator           | Developer    | v4 and v7, from Web Crypto only                                                                      |
| Base64 Encoder / Decoder | Developer    | UTF-8, URL-safe, strict decoding, file in and out                                                    |
| Image Compressor         | Image        | Keeps transparency, applies EXIF orientation, runs in a worker where the browser allows              |
| QR Code Generator        | QR & Barcode | Text/link and Wi-Fi, PNG and SVG                                                                     |

Every tool is described once, as data, in [`src/tools/registry/definitions.ts`](src/tools/registry/definitions.ts). Pages, search, categories, the sitemap and privacy labels are all generated from that entry.

Find a tool from the home page search, the `/tools/` directory (search plus category, processing and format filters, kept in the URL), category pages, or from anywhere with Ctrl+K / ?K (or `/`). The site follows your system light/dark setting; the header toggle overrides it for the visit.

## Browser validation

Tested automatically on every CI run, against the static export:

- **Chromium, Firefox and WebKit** (Playwright builds): every tool end to end, file chooser, drag and drop, clipboard, downloads checked byte for byte, workers and their fallbacks, CSP attacks, keyboard focus, zero requests to other origins.
- **Chrome** (CDP smoke test): every route, axe-core accessibility checks, 390 and 320 px layouts, JavaScript disabled.
- **Emulated phones**: Pixel 7 (Chromium), iPhone 13 and iPhone SE (WebKit).

Not yet tested: Apple's Safari itself (the WebKit build is close but not identical), physical Android and iOS devices, and screen readers. Details and measured results: [docs/browser-support.md](docs/browser-support.md).

## Development

Requires Node.js 22.18 or later.

```sh
npm ci
npm run dev             # http://localhost:3000/everything-free-tools
```

| Command                      | What it does                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `npm test`                   | Unit tests (Node's built-in runner, against the TypeScript source)                  |
| `npm run lint`               | ESLint, including bans on `eval`, `new Function` and raw HTML                       |
| `npm run typecheck`          | TypeScript, strict                                                                  |
| `npm run check:privacy`      | Fails on network, storage, eval or `Math.random` in engines                         |
| `npm run build:static`       | Static export to `out/`, with a verified hash-based CSP written into every page     |
| `npm run check:bundle`       | Per-page JavaScript sizes; fails if a page loads another tool's engine              |
| `npm run test:browser`       | Chrome test of the export: routes, tools, workers, CSP, accessibility, mobile       |
| `npm run test:cross-browser` | Chromium, Firefox and WebKit, plus phone emulation (`npx playwright install` first) |
| `npm run verify:static`      | Everything above except the two browser tests                                       |

## Documentation

- [Architecture](docs/architecture.md)
- [Adding a tool](docs/tool-development.md)
- [Privacy model](docs/privacy-model.md)
- [Browser support](docs/browser-support.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

## Related

[Everything.Free](https://everything-free-by-quilonix.github.io/everything-free/) is the sister project: a curated library of free resources. The two are separate repositories and share no code.

## Licence

[MIT](LICENSE). Third-party components are listed in [docs/architecture.md](docs/architecture.md#dependencies).
