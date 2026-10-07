/**
 * Native Text Cleaner & Normalization Engine.
 *
 * Provides batch text transformations: trimming whitespace, removing blank lines,
 * collapsing redundant spaces, line deduplication, line-ending normalization,
 * and HTML tag stripping. 100% local, zero network.
 */

export interface TextCleanOptions {
  trimLines?: boolean;
  removeBlankLines?: boolean;
  collapseSpaces?: boolean;
  removeDuplicates?: boolean;
  normalizeLineEndings?: "lf" | "crlf";
  stripHtml?: boolean;
  prefix?: string;
  suffix?: string;
}

export interface TextCleanResult {
  output: string;
  originalLines: number;
  resultLines: number;
  removedBlankLines: number;
  removedDuplicates: number;
}

/**
 * Cleans and transforms text according to specified options.
 */
export function cleanText(input: string, options: TextCleanOptions = {}): TextCleanResult {
  let text = input;

  if (options.stripHtml) {
    text = text.replace(/<[^>]*>/g, "");
  }

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = text.split("\n");
  const originalLines = rawLines.length;

  let lines: string[] = rawLines;

  // Trim lines
  if (options.trimLines) {
    lines = lines.map((l) => l.trim());
  }

  // Collapse spaces within lines
  if (options.collapseSpaces) {
    lines = lines.map((l) => l.replace(/[ \t]+/g, " "));
  }

  // Remove blank lines
  let removedBlankLines = 0;
  if (options.removeBlankLines) {
    const beforeCount = lines.length;
    lines = lines.filter((l) => l.trim().length > 0);
    removedBlankLines = beforeCount - lines.length;
  }

  // Remove duplicate lines
  let removedDuplicates = 0;
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const line of lines) {
      if (!seen.has(line)) {
        seen.add(line);
        unique.push(line);
      }
    }
    removedDuplicates = lines.length - unique.length;
    lines = unique;
  }

  // Apply optional prefix & suffix
  if (options.prefix || options.suffix) {
    const pre = options.prefix ?? "";
    const suf = options.suffix ?? "";
    lines = lines.map((l) => `${pre}${l}${suf}`);
  }

  const ending = options.normalizeLineEndings === "crlf" ? "\r\n" : "\n";
  const output = lines.join(ending);

  return {
    output,
    originalLines,
    resultLines: lines.length,
    removedBlankLines,
    removedDuplicates,
  };
}
