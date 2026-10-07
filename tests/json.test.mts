import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatJson, minifyJson, runJson, validateJson } from "@/engines/data/json";
import { toUserError } from "@/lib/errors";

function ok(result: ReturnType<typeof formatJson>): string {
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.ok ? result.output : "";
}

function error(result: ReturnType<typeof formatJson>) {
  assert.equal(result.ok, false, "expected an error");
  if (result.ok) throw new Error("unreachable");
  return result.error;
}

describe("JSON formatter: never alters values", () => {
  it("keeps big integers, number spelling and escapes exactly", () => {
    const input = '{"big":12345678901234567890,"f":1.0,"e":1E2,"neg":-0,"s":"\\u00e9\\n\\/","emoji":"😀"}';
    const output = ok(formatJson(input, 2));
    for (const raw of ["12345678901234567890", "1.0", "1E2", "-0", '"\\u00e9\\n\\/"', '"😀"']) {
      assert.ok(output.includes(raw), `${raw} should be kept verbatim`);
    }
    // JSON.parse would round the big integer.
    assert.ok(!output.includes("12345678901234567000"));
  });

  it("keeps duplicate keys in order", () => {
    const output = ok(formatJson('{"a":1,"a":2}', 2));
    assert.equal(output, '{\n  "a": 1,\n  "a": 2\n}');
  });

  it("round-trips: minify(format(x)) equals minify(x)", () => {
    const input = ' { "a" : [ 1 , 2 , { "b" : null } ] , "c" : "x y" } ';
    assert.equal(ok(minifyJson(ok(formatJson(input, 4)))), ok(minifyJson(input)));
    assert.equal(ok(minifyJson(input)), '{"a":[1,2,{"b":null}],"c":"x y"}');
  });

  it("indents with 2, 4 or tabs, and keeps empty containers on one line", () => {
    assert.equal(ok(formatJson('{"a":[],"b":{}}', 2)), '{\n  "a": [],\n  "b": {}\n}');
    assert.equal(ok(formatJson("[1]", 4)), "[\n    1\n]");
    assert.equal(ok(formatJson("[1]", "tab")), "[\n\t1\n]");
  });

  it("accepts scalars at the top level and strips a BOM", () => {
    assert.equal(ok(formatJson(" 42 ")), "42");
    assert.equal(ok(formatJson('\ufeff"x"')), '"x"');
  });

  it("validate returns the input unchanged", () => {
    const input = '{ "a":1 }';
    assert.equal(ok(validateJson(input)), input);
    assert.equal(ok(runJson({ text: input, mode: "validate", indent: 2 })), input);
  });

  it("handles very deep nesting without a stack overflow", () => {
    const depth = 100_000;
    const input = "[".repeat(depth) + "]".repeat(depth);
    const result = minifyJson(input);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.stats.depth, depth);
  });
});

describe("JSON formatter: errors with line and column", () => {
  const cases: [string, string, number, number, RegExp][] = [
    ["trailing comma", '{\n  "a": 1,\n}', 3, 1, /trailing comma/i],
    ["single quotes", "{'a': 1}", 1, 2, /double quotes/i],
    ["comment", '{"a": 1 // x\n}', 1, 9, /comments/i],
    ["missing comma", '{"a": 1 "b": 2}', 1, 9, /comma may be missing/i],
    ["unclosed object", '{"a": 1', 1, 8, /before this object is closed/i],
    ["leading zero", "[01]", 1, 2, /leading zeros/i],
    ["bare word", "{a: 1}", 1, 2, /double quotes/i],
    ["python literal", "[True]", 1, 2, /lowercase/i],
    ["NaN", "[NaN]", 1, 2, /not a JSON value/i],
    ["two roots", "1 2", 1, 3, /one top-level value/i],
    ["newline in string", '"a\nb"', 1, 3, /span lines/i],
    ["bad escape", '"\\x"', 1, 2, /not a valid escape/i],
    ["empty", "   ", 1, 4, /no JSON/i],
    ["numeric key", "{1: 2}", 1, 2, /keys must be strings/i],
  ];

  for (const [name, input, line, column, message] of cases) {
    it(name, () => {
      const problem = error(formatJson(input));
      assert.match(problem.message, message);
      assert.deepEqual([problem.line, problem.column], [line, column], problem.message);
    });
  }
});

