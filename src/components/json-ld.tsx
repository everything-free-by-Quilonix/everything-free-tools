import { jsonLd } from "@/lib/seo";

/**
 * Structured data. The one place raw HTML is written: React would HTML-escape a text
 * child, which corrupts JSON. `jsonLd` escapes "<", so no value can close the element.
 */
export function JsonLd({ data }: { data: unknown }) {
  // eslint-disable-next-line react/no-danger -- serialised by jsonLd(), which escapes "<"
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
