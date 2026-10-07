import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cleanText } from "@/engines/text/cleaner";

describe("Text Cleaner Engine", () => {
  it("trims whitespace and removes blank lines", () => {
    const raw = "  line one  \n\n   \n  line two  ";
    const res = cleanText(raw, { trimLines: true, removeBlankLines: true });
    assert.equal(res.output, "line one\nline two");
    assert.equal(res.removedBlankLines, 2);
  });

  it("collapses spaces and removes duplicate lines", () => {
    const raw = "hello     world\nhello world\nalpha   beta";
    const res = cleanText(raw, { collapseSpaces: true, removeDuplicates: true });
    assert.equal(res.output, "hello world\nalpha beta");
    assert.equal(res.removedDuplicates, 1);
  });

  it("strips HTML tags cleanly", () => {
    const raw = "<p>Hello <b>World</b>!</p>";
    const res = cleanText(raw, { stripHtml: true });
    assert.equal(res.output, "Hello World!");
  });
});
