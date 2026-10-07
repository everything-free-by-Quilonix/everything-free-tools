/**
 * Native SQL Formatter & Minifier Engine.
 *
 * Implements lexical tokenization, keyword capitalization, clause-level indentation,
 * and compact minification across standard SQL dialects (Standard, PostgreSQL, MySQL, SQLite).
 * 100% local, zero network.
 */

export type SqlDialect = "standard" | "postgresql" | "mysql" | "sqlite";

export interface SqlFormatOptions {
  dialect?: SqlDialect;
  indentSize?: number;
  keywordCase?: "upper" | "lower";
}

const MAJOR_CLAUSES = [
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "CROSS JOIN",
  "ON",
  "VALUES",
  "SET",
  "INSERT INTO",
  "UPDATE",
  "DELETE FROM",
  "CREATE TABLE",
  "ALTER TABLE",
  "DROP TABLE",
  "UNION ALL",
  "UNION",
  "WITH",
];

const SQL_KEYWORDS = new Set([
  ...MAJOR_CLAUSES,
  "AND",
  "OR",
  "NOT",
  "IN",
  "IS",
  "NULL",
  "LIKE",
  "ILIKE",
  "BETWEEN",
  "AS",
  "DISTINCT",
  "ALL",
  "EXISTS",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "ASC",
  "DESC",
  "BY",
  "PRIMARY KEY",
  "FOREIGN KEY",
  "REFERENCES",
  "DEFAULT",
  "CASCADE",
  "INDEX",
  "VIEW",
  "TRIGGER",
]);

/**
 * Formats a SQL query with proper linebreaks and indentation.
 */
export function formatSql(sql: string, options: SqlFormatOptions = {}): string {
  const indentSize = options.indentSize ?? 2;
  const keywordCase = options.keywordCase ?? "upper";
  const indentStr = " ".repeat(indentSize);

  if (!sql.trim()) return "";

  // Normalize spaces while preserving strings
  const tokens = tokenizeSql(sql);
  const lines: string[] = [];
  let currentLine = "";
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    const upper = token.toUpperCase();

    // Check if token matches major clause
    const isMajor = MAJOR_CLAUSES.some((clause) => {
      if (clause.includes(" ")) {
        const parts = clause.split(" ");
        return parts[0] === upper && tokens[i + 1]?.toUpperCase() === parts[1];
      }
      return clause === upper;
    });

    if (token === "(") {
      currentLine += " (";
      depth++;
    } else if (token === ")") {
      depth = Math.max(0, depth - 1);
      currentLine += ")";
    } else if (token === ",") {
      currentLine += ",";
      lines.push(currentLine);
      currentLine = indentStr.repeat(depth + 1);
    } else if (isMajor && currentLine.trim().length > 0) {
      lines.push(currentLine);
      currentLine = indentStr.repeat(depth);

      // Handle multi-word clauses like "GROUP BY"
      if (upper === "GROUP" && tokens[i + 1]?.toUpperCase() === "BY") {
        currentLine += keywordCase === "upper" ? "GROUP BY" : "group by";
        i++;
      } else if (upper === "ORDER" && tokens[i + 1]?.toUpperCase() === "BY") {
        currentLine += keywordCase === "upper" ? "ORDER BY" : "order by";
        i++;
      } else if (upper === "INSERT" && tokens[i + 1]?.toUpperCase() === "INTO") {
        currentLine += keywordCase === "upper" ? "INSERT INTO" : "insert into";
        i++;
      } else if (upper === "DELETE" && tokens[i + 1]?.toUpperCase() === "FROM") {
        currentLine += keywordCase === "upper" ? "DELETE FROM" : "delete from";
        i++;
      } else if (upper === "UNION" && tokens[i + 1]?.toUpperCase() === "ALL") {
        currentLine += keywordCase === "upper" ? "UNION ALL" : "union all";
        i++;
      } else if (
        (upper === "LEFT" || upper === "RIGHT" || upper === "INNER" || upper === "FULL" || upper === "CROSS") &&
        tokens[i + 1]?.toUpperCase() === "JOIN"
      ) {
        currentLine += keywordCase === "upper" ? `${upper} JOIN` : `${upper.toLowerCase()} join`;
        i++;
      } else {
        currentLine += keywordCase === "upper" ? upper : upper.toLowerCase();
      }
    } else {
      // Regular word or operator
      const formattedWord = SQL_KEYWORDS.has(upper) ? (keywordCase === "upper" ? upper : upper.toLowerCase()) : token;

      if (currentLine.length > 0 && !currentLine.endsWith(" ") && !currentLine.endsWith("(")) {
        currentLine += " ";
      }
      currentLine += formattedWord;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return (
    lines
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0)
      .join("\n") + "\n"
  );
}

/**
 * Minifies SQL query to a single compact line.
 */
export function minifySql(sql: string): string {
  return sql
    .replace(/--.*$/gm, "") // line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*([=<>!]+)\s*/g, " $1 ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ") ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSql(sql: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const c = sql[i] ?? "";

    // Skip whitespace
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Skip line comments (-- ...)
    if (c === "-" && sql[i + 1] === "-") {
      while (i < len && sql[i] !== "\n") i++;
      continue;
    }

    // Skip block comments (/* ... */)
    if (c === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < len && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // String literals ('...')
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let str = quote;
      i++;
      while (i < len) {
        str += sql[i];
        if (sql[i] === quote && sql[i - 1] !== "\\") {
          i++;
          break;
        }
        i++;
      }
      tokens.push(str);
      continue;
    }

    // Punctuation & operators
    if ("(),;".includes(c)) {
      tokens.push(c);
      i++;
      continue;
    }

    // Identifiers & keywords
    let word = "";
    while (i < len && !/\s|[(),;]/.test(sql[i] ?? "")) {
      word += sql[i];
      i++;
    }
    if (word) {
      tokens.push(word);
    }
  }

  return tokens;
}
