/**
 * Image Format Conversion Engine.
 *
 * Provides format conversion mapping, MIME resolution, and file extension helpers
 * for client-side image transcoding.
 */

export type TargetImageFormat = "image/png" | "image/jpeg" | "image/webp";

export interface FormatOption {
  mime: TargetImageFormat;
  label: string;
  extension: "png" | "jpg" | "webp";
  supportsQuality: boolean;
}

export const PNG_FORMAT: FormatOption = {
  mime: "image/png",
  label: "PNG (Lossless)",
  extension: "png",
  supportsQuality: false,
};
export const JPEG_FORMAT: FormatOption = {
  mime: "image/jpeg",
  label: "JPEG (Lossy)",
  extension: "jpg",
  supportsQuality: true,
};
export const WEBP_FORMAT: FormatOption = {
  mime: "image/webp",
  label: "WebP (Modern compressed)",
  extension: "webp",
  supportsQuality: true,
};

export const SUPPORTED_TARGET_FORMATS: readonly FormatOption[] = [PNG_FORMAT, JPEG_FORMAT, WEBP_FORMAT];

export function getFormatByExtension(ext: string): FormatOption {
  const clean = ext.toLowerCase().replace(/^\./, "");
  if (clean === "png") return PNG_FORMAT;
  if (clean === "jpg" || clean === "jpeg") return JPEG_FORMAT;
  return WEBP_FORMAT;
}

export function formatFileName(originalName: string, targetExt: string): string {
  const base = originalName.replace(/\.[^/.]+$/, "");
  return `${base}.${targetExt}`;
}