describe("JSON formatter: regression cases", () => {
  it("keeps every number spelling exactly", () => {
    const numbers = [
      "0",
      "-0",
      "-0.0",
      "1e400",
      "-1E-400",
      "0.1",
      "1.000000000000000000001",
      "9007199254740993",
      "-12345678901234567890",
      "2e+3",
      "5E-0",
    ];
    const output = ok(formatJson(`[${numbers.join(",")}]`, 2));
    assert.equal(output, `[\n${numbers.map((n) => `  ${n}`).join(",\n")}\n]`);
  });

  it("keeps escapes, Unicode and surrogate pairs exactly", () => {
    const strings = [
      '"\\"\\\\\\/\\b\\f\\n\\r\\t"',
      '"\\u00e9 é e\u0301"',
      '"\\ud83d\\ude00 😀"',
      '"\\ud800"', // a lone surrogate escape is valid JSON syntax and must survive
      '"\u2028\u2029"', // raw line and paragraph separators are allowed in JSON strings
      '"ನಮಸ್ಕಾರ 你好 مرحبا"',
    ];
    const output = ok(minifyJson(`[${strings.join(" , ")}]`));
    assert.equal(output, `[${strings.join(",")}]`);
  });

  it("keeps duplicate keys, in order, at every level", () => {
    const input = '{"a":1,"b":{"x":1,"x":[1,{"x":2,"x":3}]},"a":2}';
    assert.equal(ok(minifyJson(input)), input);
  });

  it("formats nested arrays and objects", () => {
    assert.equal(
      ok(formatJson('[[1,[2,[]]],{"a":{"b":{}}}]', 2)),
      '[\n  [\n    1,\n    [\n      2,\n      []\n    ]\n  ],\n  {\n    "a": {\n      "b": {}\n    }\n  }\n]',
    );
  });

  const nested = (depth: number) =>
    Array.from({ length: depth }, (_, i) => (i % 2 ? '{"k":' : "[")).join("") +
    "null" +
    Array.from({ length: depth }, (_, i) => (i % 2 ? "}" : "]"))
      .reverse()
      .join("");

  it("validates and minifies 100,000 levels of mixed nesting without a stack overflow", () => {
    assert.equal(validateJson(nested(100_000)).ok, true);
    assert.equal(ok(minifyJson(nested(100_000))), nested(100_000));
    assert.equal(formatJson(nested(1_000), 2).ok, true);
  });

  it("reports a size problem, not a crash, when indentation would exceed what a string can hold", () => {
    // 100,000 levels indented by 2 spaces is about 10 billion characters of indentation.
    assert.throws(() => formatJson(nested(100_000), 2), RangeError);
    assert.match(toUserError(new RangeError("Invalid string length")).message, /too large/i);
  });

  const invalid: [string, string, RegExp][] = [
    ["incomplete literal", "[tru]", /Did you mean true/],
    ["literal with trailing letters", "nullx", /Did you mean null/],
    ["unfinished array", "[1,", /before this array is closed/],
    ["unfinished object value", '{"a":', /Expected a value|before this object is closed/],
    ["unfinished string", '["abc', /never closed/],
    ["unfinished escape", '"\\u12"', /four hexadecimal digits/],
    ["lone minus", "-", /not a valid JSON number/],
    ["dangling decimal point", "1.", /decimal point/],
    ["dangling exponent", "1e", /not a valid JSON number/],
    ["plus sign", "+1", /Unexpected/],
    ["hex number", "0x10", /not a valid JSON number/],
    ["undefined", "[undefined]", /not a JSON value/],
    ["tab inside a string", '"a\tb"', /Unescaped control character/],
    ["trailing comma in array", "[1,2,]", /Trailing commas/],
    ["missing colon", '{"a" 1}', /Expected “:”/],
    ["comma without value", "[1,,2]", /Expected a value/],
  ];

  for (const [name, input, message] of invalid) {
    it(`rejects ${name}`, () => {
      const problem = error(formatJson(input));
      assert.match(problem.message, message);
      assert.ok(problem.offset >= 0 && problem.offset <= input.length, "location outside the input");
    });
  }
});

