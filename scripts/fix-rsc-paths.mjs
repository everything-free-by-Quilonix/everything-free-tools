/**
 * Works around a Next.js 16 static-export bug in client-navigation payload paths
 * (https://github.com/vercel/next.js/issues/85374).
 *
 * The router fetches `/tools/x/__next.tools.$d$tool.__PAGE__.txt`, but a Windows
 * export writes `/tools/x/__next.tools/$d$tool/__PAGE__.txt`. This copies each nested
 * segment to the flat name the router asks for. Linux builds (CI, production) need
 * no copies; the pass is idempotent and reports 0 there.
 */

import { copyFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function fixRscPaths(outDir) {
  let copied = 0;
  for await (const file of walk(outDir)) {
    if (!file.endsWith(".txt")) continue;
    const parts = relative(outDir, file).split(sep);
    const start = parts.findIndex((part, index) => index < parts.length - 1 && part.startsWith("__next."));
    if (start === -1) continue;
    const target = join(outDir, ...parts.slice(0, start), parts.slice(start).join("."));
    if (!(await exists(target))) {
      await copyFile(file, target);
      copied += 1;
    }
  }
  return { copied };
}
