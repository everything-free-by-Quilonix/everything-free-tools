/**
 * File helpers shared by every tool.
 *
 * Files are passed around as `File`/`Blob` references, never read into React state.
 * Nothing here imposes a size limit: the only limits are the device's memory and
 * the browser's, and tools say so.
 */

/** "4.8 MB". Decimal units, as file managers on most systems show them. */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1000) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : fractionDigits)} ${units[unit]}`;
}

/** Percentage saved going from `before` to `after` bytes; negative when it grew. */
export function percentSaved(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 1000) / 10;
}

/** A size above which a tool mentions memory use. A heads-up, never a limit. */
export const LARGE_FILE_BYTES = 50_000_000;

export interface FileCheck {
  accepted: File[];
  rejected: { file: File; reason: string }[];
}

/**
 * Splits files into those a tool accepts and those it does not, by MIME type, with
 * the file extension as a fallback for systems that report an empty type.
 */
export function checkFiles(files: Iterable<File>, accept: readonly string[]): FileCheck {
  const result: FileCheck = { accepted: [], rejected: [] };
  const extensions = new Map<string, string>([
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
    ["avif", "image/avif"],
    ["bmp", "image/bmp"],
    ["json", "application/json"],
    ["txt", "text/plain"],
    ["pdf", "application/pdf"],
  ]);

  for (const file of files) {
    const type = file.type || extensions.get(extensionOf(file.name)) || "";
    if (accept.length === 0 || accept.includes(type)) result.accepted.push(file);
    else
      result.rejected.push({
        file,
        reason: type ? `${type} files aren't supported here.` : "This file type isn't supported here.",
      });
  }
  return result;
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** The file name without its extension. */
export function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * A safe download name: path separators and control characters removed, length
 * capped, and a fallback when nothing is left.
 */
export function safeFileName(name: string, fallback = "download"): string {
  const cleaned = name
    // Path separators, characters Windows forbids, and control characters.
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-")
    // Bidirectional overrides and invisible characters, which can disguise an
    // extension ("photo\u202Egnp.exe" displays as "photoexe.png").
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    // No hidden files (".name"), and Windows drops trailing dots and spaces.
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "");
  if (cleaned.length === 0) return fallback;
  if (cleaned.length <= MAX_NAME) return cleaned;
  // Too long: shorten the name but keep the extension, so the file still opens.
  const dot = cleaned.lastIndexOf(".");
  const extension = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : "";
  return cleaned.slice(0, MAX_NAME - extension.length).replace(/[. ]+$/, "") + extension;
}

const MAX_NAME = 120;

/** "holiday.png" + "compressed" + "webp" → "holiday-compressed.webp" */
export function derivedFileName(original: string, suffix: string, extension: string): string {
  return safeFileName(`${baseName(original) || "file"}-${suffix}.${extension}`);
}
