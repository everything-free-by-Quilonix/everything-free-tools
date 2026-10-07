/**
 * Native Regular Expression Testing & Structural Explanation Engine.
 *
 * Implements client-side regex evaluation, match finding, capture group extraction,
 * replacement preview, and structured regex token explanation without external dependencies.
 * 100% local, zero network.
 */

export interface RegexMatchItem {
  index: number;
  match: string;
  groups: (string | undefined)[];
  namedGroups?: Record<string, string | undefined>;
}

export interface RegexTestResult {
  isValid: boolean;
  error?: string;
  matches: RegexMatchItem[];
  matchCount: number;
  replacement?: string;
  explanation: RegexExplanationToken[];
}

export interface RegexExplanationToken {
  part: string;
  meaning: string;
  category: "anchor" | "class" | "group" | "quantifier" | "literal" | "special";
}

export interface RegexTemplate {
  name: string;
  pattern: string;
  flags: string;
  description: string;
}

export const COMMON_REGEX_TEMPLATES: readonly RegexTemplate[] = [
  {
    name: "Email Address",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    flags: "i",
    description: "Matches standard RFC 5322 compatible email formats.",
  },
  {
    name: "URL (HTTP/HTTPS)",
    pattern:
      "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    flags: "i",
    description: "Matches web URLs starting with http:// or https://.",
  },
  {
    name: "IPv4 Address",
    pattern: "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$",
    flags: "",
    description: "Matches valid IPv4 addresses in dotted-decimal format (0-255).",
  },
  {
    name: "UUID (v4/v7)",
    pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    flags: "i",
    description: "Validates 8-4-4-4-12 hex UUID formats.",
  },
  {
    name: "Hex Color Code",
    pattern: "^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3}|[a-fA-F0-9]{8})$",
    flags: "i",
    description: "Matches 3, 6, or 8-digit hex color representations.",
  },
  {
    name: "ISO 8601 Date (YYYY-MM-DD)",
    pattern: "^\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])$",
    flags: "",
    description: "Matches calendar dates in standard ISO 8601 YYYY-MM-DD format.",
  },
];

/**
 * Evaluates a regex pattern against a test string.
 */
export function testRegex(
  pattern: string,
  flags: string,
  testString: string,
  replacementTemplate?: string,
): RegexTestResult {
  if (!pattern) {
    return {
      isValid: true,
      matches: [],
      matchCount: 0,
      explanation: [],
    };
  }

  try {
    const rx = new RegExp(pattern, flags);
    const explanation = explainRegex(pattern);

    // Collect matches
    const matches: RegexMatchItem[] = [];
    const isGlobal = flags.includes("g");

    if (isGlobal) {
      let match: RegExpExecArray | null;
      let iterations = 0;
      const MAX_MATCHES = 5000;

      while ((match = rx.exec(testString)) !== null) {
        matches.push({
          index: match.index,
          match: match[0],
          groups: match.slice(1),
          namedGroups: match.groups,
        });

        // Avoid infinite loop with zero-width matches
        if (match[0].length === 0) {
          rx.lastIndex++;
        }

        iterations++;
        if (iterations >= MAX_MATCHES) break;
      }
    } else {
      const match = rx.exec(testString);
      if (match) {
        matches.push({
          index: match.index,
          match: match[0],
          groups: match.slice(1),
          namedGroups: match.groups,
        });
      }
    }

    // Replacement calculation if requested
    let replacement: string | undefined;
    if (replacementTemplate !== undefined) {
      replacement = testString.replace(new RegExp(pattern, flags), replacementTemplate);
    }

    return {
      isValid: true,
      matches,
      matchCount: matches.length,
      replacement,
      explanation,
    };
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
      matches: [],
      matchCount: 0,
      explanation: [],
    };
  }
}

/**
 * Parses regex pattern into structured explanation components.
 */