/**
 * Differential fuzzing against the engine's own JSON.parse, with a fixed seed so any
 * failure reproduces. It checks the three promises that matter to users: we accept
 * exactly what JSON accepts, formatting changes nothing but whitespace, and the
 * formatted document means the same thing.
 */
describe("JSON formatter: differential fuzzing", () => {
  function random(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const next = random(20260925);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)]!;
  const space = () => pick(["", "", " ", "\n", "\t", "\r\n  "]);
  const NUMBERS = ["0", "-0", "7", "-12.5", "3e8", "1E-7", "12345678901234567890", "0.000001", "2.50"];
  const STRINGS = ['""', '"a"', '"\\n\\t"', '"\\u00e9"', '"😀"', '"\\ud83d\\ude00"', '"quote \\" here"', '"ನ"'];

  function value(depth: number): string {
    const kind = depth > 4 ? pick(["n", "s", "l"]) : pick(["n", "s", "l", "a", "o", "a", "o"]);
    if (kind === "n") return pick(NUMBERS);
    if (kind === "s") return pick(STRINGS);
    if (kind === "l") return pick(["true", "false", "null"]);
    const count = Math.floor(next() * 4);
    const items = Array.from({ length: count }, () =>
      kind === "a"
        ? `${space()}${value(depth + 1)}${space()}`
        : `${space()}${pick(STRINGS)}${space()}:${space()}${value(depth + 1)}${space()}`,
    );
    return kind === "a" ? `[${items.join(",")}]` : `{${items.join(",")}}`;
  }

  /** Removes whitespace outside strings: what minify must produce. */
  function stripWhitespace(text: string): string {
    let out = "";
    let inString = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i]!;
      if (inString) {
        out += c;
        if (c === "\\") out += text[++i] ?? "";
        else if (c === '"') inString = false;
      } else if (c === '"') {
        inString = true;
        out += c;
      } else if (!" \t\n\r".includes(c)) out += c;
    }
    return out;
  }

  const documents = Array.from({ length: 400 }, () => `${space()}${value(0)}${space()}`);

  it("formatting valid documents changes only whitespace, and keeps the meaning", () => {
    for (const doc of documents) {
      const minified = ok(minifyJson(doc));
      assert.equal(minified, stripWhitespace(doc), doc);
      assert.equal(ok(minifyJson(ok(formatJson(doc, "tab")))), minified);
      assert.deepEqual(JSON.parse(ok(formatJson(doc, 4))), JSON.parse(doc));
    }
  });

  it("accepts and rejects exactly what JSON.parse does, on 4,000 mutated documents", () => {
    const alphabet = [
      "{",
      "}",
      "[",
      "]",
      ",",
      ":",
      '"',
      "\\",
      " ",
      "0",
      "1",
      "-",
      ".",
      "e",
      "+",
      "a",
      "t",
      "n",
      "u",
      "'",
      "\n",
    ];
    let rejected = 0;
    for (let i = 0; i < 4000; i += 1) {
      let doc = pick(documents);
      for (let edits = 1 + Math.floor(next() * 3); edits > 0; edits -= 1) {
        const at = Math.floor(next() * (doc.length + 1));
        const op = next();
        doc =
          op < 0.4
            ? doc.slice(0, at) + doc.slice(at + 1)
            : op < 0.8
              ? doc.slice(0, at) + pick(alphabet) + doc.slice(at)
              : doc.slice(0, at) + pick(alphabet) + doc.slice(at + 1);
      }
      let native = true;
      try {
        JSON.parse(doc);
      } catch {
        native = false;
      }
      const ours = validateJson(doc);
      assert.equal(ours.ok, native, `disagreement on ${JSON.stringify(doc)}`);
      if (!ours.ok) {
        rejected += 1;
        assert.ok(ours.error.offset <= doc.length && ours.error.line >= 1 && ours.error.column >= 1);
      }
    }
    assert.ok(rejected > 1000, "the mutations should produce plenty of invalid documents");
  });
});
