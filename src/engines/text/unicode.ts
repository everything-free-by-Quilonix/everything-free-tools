/**
 * Native Unicode Character Inspector & Lookup Engine.
 *
 * Inspects character code points, UTF-8/UTF-16 encoding bytes, decimal/hex representations,
 * surrogate pairs, and Unicode general categories. 100% local, zero network.
 */

export interface UnicodeCharDetail {
  char: string;
  codePoint: number;
  hexCodePoint: string;
  decimal: number;
  utf8Hex: string;
  utf8Bytes: number[];
  utf16Hex: string;
  category: string;
  htmlEntity: string;
  isSurrogatePair: boolean;
}

/**
 * Inspects every character/code point in a string.
 */
export function inspectUnicode(input: string): UnicodeCharDetail[] {
  const details: UnicodeCharDetail[] = [];
  const textEncoder = new TextEncoder();

  // Use iterator to handle surrogate pairs as individual Unicode characters
  for (const ch of input) {
    const codePoint = ch.codePointAt(0) ?? 0;
    const hexCodePoint = "U+" + codePoint.toString(16).toUpperCase().padStart(4, "0");

    // UTF-8 bytes
    const utf8Bytes = Array.from(textEncoder.encode(ch));
    const utf8Hex = utf8Bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

    // UTF-16 units
    const utf16Hex = Array.from(ch)
      .map((c) => "0x" + (c.charCodeAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0"))
      .join(" ");

    const isSurrogatePair = ch.length > 1;

    // Determine category
    const category = categorizeChar(ch);

    // HTML entity
    const htmlEntity = `&#${codePoint};`;

    details.push({
      char: ch,
      codePoint,
      hexCodePoint,
      decimal: codePoint,
      utf8Hex,
      utf8Bytes,
      utf16Hex,
      category,
      htmlEntity,
      isSurrogatePair,
    });
  }

  return details;
}

function categorizeChar(ch: string): string {
  if (/\p{L}/u.test(ch)) return "Letter";
  if (/\p{N}/u.test(ch)) return "Number";
  if (/\p{P}/u.test(ch)) return "Punctuation";
  if (/\p{S}/u.test(ch)) return "Symbol";
  if (/\p{M}/u.test(ch)) return "Mark";
  if (/\p{Z}/u.test(ch)) return "Separator / Space";
  if (/\p{C}/u.test(ch)) return "Other / Control";
  return "Unknown";
}
