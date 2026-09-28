# Everything.Free Tools

Free tools. No account. Just get it done.

Everything.Free Tools by [Quilonix](https://github.com/everything-free-by-Quilonix) is a set of browser tools that do their work on your device. There is no server, no account, no analytics and no artificial limit. It's a static site on GitHub Pages and costs nothing to run.

Live site (once deployed): <https://everything-free-by-quilonix.github.io/everything-free-tools/>

## Tools

| Tool                     | Category     | Processing | Notes                                                                  |
| ------------------------ | ------------ | ---------- | ---------------------------------------------------------------------- |
| JSON Formatter           | Developer    | Local      | Strict parser; never alters numbers or strings; line/column errors     |
| Word & Character Counter | Text         | Local      | Grapheme-aware counts via `Intl.Segmenter`                             |
| UUID Generator           | Developer    | Local      | v4 and v7, Web Crypto only                                             |
| Base64 Encoder / Decoder | Developer    | Local      | UTF-8, URL-safe, strict decoding, file in and out                      |
| Image Compressor         | Image        | Local      | Worker + OffscreenCanvas, keeps transparency, applies EXIF orientation |
| QR Code Generator        | QR & Barcode | Local      | Text/link and Wi-Fi, PNG and SVG                                       |

Every tool is described once, as data, in [`src/tools/registry/definitions.ts`](src/tools/registry/definitions.ts). Pages, search, categories, the sitemap and privacy labels are all generated from that entry.

## Development

Requires Node.js 22.18 or later.

```sh
npm ci
npm run dev             # http://localhost:3000/everything-free-tools
```

| Command                 | What it does                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm test`              | Unit tests (Node's built-in runner, against the TypeScript source)     |
| `npm run lint`          | ESLint, including bans on `eval`, `new Function` and raw HTML          |
| `npm run typecheck`     | TypeScript, strict                                                     |
| `npm run check:privacy` | Fails on network, storage, eval or `Math.random` in engines            |
| `npm run build:static`  | Static export to `out/`, with a hash-based CSP written into every page |
| `npm run check:bundle`  | Per-page JavaScript sizes; fails if a page loads another tool's engine |
| `npm run test:browser`  | Real-Chrome test of the export: every tool, workers, CSP, a11y, mobile |
| `npm run verify:static` | Everything above except the browser test                               |

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
