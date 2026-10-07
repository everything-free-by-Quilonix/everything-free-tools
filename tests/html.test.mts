import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatHtml, minifyHtml } from "@/engines/developer/html";

describe("HTML Formatter & Minifier Engine", () => {
  it("formats unindented HTML with void elements properly handled", () => {
    const raw = `<div><h1>Title</h1><p>Paragraph with <img src="test.jpg" alt="test" /> inside.</p></div>`;
    const formatted = formatHtml(raw, 2);
    assert.ok(formatted.includes("<div>"));
    assert.ok(formatted.includes("  <h1>Title</h1>"));
    assert.ok(formatted.includes("  <p>Paragraph with"));
    assert.ok(formatted.includes("</div>"));
  });

  it("minifies HTML by removing whitespace and comments", () => {
    const raw = `
      <!-- Navigation section -->
      <nav>
        <a href="/">Home</a>
      </nav>
    `;
    const minified = minifyHtml(raw);
    assert.equal(minified, '<nav><a href="/">Home</a></nav>');
  });
});
