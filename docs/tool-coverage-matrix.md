# Universal Tool Coverage Matrix

This matrix maps capabilities researched across **WebTools** (`wtoolskit.com`), **91AI Tools** (`91aitool.cn`), and **100016** (`100016.com`), deduplicated into **Everything.Free Tools**' unified universal architecture.

### Integration Modes

- **Native Local**: Implemented directly in Everything.Free using modern browser Web APIs.
- **Open-source Local**: Implemented client-side using a permissively licensed library (WASM / Worker).
- **External**: Complex distributed/server task with clear provider label, privacy warning, and destination link.
- **Unavailable**: Requires paid access, proprietary authentication, or violates privacy principles.

---

## 1. Wave 1 — Existing & High-Value Tools

| Source(s)              | Tool / Capability          | Everything.Free Slug  | Category                | Existing? | Integration Mode  | Local? | Free? | Auth? | Dependency / Engine             | Status               |
| :--------------------- | :------------------------- | :-------------------- | :---------------------- | :-------- | :---------------- | :----- | :---- | :---- | :------------------------------ | :------------------- |
| WebTools, 91AI, 100016 | JSON Formatter             | `json-formatter`      | Developer / Data        | YES       | Native Local      | YES    | YES   | NO    | `src/engines/data/json.ts`      | **Implemented**      |
| WebTools               | JSON Repair                | `json-repair`         | Developer / Data        | NO        | Native Local      | YES    | YES   | NO    | Native JSON repair engine       | **Implemented**      |
| WebTools, 91AI         | Base64 Encoder / Decoder   | `base64`              | Developer / Data        | YES       | Native Local      | YES    | YES   | NO    | `src/engines/data/base64.ts`    | **Implemented**      |
| WebTools, 91AI         | URL Encoder / Decoder      | `url-encoder`         | Developer               | NO        | Native Local      | YES    | YES   | NO    | `encodeURIComponent` / `URL`    | **Implemented**      |
| WebTools, 91AI         | UUID Generator (v4 / v7)   | `uuid-generator`      | Developer / Security    | YES       | Native Local      | YES    | YES   | NO    | `src/engines/crypto/uuid.ts`    | **Implemented**      |
| WebTools               | QR Code Generator          | `qr-generator`        | QR & Barcode / Everyday | YES       | Open-source Local | YES    | YES   | NO    | `uqr` (MIT)                     | **Implemented**      |
| WebTools, 100016       | Word & Character Counter   | `text-counter`        | Text / Education        | YES       | Native Local      | YES    | YES   | NO    | `src/engines/text/counter.ts`   | **Implemented**      |
| WebTools               | Text Diff                  | `text-diff`           | Text / Developer        | NO        | Native Local      | YES    | YES   | NO    | Myers Diff Engine               | **Implemented**      |
| WebTools, 91AI         | Image Compressor           | `image-compressor`    | Image                   | YES       | Native Local      | YES    | YES   | NO    | `src/engines/image/compress.ts` | **Implemented**      |
| WebTools, 91AI         | Image Resize               | `image-resize`        | Image                   | NO        | Native Local      | YES    | YES   | NO    | Canvas 2D / Pica Engine         | **Implemented**      |
| WebTools, 91AI         | Image Crop                 | `image-crop`          | Image                   | NO        | Native Local      | YES    | YES   | NO    | Canvas 2D Cropper               | **Implemented**      |
| WebTools, 91AI         | Image Format Converter     | `image-format`        | Image                   | NO        | Native Local      | YES    | YES   | NO    | Canvas / ImageData              | **Implemented**      |
| WebTools, 91AI         | PDF Merge                  | `pdf-merge`           | PDF                     | NO        | Open-source Local | YES    | YES   | NO    | `pdf-lib` (MIT)                 | **Planned (Wave 1)** |
| WebTools, 91AI         | PDF Split                  | `pdf-split`           | PDF                     | NO        | Open-source Local | YES    | YES   | NO    | `pdf-lib` (MIT)                 | **Planned (Wave 1)** |
| WebTools, 91AI         | Image to PDF               | `image-to-pdf`        | PDF / Image             | NO        | Open-source Local | YES    | YES   | NO    | `pdf-lib` (MIT)                 | **Planned (Wave 1)** |
| WebTools, 91AI         | PDF to Image               | `pdf-to-image`        | PDF / Image             | NO        | Open-source Local | YES    | YES   | NO    | `pdfjs-dist` (Apache-2.0)       | **Planned (Wave 1)** |
| WebTools               | ZIP Manager                | `zip-manager`         | Files                   | NO        | Open-source Local | YES    | YES   | NO    | `jszip` (MIT)                   | **Planned (Wave 1)** |
| WebTools               | Color Picker & Palette     | `color-picker`        | Color & Design          | NO        | Native Local      | YES    | YES   | NO    | Native Color & EyeDropper       | **Implemented**      |
| WebTools, 91AI, 100016 | Universal Unit Converter   | `unit-converter`      | Math / Everyday         | NO        | Native Local      | YES    | YES   | NO    | Reusable Units Engine           | **Implemented**      |
| WebTools, 91AI, 100016 | Unix Timestamp Converter   | `timestamp-converter` | Developer / Everyday    | NO        | Native Local      | YES    | YES   | NO    | Native Date/Intl API            | **Implemented**      |
| WebTools, 91AI         | Strong Password Generator  | `password-generator`  | Security                | NO        | Native Local      | YES    | YES   | NO    | Web Crypto API                  | **Implemented**      |
| WebTools, 91AI, 100016 | Hash Generator (SHA / MD5) | `hash-generator`      | Security                | NO        | Native Local      | YES    | YES   | NO    | `SubtleCrypto` / Native Hash    | **Implemented**      |