export function explainRegex(pattern: string): RegexExplanationToken[] {
  const tokens: RegexExplanationToken[] = [];
  let i = 0;

  while (i < pattern.length) {
    const c = pattern[i];
    if (!c) break;
    const next = pattern[i + 1];

    if (c === "^") {
      tokens.push({ part: "^", meaning: "Asserts start of line / string", category: "anchor" });
      i++;
    } else if (c === "$") {
      tokens.push({ part: "$", meaning: "Asserts end of line / string", category: "anchor" });
      i++;
    } else if (c === "\\") {
      // Escape sequence
      const seq = "\\" + (next ?? "");
      i += 2;
      if (seq === "\\d") tokens.push({ part: "\\d", meaning: "Any digit (0-9)", category: "class" });
      else if (seq === "\\D") tokens.push({ part: "\\D", meaning: "Any non-digit character", category: "class" });
      else if (seq === "\\w")
        tokens.push({ part: "\\w", meaning: "Any word character (alphanumeric + underscore)", category: "class" });
      else if (seq === "\\W") tokens.push({ part: "\\W", meaning: "Any non-word character", category: "class" });
      else if (seq === "\\s")
        tokens.push({ part: "\\s", meaning: "Any whitespace (space, tab, newline)", category: "class" });
      else if (seq === "\\S") tokens.push({ part: "\\S", meaning: "Any non-whitespace character", category: "class" });
      else if (seq === "\\b") tokens.push({ part: "\\b", meaning: "Word boundary anchor", category: "anchor" });
      else if (seq === "\\B") tokens.push({ part: "\\B", meaning: "Non-word boundary anchor", category: "anchor" });
      else tokens.push({ part: seq, meaning: `Escaped character: ${seq.slice(1)}`, category: "literal" });
    } else if (c === "[") {
      // Character class
      let cls = "[";
      i++;
      while (i < pattern.length && pattern[i] !== "]") {
        const curr = pattern[i] ?? "";
        const next = pattern[i + 1] ?? "";
        if (curr === "\\" && i + 1 < pattern.length) {
          cls += curr + next;
          i += 2;
        } else {
          cls += curr;
          i++;
        }
      }
      if (pattern[i] === "]") {
        cls += "]";
        i++;
      }
      const isNeg = cls.startsWith("[^");
      tokens.push({
        part: cls,
        meaning: isNeg ? `Matches any character NOT in set: ${cls}` : `Matches any character in set: ${cls}`,
        category: "class",
      });
    } else if (c === "(") {
      if (pattern.slice(i, i + 3) === "(?:") {
        tokens.push({ part: "(?:...)", meaning: "Non-capturing group", category: "group" });
        i += 3;
      } else if (pattern.slice(i, i + 4) === "(?<=") {
        tokens.push({ part: "(?<=...)", meaning: "Positive lookbehind", category: "special" });
        i += 4;
      } else if (pattern.slice(i, i + 4) === "(?<!") {
        tokens.push({ part: "(?<!...)", meaning: "Negative lookbehind", category: "special" });
        i += 4;
      } else if (pattern.slice(i, i + 3) === "(?=") {
        tokens.push({ part: "(?=...)", meaning: "Positive lookahead", category: "special" });
        i += 3;
      } else if (pattern.slice(i, i + 3) === "(?!") {
        tokens.push({ part: "(?!...)", meaning: "Negative lookahead", category: "special" });
        i += 3;
      } else {
        tokens.push({ part: "(...)", meaning: "Capturing group", category: "group" });
        i++;
      }
    } else if (c === ")") {
      tokens.push({ part: ")", meaning: "End of group", category: "group" });
      i++;
    } else if (c === "*" || c === "+" || c === "?") {
      const q = c + (next === "?" ? "?" : "");
      if (next === "?") i++;
      const meaning =
        c === "*"
          ? "Quantifier: 0 or more times"
          : c === "+"
            ? "Quantifier: 1 or more times"
            : "Quantifier: 0 or 1 time (optional)";
      tokens.push({ part: q, meaning: q.endsWith("?") ? `${meaning} (lazy)` : meaning, category: "quantifier" });
      i++;
    } else if (c === "{") {
      let q = "{";
      i++;
      while (i < pattern.length && pattern[i] !== "}") {
        q += pattern[i];
        i++;
      }
      if (pattern[i] === "}") {
        q += "}";
        i++;
      }
      tokens.push({ part: q, meaning: `Quantifier bounds: ${q}`, category: "quantifier" });
    } else if (c === "|") {
      tokens.push({ part: "|", meaning: "Alternation (OR)", category: "special" });
      i++;
    } else if (c === ".") {
      tokens.push({ part: ".", meaning: "Any character (except newline)", category: "class" });
      i++;
    } else {
      // Literal
      let lit = c;
      i++;
      while (i < pattern.length && !"^$\\[]()*+?{}|.".includes(pattern[i] ?? "")) {
        lit += pattern[i] ?? "";
        i++;
      }
      tokens.push({ part: lit, meaning: `Literal text: "${lit}"`, category: "literal" });
    }
  }

  return tokens;
}
