/**
 * Strict JSON formatting and validation (RFC 8259).
 *
 * Why not `JSON.parse` + `JSON.stringify`: that round trip silently changes data.
 * `12345678901234567890` becomes `12345678901234567000`, `1.0` becomes `1`, `1e2`
 * becomes `100`, `"\u00e9"` becomes `"é"`, and a duplicated key loses all but its
 * last value. A formatter must never alter values, so this module tokenises the text
 * and re-emits every number and string exactly as written, changing only whitespace.
 *
 * It also reports errors with a line and column in every browser, rather than
 * relying on engine-specific `SyntaxError` messages.
 *
 * The parser is iterative (an explicit stack), so deeply nested input cannot
 * overflow the call stack.
 */

export type Indent = 2 | 4 | "tab";

export interface JsonLocation {
  /** 1-based line. */
  line: number;
  /** 1-based column, in UTF-16 code units, as editors count them. */
  column: number;
  /** 0-based offset into the input. */
  offset: number;
}

export interface JsonError extends JsonLocation {
  message: string;
}

export interface JsonStats {
  /** Deepest nesting of objects and arrays. */
  depth: number;
  /** Values of any kind, including containers. */
  values: number;
  /** Object keys, including repeats. */
  keys: number;
}

export type JsonResult = { ok: true; output: string; stats: JsonStats } | { ok: false; error: JsonError };

type TokenType = "{" | "}" | "[" | "]" | ":" | "," | "string" | "number" | "literal";

interface Token {
  type: TokenType;
  start: number;
  end: number;
}

class JsonSyntaxError extends Error {
  readonly offset: number;

  constructor(message: string, offset: number) {
    super(message);
    this.offset = offset;
  }
}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const LITERALS = ["true", "false", "null"] as const;

