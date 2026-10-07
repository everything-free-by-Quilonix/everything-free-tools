#!/usr/bin/env node
/**
 * Real-browser smoke test for the static export.
 *
 * Drives a locally installed Chrome (or Edge) over the DevTools Protocol with Node's
 * built-in WebSocket: no Puppeteer, no Playwright. GitHub's Ubuntu runners ship
 * Chrome, so this runs in CI at no cost.
 *
 * It checks what a file check cannot: that the hash-based CSP lets the app run,
 * that the base path is right, that every tool produces a correct result, that the
 * heavy tools really run in a worker, and that no request ever leaves the site's
 * own origin while a tool is used.
 *
 *   node scripts/browser-smoke.mjs                   # serves ./out at the configured base path
 *   node scripts/browser-smoke.mjs --url <site-url>  # tests a deployed site
 *   node scripts/browser-smoke.mjs --report <file>   # also writes a plain-text report
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { argv, env, exit, platform } from "node:process";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const urlFlag = argv.indexOf("--url");
const remoteUrl = urlFlag !== -1 ? argv[urlFlag + 1]?.replace(/\/+$/, "") : null;
const DEFAULT_SITE_URL = "https://everything-free-by-quilonix.github.io/everything-free-tools";
const configuredSite = (env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");
const basePath = new URL(remoteUrl ?? configuredSite).pathname.replace(/\/+$/, "");

const VIEWPORTS = {
  desktop: { width: 1366, height: 900, mobile: false, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, mobile: true, deviceScaleFactor: 3 },
  narrow: { width: 320, height: 640, mobile: true, deviceScaleFactor: 2 },
};

/** `--screenshots <dir>` saves full-page captures of every small-screen check, for review. */
const shotsFlag = argv.indexOf("--screenshots");
const shotsDir = shotsFlag !== -1 ? argv[shotsFlag + 1] : null;

const TOOL_SLUGS = ["json-formatter", "text-counter", "uuid-generator", "base64", "image-compressor", "qr-generator"];

