import { buildCatalog } from "@/lib/catalog";

/** The public tool catalogue, written once at build time. See `lib/catalog.ts`. */
export const dynamic = "force-static";

export function GET() {
  return new Response(`${JSON.stringify(buildCatalog(), null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
