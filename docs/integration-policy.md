# Everything.Free Integration Policy

## 1. Vision & Core Philosophy

Everything.Free Tools is built to be a large, unified, privacy-first, free universal online tools platform. Users must never be required to leave Everything.Free to accomplish their tasks whenever a technically viable, privacy-preserving, and legally sound native/local implementation is possible.

Everything.Free is **not a website copier**. We do not scrape, duplicate, or mirror proprietary interfaces, stylesheets, or backend servers. Instead, we independently build Everything.Free's own universal capability layer using modern Web APIs, WebAssembly, and permissively licensed open-source packages.

---

## 2. The Four Universal Integration Modes

Every tool capability researched across source ecosystems (WebTools, 91AI, 100016, and others) is classified into exactly one of four integration modes:

### Mode A: Native Local (Browser Native)

- **Definition:** The tool is built directly inside the Everything.Free application codebase utilizing standard browser APIs (Canvas, DOM, Web Crypto, Web Speech, Intl, OffscreenCanvas, Streams).
- **Execution Environment:** Visitor's browser.
- **Network Traffic:** Zero. User files and inputs never leave the device.
- **Telemetry / Ads:** Strictly prohibited.
- **Account / Auth:** Never required.

### Mode B: Open-Source Local Engine (WASM / Client Library)

- **Definition:** Capabilities that require specialized algorithmic or media processing engines (e.g., PDF manipulation, image transcoding, ZIP archiving, video encoding) are integrated using client-side open-source libraries.
- **Execution Environment:** In-browser Web Worker, WebAssembly module, or client-side runtime.
- **Permitted Licenses:** MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense, CC0. GPL/AGPL dependencies are not bundled into static client distributions without explicit isolation analysis.
- **Loading Invariant:** Dynamic lazy-loading only. Heavy engines (e.g., FFmpeg, PDF parsers, OCR engines) must **never** be bundled into the initial entry bundle or loaded on unrelated tool pages.
- **Network Traffic:** Zero. Data stays strictly within local browser memory.

### Mode C: External Service (Fallback Only)

- **Definition:** Utilized strictly when a capability fundamentally requires heavy distributed computing or proprietary infrastructure (e.g., AI server rendering, optical recognition with server models, proprietary CAD-to-PDF engines) and no viable client-side equivalent exists.
- **Transparency Rules:**
  - Clearly labelled with an "External Service" badge.
  - Displays the external provider, target destination URL, and a privacy warning.
  - Transparently indicates whether the service is free, requires an account, has file size limits, or applies watermarks.
  - Never masquerades an external service as an Everything.Free-native tool.

### Mode D: Unavailable

- **Definition:** Marked as "Not currently available" when an external service:
  - Requires paid subscriptions or proprietary paywalls.
  - Mandates user tracking, intrusive authentication, or privacy violations.
  - Violates Everything.Free's core privacy and safety principles.
  - Has no legal or technical integration path.
- **Rule:** Never fake or mock an integration that cannot be reliably delivered.

---

## 3. Library Selection & Bundle Discipline

Before adding any third-party open-source dependency:

1. **Permissive License:** Verify the dependency uses MIT, Apache-2.0, BSD, or compatible terms.
2. **Offline Compatibility:** The package must function entirely without making outbound HTTP calls.
3. **Lazy-Load Architecture:** Packages over 20 kB must be loaded asynchronously via `next/dynamic` or inside a Web Worker.
4. **Zero Telemetry:** The package must not contain tracking beacons, analytics pings, or CDN fallbacks.
5. **Mobile Friendly:** The library must execute within memory limits of mobile browsers (iOS Safari, Android Chrome).

---

## 4. Privacy Guarantee & Policy Enforcement

- Every tool page includes an automated **Privacy Indicator** stating whether execution is LOCAL, NETWORK, or EXTERNAL.
- The project enforces this via automated static checks (`scripts/check-privacy.mjs`) and Content Security Policy (`connect-src 'self'`).
- Any attempt to introduce network fetches or tracking scripts into local tool engines fails continuous integration and deployment.