---

## 2. Wave 2 — Developer & Data Tools

| Source(s)      | Tool / Capability         | Everything.Free Slug | Category             | Existing? | Integration Mode  | Local? | Free? | Auth? | Dependency / Engine           | Status           |
| :------------- | :------------------------ | :------------------- | :------------------- | :-------- | :---------------- | :----- | :---- | :---- | :---------------------------- | :--------------- |
| WebTools       | JSONPath Tester           | `json-path`          | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native JSONPath Engine        | **Implemented**  |
| WebTools       | JSON Schema Generator     | `json-schema`        | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native Schema Inference       | **Implemented**  |
| WebTools       | JSON ↔ YAML Converter     | `json-yaml`          | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native YAML/JSON Engine       | **Implemented**  |
| WebTools       | XML Formatter & Minifier  | `xml-formatter`      | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native XML Lexer & Formatter  | **Implemented**  |
| WebTools       | XML ↔ JSON Converter      | `xml-json`           | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | DOMParser / Native XML        | **Implemented**  |
| WebTools, 91AI | CSV ↔ JSON Converter      | `csv-json`           | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native RFC 4180 CSV Engine    | **Implemented**  |
| WebTools, 91AI | CSV Viewer & Grid         | `csv-viewer`         | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native RFC 4180 Grid Engine   | **Implemented**  |
| WebTools       | Table Generator           | `table-generator`    | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native Table Engine           | **Implemented**  |
| WebTools       | Regex Tester & Visualizer | `regex-tester`       | Developer            | NO        | Native Local      | YES    | YES   | NO    | Native RegExp & Explainer     | **Implemented**  |
| WebTools       | SQL Formatter             | `sql-formatter`      | Developer / Data     | NO        | Native Local      | YES    | YES   | NO    | Native Multi-Dialect SQL      | **Implemented**  |
| WebTools       | HTML Formatter & Minifier | `html-formatter`     | Developer            | NO        | Native Local      | YES    | YES   | NO    | Native HTML Lexer             | **Implemented**  |
| WebTools       | HTML Sandbox Preview      | `html-preview`       | Developer            | NO        | Native Local      | YES    | YES   | NO    | Sandboxed iframe (Zero-XSS)   | **Implemented**  |
| WebTools       | Markdown Realtime Preview | `markdown-preview`   | Developer / Text     | NO        | Native Local      | YES    | YES   | NO    | Native Sanitized Markdown     | **Implemented**  |
| WebTools       | JWT Decoder & Inspector   | `jwt-debugger`       | Developer / Security | NO        | Native Local      | YES    | YES   | NO    | Base64URL / RFC 7519 Engine   | **Implemented**  |
| WebTools       | Cron Expression Parser    | `cron-parser`        | Developer            | NO        | Native Local      | YES    | YES   | NO    | Native 5-Field Cron Engine    | **Implemented**  |
| WebTools       | URL & Query String Parser | `url-parser`         | Developer / Network  | NO        | Native Local      | YES    | YES   | NO    | Native URL & SearchParams     | **Implemented**  |
| WebTools       | MIME Type Lookup          | `mime-lookup`        | Developer            | NO        | Native Local      | YES    | YES   | NO    | Static IANA MIME Registry     | **Implemented**  |
| WebTools       | HTTP Status Code Lookup   | `http-status`        | Developer            | NO        | Native Local      | YES    | YES   | NO    | Static RFC 7231 Spec Table    | **Implemented**  |
| WebTools       | Unicode Lookup            | `unicode-lookup`     | Text / Developer     | NO        | Native Local      | YES    | YES   | NO    | Native UTF-8/UTF-16 Engine    | **Implemented**  |
| WebTools       | Number Base Converter     | `number-base`        | Math / Developer     | NO        | Native Local      | YES    | YES   | NO    | BigInt Arbitrary Radix (2-36) | **Implemented**  |
| WebTools       | Text & Line Sorter        | `text-sorter`        | Text / Developer     | NO        | Native Local      | YES    | YES   | NO    | Native Line Sorter Engine     | **Implemented**  |
| WebTools       | Text Cleaner & Whitespace | `text-cleaner`       | Text / Developer     | NO        | Native Local      | YES    | YES   | NO    | Native Text Cleaner Engine    | **Implemented**  |
| WebTools       | Case Converter            | `case-converter`     | Text / Developer     | NO        | Native Local      | YES    | YES   | NO    | Native Casing Engine (10 fmt) | **Implemented**  |
| WebTools       | Find & Replace            | `find-replace`       | Text / Developer     | NO        | Native Local      | YES    | YES   | NO    | Native Safe Regex/Literal     | **Implemented**  |
| WebTools       | Word Frequency Analyzer   | `word-frequency`     | Text / Education     | NO        | Native Local      | YES    | YES   | NO    | Native Frequency Lexer        | **Implemented**  |
| WebTools, 91AI | API Mock Generator        | `api-mock`           | Developer            | NO        | Native Local      | YES    | YES   | NO    | Multi-Lang Fetch/Curl Engine  | **Implemented**  |
| WebTools       | SQLite Database Viewer    | `sqlite-viewer`      | Developer / Data     | NO        | Open-source Local | YES    | YES   | NO    | Deferred (Large WASM Bundle)  | Planned (Wave 6) |

