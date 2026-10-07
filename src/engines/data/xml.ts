/**
 * Native XML Formatter, Minifier & XML ↔ JSON Conversion Engine.
 *
 * Implements lexical XML parsing, indentation, minification, and
 * bidirectional JSON mapping. 100% local, zero network.
 */

export interface XmlFormatOptions {
  indentSize?: number;
}

/**
 * Formats XML with consistent indentation and newlines.
 */
export function formatXml(xml: string, indentSize = 2): string {
  const indent = " ".repeat(indentSize);
  const clean = xml.replace(/>\s*</g, "><").trim();
  const tokens = clean.match(/<[^>]+>|[^<]+/g) || [];
  let depth = 0;
  let formatted = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = (tokens[i] ?? "").trim();
    if (!token) continue;

    if (token.startsWith("<?") || token.startsWith("<!DOCTYPE") || token.startsWith("<!doctype")) {
      formatted += token + "\n";
    } else if (token.startsWith("<!--")) {
      formatted += indent.repeat(depth) + token + "\n";
    } else if (token.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      formatted += indent.repeat(depth) + token + "\n";
    } else if (token.startsWith("<") && token.endsWith("/>")) {
      formatted += indent.repeat(depth) + token + "\n";
    } else if (token.startsWith("<")) {
      // Check if next token is text and token after next is the matching closing tag
      const nextToken = tokens[i + 1]?.trim() ?? "";
      const nextNextToken = tokens[i + 2]?.trim() ?? "";
      const tagNameMatch = token.match(/^<([a-zA-Z0-9_:-]+)/);
      const tagName = tagNameMatch?.[1];

      if (tagName && !nextToken.startsWith("<") && nextNextToken === `</${tagName}>`) {
        formatted += indent.repeat(depth) + `${token}${nextToken}${nextNextToken}\n`;
        i += 2;
      } else {
        formatted += indent.repeat(depth) + token + "\n";
        depth++;
      }
    } else {
      formatted += indent.repeat(depth) + token + "\n";
    }
  }

  return formatted.trim() + "\n";
}

/**
 * Minifies XML by removing unnecessary whitespace and line breaks.
 */
export function minifyXml(xml: string): string {
  return xml
    .replace(/\s*([<>])\s*/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

/**
 * Converts XML string into a JSON-compatible JavaScript object.
 */
export function xmlToJson(xml: string): unknown {
  const clean = xml.trim();
  if (!clean) return null;

  // Browser environment: use DOMParser if available
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(clean, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      throw new Error(`XML Parse Error: ${parserError.textContent}`);
    }
    return domNodeToObject(doc.documentElement);
  }

  // Universal fallback parser
  return parseXmlLexical(clean);
}

function domNodeToObject(node: Element): unknown {
  const obj: Record<string, unknown> = {};

  // Attributes
  if (node.attributes && node.attributes.length > 0) {
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      if (attr) {
        obj[`@_${attr.name}`] = attr.value;
      }
    }
  }

  // Children
  const children = Array.from(node.children);
  if (children.length === 0) {
    const text = node.textContent?.trim() ?? "";
    if (Object.keys(obj).length === 0) {
      return text;
    }
    if (text) {
      obj["#text"] = text;
    }
    return obj;
  }

  const childMap: Record<string, unknown[]> = {};
  for (const child of children) {
    const tag = child.tagName;
    if (!childMap[tag]) childMap[tag] = [];
    childMap[tag]?.push(domNodeToObject(child));
  }

  for (const [tag, items] of Object.entries(childMap)) {
    if (items.length === 1) {
      obj[tag] = items[0];
    } else {
      obj[tag] = items;
    }
  }

  return { [node.tagName]: obj };
}

/**
 * Lexical XML parser fallback for Node.js / non-DOM environments.
 */
function parseXmlLexical(xml: string): Record<string, unknown> {
  const rootMatch = xml.match(/<([a-zA-Z0-9_-]+)([^>]*)>([\s\S]*)<\/\1>/);
  if (!rootMatch) {
    // Single self-closing
    const selfClosing = xml.match(/<([a-zA-Z0-9_-]+)([^>]*)\/>/);
    if (selfClosing && selfClosing[1]) {
      return { [selfClosing[1]]: {} };
    }
    return {};
  }

  const rootTag = rootMatch[1] ?? "root";
  const innerContent = rootMatch[3] ?? "";

  // Parse direct children
  const children: Record<string, unknown[]> = {};
  const childRegex = /<([a-zA-Z0-9_-]+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = childRegex.exec(innerContent)) !== null) {
    const tag = match[1] ?? "item";
    const body = match[3] ?? "";
    if (!children[tag]) children[tag] = [];

    if (body.includes("<")) {
      children[tag]?.push(parseXmlLexical(match[0]));
    } else {
      children[tag]?.push(body.trim());
    }
  }

  const finalObj: Record<string, unknown> = {};
  const keys = Object.keys(children);
  if (keys.length === 0) {
    finalObj[rootTag] = innerContent.trim();
  } else {
    const innerObj: Record<string, unknown> = {};
    for (const [tag, items] of Object.entries(children)) {
      innerObj[tag] = items.length === 1 ? items[0] : items;
    }
    finalObj[rootTag] = innerObj;
  }

  return finalObj;
}

/**
 * Converts a JavaScript object or JSON string into an XML string.
 */
export function jsonToXml(input: unknown, rootTag = "root", indentSize = 2): string {
  let data = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new Error("Invalid JSON input");
    }
  }

  const rawXml = buildXmlNode(rootTag, data);
  return formatXml(`<?xml version="1.0" encoding="UTF-8"?>\n${rawXml}`, indentSize);
}

function buildXmlNode(tag: string, val: unknown): string {
  if (val === null || val === undefined) {
    return `<${tag}/>`;
  }

  if (typeof val !== "object") {
    return `<${tag}>${escapeXml(String(val))}</${tag}>`;
  }

  if (Array.isArray(val)) {
    return val.map((item) => buildXmlNode(tag, item)).join("\n");
  }

  const obj = val as Record<string, unknown>;
  const attrs: string[] = [];
  let childrenXml = "";

  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("@_")) {
      attrs.push(`${k.slice(2)}="${escapeXml(String(v))}"`);
    } else if (k === "#text") {
      childrenXml += escapeXml(String(v));
    } else {
      childrenXml += buildXmlNode(k, v);
    }
  }

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  if (!childrenXml) {
    return `<${tag}${attrStr}/>`;
  }

  return `<${tag}${attrStr}>${childrenXml}</${tag}>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
