#!/usr/bin/env node
/**
 * Privacy and safety check over the application source.
 *
 * The Content Security Policy (`connect-src 'self'`) stops a page from sending data
 * to another host at runtime. This check stops the code that would try from being
 * written in the first place, and keeps the claims on the Privacy page true:
 *
 * - no network APIs in application code (fetch, XHR, beacons, sockets, event streams);
 * - no persistent storage or cookies (the Privacy page says nothing is stored);
 * - no eval or new Function;
 * - no Math.random in processing engines (randomness must come from Web Crypto);
 * - no absolute http(s) URLs in scripts or workers, which would load third-party code.
 *
 * A line can opt out with `privacy-check: allow <reason>`, which keeps every
 * exception visible in review. There are none today.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

const RULES = [
  { pattern: /\bfetch\s*\(/, message: "network request (fetch)" },
  { pattern: /\bXMLHttpRequest\b/, message: "network request (XMLHttpRequest)" },
  { pattern: /\bsendBeacon\b/, message: "network beacon" },
  { pattern: /\bnew\s+WebSocket\b/, message: "WebSocket connection" },
  { pattern: /\bnew\s+EventSource\b/, message: "EventSource connection" },
  { pattern: /\b(localStorage|sessionStorage|indexedDB)\b/, message: "persistent browser storage" },
  { pattern: /\bdocument\.cookie\b/, message: "cookie access" },
  { pattern: /\beval\s*\(/, message: "eval" },
  { pattern: /\bnew\s+Function\s*\(/, message: "new Function" },
  { pattern: /\bimportScripts\s*\(/, message: "importScripts" },
  { pattern: /import\s*\(\s*["']https?:/, message: "remote module import" },
  { pattern: /new\s+Worker\s*\(\s*["'`]https?:/, message: "remote worker" },
  { pattern: /Math\.random\s*\(/, message: "Math.random in an engine (use Web Crypto)", only: /[\\/]engines[\\/]/ },
];

async function* sourceFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name)) yield path;
  }
}

const problems = [];
let files = 0;

for await (const file of sourceFiles(SRC)) {
  files += 1;
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("privacy-check: allow")) return;
    // Comments explain these APIs; only code counts.
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
    for (const rule of RULES) {
      if (rule.only && !rule.only.test(file)) continue;
      if (rule.pattern.test(code)) problems.push(`${relative(ROOT, file)}:${index + 1}  ${rule.message}`);
    }
  });
}

if (problems.length > 0) {
  console.error(`✗ Privacy check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ Privacy check: ${files} source files, no network, storage, eval or insecure randomness`);