function findChrome() {
  const candidates = [
    env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  return candidates.find((path) => existsSync(path)) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Static server: behaves like a header-less static host                      */
/* -------------------------------------------------------------------------- */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

async function startServer(root) {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
    const send404 = async () => {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      res.end(await readFile(join(root, "404.html")).catch(() => "Not found"));
    };
    if (!pathname.startsWith(`${basePath}/`) && pathname !== basePath) return send404();
    let file = normalize(join(root, pathname.slice(basePath.length)));
    if (!file.startsWith(root)) return send404();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      // No security headers on purpose: GitHub Pages can't send any, so the meta CSP must hold up alone.
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      await send404();
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

/* -------------------------------------------------------------------------- */
/* Minimal DevTools Protocol client                                           */
/* -------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function launchChrome(chromePath) {
  const profile = await mkdtemp(join(tmpdir(), "eft-smoke-"));
  const child = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      ...(platform === "linux" ? ["--no-sandbox"] : []),
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  // A cold CI runner can take well over 10 seconds to open DevTools.
  const STARTUP_TIMEOUT_MS = 30_000;
  const portFile = join(profile, "DevToolsActivePort");
  for (let waited = 0; waited < STARTUP_TIMEOUT_MS && !existsSync(portFile); waited += 100) await sleep(100);
  const [port, path] = (await readFile(portFile, "utf8")).trim().split("\n");

  const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((ok, fail) => {
    socket.onopen = ok;
    socket.onerror = fail;
  });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== undefined && pending.has(message.id)) {
      const { ok, fail } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) fail(new Error(message.error.message));
      else ok(message.result);
    } else if (message.method) {
      for (const listener of listeners) listener(message);
    }
  };

  const send = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = ++nextId;
      pending.set(id, { ok, fail });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  const exited = new Promise((ok) => child.once("exit", ok));
  const close = async () => {
    send("Browser.close").catch(() => {});
    const clean = await Promise.race([exited.then(() => true), sleep(3000).then(() => false)]);
    if (!clean) {
      if (platform === "win32") {
        await new Promise((ok) =>
          spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" }).on("exit", ok),
        );
      } else child.kill("SIGKILL");
    }
    socket.close();
    await sleep(300);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  };

  return { send, listeners, close };
}

async function openPage(browser, { viewport = VIEWPORTS.desktop, javascript = true } = {}) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);

  const events = { errors: [], failedRequests: [], requests: [], loads: 0, lastStatus: null };
  const listener = (message) => {
    if (message.sessionId !== sessionId) return;
    const { method, params } = message;
    if (method === "Page.loadEventFired") events.loads += 1;
    if (method === "Runtime.exceptionThrown") {
      events.errors.push(
        `exception: ${params.exceptionDetails.exception?.description ?? params.exceptionDetails.text}`,
      );
    }
    if (method === "Log.entryAdded" && params.entry.level === "error")
      events.errors.push(`${params.entry.source}: ${params.entry.text}`);
    if (method === "Runtime.consoleAPICalled" && params.type === "error") {
      events.errors.push(`console: ${params.args.map((a) => a.value ?? a.description).join(" ")}`);
    }
    if (method === "Network.requestWillBeSent") events.requests.push(params.request.url);
    if (method === "Network.responseReceived" && params.type === "Document") events.lastStatus = params.response.status;
    if (method === "Network.responseReceived" && params.response.status >= 400 && params.type !== "Document") {
      events.failedRequests.push(`${params.response.status} ${params.type} ${params.response.url}`);
    }
    if (method === "Network.loadingFailed" && !params.canceled)
      events.failedRequests.push(`${params.blockedReason ?? params.errorText} ${params.type}`);
  };
  browser.listeners.add(listener);

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", viewport);
  if (!javascript) await send("Emulation.setScriptExecutionDisabled", { value: true });

  // Installed by DevTools, outside the page's CSP: records CSP violations and every
  // worker the page starts, so the test can prove the heavy work ran off the page.
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        window.__cspViolations.push(e.violatedDirective + " " + (e.blockedURI || "inline")));
      window.__workers = [];
      if (window.Worker) {
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
          constructor(url, options) { super(url, options); window.__workers.push(String(url)); }
        };
      }`,
  });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };

  const waitFor = async (expression, timeout = 10_000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await evaluate(expression)) return true;
      } catch {
        /* mid-navigation */
      }
      await sleep(100);
    }
    return false;
  };

  const goto = async (url) => {
    const before = events.loads;
    events.lastStatus = null;
    events.errors.length = 0;
    events.failedRequests.length = 0;
    events.requests.length = 0;
    await send("Page.navigate", { url });
    const start = Date.now();
    while (events.loads === before && Date.now() - start < 15_000) await sleep(50);
    await sleep(javascript ? 300 : 100);
  };

  const key = async (keyName, code, keyCode) => {
    for (const type of ["keyDown", "keyUp"])
      await send("Input.dispatchKeyEvent", { type, key: keyName, code, windowsVirtualKeyCode: keyCode });
  };

  const close = async () => {
    browser.listeners.delete(listener);
    await browser.send("Target.closeTarget", { targetId });
  };

  return { send, evaluate, waitFor, goto, key, events, close };
}

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? "" });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
    console.log(`  ✗ ${name} — ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const JS = {
  hydrated: `document.documentElement.dataset.hydrated === "1"`,
  violations: `window.__cspViolations || []`,
  workers: `window.__workers || []`,
  h1: `document.querySelector('h1')?.textContent?.trim() ?? ""`,
  overflow: `document.documentElement.scrollWidth - window.innerWidth`,
  text: `document.body.innerText`,
  setValue: (selector, value) => `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`,
  click: (selector) =>
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`,
  clickText: (selector, text) => `(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((n) => n.textContent.trim() === ${JSON.stringify(text)});
    if (!el) return false; el.click(); return true;
  })()`,
  /** Selects a radio in a Segmented control by its visible label. */
  choose: (label) => `(() => {
    const el = [...document.querySelectorAll('label')].find((n) => n.textContent.trim() === ${JSON.stringify(label)} && n.querySelector('input[type=radio]'));
    if (!el) return false; el.querySelector('input').click(); return true;
  })()`,
  /** Value of a StatList entry by its label. */
  stat: (label) =>
    `[...document.querySelectorAll('dl > div')].find((d) => d.querySelector('dt')?.textContent.trim() === ${JSON.stringify(label)})?.querySelector('dd')?.textContent.trim()`,
  supplyFiles: (makeFiles) => `(async () => {
    const files = await (${makeFiles})();
    const input = document.querySelector('input[type="file"]');
    if (!input) return false;
    const dt = new DataTransfer();
    for (const file of files) dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`,
};

/** Every request is to the site's own origin, or a local blob:/data: URL. */
function assertSameOrigin(page, origin, label) {
  const foreign = page.events.requests.filter((url) => !url.startsWith(origin) && !/^(blob|data):/.test(url));
  assert(foreign.length === 0, `${label}: requests left the site: ${JSON.stringify(foreign.slice(0, 3))}`);
}

async function assertCleanLoad(page, label) {
  const violations = await page.evaluate(JS.violations);
  assert(violations.length === 0, `${label}: CSP violations ${JSON.stringify(violations)}`);
  const failed = page.events.failedRequests;
  assert(failed.length === 0, `${label}: failed requests ${JSON.stringify(failed.slice(0, 3))}`);
  const errors = page.events.errors;
  assert(errors.length === 0, `${label}: console errors ${JSON.stringify(errors.slice(0, 3))}`);
}

const AXE_SOURCE = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

