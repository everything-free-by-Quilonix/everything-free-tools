#!/usr/bin/env node
/**
 * Produces the static production build in `out/`.
 *
 * 1. `next build` with STATIC_EXPORT=1 (`output: "export"`). This fails if any route
 *    needs a server, which is the architectural guarantee that the site has no runtime.
 * 2. `fix-rsc-paths.mjs` works around a Next.js 16 export bug on Windows builds.
 * 3. `csp.mjs` writes a strict, hash-based Content Security Policy into every page,
 *    because a static host cannot send headers.
 *
 * A wrapper script rather than `STATIC_EXPORT=1 next build` so it works on Windows
 * without a cross-env dependency.
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { applyCsp } from "./csp.mjs";
import { fixRscPaths } from "./fix-rsc-paths.mjs";

function run(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolvePromise(code ?? 1));
  });
}

const code = await run("npx", ["next", "build"], { STATIC_EXPORT: "1" });
if (code !== 0) process.exit(code);

try {
  const { copied } = await fixRscPaths(resolve("out"));
  console.log(`\n✓ Navigation payloads: ${copied} segment files copied (vercel/next.js#85374)`);
  const { pages, hashed } = await applyCsp(resolve("out"));
  console.log(`✓ Content Security Policy written into ${pages} pages (${hashed} inline scripts hashed)`);
} catch (error) {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
