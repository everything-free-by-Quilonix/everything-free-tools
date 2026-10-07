/**
 * Image compression by re-encoding.
 *
 * Runs unchanged in a worker (OffscreenCanvas) or on the page (<canvas>). The
 * pieces that decide anything, format choice, scaling and transparency detection,
 * are pure functions so they can be unit tested without a browser.
 *
 * Guarantees:
 * - The original `File` is only read, never modified or replaced.
 * - Orientation: decoding uses `imageOrientation: "from-image"`, so photos appear
 *   the way the camera recorded them, and the output has the rotation baked in.
 * - Transparency: images with transparent pixels are never silently flattened. Auto
 *   picks WebP (or PNG where WebP can't be encoded). If JPEG is chosen explicitly,
 *   transparent areas become white and the result says so.
 * - The encoder the browser actually used is reported (`blob.type`), not assumed.
 *
 * Memory: the decoded bitmap and one canvas are the only full-size buffers.
 * Transparency is checked in strips of about 1 megapixel, not with one full-size
 * `getImageData` copy, and both buffers are released as soon as the output exists.
 */

import { ToolError } from "@/lib/errors";
import type { TaskContext } from "@/workers/protocol";

export type OutputChoice = "auto" | "image/jpeg" | "image/webp" | "image/png";
export type EncodedType = "image/jpeg" | "image/webp" | "image/png";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"] as const;

export interface CompressInput {
  file: File;
  output: OutputChoice;
  /** Encoder quality from 0.1 to 1. Ignored by PNG, which is lossless. */
  quality: number;
  /** Longest side in pixels, or null to keep the original size. Never enlarges. */
  maxDimension: number | null;
}

export interface CompressOutput {
  blob: Blob;
  type: EncodedType;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  hasTransparency: boolean;
  /** True when transparent pixels were filled with white because JPEG was chosen. */
  flattened: boolean;
  /** Set when the browser couldn't produce the requested type and another was used. */
  substitutedFor?: EncodedType;
}

/** Which encoder to ask for. */
export function chooseOutputType(choice: OutputChoice, hasTransparency: boolean): EncodedType {
  if (choice !== "auto") return choice;
  return hasTransparency ? "image/webp" : "image/jpeg";
}

/** Scales so the longest side is at most `max`, keeping the aspect ratio. Never enlarges. */
export function scaleDimensions(width: number, height: number, max: number | null): { width: number; height: number } {
  if (!max || max <= 0 || (width <= max && height <= max)) return { width, height };
  const ratio = Math.min(max / width, max / height);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/** True if any pixel in RGBA data is not fully opaque. */
export function hasTransparentPixel(rgba: Uint8ClampedArray | Uint8Array): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i]! < 255) return true;
  return false;
}

/** Formats that can carry transparency. JPEG never does, so its pixels need no check. */
export function mayHaveTransparency(type: string): boolean {
  return type !== "image/jpeg";
}

export function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) return 0.8;
  return Math.min(1, Math.max(0.1, quality));
}

/** Pixels read per strip when looking for transparency: 1 MP, a 4 MB buffer. */
export const STRIP_PIXELS = 1 << 20;

/** Rows per strip, so a scan never allocates a second full-size copy of the image. */
export function stripRows(width: number): number {
  return Math.max(1, Math.floor(STRIP_PIXELS / Math.max(1, width)));
}

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

interface Surface {
  context: Canvas2D;
  encode(type: EncodedType, quality: number): Promise<Blob>;
  /** Frees the pixel buffer now rather than at garbage collection. Safari limits total canvas memory. */
  release(): void;
}

function tooLarge(width: number, height: number, technical?: string): ToolError {
  return new ToolError(
    `This image is too large for your browser to process (${width} × ${height} pixels). Choose a smaller size under Resize, or try another browser.`,
    technical,
  );
}

