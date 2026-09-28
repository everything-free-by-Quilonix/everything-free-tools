/**
 * Module resolution for the unit tests.
 *
 * The tests run on Node's built-in test runner against the TypeScript source
 * directly, with no build step and no test dependency: Node strips the type
 * annotations itself. The only thing Node cannot do on its own is follow the
 * project's import conventions â€” the `@/` alias and extensionless relative imports,
 * which the Next.js bundler resolves. These hooks add exactly that, and nothing
 * else.
 */

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../../src/", import.meta.url);
const CANDIDATES = [".ts", ".tsx", "/index.ts"];

function toTypeScript(url) {
  const path = fileURLToPath(url);
  if (existsSync(path) && !path.endsWith("/") && /\.[cm]?[jt]sx?$/.test(path)) return url.href;
  for (const suffix of CANDIDATES) {
    if (existsSync(path + suffix)) return pathToFileURL(path + suffix).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = toTypeScript(new URL(specifier.slice(2), SRC));
    if (resolved) return nextResolve(resolved, context);
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const url = new URL(specifier, context.parentURL);
    // TypeScript convention: `./fixtures.mjs` in source means `./fixtures.mts` on disk.
    const typescriptTwin = url.href.replace(/\.(m?)js$/, ".$1ts");
    if (typescriptTwin !== url.href && !existsSync(fileURLToPath(url)) && existsSync(fileURLToPath(typescriptTwin))) {
      return nextResolve(typescriptTwin, context);
    }
    if (!/\.(?:[cm]?[jt]sx?|json)$/.test(specifier)) {
      const resolved = toTypeScript(url);
      if (resolved) return nextResolve(resolved, context);
    }
  }
  return nextResolve(specifier, context);
}
