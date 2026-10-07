/**
 * Native Text Find & Replace Engine.
 *
 * Implements plain text and regular expression search and replace with
 * case sensitivity, whole word boundaries, and match counters.
 * 100% local, zero network.
 */

export interface FindReplaceOptions {
  find: string;
  replace: string;
  isRegex?: boolean;
  caseSensitive?: boolean;
  matchWholeWord?: boolean;
}

export interface FindReplaceResult {
  output: string;
  matchCount: number;
  error?: string;
}

/**
 * Replaces matching substrings according to search options.
 */
export function executeFindReplace(text: string, options: FindReplaceOptions): FindReplaceResult {
  const { find, replace, isRegex, caseSensitive, matchWholeWord } = options;

  if (!find) {
    return { output: text, matchCount: 0 };
  }

  try {
    let pattern: string;
    let flags = "g";
    if (!caseSensitive) flags += "i";

    if (isRegex) {
      pattern = find;
      if (matchWholeWord) {
        pattern = `\\b(?:${pattern})\\b`;
      }
    } else {
      // Escape special characters for literal search
      pattern = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
    }

    const rx = new RegExp(pattern, flags);
    const matches = text.match(rx);
    const matchCount = matches ? matches.length : 0;
    const output = text.replace(rx, replace);

    return {
      output,
      matchCount,
    };
  } catch (err) {
    return {
      output: text,
      matchCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
