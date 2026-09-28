import { safeFileName } from "./files";

/**
 * Downloads, all generated in the page.
 *
 * A result is a `Blob`; a download is an object URL for it on an `<a download>`.
 * No data URL round-trips, no server, and object URLs are revoked once they are no
 * longer shown (see `useObjectUrl`).
 */

export const MIME = {
  text: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  svg: "image/svg+xml;charset=utf-8",
  png: "image/png",
  octet: "application/octet-stream",
} as const;

export function textBlob(text: string, type: string = MIME.text): Blob {
  return new Blob([text], { type });
}

/** File extension for an image MIME type produced by canvas encoding. */
export function extensionForType(type: string): string {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}

/**
 * Starts a download imperatively, for results that are not shown as a link. The URL
 * is revoked after the browser has had time to start the download.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(fileName);
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