function describeChar(text: string, index: number): string {
  const char = text.codePointAt(index);
  if (char === undefined) return "end of input";
  const value = String.fromCodePoint(char);
  if (char < 0x20 || char === 0x7f) return `control character U+${char.toString(16).toUpperCase().padStart(4, "0")}`;
  return `“${value}”`;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const length = text.length;

  while (i < length) {
    const char = text.charCodeAt(i);

    // Insignificant whitespace: space, tab, LF, CR. Nothing else.
    if (char === 0x20 || char === 0x09 || char === 0x0a || char === 0x0d) {
      i += 1;
      continue;
    }

    if (char === 0x7b || char === 0x7d || char === 0x5b || char === 0x5d || char === 0x3a || char === 0x2c) {
      tokens.push({ type: text[i] as TokenType, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    if (char === 0x22) {
      const start = i;
      i += 1;
      for (;;) {
        if (i >= length) throw new JsonSyntaxError("This string is never closed. Add a closing double quote.", start);
        const c = text.charCodeAt(i);
        if (c === 0x22) {
          i += 1;
          break;
        }
        if (c < 0x20) {
          throw new JsonSyntaxError(
            c === 0x0a || c === 0x0d
              ? "Strings can't span lines. Use \\n for a line break."
              : `Unescaped ${describeChar(text, i)} inside a string.`,
            i,
          );
        }
        if (c === 0x5c) {
          const next = text[i + 1];
          if (next === undefined)
            throw new JsonSyntaxError("This string is never closed. Add a closing double quote.", start);
          if ('"\\/bfnrt'.includes(next)) i += 2;
          else if (next === "u") {
            if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
              throw new JsonSyntaxError("\\u must be followed by four hexadecimal digits.", i);
            }
            i += 6;
          } else throw new JsonSyntaxError(`“\\${next}” is not a valid escape in JSON.`, i);
          continue;
        }
        i += 1;
      }
      tokens.push({ type: "string", start, end: i });
      continue;
    }

    if (char === 0x2d || (char >= 0x30 && char <= 0x39)) {
      NUMBER.lastIndex = i;
      const match = NUMBER.exec(text);
      const end = match ? i + match[0].length : i;
      const after = text[end];
      // A number followed directly by more number-like characters or letters ("01", "1.2.3", "0x10", "12px") is one bad token.
      if (!match || match[0] === "-" || (after !== undefined && /[\w.+\-]/.test(after))) {
        const bad = text.slice(i).match(/^[-+\w.]+/)?.[0] ?? text[i] ?? "";
        let hint = "";
        if (/^-?0[xX]/.test(bad)) hint = " JSON numbers can't be hexadecimal.";
        else if (/^-?0\d/.test(bad)) hint = " Numbers can't have leading zeros.";
        else if (/\.$|\.[eE]/.test(bad)) hint = " A decimal point must be followed by digits.";
        throw new JsonSyntaxError(`“${bad}” is not a valid JSON number.${hint}`, i);
      }
      tokens.push({ type: "number", start: i, end });
      i = end;
      continue;
    }

    const literal = LITERALS.find((word) => text.startsWith(word, i));
    if (literal && !/[A-Za-z0-9_$]/.test(text[i + literal.length] ?? "")) {
      tokens.push({ type: "literal", start: i, end: i + literal.length });
      i += literal.length;
      continue;
    }

    // The common mistakes, named.
    if (char === 0x27) throw new JsonSyntaxError("JSON strings must use double quotes, not single quotes.", i);
    if (char === 0x2f && (text[i + 1] === "/" || text[i + 1] === "*")) {
      throw new JsonSyntaxError("Comments aren't allowed in JSON.", i);
    }
    if (char === 0xfeff) throw new JsonSyntaxError("Unexpected byte order mark.", i);
    const word = text.slice(i).match(/^[A-Za-z_$][\w$]*/)?.[0];
    if (word) {
      const near = LITERALS.find(
        (literal) => literal !== word && (literal.startsWith(word) || word.startsWith(literal)),
      );
      const hint = /^(True|False|Null|TRUE|FALSE|NULL)$/.test(word)
        ? ` JSON literals are lowercase: ${word.toLowerCase()}.`
        : /^(undefined|NaN|Infinity)$/.test(word)
          ? ` ${word} is not a JSON value.`
          : near
            ? ` Did you mean ${near}?`
            : " Keys and text values need double quotes.";
      throw new JsonSyntaxError(`Unexpected “${word}”.${hint}`, i);
    }
    throw new JsonSyntaxError(`Unexpected ${describeChar(text, i)}.`, i);
  }

  return tokens;
}

type Frame = { kind: "object" | "array"; state: "start" | "key" | "colon" | "value" | "comma" };

interface Parsed {
  tokens: Token[];
  stats: JsonStats;
}

/** Validates the token stream against the JSON grammar. Throws `JsonSyntaxError`. */
function parse(text: string): Parsed {
  const tokens = tokenize(text);
  if (tokens.length === 0) throw new JsonSyntaxError("There's no JSON here yet.", text.length);

  const stack: Frame[] = [];
  const stats: JsonStats = { depth: 0, values: 0, keys: 0 };
  let rootDone = false;

  const expectValue = (token: Token) => {
    if (token.type === "{" || token.type === "[") {
      stack.push({ kind: token.type === "{" ? "object" : "array", state: "start" });
      stats.depth = Math.max(stats.depth, stack.length);
      stats.values += 1;
      return;
    }
    if (token.type === "string" || token.type === "number" || token.type === "literal") {
      stats.values += 1;
      completeValue();
      return;
    }
    if (token.type === "}" || token.type === "]")
      throw new JsonSyntaxError(`Expected a value before “${token.type}”.`, token.start);
    throw new JsonSyntaxError(`Expected a value, but found “${token.type}”.`, token.start);
  };

  const completeValue = () => {
    const top = stack.at(-1);
    if (top) top.state = "comma";
    else rootDone = true;
  };

  for (const token of tokens) {
    if (rootDone) {
      throw new JsonSyntaxError(
        "Unexpected content after the end of the JSON. Only one top-level value is allowed.",
        token.start,
      );
    }
    const top = stack.at(-1);
    if (!top) {
      expectValue(token);
      continue;
    }

    if (top.kind === "object") {
      switch (top.state) {
        case "start":
        case "key":
          if (token.type === "}" && top.state === "start") {
            stack.pop();
            completeValue();
          } else if (token.type === "}") {
            throw new JsonSyntaxError(
              "Trailing commas aren't allowed in JSON. Remove the comma before “}”.",
              token.start,
            );
          } else if (token.type === "string") {
            stats.keys += 1;
            top.state = "colon";
          } else {
            throw new JsonSyntaxError(
              token.type === "number" || token.type === "literal"
                ? "Object keys must be strings in double quotes."
                : `Expected a key in double quotes, but found “${token.type}”.`,
              token.start,
            );
          }
          break;
        case "colon":
          if (token.type !== ":") throw new JsonSyntaxError("Expected “:” after the key.", token.start);
          top.state = "value";
          break;
        case "value":
          expectValue(token);
          break;
        case "comma":
          if (token.type === ",") top.state = "key";
          else if (token.type === "}") {
            stack.pop();
            completeValue();
          } else
            throw new JsonSyntaxError("Expected “,” or “}” after this value. A comma may be missing.", token.start);
          break;
      }
    } else {
      switch (top.state) {
        case "start":
        case "value":
          if (token.type === "]" && top.state === "start") {
            stack.pop();
            completeValue();
          } else if (token.type === "]") {
            throw new JsonSyntaxError(
              "Trailing commas aren't allowed in JSON. Remove the comma before “]”.",
              token.start,
            );
          } else expectValue(token);
          break;
        case "comma":
          if (token.type === ",") top.state = "value";
          else if (token.type === "]") {
            stack.pop();
            completeValue();
          } else
            throw new JsonSyntaxError("Expected “,” or “]” after this value. A comma may be missing.", token.start);
          break;
        default:
          throw new JsonSyntaxError(`Unexpected “${token.type}”.`, token.start);
      }
    }
  }

  const open = stack.at(-1);
  if (open) {
    throw new JsonSyntaxError(
      open.kind === "object"
        ? "The JSON ends before this object is closed. Add “}”."
        : "The JSON ends before this array is closed. Add “]”.",
      text.length,
    );
  }

  return { tokens, stats };
}

export function locate(text: string, offset: number): JsonLocation {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i += 1) {
    if (text.charCodeAt(i) === 0x0a) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return { line, column: end - lineStart + 1, offset: end };
}

function fail(text: string, error: unknown): JsonResult {
  if (error instanceof JsonSyntaxError)
    return { ok: false, error: { message: error.message, ...locate(text, error.offset) } };
  throw error;
}

function emit(text: string, tokens: Token[], indent: string | null): string {
  const out: string[] = [];
  let depth = 0;
  const newline = (level: number) => (indent === null ? "" : `\n${indent.repeat(level)}`);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    const next = tokens[i + 1];
    const raw = text.slice(token.start, token.end);

    switch (token.type) {
      case "{":
      case "[": {
        // Empty containers stay on one line: {} and [].
        const closer = token.type === "{" ? "}" : "]";
        if (next?.type === closer) {
          out.push(token.type, closer);
          i += 1;
        } else {
          depth += 1;
          out.push(token.type, newline(depth));
        }
        break;
      }
      case "}":
      case "]":
        depth -= 1;
        out.push(newline(depth), token.type);
        break;
      case ",":
        out.push(",", newline(depth));
        break;
      case ":":
        out.push(indent === null ? ":" : ": ");
        break;
      default:
        out.push(raw);
    }
  }
  return out.join("");
}

/** Strips a leading byte order mark, which many editors add and which JSON forbids. */
function withoutBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function formatJson(input: string, indent: Indent = 2): JsonResult {
  const text = withoutBom(input);
  try {
    const { tokens, stats } = parse(text);
    return { ok: true, output: emit(text, tokens, indent === "tab" ? "\t" : " ".repeat(indent)), stats };
  } catch (error) {
    return fail(text, error);
  }
}

export function minifyJson(input: string): JsonResult {
  const text = withoutBom(input);
  try {
    const { tokens, stats } = parse(text);
    return { ok: true, output: emit(text, tokens, null), stats };
  } catch (error) {
    return fail(text, error);
  }
}

/** Validation only: the output is the input unchanged. */
export function validateJson(input: string): JsonResult {
  const text = withoutBom(input);
  try {
    const { stats } = parse(text);
    return { ok: true, output: input, stats };
  } catch (error) {
    return fail(text, error);
  }
}

export type JsonMode = "format" | "minify" | "validate";

export interface JsonTaskInput {
  text: string;
  mode: JsonMode;
  indent: Indent;
}

/** Single entry point for the worker. */
export function runJson({ text, mode, indent }: JsonTaskInput): JsonResult {
  if (mode === "minify") return minifyJson(text);
  if (mode === "validate") return validateJson(text);
  return formatJson(text, indent);
}
