/**
 * Downloads, all generated in the page.
 *
 * A result is a `Blob`; a download is an object URL for it on an `<a download>`
 * (`DownloadLink`), revoked when the result is no longer shown (`useObjectUrl`).
 * No data URLs, no server, no `showSaveFilePicker`.
 */

export const MIME = {
  text: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
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
    default:
      return "bin";
  }
}
