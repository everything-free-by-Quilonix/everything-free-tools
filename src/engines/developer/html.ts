/**
 * Native HTML Formatter & Minifier Engine.
 *
 * Implements lexical HTML tokenization, void element detection,
 * configurable indentation, and safe minification. 100% local, zero network.
 */

export interface HtmlFormatOptions {
  indentSize?: number;
}

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Formats HTML markup with structured indentation.
 */
export function formatHtml(html: string, options: HtmlFormatOptions | number = {}): string {
  const indentSize = typeof options === "number" ? options : (options.indentSize ?? 2);
  const indentStr = " ".repeat(indentSize);

  // Clean extra spaces between tags
  const clean = html.replace(/>\s+</g, "><").trim();
  const tokens = clean.split(/(<[^>]+>)/g).filter((t) => t.trim().length > 0);

  const formattedPieces: {
    type: "open" | "close" | "self" | "comment" | "doctype" | "text";
    raw: string;
    tag: string;
  }[] = [];

  for (const token of tokens) {
    if (token.startsWith("<!DOCTYPE") || token.startsWith("<!doctype")) {
      formattedPieces.push({ type: "doctype", raw: token, tag: "" });
    } else if (token.startsWith("<!--")) {
      formattedPieces.push({ type: "comment", raw: token, tag: "" });
    } else if (token.startsWith("</")) {
      const match = token.match(/^<\/([a-zA-Z0-9_-]+)/);
      formattedPieces.push({ type: "close", raw: token, tag: match?.[1]?.toLowerCase() ?? "" });
    } else if (
      token.startsWith("<") &&
      (token.endsWith("/>") || VOID_ELEMENTS.has(token.match(/^<([a-zA-Z0-9_-]+)/)?.[1]?.toLowerCase() ?? ""))
    ) {
      const match = token.match(/^<([a-zA-Z0-9_-]+)/);
      formattedPieces.push({ type: "self", raw: token, tag: match?.[1]?.toLowerCase() ?? "" });
    } else if (token.startsWith("<")) {
      const match = token.match(/^<([a-zA-Z0-9_-]+)/);
      formattedPieces.push({ type: "open", raw: token, tag: match?.[1]?.toLowerCase() ?? "" });
    } else {
      formattedPieces.push({ type: "text", raw: token, tag: "" });
    }
  }

  const lines: string[] = [];
  let depth = 0;

  for (let i = 0; i < formattedPieces.length; i++) {
    const current = formattedPieces[i]!;

    // Check if open tag immediately followed by text and corresponding closing tag: e.g. <h1>Title</h1>
    if (
      current.type === "open" &&
      formattedPieces[i + 1]?.type === "text" &&
      formattedPieces[i + 2]?.type === "close" &&
      formattedPieces[i + 2]?.tag === current.tag
    ) {
      const text = formattedPieces[i + 1]!.raw;
      const close = formattedPieces[i + 2]!.raw;
      lines.push(`${indentStr.repeat(depth)}${current.raw}${text}${close}`);
      i += 2;
      continue;
    }

    if (current.type === "close") {
      depth = Math.max(0, depth - 1);
      lines.push(`${indentStr.repeat(depth)}${current.raw}`);
    } else if (current.type === "open") {
      // If the next piece is text, append it to the current line: e.g. <p>Paragraph with
      if (formattedPieces[i + 1]?.type === "text") {
        lines.push(`${indentStr.repeat(depth)}${current.raw}${formattedPieces[i + 1]!.raw}`);
        depth++;
        i++;
      } else {
        lines.push(`${indentStr.repeat(depth)}${current.raw}`);
        depth++;
      }
    } else if (current.type === "self" || current.type === "comment" || current.type === "doctype") {
      lines.push(`${indentStr.repeat(depth)}${current.raw}`);
    } else {
      lines.push(`${indentStr.repeat(depth)}${current.raw.trim()}`);
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Minifies HTML by removing whitespace between tags, linebreaks, and comments.
 */
export function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "") // remove comments
    .replace(/\s+/g, " ") // collapse whitespaces
    .replace(/>\s+</g, "><") // remove space between tags
    .trim();
}
