#!/usr/bin/env node
/**
 * Bundle check over the static export in `out/`.
 *
 * For each page, finds every JavaScript chunk the page loads up front (script tags
 * and chunk references in the inline payload), measures it, and checks that:
 *
 * - a tool page does not load another tool's engine (the JSON page must not ship the
 *   image engine or the QR library, and so on);
 * - the heavy engines are not loaded up front at all: they arrive in a worker or a
 *   lazy fallback chunk only when the user runs the tool;
 * - each engine really was emitted as its own chunk (so the worker exists);
 * - total up-front JavaScript per page stays within a budget.
 *
 * Engines are recognised by a distinctive string they contain.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const OUT = "out";
const BASE = "/everything-free-tools";
/** Up-front JavaScript per page, gzipped. */
const BUDGET_GZIP = 180_000;

const ENGINES = {
  "QR library (uqr)": "Data too long",
  "image engine": "imageOrientation",
  "JSON engine": "Trailing commas aren't allowed",
};

/** Which engines each page may load up front. */
const ALLOWED = {
  "tools/qr-generator": ["QR library (uqr)"],
};

if (!existsSync(OUT)) {
  console.error("✗ out/ not found. Run `npm run build:static` first.");
  process.exit(1);
}

const chunkDir = join(OUT, "_next", "static", "chunks");
const chunkText = new Map();
const readChunk = (name) => {
  if (!chunkText.has(name)) {
    const path = join(chunkDir, name);
    chunkText.set(name, existsSync(path) ? readFileSync(path, "utf8") : null);
  }
  return chunkText.get(name);
};

function* pages(dir, prefix = "") {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "_next") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* pages(path, prefix ? `${prefix}/${entry.name}` : entry.name);
    else if (entry.name === "index.html") yield { route: prefix || "/", path };
  }
}

const problems = [];
const rows = [];

for (const page of pages(OUT)) {
  const html = readFileSync(page.path, "utf8");
  // Legacy polyfills in <script noModule> are never downloaded by modern browsers.
  const legacy = new Set(
    [...html.matchAll(/<script[^>]*\bsrc="[^"]*static\/chunks\/([\w.-]+\.js)"[^>]*\bnoModule/gi)].map(
      (match) => match[1],
    ),
  );
  const chunks = new Set(
    [...html.matchAll(/static\/chunks\/([\w.-]+\.js)/g)].map((match) => match[1]).filter((name) => !legacy.has(name)),
  );
  let raw = 0;
  let gzip = 0;
  const found = new Set();

  for (const name of chunks) {
    const text = readChunk(name);
    if (text === null) {
      problems.push(`${page.route}: references missing chunk ${name}`);
      continue;
    }
    raw += Buffer.byteLength(text);
    gzip += gzipSync(text).length;
    for (const [engine, marker] of Object.entries(ENGINES)) if (text.includes(marker)) found.add(engine);
  }

  const allowed = ALLOWED[page.route] ?? [];
  for (const engine of found) {
    if (!allowed.includes(engine)) problems.push(`${page.route}: loads the ${engine} up front`);
  }
  if (gzip > BUDGET_GZIP)
    problems.push(
      `${page.route}: ${(gzip / 1000).toFixed(1)} kB gzipped JS is over the ${BUDGET_GZIP / 1000} kB budget`,
    );
  rows.push({ route: page.route, chunks: chunks.size, raw, gzip, engines: [...found].join(", ") || "—" });
}

// Every engine must exist somewhere in the output, in a chunk of its own.
const allChunks = readdirSync(chunkDir).filter(
  (name) => name.endsWith(".js") && statSync(join(chunkDir, name)).isFile(),
);
for (const [engine, marker] of Object.entries(ENGINES)) {
  const holders = allChunks.filter((name) => readChunk(name)?.includes(marker));
  if (holders.length === 0) problems.push(`the ${engine} was not found in any chunk`);
  else console.log(`  ${engine}: ${holders.length} chunk(s) (worker and/or lazy fallback)`);
}

rows.sort((a, b) => a.route.localeCompare(b.route));
console.log("\n  page                               chunks     raw kB    gzip kB  engines up front");
for (const row of rows) {
  console.log(
    `  ${row.route.padEnd(34)} ${String(row.chunks).padStart(6)} ${(row.raw / 1000).toFixed(1).padStart(10)} ${(
      row.gzip / 1000
    )
      .toFixed(1)
      .padStart(10)}  ${row.engines}`,
  );
}

if (problems.length > 0) {
  console.error(`\n✗ Bundle check failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`\n✓ Bundle check: ${rows.length} pages, no page loads another tool's engine (base path ${BASE})`);
