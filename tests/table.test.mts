import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateHtmlTable, generateMarkdownTable } from "@/engines/data/table";

describe("Table Generator Engine", () => {
  const data = {
    headers: ["ID", "Name", "Role"],
    rows: [
      ["1", "Alice", "Admin"],
      ["2", "Bob", "User"],
    ],
    alignments: ["left" as const, "center" as const, "right" as const],
  };

  it("generates formatted Markdown table", () => {
    const md = generateMarkdownTable(data);
    assert.ok(md.includes("| ID  | Name  | Role  |"));
    assert.ok(md.includes("| :-- | :---: | ----: |"));
    assert.ok(md.includes("| 1   | Alice | Admin |"));
  });

  it("generates semantic HTML table", () => {
    const html = generateHtmlTable(data);
    assert.ok(html.includes("<table>"));
    assert.ok(html.includes("<thead>"));
    assert.ok(html.includes(">ID</th>"));
    assert.ok(html.includes(">Alice</td>"));
    assert.ok(html.includes("</table>"));
  });
});
