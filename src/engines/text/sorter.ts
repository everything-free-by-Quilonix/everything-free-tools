/**
 * Native Text Sorter Engine.
 *
 * Implements alphabetical, numeric, natural, and length-based line sorting
 * with case-sensitivity, deduplication, and order reversal options.
 * 100% local, zero network.
 */

export type SortMode = "alphabetical" | "natural" | "numeric" | "length";

export interface SortOptions {
  mode?: SortMode;
  reverse?: boolean;
  caseSensitive?: boolean;
  deduplicate?: boolean;
  trimLines?: boolean;
}

export interface SortResult {
  output: string;
  totalLines: number;
  uniqueLines: number;
}

/**
 * Sorts lines of text based on chosen ordering rules.
 */
export function sortLines(input: string, options: SortOptions = {}): SortResult {
  const mode = options.mode ?? "alphabetical";
  const reverse = options.reverse ?? false;
  const caseSensitive = options.caseSensitive ?? false;
  const deduplicate = options.deduplicate ?? false;
  const trimLines = options.trimLines ?? false;

  let lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (trimLines) {
    lines = lines.map((l) => l.trim());
  }

  const totalLines = lines.length;

  if (deduplicate) {
    lines = Array.from(new Set(lines));
  }
  const uniqueLines = lines.length;

  lines.sort((a, b) => {
    let comparison = 0;

    switch (mode) {
      case "numeric": {
        const numA = parseFloat(a.trim());
        const numB = parseFloat(b.trim());
        const validA = !isNaN(numA);
        const validB = !isNaN(numB);
        if (validA && validB) {
          comparison = numA - numB;
        } else if (validA) {
          comparison = -1;
        } else if (validB) {
          comparison = 1;
        } else {
          comparison = a.localeCompare(b);
        }
        break;
      }
      case "length": {
        comparison = a.length - b.length || a.localeCompare(b);
        break;
      }
      case "natural": {
        comparison = a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: caseSensitive ? "case" : "base",
        });
        break;
      }
      case "alphabetical":
      default: {
        if (!caseSensitive) {
          comparison = a.toLowerCase().localeCompare(b.toLowerCase());
        } else {
          comparison = a.localeCompare(b);
        }
        break;
      }
    }

    return reverse ? -comparison : comparison;
  });

  return {
    output: lines.join("\n"),
    totalLines,
    uniqueLines,
  };
}
