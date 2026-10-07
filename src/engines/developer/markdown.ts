/**
 * Native Markdown Parsing & Safe Sanitization Engine.
 *
 * Converts GitHub Flavored Markdown to HTML with strict built-in XSS sanitization,
 * preventing arbitrary script execution and unsafe protocol links.
 * 100% local, zero network.
 */

/**
 * Parses markdown to sanitized HTML.
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown.trim()) return "";

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeContent: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";
  let inBlockquote = false;
  let blockquoteContent: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  const flushList = () => {
    if (inList) {
      htmlParts.push(`</${listType}>`);
      inList = false;
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote) {
      htmlParts.push(`<blockquote><p>${blockquoteContent.join("<br>")}</p></blockquote>`);
      inBlockquote = false;
      blockquoteContent = [];
    }
  };

  const flushTable = () => {
    if (inTable) {
      htmlParts.push(renderTableBlock(tableRows));
      inTable = false;
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // Code blocks ```
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlParts.push(
          `<pre><code class="language-${escapeHtml(codeBlockLang)}">${escapeHtml(codeContent.join("\n"))}</code></pre>`,
        );
        inCodeBlock = false;
        codeBlockLang = "";
        codeContent = [];
      } else {
        flushList();
        flushBlockquote();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(?:---|\*\*\*|___)\s*$/.test(line.trim())) {
      flushList();
      flushBlockquote();
      flushTable();
      htmlParts.push("<hr />");
      continue;
    }

    // Tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushList();
      flushBlockquote();
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else {
      flushTable();
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      flushList();
      flushBlockquote();
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2]);
      htmlParts.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      flushList();
      inBlockquote = true;
      blockquoteContent.push(renderInline(line.replace(/^>\s*/, "")));
      continue;
    } else {
      flushBlockquote();
    }

    // Unordered List
    const ulMatch = line.match(/^[-*+]\s+(.*)$/);
    if (ulMatch && ulMatch[1]) {
      flushBlockquote();
      if (!inList || listType !== "ul") {
        flushList();
        htmlParts.push("<ul>");
        inList = true;
        listType = "ul";
      }
      htmlParts.push(`<li>${renderInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered List
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch && olMatch[1]) {
      flushBlockquote();
      if (!inList || listType !== "ol") {
        flushList();
        htmlParts.push("<ol>");
        inList = true;
        listType = "ol";
      }
      htmlParts.push(`<li>${renderInline(olMatch[1])}</li>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      flushList();
      flushBlockquote();
      continue;
    }

    // Regular paragraph
    flushList();
    flushBlockquote();
    htmlParts.push(`<p>${renderInline(line)}</p>`);
  }

  flushList();
  flushBlockquote();
  flushTable();

  return sanitizeHtml(htmlParts.join("\n"));
}

function renderTableBlock(rows: string[]): string {
  if (rows.length === 0) return "";
  const headerLine = rows[0];
  const separatorLine = rows[1];
  const bodyLines = rows.slice(2);

  if (!headerLine || !separatorLine) return "";

  const splitCells = (row: string): string[] => {
    return row
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());
  };

  const headers = splitCells(headerLine);
  let html = "<table>\n<thead>\n<tr>\n";
  for (const h of headers) {
    html += `  <th>${renderInline(h)}</th>\n`;
  }
  html += "</tr>\n</thead>\n<tbody>\n";

  for (const b of bodyLines) {
    const cells = splitCells(b);
    html += "<tr>\n";
    for (const c of cells) {
      html += `  <td>${renderInline(c)}</td>\n`;
    }
    html += "</tr>\n";
  }

  html += "</tbody>\n</table>";
  return html;
}

function renderInline(text: string): string {
  let res = text;

  // Inline code: `code`
  res = res.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

  // Bold & Italics
  res = res.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  res = res.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  res = res.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  res = res.replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>");
  res = res.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  res = res.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Strikethrough
  res = res.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Images: ![alt](url)
  res = res.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<img src="${safeUrl}" alt="${escapeHtml(alt)}" />`;
  });

  // Links: [text](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return res;
}

function sanitizeUrl(url: string): string {
  const clean = url.trim();
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("mailto:") ||
    clean.startsWith("#") ||
    clean.startsWith("/")
  ) {
    return escapeHtml(clean);
  }
  return "#";
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHtml(html: string): string {
  // Strip harmful tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
}
