import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderMarkdown } from "@/engines/developer/markdown";

describe("Markdown Safe Rendering Engine", () => {
  it("renders headers, emphasis, and lists", () => {
    const md = `
# Heading 1
This is **bold** and *italic*.

- First item
- Second item
`;
    const html = renderMarkdown(md);
    assert.ok(html.includes("<h1>Heading 1</h1>"));
    assert.ok(html.includes("<strong>bold</strong>"));
    assert.ok(html.includes("<em>italic</em>"));
    assert.ok(html.includes("<ul>"));
    assert.ok(html.includes("<li>First item</li>"));
  });

  it("renders code blocks and inline code", () => {
    const md = "Here is `const x = 10;` and a block:\n```js\nfunction test() {}\n```";
    const html = renderMarkdown(md);
    assert.ok(html.includes("<code>const x = 10;</code>"));
    assert.ok(html.includes('<pre><code class="language-js">function test() {}</code></pre>'));
  });

  it("sanitizes dangerous script tags and event handlers", () => {
    const md = `Hello <script>alert("hacked")</script> <img src="x" onerror="steal()" />`;
    const html = renderMarkdown(md);
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("alert"));
    assert.ok(!html.includes("onerror"));
  });
});
