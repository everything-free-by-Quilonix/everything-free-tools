/**
 * Native JSONPath Query Engine.
 *
 * Implements client-side JSONPath evaluation supporting dot notation,
 * array index access, slices, recursive descent (..), and wildcard (*) matching.
 * 100% local, zero external network, zero eval.
 */

export interface JsonPathMatch {
  path: string;
  value: unknown;
}

export interface JsonPathResult {
  success: boolean;
  matches: JsonPathMatch[];
  count: number;
  error?: string;
}

/**
 * Evaluates a JSONPath query against a JavaScript object/value.
 */
export function evaluateJsonPath(root: unknown, pathExpr: string): JsonPathResult {
  const query = pathExpr.trim();
  if (!query) {
    return { success: true, matches: [{ path: "$", value: root }], count: 1 };
  }

  if (!query.startsWith("$")) {
    return { success: false, matches: [], count: 0, error: 'JSONPath expression must start with "$"' };
  }

  try {
    const tokens = tokenizePath(query);
    const initial: JsonPathMatch[] = [{ path: "$", value: root }];
    let current = initial;

    for (const token of tokens) {
      const next: JsonPathMatch[] = [];
      for (const item of current) {
        applyToken(item, token, next);
      }
      current = next;
    }

    return {
      success: true,
      matches: current,
      count: current.length,
    };
  } catch (err) {
    return {
      success: false,
      matches: [],
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface PathToken {
  type: "property" | "wildcard" | "recursive" | "index" | "slice";
  key?: string;
  index?: number;
  start?: number;
  end?: number;
}

function tokenizePath(expr: string): PathToken[] {
  const tokens: PathToken[] = [];
  let i = 1; // skip leading '$'

  while (i < expr.length) {
    const char = expr[i];

    if (char === ".") {
      if (expr[i + 1] === ".") {
        // Recursive descent: ..
        i += 2;
        // Read property or wildcard after ..
        let key = "";
        while (i < expr.length && expr[i] !== "." && expr[i] !== "[") {
          key += expr[i];
          i++;
        }
        if (key === "*") {
          tokens.push({ type: "recursive", key: "*" });
        } else if (key) {
          tokens.push({ type: "recursive", key });
        } else {
          tokens.push({ type: "recursive", key: "*" });
        }
      } else {
        // Single dot
        i++;
        let key = "";
        while (i < expr.length && expr[i] !== "." && expr[i] !== "[") {
          key += expr[i];
          i++;
        }
        if (key === "*") {
          tokens.push({ type: "wildcard" });
        } else if (key) {
          tokens.push({ type: "property", key });
        }
      }
    } else if (char === "[") {
      i++;
      let bracketContent = "";
      while (i < expr.length && expr[i] !== "]") {
        bracketContent += expr[i];
        i++;
      }
      if (expr[i] === "]") i++;

      bracketContent = bracketContent.trim();
      if (bracketContent === "*") {
        tokens.push({ type: "wildcard" });
      } else if (bracketContent.includes(":")) {
        // Slice notation [start:end]
        const parts = bracketContent.split(":");
        const start = parts[0]?.trim() ? parseInt(parts[0].trim(), 10) : undefined;
        const end = parts[1]?.trim() ? parseInt(parts[1].trim(), 10) : undefined;
        tokens.push({ type: "slice", start, end });
      } else if (/^-?\d+$/.test(bracketContent)) {
        // Numeric index
        tokens.push({ type: "index", index: parseInt(bracketContent, 10) });
      } else {
        // Quoted property name e.g. ['key'] or ["key"]
        const unquoted = bracketContent.replace(/^['"]|['"]$/g, "");
        tokens.push({ type: "property", key: unquoted });
      }
    } else {
      i++;
    }
  }

  return tokens;
}

function applyToken(parent: JsonPathMatch, token: PathToken, out: JsonPathMatch[]): void {
  const val = parent.value;
  if (val === null || val === undefined) return;

  if (token.type === "property") {
    const key = token.key ?? "";
    if (typeof val === "object" && val !== null && key in (val as Record<string, unknown>)) {
      const obj = val as Record<string, unknown>;
      out.push({
        path: `${parent.path}.${key}`,
        value: obj[key],
      });
    }
  } else if (token.type === "index") {
    if (Array.isArray(val)) {
      let idx = token.index ?? 0;
      if (idx < 0) idx = val.length + idx;
      if (idx >= 0 && idx < val.length) {
        out.push({
          path: `${parent.path}[${idx}]`,
          value: val[idx],
        });
      }
    }
  } else if (token.type === "wildcard") {
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        out.push({
          path: `${parent.path}[${i}]`,
          value: val[i],
        });
      }
    } else if (typeof val === "object" && val !== null) {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        out.push({
          path: `${parent.path}.${k}`,
          value: v,
        });
      }
    }
  } else if (token.type === "slice") {
    if (Array.isArray(val)) {
      const start = token.start !== undefined ? (token.start < 0 ? val.length + token.start : token.start) : 0;
      const end = token.end !== undefined ? (token.end < 0 ? val.length + token.end : token.end) : val.length;
      for (let i = Math.max(0, start); i < Math.min(val.length, end); i++) {
        out.push({
          path: `${parent.path}[${i}]`,
          value: val[i],
        });
      }
    }
  } else if (token.type === "recursive") {
    const key = token.key ?? "*";
    collectRecursive(parent.path, val, key, out);
  }
}

function collectRecursive(currentPath: string, currentVal: unknown, targetKey: string, out: JsonPathMatch[]): void {
  if (currentVal === null || typeof currentVal !== "object") return;

  if (Array.isArray(currentVal)) {
    for (let i = 0; i < currentVal.length; i++) {
      const item = currentVal[i];
      const itemPath = `${currentPath}[${i}]`;
      if (targetKey === "*") {
        out.push({ path: itemPath, value: item });
      }
      collectRecursive(itemPath, item, targetKey, out);
    }
  } else {
    const obj = currentVal as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      const childPath = `${currentPath}.${k}`;
      if (targetKey === "*" || k === targetKey) {
        out.push({ path: childPath, value: v });
      }
      collectRecursive(childPath, v, targetKey, out);
    }
  }
}
