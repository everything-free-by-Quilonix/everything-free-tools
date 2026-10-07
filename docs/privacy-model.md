# Privacy Model & Data Handling Architecture

## 1. The Core Privacy Promise

Everything.Free Tools operates under a strict, verifiable privacy model. Every tool explicitly declares its processing architecture:

### 🔒 LOCAL (Native / In-Browser Engine)

- **Statement:** "Processed locally in your browser. Your files don't leave your device."
- **Guarantee:** 100% of computation happens directly on the client machine using native browser APIs or WebAssembly/JS workers. Nothing the user inputs, pastes, or uploads is ever transmitted to a server, logged, stored in persistent cookies, or retained.
- **Enforcement:** Enforced at build time via `npm run check:privacy` and at runtime via Content Security Policy (`connect-src 'self'`).

### 🌐 NETWORK (Client-Initiated Network Service)

- **Statement:** "This tool requires a network service to process your data."
- **Mandatory Disclosures:** Destination endpoint/service provider, exact data sent, and why local execution is technically infeasible.
- **Rules:** The user must be informed prior to transmission. No secret pings or telemetry.

### ↗ EXTERNAL (Third-Party Web Application)

- **Statement:** "External service. You are leaving Everything.Free."
- **Transparency:** Clearly identifies the third-party provider, privacy implications, free/paid status, upload requirements, and potential limits or watermarks. Everything.Free never impersonates an external service as its own.

---

## 2. Technical Verification & Security Invariants

| Layer                   | Mechanism                                                 | Protection                                                                                                                                                                                                                                         |
| :---------------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Declaration**         | Master Registry Schema (`src/tools/registry/`)            | Registry consistency rules fail the build if a LOCAL tool claims network usage, or if a NETWORK tool omits destination details.                                                                                                                    |
| **Wording**             | Automated Privacy Statement Engine (`src/lib/privacy.ts`) | UI components derive wording strictly from validated registry metadata. Tool pages cannot author custom, unverified privacy claims.                                                                                                                |
| **Source Code Audit**   | Automated AST/Regex Scanner (`scripts/check-privacy.mjs`) | Verifies zero outbound network calls (`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`), zero tracking storage (`localStorage`, `sessionStorage`, `document.cookie`), and zero dynamic code execution (`eval`, `new Function`). |
| **Runtime CSP**         | Strict Static CSP (`scripts/csp.mjs`)                     | Pages enforce `default-src 'self'`, `connect-src 'self'`, and hash-based script execution to cryptographically block external network calls.                                                                                                       |
| **Browser Smoke Tests** | Automated Headless Tests (`scripts/browser-smoke.mjs`)    | Records all outgoing network requests during end-to-end tool operations. Any third-party domain request triggers immediate test failure.                                                                                                           |

---

## 3. Data Storage & Retention Invariants

1. **Zero Server Uploads for Local Tools:** All file conversions, formatting, minification, and cryptographic operations execute in local memory.
2. **Ephemeral Memory:** Objects and buffers are created in memory and released when closed or navigated away from. Results are surfaced as browser-native `blob:` or `data:` URLs.
3. **No Account Tracking:** Everything.Free requires zero account registration, login, cookies, or user profiling.