---

## 3. Wave 3 — Image & Design Tools

| Source(s)      | Tool / Capability               | Everything.Free Slug | Category          | Existing? | Integration Mode  | Local? | Free? | Auth? | Dependency / Engine                | Status  |
| :------------- | :------------------------------ | :------------------- | :---------------- | :-------- | :---------------- | :----- | :---- | :---- | :--------------------------------- | :------ |
| WebTools, 91AI | Batch Image Resizer             | `batch-image-resize` | Image             | NO        | Native Local      | YES    | YES   | NO    | OffscreenCanvas Worker             | Planned |
| WebTools, 91AI | Image Watermark (Text/Image)    | `image-watermark`    | Image             | NO        | Native Local      | YES    | YES   | NO    | Canvas 2D                          | Planned |
| WebTools       | Image Collage & Grid Styler     | `image-collage`      | Image             | NO        | Native Local      | YES    | YES   | NO    | Canvas 2D Compositor               | Planned |
| WebTools       | SVG Code Editor & Optimizer     | `svg-editor`         | Image / Developer | NO        | Open-source Local | YES    | YES   | NO    | `svgo` browser / DOM               | Planned |
| WebTools, 91AI | EXIF Metadata Viewer & Stripper | `exif-reader`        | Image / Security  | NO        | Open-source Local | YES    | YES   | NO    | `exif-js` (MIT)                    | Planned |
| WebTools       | Image OCR Text Extractor        | `image-ocr`          | Image / Text      | NO        | Open-source Local | YES    | YES   | NO    | `tesseract.js` (Apache-2.0 / WASM) | Planned |
| WebTools       | Image Comparison Slider         | `image-compare`      | Image             | NO        | Native Local      | YES    | YES   | NO    | Native DOM / Canvas                | Planned |
| WebTools       | CSS Gradient Generator          | `css-gradient`       | Color & Design    | NO        | Native Local      | YES    | YES   | NO    | Native CSS Engine                  | Planned |
| WebTools       | Box Shadow Generator            | `box-shadow`         | Color & Design    | NO        | Native Local      | YES    | YES   | NO    | Native CSS Engine                  | Planned |
| WebTools       | Border Radius Generator         | `border-radius`      | Color & Design    | NO        | Native Local      | YES    | YES   | NO    | Native CSS Engine                  | Planned |
| WebTools       | CSS Grid Layout Builder         | `css-grid`           | Color & Design    | NO        | Native Local      | YES    | YES   | NO    | Visual Grid Engine                 | Planned |
| WebTools       | Flexbox Layout Builder          | `css-flexbox`        | Color & Design    | NO        | Native Local      | YES    | YES   | NO    | Visual Flex Engine                 | Planned |
| WebTools       | CSS Keyframe Animations         | `css-animation`      | Color & Design    | NO        | Native Local      | YES    | YES   | NO    | Native CSS Engine                  | Planned |

