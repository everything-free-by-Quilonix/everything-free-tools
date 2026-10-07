/**
 * Native Table Generator Engine.
 *
 * Converts tabular grid data, CSV, or JSON into GitHub Flavored Markdown tables
 * and semantic HTML tables with configurable alignments. 100% local, zero network.
 */

export type TableAlignment = "left" | "center" | "right";

export interface TableOptions {
  headers: string[];
  rows: string[][];
  alignments?: TableAlignment[];
}

/**
 * Generates a GitHub-flavored Markdown table string.
 */
export function generateMarkdownTable(data: TableOptions): string {
  const { headers, rows, alignments } = data;
  if (headers.length === 0 && rows.length === 0) return "";

  const colCount = Math.max(headers.length, ...rows.map((r) => r.length));

  // Pad column names
  const headerCols = Array.from({ length: colCount }, (_, idx) => headers[idx] ?? `Col ${idx + 1}`);

  // Calculate max widths for clean column alignment
  const colWidths = headerCols.map((h, colIdx) => {
    let max = h.length;
    for (const row of rows) {
      const cell = row[colIdx] ?? "";
      if (cell.length > max) max = cell.length;
    }
    return Math.max(3, max);
  });

  // Header row
  const headerRow = "| " + headerCols.map((h, i) => h.padEnd(colWidths[i] ?? 3, " ")).join(" | ") + " |";

  // Separator row
  const separatorRow =
    "| " +
    headerCols
      .map((_, i) => {
        const align = alignments?.[i] ?? "left";
        const width = colWidths[i] ?? 3;
        if (align === "center") {
          return ":" + "-".repeat(Math.max(1, width - 2)) + ":";
        }
        if (align === "right") {
          return "-".repeat(Math.max(1, width - 1)) + ":";
        }
        return ":" + "-".repeat(Math.max(1, width - 1));
      })
      .join(" | ") +
    " |";

  // Body rows
  const bodyRows = rows.map((row) => {
    return (
      "| " +
      Array.from({ length: colCount }, (_, i) => {
        const cell = (row[i] ?? "").replace(/\|/g, "\\|");
        const width = colWidths[i] ?? 3;
        const align = alignments?.[i] ?? "left";
        if (align === "right") {
          return cell.padStart(width, " ");
        }
        return cell.padEnd(width, " ");
      }).join(" | ") +
      " |"
    );
  });

  return [headerRow, separatorRow, ...bodyRows].join("\n") + "\n";
}

/**
 * Generates semantic HTML table markup.
 */
export function generateHtmlTable(data: TableOptions): string {
  const { headers, rows, alignments } = data;
  const lines: string[] = ["<table>"];

  if (headers.length > 0) {
    lines.push("  <thead>");
    lines.push("    <tr>");
    headers.forEach((h, i) => {
      const align = alignments?.[i] ? ` style="text-align: ${alignments[i]}"` : "";
      lines.push(`      <th${align}>${escapeHtml(h)}</th>`);
    });
    lines.push("    </tr>");
    lines.push("  </thead>");
  }

  if (rows.length > 0) {
    lines.push("  <tbody>");
    for (const row of rows) {
      lines.push("    <tr>");
      row.forEach((cell, i) => {
        const align = alignments?.[i] ? ` style="text-align: ${alignments[i]}"` : "";
        lines.push(`      <td${align}>${escapeHtml(cell)}</td>`);
      });
      lines.push("    </tr>");
    }
    lines.push("  </tbody>");
  }

  lines.push("</table>\n");
  return lines.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
