import type { NextConfig } from "next";

import { basePath } from "./src/config/deployment";

/**
 * The application has no server runtime. Every route is statically generated;
 * there are no API routes, server actions or per-request rendering. With
 * `STATIC_EXPORT=1` the build writes a plain `out/` directory, and `output: "export"`
 * makes the build fail if anything ever needs a server. That failure is the
 * guarantee behind "₹0 mandatory infrastructure".
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const } : {}),
  // GitHub Pages serves the site under /everything-free-tools. Derived from the
  // public URL so the two cannot disagree. Empty at a domain root.
  basePath,
  // Image optimisation needs a server. Nothing here needs it.
  images: { unoptimized: true },
  // Static hosts serve /path/ from /path/index.html.
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