function createSurface(width: number, height: number): Surface {
  // Browsers return a null context, rather than throwing, when a canvas is over their size or memory limit.
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw tooLarge(width, height, "OffscreenCanvas.getContext('2d') returned null");
    return {
      context,
      encode: (type, quality) => canvas.convertToBlob({ type, quality }),
      release: () => {
        canvas.width = 0;
        canvas.height = 0;
      },
    };
  }
  if (typeof document === "undefined") throw new ToolError("Image processing isn't available here.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw tooLarge(width, height, "canvas.getContext('2d') returned null");
  return {
    context,
    encode: (type, quality) =>
      new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new ToolError("The browser couldn't encode this image."))),
          type,
          quality,
        ),
      ),
    release: () => {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

/** True when running on the page rather than in a worker (the fallback without OffscreenCanvas). */
const onPage = () => typeof document !== "undefined";
const yieldToPage = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function scanForTransparency(context: Canvas2D, width: number, height: number): Promise<boolean> {
  const rows = stripRows(width);
  for (let y = 0; y < height; y += rows) {
    if (hasTransparentPixel(context.getImageData(0, y, width, Math.min(rows, height - y)).data)) return true;
    // On the page, let clicks and scrolling through between strips.
    if (onPage()) await yieldToPage();
  }
  return false;
}

async function decode(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== "function") throw new ToolError("Your browser can't decode images for processing.");
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    throw new ToolError(
      "We couldn't read this image. It may be damaged, or in a format your browser can't open.",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
  }
}

const ENCODED_TYPES = ["image/jpeg", "image/webp", "image/png"] as const;

export async function compressImage(input: CompressInput, context?: TaskContext): Promise<CompressOutput> {
  const quality = clampQuality(input.quality);
  context?.progress(0.05, "Reading");
  const bitmap = await decode(input.file);
  let surface: Surface | null = null;

  try {
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    if (originalWidth === 0 || originalHeight === 0) throw new ToolError("This image has no pixels.");
    const { width, height } = scaleDimensions(originalWidth, originalHeight, input.maxDimension);

    try {
      surface = createSurface(width, height);
    } catch (error) {
      if (error instanceof ToolError) throw error;
      throw tooLarge(width, height, String(error));
    }

    context?.progress(0.3, "Drawing");
    surface.context.imageSmoothingQuality = "high";
    surface.context.drawImage(bitmap, 0, 0, width, height);
    // The bitmap is no longer needed once drawn; free it before encoding.
    bitmap.close();

    let hasTransparency = false;
    if (mayHaveTransparency(input.file.type)) {
      try {
        hasTransparency = await scanForTransparency(surface.context, width, height);
      } catch (error) {
        throw tooLarge(width, height, String(error));
      }
    }

    const requested = chooseOutputType(input.output, hasTransparency);
    let flattened = false;
    if (requested === "image/jpeg" && hasTransparency) {
      // JPEG has no alpha channel; without this, transparent areas turn black.
      surface.context.globalCompositeOperation = "destination-over";
      surface.context.fillStyle = "#ffffff";
      surface.context.fillRect(0, 0, width, height);
      surface.context.globalCompositeOperation = "source-over";
      flattened = true;
    }

    context?.progress(0.6, "Encoding");
    const blob = await surface.encode(requested, quality);
    if (blob.size === 0) throw new ToolError("The browser produced an empty image. Try a different output format.");

    // Browsers that can't encode a type return PNG instead of failing.
    const actual = ENCODED_TYPES.find((type) => type === blob.type) ?? "image/png";
    context?.progress(1, "Done");

    return {
      blob,
      type: actual,
      width,
      height,
      originalWidth,
      originalHeight,
      hasTransparency,
      flattened,
      ...(actual !== requested ? { substitutedFor: requested } : {}),
    };
  } finally {
    // close() is idempotent; release() drops the canvas buffer immediately.
    bitmap.close();
    surface?.release();
  }
}