---

## 4. Wave 4 — Media (Audio & Video)

| Source(s)      | Tool / Capability                  | Everything.Free Slug  | Category         | Existing? | Integration Mode    | Local? | Free? | Auth? | Dependency / Engine                      | Status  |
| :------------- | :--------------------------------- | :-------------------- | :--------------- | :-------- | :------------------ | :----- | :---- | :---- | :--------------------------------------- | :------ |
| WebTools, 91AI | Video to GIF Converter             | `video-to-gif`        | Video            | NO        | Open-source Local   | YES    | YES   | NO    | Canvas / GIFenc / FFmpeg WASM            | Planned |
| WebTools, 91AI | Video Trimmer & Cutter             | `video-trimmer`       | Video            | NO        | Native Local / WASM | YES    | YES   | NO    | WebCodecs / MediaStream                  | Planned |
| WebTools       | Video Screenshot / Frame Grabber   | `video-screenshot`    | Video / Image    | NO        | Native Local        | YES    | YES   | NO    | HTML5 Video & Canvas                     | Planned |
| WebTools, 91AI | Video to Audio Extractor           | `video-extract-audio` | Video / Audio    | NO        | Open-source Local   | YES    | YES   | NO    | AudioContext / WASM                      | Planned |
| WebTools, 91AI | Audio Trimmer & Cutter             | `audio-trimmer`       | Audio            | NO        | Native Local        | YES    | YES   | NO    | Web Audio API / AudioBuffer              | Planned |
| WebTools, 91AI | Audio Format Converter             | `audio-converter`     | Audio            | NO        | Open-source Local   | YES    | YES   | NO    | Web Audio API / WASM                     | Planned |
| 91AI           | Audio Compressor                   | `audio-compressor`    | Audio            | NO        | Open-source Local   | YES    | YES   | NO    | Web Audio API / WASM                     | Planned |
| WebTools, 91AI | Screen Video Recorder              | `screen-recorder`     | Video            | NO        | Native Local        | YES    | YES   | NO    | `navigator.mediaDevices.getDisplayMedia` | Planned |
| WebTools       | Camera Video Recorder              | `camera-recorder`     | Video            | NO        | Native Local        | YES    | YES   | NO    | `navigator.mediaDevices.getUserMedia`    | Planned |
| WebTools       | Microphone Voice Recorder          | `microphone-recorder` | Audio            | NO        | Native Local        | YES    | YES   | NO    | `MediaRecorder` API                      | Planned |
| WebTools       | Speech to Text (Dictation)         | `speech-to-text`      | Audio / Text     | NO        | Native Local        | YES    | YES   | NO    | Web Speech Recognition API               | Planned |
| WebTools       | Text to Speech (Voice Synthesizer) | `text-to-speech`      | Audio / Everyday | NO        | Native Local        | YES    | YES   | NO    | `window.speechSynthesis`                 | Planned |

---

## 5. Wave 5 — Documents & PDF

