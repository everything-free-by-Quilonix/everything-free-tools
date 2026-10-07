/**
 * Native CSV Parser, Serializer & CSV ↔ JSON Engine (RFC 4180).
 *
 * Implements robust character-by-character CSV parsing supporting quoted fields,
 * embedded newlines, custom delimiters, auto-detection, and JSON mapping.
 * 100% local, zero network.
 */

export interface CsvParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  trimFields?: boolean;
}

export interface CsvStringifyOptions {
  delimiter?: string;
  header?: boolean;
  quoteAll?: boolean;
}

export interface CsvData {
  headers: string[];
  rows: string[][];
  rowCount: number;
  columnCount: number;
}

/**
 * Detects common delimiters (, ; \t |).
 */
export function detectDelimiter(sample: string): string {
  const line = sample.split(/\r\n|\n|\r/)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (line.match(/,/g) || []).length,
    ";": (line.match(/;/g) || []).length,
    "\t": (line.match(/\t/g) || []).length,
    "|": (line.match(/\|/g) || []).length,
  };

  let maxDelim = ",";
  let maxCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDelim = delim;
    }
  }
  return maxDelim;
}

/**
 * Parses raw CSV/TSV text into structured rows and headers according to RFC 4180.
 */
export function parseCsv(text: string, options: CsvParseOptions = {}): CsvData {
  const delimiter = options.delimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote ("")
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      // Delimiter outside quotes
      currentRow.push(options.trimFields ? currentField.trim() : currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      // End of line
      if (char === "\r" && nextChar === "\n") {
        i++; // Skip LF in CRLF
      }
      currentRow.push(options.trimFields ? currentField.trim() : currentField);
      currentField = "";
      if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === "")) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push remainder
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(options.trimFields ? currentField.trim() : currentField);
    if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], rowCount: 0, columnCount: 0 };
  }

  const hasHeader = options.hasHeader ?? true;
  let headers: string[] = [];
  let dataRows: string[][] = rows;

  if (hasHeader && rows[0]) {
    headers = rows[0].map((h, idx) => h || `col_${idx + 1}`);
    dataRows = rows.slice(1);
  } else if (rows[0]) {
    headers = rows[0].map((_, idx) => `col_${idx + 1}`);
  }

  const columnCount = headers.length;

  return {
    headers,
    rows: dataRows,
    rowCount: dataRows.length,
    columnCount,
  };
}

/**
 * Converts CSV string to JSON objects.
 */
export function csvToJson(csv: string, options: CsvParseOptions = {}): Record<string, unknown>[] {
  const parsed = parseCsv(csv, options);
  const result: Record<string, unknown>[] = [];

  for (const row of parsed.rows) {
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < parsed.headers.length; c++) {
      const header = parsed.headers[c] ?? `col_${c + 1}`;
      const cell = row[c] ?? "";

      // Convert numbers / booleans if primitive
      if (cell === "true") obj[header] = true;
      else if (cell === "false") obj[header] = false;
      else if (cell === "null" || cell === "") obj[header] = null;
      else if (!isNaN(Number(cell)) && cell.trim() !== "") obj[header] = Number(cell);
      else obj[header] = cell;
    }
    result.push(obj);
  }

  return result;
}

/**
 * Converts an array of objects to CSV.
 */
export function jsonToCsv(data: unknown[], options: CsvStringifyOptions = {}): string {
  if (!Array.isArray(data) || data.length === 0) return "";
  const delimiter = options.delimiter || ",";
  const quoteAll = options.quoteAll ?? false;

  // Extract all unique keys
  const keysSet = new Set<string>();
  for (const item of data) {
    if (typeof item === "object" && item !== null) {
      for (const k of Object.keys(item)) {
        keysSet.add(k);
      }
    }
  }
  const headers = Array.from(keysSet);

  const formatField = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    let str = typeof val === "object" ? JSON.stringify(val) : String(val);
    const mustQuote =
      quoteAll || str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r");

    if (str.includes('"')) {
      str = str.replace(/"/g, '""');
    }

    return mustQuote ? `"${str}"` : str;
  };

  const lines: string[] = [];
  if (options.header ?? true) {
    lines.push(headers.map((h) => formatField(h)).join(delimiter));
  }

  for (const item of data) {
    const obj = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const row = headers.map((h) => formatField(obj[h]));
    lines.push(row.join(delimiter));
  }

  return lines.join("\n") + "\n";
}
