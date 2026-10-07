/**
 * Native YAML ↔ JSON Conversion Engine.
 *
 * Provides bidirectional parsing and serialization between JSON and YAML
 * without external dependencies. 100% local, zero network.
 */

/**
 * Converts a JavaScript value or JSON string to formatted YAML.
 */
export function jsonToYaml(input: unknown, indentSize = 2): string {
  let data = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new Error("Invalid JSON input");
    }
  }

  return serializeYaml(data, 0, indentSize).trimEnd() + "\n";
}

function serializeYaml(val: unknown, depth: number, indentSize: number): string {
  const indent = " ".repeat(depth * indentSize);

  if (val === null || val === undefined) {
    return "null\n";
  }

  if (typeof val === "boolean") {
    return `${val}\n`;
  }

  if (typeof val === "number") {
    return `${val}\n`;
  }

  if (typeof val === "string") {
    if (val.includes("\n")) {
      const lines = val
        .split("\n")
        .map((l) => indent + "  " + l)
        .join("\n");
      return `|\n${lines}\n`;
    }
    if (
      val === "" ||
      val === "true" ||
      val === "false" ||
      val === "null" ||
      /^[-?:\s\[\]{}#&*!|>'"%@`]/.test(val) ||
      !isNaN(Number(val))
    ) {
      return JSON.stringify(val) + "\n";
    }
    return `${val}\n`;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]\n";
    let res = "";
    for (const item of val) {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        // Object item in array
        const inner = serializeYaml(item, depth + 1, indentSize).trimStart();
        res += `${indent}- ${inner}`;
      } else {
        res += `${indent}- ${serializeYaml(item, depth + 1, indentSize).trimStart()}`;
      }
    }
    return res;
  }

  if (typeof val === "object") {
    const keys = Object.keys(val as Record<string, unknown>);
    if (keys.length === 0) return "{}\n";
    let res = "";
    for (const key of keys) {
      const childVal = (val as Record<string, unknown>)[key];
      const safeKey = /^[a-zA-Z0-9_-]+$/.test(key) ? key : JSON.stringify(key);

      if (typeof childVal === "object" && childVal !== null) {
        if (Array.isArray(childVal) && childVal.length === 0) {
          res += `${indent}${safeKey}: []\n`;
        } else if (!Array.isArray(childVal) && Object.keys(childVal).length === 0) {
          res += `${indent}${safeKey}: {}\n`;
        } else {
          res += `${indent}${safeKey}:\n${serializeYaml(childVal, depth + 1, indentSize)}`;
        }
      } else {
        res += `${indent}${safeKey}: ${serializeYaml(childVal, depth + 1, indentSize).trimStart()}`;
      }
    }
    return res;
  }

  return `${String(val)}\n`;
}

/**
 * Converts a YAML string into a formatted JSON string.
 */
export function yamlToJson(yamlString: string, indent = 2): string {
  const parsed = parseYaml(yamlString);
  return JSON.stringify(parsed, null, indent);
}

/**
 * Parses basic to intermediate YAML into a JavaScript data structure.
 */
export function parseYaml(yaml: string): unknown {
  const clean = yaml.replace(/\r\n/g, "\n");
  const rawLines = clean.split("\n");

  // Filter comments & empty lines while preserving indentation
  const lines: { indent: number; text: string; raw: string }[] = [];
  for (const raw of rawLines) {
    const commentIdx = raw.indexOf("#");
    const content = commentIdx !== -1 ? raw.slice(0, commentIdx) : raw;
    if (!content.trim()) continue;
    const match = content.match(/^(\s*)(.*)$/);
    const ind = match?.[1] ? match[1].length : 0;
    const text = match?.[2] ? match[2].trimEnd() : "";
    if (text) {
      lines.push({ indent: ind, text, raw: content });
    }
  }

  if (lines.length === 0) return null;

  let lineIdx = 0;

  function parseBlock(currentIndent: number): unknown {
    if (lineIdx >= lines.length) return null;
    const current = lines[lineIdx];
    if (!current) return null;

    if (current.text.startsWith("- ")) {
      // It's a sequence/list
      const list: unknown[] = [];
      while (lineIdx < lines.length) {
        const item = lines[lineIdx];
        if (!item || item.indent < currentIndent) break;
        if (item.indent > currentIndent) {
          break;
        }

        if (item.text.startsWith("- ")) {
          const itemContent = item.text.slice(2).trim();
          lineIdx++;
          if (!itemContent) {
            // Child block underneath
            list.push(parseBlock(item.indent + 2));
          } else if (itemContent.includes(": ")) {
            // Inline map in list item e.g. - name: Alice
            const [k, ...vParts] = itemContent.split(": ");
            const subKey = (k ?? "").trim();
            const subValStr = vParts.join(": ").trim();
            const subObj: Record<string, unknown> = {};
            subObj[subKey] = parseScalar(subValStr);
            list.push(subObj);
          } else {
            list.push(parseScalar(itemContent));
          }
        } else {
          break;
        }
      }
      return list;
    } else {
      // It's a map/object or scalar
      if (lines.length === 1 && !current.text.includes(":")) {
        lineIdx++;
        return parseScalar(current.text);
      }

      const map: Record<string, unknown> = {};
      while (lineIdx < lines.length) {
        const item = lines[lineIdx];
        if (!item || item.indent < currentIndent) break;
        if (item.indent > currentIndent) break;

        const colonIdx = item.text.indexOf(":");
        if (colonIdx === -1) {
          lineIdx++;
          continue;
        }

        const rawKey = item.text.slice(0, colonIdx).trim();
        const key = rawKey.replace(/^['"]|['"]$/g, "");
        const remainder = item.text.slice(colonIdx + 1).trim();
        lineIdx++;

        if (!remainder) {
          // Nested structure below
          if (lineIdx < lines.length) {
            const nextItem = lines[lineIdx];
            if (nextItem && nextItem.indent > currentIndent) {
              map[key] = parseBlock(nextItem.indent);
            } else {
              map[key] = null;
            }
          } else {
            map[key] = null;
          }
        } else {
          map[key] = parseScalar(remainder);
        }
      }
      return map;
    }
  }

  return parseBlock(lines[0]?.indent ?? 0);
}

function parseScalar(val: string): unknown {
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "~" || trimmed.toLowerCase() === "null") return null;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;

  // Number
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Quoted string
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  // Bracket inline arrays [a, b, c]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      const items = trimmed
        .slice(1, -1)
        .split(",")
        .map((s) => parseScalar(s.trim()));
      return items;
    }
  }

  // Inline maps {a: 1}
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}
