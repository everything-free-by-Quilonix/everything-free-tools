import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeTextDiff } from "@/engines/text/diff";

describe("Text Diff Engine", () => {
  it("detects identical texts as all equal", () => {
    const text = "line 1\nline 2\nline 3";
    const res = computeTextDiff(text, text);
    assert.equal(res.additions, 0);
    assert.equal(res.deletions, 0);
    assert.equal(res.unchanged, 3);
    assert.ok(res.lines.every((l) => l.type === "equal"));
  });

  it("detects inserted lines", () => {
    const orig = "alpha\ngamma";
    const mod = "alpha\nbeta\ngamma";
    const res = computeTextDiff(orig, mod);
    assert.equal(res.additions, 1);
    assert.equal(res.deletions, 0);
    assert.equal(res.unchanged, 2);

    const inserted = res.lines.find((l) => l.type === "insert");
    assert.ok(inserted !== undefined);
    assert.equal(inserted?.text, "beta");
  });

  it("detects deleted lines", () => {
    const orig = "alpha\nbeta\ngamma";
    const mod = "alpha\ngamma";
    const res = computeTextDiff(orig, mod);
    assert.equal(res.additions, 0);
    assert.equal(res.deletions, 1);
    assert.equal(res.unchanged, 2);

    const deleted = res.lines.find((l) => l.type === "delete");
    assert.ok(deleted !== undefined);
    assert.equal(deleted?.text, "beta");
  });

  it("detects replaced lines as deletion and insertion", () => {
    const orig = "hello world";
    const mod = "hello universe";
    const res = computeTextDiff(orig, mod);
    assert.equal(res.additions, 1);
    assert.equal(res.deletions, 1);
  });
});
