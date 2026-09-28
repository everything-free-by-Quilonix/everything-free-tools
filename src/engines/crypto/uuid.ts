/**
 * UUID generation (RFC 9562).
 *
 * Randomness only ever comes from the Web Crypto API. There is deliberately no
 * Math.random fallback: an identifier that looks random but is predictable is worse
 * than a clear error.
 */

import { ToolError } from "@/lib/errors";

export type UuidVersion = 4 | 7;

export interface UuidFormat {
  uppercase?: boolean;
  /** Omit the hyphens. */
  compact?: boolean;
  /** Wrap in braces, as Windows tools show GUIDs. */
  braces?: boolean;
}

export const MAX_UUIDS = 1000;

type RandomSource = Pick<Crypto, "getRandomValues"> & Partial<Pick<Crypto, "randomUUID">>;

function source(random?: RandomSource): RandomSource {
  const crypto = random ?? globalThis.crypto;
  if (typeof crypto?.getRandomValues !== "function") {
    throw new ToolError(
      "Your browser doesn't provide a secure random number generator, so UUIDs can't be generated safely.",
    );
  }
  return crypto;
}

function hex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20)}`;
}

export function uuidV4(random?: RandomSource): string {
  const crypto = source(random);
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return hex(bytes);
}

/**
 * Version 7: 48-bit Unix milliseconds, then random bits. Within one batch the
 * 12-bit rand_a field is used as a counter when the clock hasn't moved, so a batch
 * generated in the same millisecond still sorts in generation order (RFC 9562 §6.2,
 * method 1).
 */
export function createUuidV7Generator(random?: RandomSource, now: () => number = Date.now): () => string {
  const crypto = source(random);
  let lastMs = -1;
  let counter = 0;

  return () => {
    let ms = now();
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    if (ms <= lastMs) {
      counter += 1;
      if (counter > 0xfff) {
        // Counter exhausted within one millisecond: borrow the next millisecond.
        lastMs += 1;
        counter = 0;
      }
      ms = lastMs;
    } else {
      lastMs = ms;
      // Start the counter in the lower half so it has room to grow.
      counter = ((bytes[6]! << 8) | bytes[7]!) & 0x7ff;
    }

    bytes[0] = Math.floor(ms / 2 ** 40) & 0xff;
    bytes[1] = Math.floor(ms / 2 ** 32) & 0xff;
    bytes[2] = Math.floor(ms / 2 ** 24) & 0xff;
    bytes[3] = Math.floor(ms / 2 ** 16) & 0xff;
    bytes[4] = Math.floor(ms / 2 ** 8) & 0xff;
    bytes[5] = ms & 0xff;
    bytes[6] = 0x70 | ((counter >> 8) & 0x0f);
    bytes[7] = counter & 0xff;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    return hex(bytes);
  };
}

export function formatUuid(uuid: string, format: UuidFormat = {}): string {
  let value = format.compact ? uuid.replace(/-/g, "") : uuid;
  value = format.uppercase ? value.toUpperCase() : value.toLowerCase();
  return format.braces ? `{${value}}` : value;
}

export interface GenerateOptions extends UuidFormat {
  version: UuidVersion;
  count: number;
}

export function generateUuids(options: GenerateOptions, random?: RandomSource): string[] {
  const count = Math.trunc(options.count);
  if (!Number.isFinite(count) || count < 1 || count > MAX_UUIDS) {
    throw new ToolError(`Choose a number from 1 to ${MAX_UUIDS.toLocaleString("en")}.`);
  }
  const next = options.version === 7 ? createUuidV7Generator(random) : () => uuidV4(random);
  return Array.from({ length: count }, () => formatUuid(next(), options));
}

/** Reads the version and, for v7, the embedded timestamp. For display and tests. */
export function inspectUuid(uuid: string): { version: number; variantOk: boolean; timestamp?: number } | null {
  const compact = uuid.replace(/[{}-]/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) return null;
  const version = Number.parseInt(compact[12]!, 16);
  const variantOk = /[89ab]/.test(compact[16]!);
  return {
    version,
    variantOk,
    ...(version === 7 ? { timestamp: Number.parseInt(compact.slice(0, 12), 16) } : {}),
  };
}