/** axe-core, WCAG 2.0/2.1 A and AA rules. Returns serious and critical violations. */
async function axe(page) {
  await page.evaluate(`window.axe ? true : (() => { ${AXE_SOURCE}; return true; })()`);
  const { violations, passes } =
    await page.evaluate(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
    .then((r) => ({
      passes: r.passes.length,
      violations: r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => v.id + " (" + v.nodes.length + "): " + v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")),
    }))`);
  // A run that checked nothing would pass vacuously.
  assert(passes > 10, `axe only evaluated ${passes} rules`);
  return violations;
}

/** In-page: a 64×48 PNG whose right half is transparent. */
const TRANSPARENT_PNG = `async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 48;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d4af37"; ctx.fillRect(0, 0, 32, 48);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  return [new File([blob], "logo.png", { type: "image/png" })];
}`;

/**
 * In-page: a 64×32 JPEG with an EXIF orientation of 6 (rotate 90°), made by
 * inserting an APP1 segment after the SOI marker. Decoded correctly it is 32×64.
 */
const ROTATED_JPEG = `async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 32;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0faf78"; ctx.fillRect(0, 0, 64, 32);
  const jpeg = new Uint8Array(await (await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9))).arrayBuffer());
  const tiff = [0x4d,0x4d,0x00,0x2a,0x00,0x00,0x00,0x08, 0x00,0x01, 0x01,0x12, 0x00,0x03, 0x00,0x00,0x00,0x01, 0x00,0x06,0x00,0x00, 0x00,0x00,0x00,0x00];
  const payload = [0x45,0x78,0x69,0x66,0x00,0x00, ...tiff];
  const length = payload.length + 2;
  const app1 = [0xff, 0xe1, length >> 8, length & 255, ...payload];
  const out = new Uint8Array(jpeg.length + app1.length);
  out.set(jpeg.subarray(0, 2), 0); out.set(app1, 2); out.set(jpeg.subarray(2), 2 + app1.length);
  return [new File([out], "portrait.jpg", { type: "image/jpeg" })];
}`;

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error("No Chrome or Edge found. Set CHROME_PATH.");
    exit(2);
  }

  let server = null;
  let origin;
  if (remoteUrl) origin = new URL(remoteUrl).origin;
  else {
    const root = resolve("out");
    if (!existsSync(join(root, "index.html"))) {
      console.error("out/ is missing. Run `npm run build:static` first.");
      exit(2);
    }
    ({ server, origin } = await startServer(root));
  }

  const site = `${origin}${basePath}`;
  console.log(`Testing ${site}/ with ${chromePath.split(/[\\/]/).pop()}\n`);
  const browser = await launchChrome(chromePath);

  try {
    const routes = [
      "/",
      "/tools/",
      ...TOOL_SLUGS.map((slug) => `/tools/${slug}/`),
      "/categories/",
      "/categories/developer/",
      "/categories/image/",
      "/about/",
      "/privacy/",
      "/accessibility/",
    ];

    /* ------------------------------------------------ direct loads */
    console.log("Direct navigation (desktop)");
    const desktop = await openPage(browser);
    for (const route of routes) {
      await check(`load ${route}`, async () => {
        await desktop.goto(`${site}${route}`);
        assert(desktop.events.lastStatus === 200, `HTTP ${desktop.events.lastStatus}`);
        assert(await desktop.waitFor(JS.hydrated), "did not hydrate (scripts blocked or failed)");
        const csp = await desktop.evaluate(
          `document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content ?? ""`,
        );
        assert(csp.includes("connect-src 'self'"), "no CSP with connect-src 'self'");
        await assertCleanLoad(desktop, route);
        assertSameOrigin(desktop, origin, route);
        return await desktop.evaluate(JS.h1);
      });
    }

    await check("every tool page follows the shared layout and privacy wording", async () => {
      for (const slug of TOOL_SLUGS) {
        await desktop.goto(`${site}/tools/${slug}/`);
        await desktop.waitFor(JS.hydrated);
        const layout = await desktop.evaluate(`(() => {
          const main = document.querySelector('main');
          const order = ['nav[aria-label="Breadcrumb"]', 'h1', '[data-privacy]', 'section[aria-label$="workspace"]', '#how-it-works', '#limitations', '#related']
            .map((s) => main.querySelector(s));
          if (order.some((el) => !el)) return "missing " + order.findIndex((el) => !el);
          if (!order[3].querySelector('input, textarea, button')) return "the workspace rendered no controls";
          for (let i = 1; i < order.length; i += 1) {
            if (!(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING)) return "out of order at " + i;
          }
          return document.querySelector('[data-privacy]').textContent;
        })()`);
        assert(
          layout.includes("Processed locally in your browser. Your files don't leave your device."),
          `${slug}: ${layout}`,
        );
      }
      return `${TOOL_SLUGS.length} tool pages`;
    });

    await check("missing page returns 404 with the site's not-found page", async () => {
      await desktop.goto(`${site}/no-such-page/`);
      assert(desktop.events.lastStatus === 404, `HTTP ${desktop.events.lastStatus}`);
      assert(/doesn.t exist/i.test(await desktop.evaluate(JS.h1)), "custom 404 not rendered");
    });

    await check("tool pages: title, description, canonical, Open Graph and structured data", async () => {
      const problems = [];
      for (const slug of TOOL_SLUGS) {
        await desktop.goto(`${site}/tools/${slug}/`);
        const head = await desktop.evaluate(`(() => {
          const meta = (selector) => document.querySelector(selector)?.getAttribute("content") ?? "";
          const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));
          return {
            title: document.title,
            h1: document.querySelector("h1")?.textContent ?? "",
            description: meta('meta[name="description"]'),
            canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
            ogUrl: meta('meta[property="og:url"]'),
            ogTitle: meta('meta[property="og:title"]'),
            robots: meta('meta[name="robots"]'),
            ld,
          };
        })()`);
        // Canonical URLs are built for the deployed site, not the local test server.
        const expected = `${configuredSite}/tools/${slug}/`;
        if (!head.title.startsWith(`${head.h1} · `)) problems.push(`${slug}: title "${head.title}"`);
        if (head.description.length < 40) problems.push(`${slug}: description "${head.description}"`);
        if (head.canonical !== expected) problems.push(`${slug}: canonical ${head.canonical}`);
        if (head.ogUrl !== expected) problems.push(`${slug}: og:url ${head.ogUrl}`);
        if (!head.ogTitle.includes(head.h1)) problems.push(`${slug}: og:title ${head.ogTitle}`);
        if (/noindex/.test(head.robots)) problems.push(`${slug}: noindex`);
        const app = head.ld.find((entry) => entry["@type"] === "WebApplication");
        if (!app || app.name !== head.h1 || app.url !== expected || app.offers?.price !== "0")
          problems.push(`${slug}: structured data ${JSON.stringify(app)}`);
      }
      assert(problems.length === 0, problems.join("; "));
      return `${TOOL_SLUGS.length} tool pages`;
    });

    await check("sitemap and robots", async () => {
      const sitemap = await (await fetch(`${site}/sitemap.xml`)).text();
      const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
      for (const slug of TOOL_SLUGS) assert(urls.includes(`${configuredSite}/tools/${slug}/`), `sitemap lacks ${slug}`);
      assert(
        urls.every((url) => url.startsWith(`${configuredSite}/`)),
        "sitemap has a URL outside the site",
      );
      assert(new Set(urls).size === urls.length, "sitemap repeats a URL");
      const robots = await (await fetch(`${site}/robots.txt`)).text();
      assert(robots.includes(`Sitemap: ${configuredSite}/sitemap.xml`), "robots.txt does not point to the sitemap");
      assert(/Allow: \//.test(robots) && !/Disallow: \/\s/.test(robots), "robots.txt blocks crawling");
      return `${urls.length} URLs`;
    });

    /* ------------------------------------------------ search */
    console.log("\nSearch");
    for (const [query, expected] of [
      ["compress image", "Image Compressor"],
      ["json pretty", "JSON Formatter"],
      ["qr wifi", "QR Code Generator"],
      ["uuid", "UUID Generator"],
    ]) {
      await check(`search “${query}” → ${expected}`, async () => {
        await desktop.goto(`${site}/tools/?q=${encodeURIComponent(query)}`);
        await desktop.waitFor(JS.hydrated);
        assert(
          await desktop.waitFor(
            `document.querySelector('main article h3')?.textContent.trim() === ${JSON.stringify(expected)}`,
          ),
          `top result: ${await desktop.evaluate(`document.querySelector('main article h3')?.textContent`)}`,
        );
      });
    }

    await check("search for a tool that doesn't exist says so instead of guessing", async () => {
      await desktop.goto(`${site}/tools/?q=edit%20video%20timeline`);
      await desktop.waitFor(JS.hydrated);
      assert(
        await desktop.waitFor(`/There isn.t a tool for that yet/.test(document.body.innerText)`),
        "no honest empty state",
      );
      assert(
        (await desktop.evaluate(`document.querySelectorAll('main article').length`)) === 0,
        "shows unrelated tools",
      );
    });

    await check("home search submits to /tools and filters as you type", async () => {
      await desktop.goto(`${site}/`);
      await desktop.waitFor(JS.hydrated);
      await desktop.evaluate(JS.setValue('form[role="search"] input', "uuid"));
      await desktop.evaluate(JS.click('form[role="search"] button[type="submit"]'));
      assert(
        await desktop.waitFor(`location.pathname.endsWith("/tools/") && location.search.includes("q=uuid")`),
        "did not navigate to /tools/?q=uuid",
      );
      await desktop.waitFor(JS.hydrated);
      await desktop.evaluate(JS.setValue('form[role="search"] input', "base64"));
      assert(
        await desktop.waitFor(
          `document.querySelector('main article h3')?.textContent.trim() === "Base64 Encoder / Decoder"`,
        ),
        "typing did not filter",
      );
    });

    await check("home finder: results as you type, arrows and Enter open a tool", async () => {
      await desktop.goto(`${site}/`);
      await desktop.waitFor(JS.hydrated);
      await desktop.key("/", "Slash", 191);
      assert(
        await desktop.waitFor(`document.activeElement?.hasAttribute("data-primary-search")`),
        "/ did not focus the home search",
      );
      await desktop.send("Input.insertText", { text: "jsno" });
      assert(
        await desktop.waitFor(
          `document.querySelector('[role="combobox"][aria-expanded="true"]') && document.querySelector('[role="listbox"] [role="option"]')?.textContent.includes("JSON")`,
        ),
        "no typo-tolerant results for “jsno”",
      );
      await desktop.key("ArrowDown", "ArrowDown", 40);
      const chosen = await desktop.evaluate(
        `document.getElementById(document.activeElement.getAttribute("aria-activedescendant"))?.querySelector('.truncate')?.textContent`,
      );
      await desktop.key("Enter", "Enter", 13);
      assert(
        await desktop.waitFor(
          `/\\/tools\\/[a-z0-9-]+\\/$/.test(location.pathname) && document.querySelector("h1")?.textContent === ${JSON.stringify(chosen)}`,
        ),
        "Enter did not open the highlighted tool",
      );
      const h1 = await desktop.evaluate(JS.h1);
      assert(h1 === chosen, `opened “${h1}”, highlighted “${chosen}”`);
      return `opened ${h1}`;
    });

    await check("command palette: Ctrl+K opens, searches, Esc closes, Enter opens a tool", async () => {
      await desktop.goto(`${site}/about/`);
      await desktop.waitFor(JS.hydrated);
      const ctrlK = async () => {
        for (const type of ["keyDown", "keyUp"])
          await desktop.send("Input.dispatchKeyEvent", {
            type,
            key: "k",
            code: "KeyK",
            windowsVirtualKeyCode: 75,
            modifiers: 2,
          });
      };
      await ctrlK();
      assert(await desktop.waitFor(`!!document.querySelector("dialog[open] [role=combobox]")`), "palette did not open");
      assert(
        await desktop.waitFor(`document.activeElement?.getAttribute("role") === "combobox"`),
        "focus not in the palette",
      );
      assert(
        await desktop.evaluate(`document.querySelector("dialog[open]").textContent.includes("Essential tools")`),
        "empty palette does not suggest tools",
      );
      await desktop.send("Input.insertText", { text: "uuid" });
      assert(
        await desktop.waitFor(
          `document.querySelector('dialog[open] [role="option"][aria-selected="true"]')?.textContent.includes("UUID Generator")`,
        ),
        "first result is not UUID Generator",
      );
      await desktop.key("Escape", "Escape", 27);
      assert(await desktop.waitFor(`!document.querySelector("dialog[open]")`), "Escape did not close the palette");
      await ctrlK();
      assert(
        await desktop.waitFor(`!!document.querySelector("dialog[open] [role=combobox]")`),
        "palette did not reopen",
      );
      await desktop.send("Input.insertText", { text: "qr" });
      await desktop.waitFor(`!!document.querySelector('dialog[open] [role="option"][aria-selected="true"]')`);
      await desktop.key("Enter", "Enter", 13);
      assert(
        await desktop.waitFor(
          `location.pathname.endsWith("/tools/qr-generator/") && !document.querySelector("dialog[open]")`,
        ),
        "Enter did not open the QR tool",
      );
      await assertCleanLoad(desktop, "palette");
      assertSameOrigin(desktop, origin, "palette");
    });

    await check("tools directory: category and processing filters, kept in the address bar", async () => {
      await desktop.goto(`${site}/tools/?category=image`);
      await desktop.waitFor(JS.hydrated);
      assert(
        await desktop.waitFor(
          `/^\\d+ tools? in Image\\.$/.test(document.querySelector('main [role="status"]')?.textContent ?? "") && document.querySelectorAll('main article').length > 0`,
        ),
        "category filter from the URL not applied",
      );
      const imageCount = await desktop.evaluate(`document.querySelectorAll('main article').length`);
      await desktop.evaluate(JS.clickText("aside button", `Runs in your browser${imageCount}`));
      assert(
        await desktop.waitFor(`location.search.includes("processing=local")`),
        "processing filter not reflected in the URL",
      );
      assert(
        await desktop.evaluate(
          `[...document.querySelectorAll('aside button')].find((b) => b.textContent.startsWith("Uses a network"))?.disabled`,
        ),
        "an empty filter option is not disabled",
      );
      return `${imageCount} image tools`;
    });

    await check("theme toggle switches between light and dark", async () => {
      await desktop.goto(`${site}/`);
      await desktop.waitFor(JS.hydrated);
      const bg = () => desktop.evaluate(`getComputedStyle(document.body).backgroundColor`);
      const before = await bg();
      await desktop.evaluate(JS.click('header button[aria-label^="Switch to"]'));
      await sleep(100);
      const after = await bg();
      assert(before !== after, `background stayed ${before}`);
      const cls = await desktop.evaluate(`document.documentElement.className`);
      assert(/\b(light|dark)\b/.test(cls), `no theme class on <html>: ${cls}`);
      return `${before} → ${after}`;
    });

    await check("tools.json: the public catalogue lists every tool with links into this site", async () => {
      const catalog = await (await fetch(`${site}/tools.json`)).json();
      assert(catalog.version === 1, `version ${catalog.version}`);
      for (const slug of TOOL_SLUGS)
        assert(
          catalog.tools.some((tool) => tool.slug === slug),
          `missing ${slug}`,
        );
      assert(
        catalog.tools.every((tool) => tool.url.startsWith(`${configuredSite}/tools/`)),
        "a tool URL points outside the site",
      );
      return `${catalog.tools.length} tools`;
    });

    /* ------------------------------------------------ tools */
    console.log("\nTools");

    await check("JSON: formats in a worker and keeps big integers exact", async () => {
      await desktop.goto(`${site}/tools/json-formatter/`);
      await desktop.waitFor(JS.hydrated);
      assert(await desktop.waitFor(`!!document.querySelector('textarea')`), "no input");
      await desktop.evaluate(JS.setValue("textarea", '{"id":12345678901234567890,"price":1.10}'));
      await desktop.evaluate(JS.click('form button[type="submit"]'));
      assert(
        await desktop.waitFor(
          `[...document.querySelectorAll('textarea[readonly]')].some((t) => t.value.includes('"id": 12345678901234567890') && t.value.includes('1.10'))`,
        ),
        "formatted output missing or altered",
      );
      const workers = await desktop.evaluate(JS.workers);
      assert(
        workers.some((url) => url.includes("/_next/")),
        `no worker started (${JSON.stringify(workers)})`,
      );
      assert(
        await desktop.evaluate(`!!document.querySelector('a[download="formatted.json"][href^="blob:"]')`),
        "no download link",
      );
      await assertCleanLoad(desktop, "json");
      assertSameOrigin(desktop, origin, "json");
      return `worker ${workers[0].split("/").pop()}`;
    });

    await check("JSON: reports the line and column of an error", async () => {
      await desktop.evaluate(JS.setValue("textarea", '{\n  "a": 1,\n}'));
      await desktop.evaluate(JS.click('form button[type="submit"]'));
      assert(await desktop.waitFor(`document.body.innerText.includes("Line 3, column 1")`), "no location shown");
      assert(await desktop.evaluate(`document.body.innerText.includes("Trailing commas")`), "no explanation");
    });

    await check("Text counter: counts words and characters as you type", async () => {
      await desktop.goto(`${site}/tools/text-counter/`);
      await desktop.waitFor(JS.hydrated);
      assert(await desktop.waitFor(`!!document.querySelector('textarea')`), "no input");
      await desktop.evaluate(JS.setValue("textarea", "Hello wörld. Two sentences here! 👨‍👩‍👧"));
      assert(
        await desktop.waitFor(`${JS.stat("Words")} === "5"`),
        `words = ${await desktop.evaluate(JS.stat("Words"))}`,
      );
      assert(
        await desktop.evaluate(`${JS.stat("Sentences")} === "2"`),
        `sentences = ${await desktop.evaluate(JS.stat("Sentences"))}`,
      );
      assert(
        await desktop.evaluate(`${JS.stat("Characters")} === "34"`),
        `characters = ${await desktop.evaluate(JS.stat("Characters"))}`,
      );
      await assertCleanLoad(desktop, "text counter");
    });

    await check("UUID: generates valid, sorted v7 UUIDs", async () => {
      await desktop.goto(`${site}/tools/uuid-generator/`);
      await desktop.waitFor(JS.hydrated);
      assert(await desktop.waitFor(JS.choose("v7 · time-ordered")), "no v7 option");
      await desktop.evaluate(JS.setValue('input[type="number"]', "20"));
      await desktop.evaluate(JS.click('form button[type="submit"]'));
      assert(
        await desktop.waitFor(`document.querySelector('textarea[readonly]')?.value.split("\\n").length === 20`),
        "not 20 UUIDs",
      );
      const ok = await desktop.evaluate(`(() => {
        const list = document.querySelector('textarea[readonly]').value.split("\\n");
        const valid = list.every((u) => /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u));
        return valid && JSON.stringify([...list].sort()) === JSON.stringify(list) && new Set(list).size === 20;
      })()`);
      assert(ok, "UUIDs invalid, unsorted or repeated");
      await assertCleanLoad(desktop, "uuid");
    });

    await check("Base64: UTF-8 round trip and strict decoding", async () => {
      await desktop.goto(`${site}/tools/base64/`);
      await desktop.waitFor(JS.hydrated);
      assert(await desktop.waitFor(`!!document.querySelector('textarea')`), "no input");
      await desktop.evaluate(JS.setValue("textarea", "héllo 😀"));
      await desktop.evaluate(JS.click('form button[type="submit"]'));
      const expected = Buffer.from("héllo 😀", "utf8").toString("base64");
      assert(
        await desktop.waitFor(`document.querySelector('textarea[readonly]')?.value === ${JSON.stringify(expected)}`),
        "wrong encoding",
      );
      await desktop.evaluate(JS.choose("Decode"));
      await desktop.waitFor(`document.querySelector('form button[type="submit"]')?.textContent.trim() === "Decode"`);
      await desktop.evaluate(JS.setValue("textarea", "not*base64"));
      await desktop.evaluate(JS.click('form button[type="submit"]'));
      assert(
        await desktop.waitFor(
          `document.querySelector('[role="alert"]')?.textContent.includes("isn't a Base64 character")`,
        ),
        "invalid input not reported",
      );
      await desktop.evaluate(JS.setValue("textarea", expected));
      await desktop.evaluate(JS.click('form button[type="submit"]'));
      assert(
        await desktop.waitFor(`document.querySelector('textarea[readonly]')?.value === "héllo 😀"`),
        "decode failed",
      );
      assert(
        await desktop.evaluate(`document.body.innerText.includes("not encryption")`),
        "no encoding-is-not-encryption note",
      );
      await assertCleanLoad(desktop, "base64");
    });

    await check("Image: keeps transparency (WebP), runs in a worker, never leaves the origin", async () => {
      await desktop.goto(`${site}/tools/image-compressor/`);
      await desktop.waitFor(JS.hydrated);
      assert(await desktop.waitFor(`!!document.querySelector('input[type="file"]')`), "no file input");
      assert(await desktop.evaluate(JS.supplyFiles(TRANSPARENT_PNG)), "could not supply a file");
      assert(await desktop.waitFor(JS.clickText("button", "Compress")), "no Compress button");
      assert(
        await desktop.waitFor(`!!document.querySelector('a[download$="-compressed.webp"][href^="blob:"]')`),
        "no WebP download",
      );
      const text = await desktop.evaluate(JS.text);
      assert(text.includes("64 × 48"), "dimensions not shown");
      assert(text.includes("PNG ·") && text.includes("WebP ·"), "before and after formats not shown");
      assert(/smaller|larger|same size/.test(text), "no size comparison");
      assert(
        await desktop.waitFor(
          `[...document.querySelectorAll('img[src^="blob:"]')].filter((i) => i.complete && i.naturalWidth > 0).length === 2`,
        ),
        "before/after previews did not render",
      );
      const workers = await desktop.evaluate(JS.workers);
      assert(workers.length > 0, "no worker started");
      await assertCleanLoad(desktop, "image");
      assertSameOrigin(desktop, origin, "image");
      return `worker ${workers[0].split("/").pop()}`;
    });

    await check("Image: applies EXIF orientation", async () => {
      await desktop.goto(`${site}/tools/image-compressor/`);
      await desktop.waitFor(JS.hydrated);
      await desktop.waitFor(`!!document.querySelector('input[type="file"]')`);
      assert(await desktop.evaluate(JS.supplyFiles(ROTATED_JPEG)), "could not supply a file");
      assert(await desktop.waitFor(JS.clickText("button", "Compress")), "no Compress button");
      assert(
        await desktop.waitFor(`!!document.querySelector('a[download$="-compressed.jpg"][href^="blob:"]')`),
        "no JPEG download",
      );
      const text = await desktop.evaluate(JS.text);
      assert(text.includes("32 × 64"), `orientation not applied: ${text.match(/\d+ × \d+/g)}`);
      await assertCleanLoad(desktop, "image orientation");
    });

    await check("QR: link and Wi-Fi codes render as SVG with PNG and SVG downloads", async () => {
      await desktop.goto(`${site}/tools/qr-generator/`);
      await desktop.waitFor(JS.hydrated);
      assert(await desktop.waitFor(`!!document.querySelector('textarea')`), "no input");
      await desktop.evaluate(JS.setValue("textarea", "https://example.com"));
      assert(
        await desktop.waitFor(`document.querySelector('svg[role="img"] path')?.getAttribute('d')?.length > 100`),
        "no QR preview",
      );
      assert(
        await desktop.waitFor(
          `!!document.querySelector('a[download="qr-code.png"][href^="blob:"]') && !!document.querySelector('a[download="qr-code.svg"][href^="blob:"]')`,
        ),
        "downloads missing",
      );
      await desktop.evaluate(JS.choose("Wi-Fi network"));
      assert(await desktop.waitFor(`!!document.querySelector('input[autocomplete="off"]')`), "no Wi-Fi fields");
      // SSID then password: the two text inputs of the Wi-Fi form, in order.
      const tagged = await desktop.evaluate(`(() => {
        const fields = [...document.querySelectorAll('main input[type="text"], main input:not([type])')];
        fields[0]?.setAttribute("data-t", "ssid"); fields[1]?.setAttribute("data-t", "pw");
        return fields.length;
      })()`);
      assert(tagged === 2, `expected SSID and password fields, found ${tagged}`);
      await desktop.evaluate(JS.setValue('[data-t="pw"]', "correct horse"));
      await desktop.evaluate(JS.setValue('[data-t="ssid"]', "Home;Net"));
      assert(
        await desktop.waitFor(
          `document.querySelector('svg[role="img"]')?.getAttribute('aria-label')?.includes("Home;Net")`,
        ),
        "no Wi-Fi code",
      );
      await assertCleanLoad(desktop, "qr");
      assertSameOrigin(desktop, origin, "qr");
    });

    /* ------------------------------------------------ accessibility */
    console.log("\nAccessibility");
    await check("keyboard: first Tab reaches a visible skip link", async () => {
      await desktop.goto(`${site}/`);
      await desktop.waitFor(JS.hydrated);
      await desktop.key("Tab", "Tab", 9);
      const text = await desktop.evaluate(`document.activeElement?.textContent?.trim()`);
      assert(text === "Skip to main content", `focused "${text}"`);
      assert(
        (await desktop.evaluate(`getComputedStyle(document.activeElement).outlineStyle`)) !== "none",
        "no focus outline",
      );
    });

    for (const route of routes) {
      await check(`axe (WCAG 2.1 A/AA, serious+critical): ${route}`, async () => {
        await desktop.goto(`${site}${route}`);
        await desktop.waitFor(JS.hydrated);
        await sleep(300);
        const violations = await axe(desktop);
        assert(violations.length === 0, violations.join("; "));
      });
    }

    await check("axe on tool results (JSON error, image result)", async () => {
      await desktop.goto(`${site}/tools/json-formatter/`);
      await desktop.waitFor(JS.hydrated);
      await desktop.waitFor(`!!document.querySelector('textarea')`);
      await desktop.evaluate(JS.setValue("textarea", "{'a':1}"));
      await desktop.evaluate(JS.click('form button[type="submit"]'));
      await desktop.waitFor(`document.body.innerText.includes("Line 1")`);
      let violations = await axe(desktop);
      assert(violations.length === 0, `json: ${violations.join("; ")}`);
      await desktop.goto(`${site}/tools/image-compressor/`);
      await desktop.waitFor(JS.hydrated);
      await desktop.waitFor(`!!document.querySelector('input[type="file"]')`);
      await desktop.evaluate(JS.supplyFiles(TRANSPARENT_PNG));
      await desktop.waitFor(JS.clickText("button", "Compress"));
      await desktop.waitFor(`!!document.querySelector('a[download][href^="blob:"]')`);
      violations = await axe(desktop);
      assert(violations.length === 0, `image: ${violations.join("; ")}`);
    });
    await desktop.close();

    /* ------------------------------------------------ small screens */
    for (const [name, viewport] of [
      ["mobile", VIEWPORTS.mobile],
      ["narrow", VIEWPORTS.narrow],
    ]) {
      console.log(`\n${name} (${viewport.width}×${viewport.height})`);
      const page = await openPage(browser, { viewport });
      for (const route of routes) {
        await check(`${name} ${route} has no horizontal overflow`, async () => {
          await page.goto(`${site}${route}`);
          await page.waitFor(JS.hydrated);
          await sleep(200);
          const overflow = await page.evaluate(JS.overflow);
          if (shotsDir) {
            const { data } = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
            await writeFile(
              join(shotsDir, `${name}${route.replace(/\//g, "_") || "_"}.png`),
              Buffer.from(data, "base64"),
            );
          }
          assert(overflow <= 1, `content ${overflow}px wider than the viewport`);
        });
      }
      await page.close();
    }

    /* ------------------------------------------------ JavaScript disabled */
    console.log("\nJavaScript disabled");
    const noJs = await openPage(browser, { javascript: false });
    await check("no-JS: /tools lists every tool as static HTML", async () => {
      await noJs.goto(`${site}/tools/`);
      const cards = await noJs.evaluate(`document.querySelectorAll('main article').length`);
      const stated = Number((await noJs.evaluate(JS.text)).match(/All (\d+) tools/)?.[1]);
      assert(cards >= TOOL_SLUGS.length && cards === stated, `${cards} cards, page says ${stated}`);
      return `${cards} tools`;
    });
    await check("no-JS: a tool page explains itself and says JavaScript is needed", async () => {
      await noJs.goto(`${site}/tools/image-compressor/`);
      const text = await noJs.evaluate(JS.text);
      assert(text.includes("needs JavaScript"), "no noscript notice");
      assert(text.includes("Limitations") && text.includes("How it works"), "page body missing");
    });
    await noJs.close();
  } finally {
    await browser.close();
    server?.close();
  }

  const failed = results.filter((r) => !r.ok);
  const summary = `${results.length - failed.length}/${results.length} checks passed`;
  console.log(`\n${summary}`);

  const reportFlag = argv.indexOf("--report");
  if (reportFlag !== -1) {
    const lines = [
      summary,
      ...results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`),
    ];
    await writeFile(argv[reportFlag + 1], `${lines.join("\n")}\n`, "utf8");
  }
  exit(failed.length === 0 ? 0 : 1);
}

await main();
