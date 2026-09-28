/**
 * Base64 (RFC 4648), standard and URL-safe alphabets.
 *
 * Text is always converted through UTF-8 bytes, so any character round-trips.
 * Decoding is strict: characters outside the alphabet, misplaced padding or an
 * impossible length are reported, never skipped. Whitespace (line breaks from
 * MIME-wrapped input) is the only thing ignored.
 *
 * Base64 is an encoding, not encryption. Nothing here protects data.
 */

import { ToolError } from "@/lib/errors";

const STANDARD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const URL_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export interface EncodeOptions {
  urlSafe?: boolean;
  /** Keep "=" padding. Defaults to true for standard and false for URL-safe. */
  padding?: boolean;
}

export function encodeBytes(bytes: Uint8Array, options: EncodeOptions = {}): string {
  const alphabet = options.urlSafe ? URL_SAFE : STANDARD;
  const pad = options.padding ?? !options.urlSafe;
  const parts: string[] = [];
  let chunk = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    chunk += alphabet[(triple >> 18) & 63]! + alphabet[(triple >> 12) & 63]!;
    chunk += b === undefined ? (pad ? "=" : "") : alphabet[(triple >> 6) & 63]!;
    chunk += c === undefined ? (pad ? "=" : "") : alphabet[triple & 63]!;
    // Join in pieces so very large inputs don't build one enormous rope string.
    if (chunk.length >= 8192) {
      parts.push(chunk);
      chunk = "";
    }
  }
  parts.push(chunk);
  return parts.join("");
}

export function encodeText(text: string, options: EncodeOptions = {}): string {
  return encodeBytes(new TextEncoder().encode(text), options);
}

const LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < 64; i += 1) {
    table[STANDARD.charCodeAt(i)] = i;
    table[URL_SAFE.charCodeAt(i)] = i;
  }
  return table;
})();

export interface DecodedBase64 {
  bytes: Uint8Array;
  /** Which alphabet the input used. "either" when it contained no + / - or _. */
  alphabet: "standard" | "url-safe" | "either";
}

/** Decodes standard or URL-safe Base64, padded or not. Throws a `ToolError` describing the problem. */
export function decodeBase64(input: string): DecodedBase64 {
  const text = input.replace(/[\s]+/g, "");
  if (text.length === 0) throw new ToolError("There's nothing to decode yet.");

  const hasStandard = /[+/]/.test(text);
  const hasUrlSafe = /[-_]/.test(text);
  if (hasStandard && hasUrlSafe) {
    throw new ToolError("This mixes the standard (+ /) and URL-safe (- _) Base64 alphabets, so it isn't valid Base64.");
  }

  const firstPad = text.indexOf("=");
  const body = firstPad === -1 ? text : text.slice(0, firstPad);
  const padding = firstPad === -1 ? "" : text.slice(firstPad);

  if (!/^={0,2}$/.test(padding)) {
    throw new ToolError(
      /[^=]/.test(padding)
        ? `Padding (“=”) can only appear at the end, but there is more after it at position ${firstPad + 1}.`
        : "There are too many “=” padding characters at the end.",
    );
  }

  for (let i = 0; i < body.length; i += 1) {
    const code = body.charCodeAt(i);
    if (code >= 128 || LOOKUP[code] === -1) {
      throw new ToolError(
        `“${String.fromCodePoint(body.codePointAt(i)!)}” at position ${i + 1} isn't a Base64 character.`,
      );
    }
  }

  if (body.length % 4 === 1) {
    throw new ToolError("The length of this text isn't possible for Base64. A character may be missing or extra.");
  }
  if (padding && (body.length + padding.length) % 4 !== 0) {
    throw new ToolError("The “=” padding doesn't match the length of the text.");
  }

  const bytes = new Uint8Array(Math.floor((body.length * 3) / 4));
  let out = 0;
  for (let i = 0; i < body.length; i += 4) {
    const n0 = LOOKUP[body.charCodeAt(i)]!;
    const n1 = LOOKUP[body.charCodeAt(i + 1)]!;
    const c2 = body.charCodeAt(i + 2);
    const c3 = body.charCodeAt(i + 3);
    const n2 = Number.isNaN(c2) ? 0 : LOOKUP[c2]!;
    const n3 = Number.isNaN(c3) ? 0 : LOOKUP[c3]!;
    const triple = (n0 << 18) | (n1 << 12) | (n2 << 6) | n3;
    bytes[out++] = (triple >> 16) & 255;
    if (!Number.isNaN(c2)) bytes[out++] = (triple >> 8) & 255;
    if (!Number.isNaN(c3)) bytes[out++] = triple & 255;
  }

  return {
    bytes: out === bytes.length ? bytes : bytes.slice(0, out),
    alphabet: hasStandard ? "standard" : hasUrlSafe ? "url-safe" : "either",
  };
}

export type DecodedResult =
  | { kind: "text"; text: string; bytes: Uint8Array; alphabet: DecodedBase64["alphabet"] }
  | { kind: "binary"; bytes: Uint8Array; alphabet: DecodedBase64["alphabet"] };

/**
 * Decodes, then shows the result as text only if it is valid UTF-8 without
 * unprintable control characters. Anything else is binary and offered as a file.
 */
export function decodeToResult(input: string): DecodedResult {
  const { bytes, alphabet } = decodeBase64(input);
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
    // Tab, LF, CR are fine; other C0 controls and NUL mean this is not text.
    if (!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) return { kind: "text", text, bytes, alphabet };
  } catch {
    // Not UTF-8: binary.
  }
  return { kind: "binary", bytes, alphabet };
}

/** A best guess at a file type from its first bytes, for naming a decoded download. */
export function sniffType(bytes: Uint8Array): { mime: string; extension: string } {
  const starts = (...sig: number[]) => sig.every((value, index) => bytes[index] === value);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", extension: "png" };
  if (starts(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", extension: "jpg" };
  if (starts(0x47, 0x49, 0x46, 0x38)) return { mime: "image/gif", extension: "gif" };
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45)
    return { mime: "image/webp", extension: "webp" };
  if (starts(0x25, 0x50, 0x44, 0x46)) return { mime: "application/pdf", extension: "pdf" };
  if (starts(0x50, 0x4b, 0x03, 0x04)) return { mime: "application/zip", extension: "zip" };
  if (starts(0x1f, 0x8b)) return { mime: "application/gzip", extension: "gz" };
  return { mime: "application/octet-stream", extension: "bin" };
}