| Source(s)      | Tool / Capability              | Everything.Free Slug | Category | Existing? | Integration Mode  | Local? | Free?   | Auth?   | Dependency / Engine           | Status          |
| :------------- | :----------------------------- | :------------------- | :------- | :-------- | :---------------- | :----- | :------ | :------ | :---------------------------- | :-------------- |
| WebTools, 91AI | PDF Watermark Adder            | `pdf-watermark`      | PDF      | NO        | Open-source Local | YES    | YES     | NO      | `pdf-lib` (MIT)               | Planned         |
| 91AI           | PDF Page Rotation              | `pdf-rotate`         | PDF      | NO        | Open-source Local | YES    | YES     | NO      | `pdf-lib` (MIT)               | Planned         |
| 91AI           | PDF Page Numbering             | `pdf-page-number`    | PDF      | NO        | Open-source Local | YES    | YES     | NO      | `pdf-lib` (MIT)               | Planned         |
| 91AI           | PDF Page Deleter & Reorder     | `pdf-organize`       | PDF      | NO        | Open-source Local | YES    | YES     | NO      | `pdf-lib` (MIT)               | Planned         |
| 91AI           | PDF Encryption & Password Lock | `pdf-protect`        | PDF      | NO        | Open-source Local | YES    | YES     | NO      | `pdf-lib` (MIT)               | Planned         |
| 91AI           | PDF Compression                | `pdf-compress`       | PDF      | NO        | Open-source Local | YES    | YES     | NO      | `pdf-lib` / Ghostscript WASM  | Planned         |
| 91AI           | PDF to Word (.docx)            | `pdf-to-word`        | PDF      | NO        | External Service  | NO     | Limited | Unknown | LibreOffice / External Server | Fallback Policy |
| 91AI           | PDF to Excel (.xlsx)           | `pdf-to-excel`       | PDF      | NO        | External Service  | NO     | Limited | Unknown | External Server Engine        | Fallback Policy |
| 91AI           | PDF to PPT (.pptx)             | `pdf-to-ppt`         | PDF      | NO        | External Service  | NO     | Limited | Unknown | External Server Engine        | Fallback Policy |
| 91AI           | Word (.docx) to PDF            | `word-to-pdf`        | PDF      | NO        | External Service  | NO     | Limited | Unknown | External Conversion Server    | Fallback Policy |
| 91AI           | Excel (.xlsx) to PDF           | `excel-to-pdf`       | PDF      | NO        | External Service  | NO     | Limited | Unknown | External Conversion Server    | Fallback Policy |
| 91AI           | PPT (.pptx) to PDF             | `ppt-to-pdf`         | PDF      | NO        | External Service  | NO     | Limited | Unknown | External Conversion Server    | Fallback Policy |

---

## 6. Wave 6 — Advanced & Specialized

| Source(s) | Tool / Capability           | Everything.Free Slug | Category            | Existing? | Integration Mode  | Local? | Free?   | Auth?   | Dependency / Engine                | Status            |
| :-------- | :-------------------------- | :------------------- | :------------------ | :-------- | :---------------- | :----- | :------ | :------ | :--------------------------------- | :---------------- |
| 91AI      | CAD to PDF (DWG / DXF)      | `cad-to-pdf`         | Files               | NO        | External Service  | NO     | Unknown | Unknown | Proprietary CAD Engine             | Unavailable Local |
| WebTools  | DNS Lookup                  | `dns-lookup`         | Developer / Network | NO        | External / DoH    | NO     | YES     | NO      | DNS over HTTPS (Cloudflare/Google) | Planned           |
| WebTools  | IP Address Validator & CIDR | `ip-calculator`      | Developer / Network | NO        | Native Local      | YES    | YES     | NO      | Native IP bitwise calculations     | Planned           |
| WebTools  | RSA Keypair Generator       | `rsa-keygen`         | Security            | NO        | Native Local      | YES    | YES     | NO      | Web Crypto (`generateKey`)         | Planned           |
| WebTools  | Bcrypt Hash Generator       | `bcrypt-hash`        | Security            | NO        | Open-source Local | YES    | YES     | NO      | `bcryptjs` (MIT)                   | Planned           |
| 100016    | Historical Directory Tools  | N/A                  | Various             | NO        | Unavailable       | ?      | ?       | ?       | Domain Unreachable (DNS fail)      | Documented        |
