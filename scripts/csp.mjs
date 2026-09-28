/**
 * Content Security Policy for the static export.
 *
 * GitHub Pages cannot send response headers, so the policy is written into each
 * exported page as a `<meta http-equiv="Content-Security-Policy">` tag.
 *
 * - Scripts: no 'unsafe-inline'. Every inline script in the export is static text
 *   (Next.js payload chunks), so each page lists the SHA-256 of exactly the inline
 *   scripts it contains. An injected script does not match and does not run.
 * - connect-src 'self': the page may only fetch from its own origin (client
 *   navigation payloads). This is the enforcement behind "your files don't leave
 *   your device": even a bug could not send data to another host.
 * - worker-src 'self': processing workers are same-origin build output.
 * - img-src blob: data:: previews of locally generated results.
 * - style-src-attr 'unsafe-inline': React `style={{…}}` attributes cannot be hashed.
 *   Injected `<style>` elements are still blocked by style-src-elem 'self'.
 * - frame-ancestors / report-to are ignored in meta policies, so they are omitted.
 *
 * The build fails if a page contains an inline event handler or a javascript: URL,
 * which a hash-based policy would silently break.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const DATA_BLOCK = /type=["']?application\/(ld\+)?json/i;

export function buildPolicy(scriptHashes) {
  return [
    "default-src 'self'",
    `script-src ${["'self'", ...scriptHashes.map((hash) => `'sha256-${hash}'`)].join(" ")}`,
    "worker-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("base64");

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

export async function applyCsp(outDir) {
  let pages = 0;
  let hashed = 0;
  const problems = [];

  for await (const file of htmlFiles(outDir)) {
    let html = await readFile(file, "utf8");
    if (html.includes('http-equiv="Content-Security-Policy"')) {
      problems.push(`${file}: already has a CSP meta tag`);
      continue;
    }

    const withoutScripts = html.replace(INLINE_SCRIPT, "");
    if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(withoutScripts)) problems.push(`${file}: inline event handler`);
    if (/\shref=["']?\s*javascript:/i.test(withoutScripts)) problems.push(`${file}: javascript: URL`);

    const hashes = new Set();
    for (const [, attributes, content] of html.matchAll(INLINE_SCRIPT)) {
      if (!DATA_BLOCK.test(attributes)) hashes.add(sha256(content));
    }

    const meta = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy([...hashes])}"/>`;
    const charset = /<meta charSet="utf-8"\s*\/?>/i;
    if (charset.test(html)) html = html.replace(charset, (tag) => `${tag}${meta}`);
    else if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (tag) => `${tag}${meta}`);
    else {
      problems.push(`${file}: no <head>`);
      continue;
    }

    await writeFile(file, html, "utf8");
    pages += 1;
    hashed += hashes.size;
  }

  if (problems.length > 0) throw new Error(`Could not apply a strict CSP:\n  - ${problems.join("\n  - ")}`);
  return { pages, hashed };
}
