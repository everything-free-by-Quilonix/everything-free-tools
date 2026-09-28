import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatJson, minifyJson, runJson, validateJson } from "@/engines/data/json";

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
