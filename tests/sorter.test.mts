import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sortLines } from "@/engines/text/sorter";

describe("Text Sorter Engine", () => {
  it("sorts lines alphabetically and in reverse", () => {
    const raw = "banana\napple\ncherry";
    assert.equal(sortLines(raw, { mode: "alphabetical" }).output, "apple\nbanana\ncherry");
    assert.equal(sortLines(raw, { mode: "alphabetical", reverse: true }).output, "cherry\nbanana\napple");
  });

  it("sorts numbers numerically", () => {
    const raw = "100\n20\n3\n40";
    assert.equal(sortLines(raw, { mode: "numeric" }).output, "3\n20\n40\n100");
  });

  it("sorts naturally with embedded numbers", () => {
    const raw = "item10\nitem2\nitem1";
    assert.equal(sortLines(raw, { mode: "natural" }).output, "item1\nitem2\nitem10");
  });

  it("deduplicates lines while sorting", () => {
    const raw = "cat\ndog\ncat\nbird";
    const res = sortLines(raw, { deduplicate: true });
    assert.equal(res.output, "bird\ncat\ndog");
    assert.equal(res.uniqueLines, 3);
  });
});
