import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateJsonPath } from "@/engines/data/jsonpath";

describe("JSONPath Evaluator Engine", () => {
  const sample = {
    store: {
      book: [
        { category: "reference", author: "Nigel Rees", title: "Sayings of the Century", price: 8.95 },
        { category: "fiction", author: "Evelyn Waugh", title: "Sword of Honour", price: 12.99 },
        { category: "fiction", author: "Herman Melville", title: "Moby Dick", isbn: "0-553-21311-3", price: 8.99 },
      ],
      bicycle: { color: "red", price: 19.95 },
    },
  };

  it("evaluates root expression", () => {
    const res = evaluateJsonPath(sample, "$");
    assert.equal(res.success, true);
    assert.equal(res.count, 1);
  });

  it("evaluates direct dot property access", () => {
    const res = evaluateJsonPath(sample, "$.store.bicycle.color");
    assert.equal(res.success, true);
    assert.equal(res.count, 1);
    assert.equal(res.matches[0]?.value, "red");
  });

  it("evaluates array index access", () => {
    const res = evaluateJsonPath(sample, "$.store.book[0].author");
    assert.equal(res.success, true);
    assert.equal(res.count, 1);
    assert.equal(res.matches[0]?.value, "Nigel Rees");
  });

  it("evaluates array wildcard", () => {
    const res = evaluateJsonPath(sample, "$.store.book[*].price");
    assert.equal(res.success, true);
    assert.equal(res.count, 3);
    assert.deepEqual(
      res.matches.map((m) => m.value),
      [8.95, 12.99, 8.99],
    );
  });

  it("evaluates recursive descent", () => {
    const res = evaluateJsonPath(sample, "$..price");
    assert.equal(res.success, true);
    // 3 books + 1 bicycle = 4 prices
    assert.equal(res.count, 4);
    assert.ok(res.matches.some((m) => m.value === 19.95));
  });

  it("evaluates slice access", () => {
    const res = evaluateJsonPath(sample, "$.store.book[0:2]");
    assert.equal(res.success, true);
    assert.equal(res.count, 2);
  });

  it("rejects invalid JSONPath queries without leading $", () => {
    const res = evaluateJsonPath(sample, "store.book");
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("$"));
  });
});
