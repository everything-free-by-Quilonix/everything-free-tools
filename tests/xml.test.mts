import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatXml, jsonToXml, minifyXml, xmlToJson } from "@/engines/data/xml";

describe("XML Formatter & Conversion Engine", () => {
  it("formats unindented XML", () => {
    const raw = `<root><title>Hello World</title><item id="1"><name>First</name></item></root>`;
    const formatted = formatXml(raw, 2);
    assert.ok(formatted.includes("<root>"));
    assert.ok(formatted.includes("  <title>Hello World</title>"));
    assert.ok(formatted.includes("</root>"));
  });

  it("minifies XML removing comments and spaces", () => {
    const formatted = `
<!-- sample comment -->
<note>
  <to>Tove</to>
  <from>Jani</from>
</note>
`;
    const minified = minifyXml(formatted);
    assert.equal(minified, "<note><to>Tove</to><from>Jani</from></note>");
  });

  it("converts XML to JSON object", () => {
    const xml = `<book><title>1984</title><author>George Orwell</author></book>`;
    const json = xmlToJson(xml) as Record<string, unknown>;
    assert.ok(json.book);
    const book = json.book as Record<string, unknown>;
    assert.equal(book.title, "1984");
    assert.equal(book.author, "George Orwell");
  });

  it("converts JSON to XML string", () => {
    const data = {
      title: "Clean Code",
      author: "Robert C. Martin",
    };
    const xml = jsonToXml(data, "book");
    assert.ok(xml.includes("<title>Clean Code</title>"));
    assert.ok(xml.includes("<author>Robert C. Martin</author>"));
  });
});
