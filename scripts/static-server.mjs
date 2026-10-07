/**
 * A static file server that behaves like GitHub Pages: files under a base path,
 * `index.html` for directories, the site's 404 page for anything else, and no
 * security headers (the production host can't send any, so the meta CSP must hold
 * up on its own). Used by the browser tests.
 */

import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

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

export async function startStaticServer(root, basePath) {
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
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      await send404();
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
