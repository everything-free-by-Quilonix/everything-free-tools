/**
 * Page selections for the PDF tools: "1-3, 5, 8-" in, page numbers out.
 *
 * Kept free of the PDF library so it is cheap to load and easy to test. Page
 * numbers are 1-based in the interface and 0-based in the result.
 */

export interface PageRange {
  /** 0-based, inclusive. */
  start: number;
  /** 0-based, inclusive. */
  end: number;
}

/** A page selection the person needs to correct. The message says how. */
export class PageRangeError extends Error {
  override name = "PageRangeError";
}

/**
 * Parses a list such as "1-3, 5, 8-" against a document of `pageCount` pages.
 *
 * - "5" is one page; "1-3" is pages 1 to 3; "8-" runs to the last page; "-3" is
 *   pages 1 to 3; "3-1" is pages 3, 2, 1 (reversed).
 * - Whitespace is ignored; commas or semicolons separate parts.
 * - Anything out of range, or not a page number, is reported with the part that
 *   caused it, so the person can fix their input.
 */
export function parsePageRanges(input: string, pageCount: number): PageRange[] {
  const parts = input
    .split(/[,;]/)
    .map((part) => part.replace(/\s+/g, ""))
    .filter(Boolean);
  if (parts.length === 0) throw new PageRangeError("Enter the pages you want, for example 1-3, 5.");

  const page = (text: string, part: string): number => {
    if (!/^\d+$/.test(text)) throw new PageRangeError(`“${part}” isn't a page number or range.`);
    const value = Number(text);
    if (value < 1 || value > pageCount)
      throw new PageRangeError(
        `Page ${value} doesn't exist: this document has ${pageCount} ${pageCount === 1 ? "page" : "pages"}.`,
      );
    return value - 1;
  };

  return parts.map((part) => {
    const dash = part.indexOf("-");
    if (dash === -1) {
      const index = page(part, part);
      return { start: index, end: index };
    }
    const from = part.slice(0, dash);
    const to = part.slice(dash + 1);
    if (to.includes("-") || (!from && !to)) throw new PageRangeError(`“${part}” isn't a page number or range.`);
    return { start: from ? page(from, part) : 0, end: to ? page(to, part) : pageCount - 1 };
  });
}

/** Every page index covered by the ranges, in order, repeats kept (a page can be wanted twice). */
export function rangeIndices(ranges: readonly PageRange[]): number[] {
  const out: number[] = [];
  for (const { start, end } of ranges) {
    const step = start <= end ? 1 : -1;
    for (let index = start; step > 0 ? index <= end : index >= end; index += step) out.push(index);
  }
  return out;
}

/** "1-3" / "5" for a range, 1-based, for file names and labels. */
export function rangeLabel({ start, end }: PageRange): string {
  return start === end ? `${start + 1}` : `${start + 1}-${end + 1}`;
}

/** Splits a document into chunks of `size` pages: 10 pages by 3 → 1-3, 4-6, 7-9, 10. */
export function fixedSizeRanges(pageCount: number, size: number): PageRange[] {
  const step = Math.max(1, Math.floor(size));
  const ranges: PageRange[] = [];
  for (let start = 0; start < pageCount; start += step) {
    ranges.push({ start, end: Math.min(pageCount, start + step) - 1 });
  }
  return ranges;
}
