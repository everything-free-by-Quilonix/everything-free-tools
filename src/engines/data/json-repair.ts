/**
 * JSON Repair Engine.
 *
 * Automatically repairs common JSON syntax errors:
 * - Single-quoted strings and keys
 * - Unquoted object keys
 * - Trailing commas in arrays and objects
 * - JavaScript and Python comments (// and /* * /)
 * - Python / JS literals (True, False, None, undefined, NaN)
 * - Missing or unmatched closing brackets
 */

export interface JsonRepairResult {
  repaired: string;
  fixes: string[];
  success: boolean;
}

export function repairJson(input: string, indent = 2): JsonRepairResult {
  const fixes: string[] = [];
  let text = input.trim();

  if (!text) {
    return { repaired: "", fixes: [], success: false };
  }

  // 1. Strip comments
  const withoutBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, () => {
    fixes.push("Removed block comments");
    return "";
  });
  const withoutComments = withoutBlockComments.replace(/(^|[^:])\/\/[^\r\n]*/g, (match, prefix) => {
    fixes.push("Removed single-line comment");
    return prefix;
  });
  text = withoutComments;

  // 2. Python / JS constants replacement
  const replaceConstants = (src: string): string => {
    return src
      .replace(/\bTrue\b/g, () => {
        fixes.push("Replaced Python True with true");
        return "true";
      })
      .replace(/\bFalse\b/g, () => {
        fixes.push("Replaced Python False with false");
        return "false";
      })
      .replace(/\bNone\b/g, () => {
        fixes.push("Replaced Python None with null");
        return "null";
      })
      .replace(/\bundefined\b/g, () => {
        fixes.push("Replaced undefined with null");
        return "null";
      })
      .replace(/\bNaN\b/g, () => {
        fixes.push("Replaced NaN with null");
        return "null";
      });
  };
  text = replaceConstants(text);

  // 3. Fix single-quoted strings: 'foo' -> "foo"
  // Careful with escaped quotes
  const replaceSingleQuotes = (src: string): string => {
    let inDouble = false;
    let inSingle = false;
    let out = "";
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      const prev = i > 0 ? src[i - 1] : "";

      if (c === '"' && !inSingle && prev !== "\\") {
        inDouble = !inDouble;
        out += c;
      } else if (c === "'" && !inDouble && prev !== "\\") {
        inSingle = !inSingle;
        out += '"';
        fixes.push("Converted single quotes to double quotes");
      } else if (inSingle && c === '"') {
        out += '\\"';
      } else {
        out += c;
      }
    }
    return out;
  };
  text = replaceSingleQuotes(text);

  // 4. Quote unquoted keys: { key: "val" } -> { "key": "val" }
  text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, (match, prefix, key) => {
    fixes.push(`Quoted unquoted key "${key}"`);
    return `${prefix}"${key}":`;
  });

  // 5. Remove trailing commas: [1, 2,] or {"a": 1,}
  const stripTrailingCommas = (src: string): string => {
    return src.replace(/,(\s*[}\]])/g, (match, closeChar) => {
      fixes.push("Removed trailing comma");
      return closeChar;
    });
  };
  text = stripTrailingCommas(text);

  // 6. Balance unclosed brackets/braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const prev = i > 0 ? text[i - 1] : "";
    if (c === '"' && prev !== "\\") {
      inString = !inString;
    } else if (!inString) {
      if (c === "{") openBraces++;
      else if (c === "}") openBraces = Math.max(0, openBraces - 1);
      else if (c === "[") openBrackets++;
      else if (c === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  if (openBrackets > 0) {
    text += "]".repeat(openBrackets);
    fixes.push(`Added ${openBrackets} missing closing bracket(s) ']'`);
  }
  if (openBraces > 0) {
    text += "}".repeat(openBraces);
    fixes.push(`Added ${openBraces} missing closing brace(s) '}'`);
  }

  // Attempt parse and formatting
  try {
    const parsed = JSON.parse(text);
    const pretty = JSON.stringify(parsed, null, indent);
    return {
      repaired: pretty,
      fixes: Array.from(new Set(fixes)),
      success: true,
    };
  } catch {
    // If full JSON.parse still fails, return the cleaned-up string
    return {
      repaired: text,
      fixes: Array.from(new Set(fixes)),
      success: false,
    };
  }
}
