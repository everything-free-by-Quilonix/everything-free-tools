import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { csvToJson, jsonToCsv, parseCsv } from "@/engines/data/csv";

describe("CSV ↔ JSON Engine (RFC 4180)", () => {
  it("parses CSV with quoted commas and newlines", () => {
    const csv = `id,name,bio\n1,Alice,"Engineer, writer"\n2,Bob,"Line 1\nLine 2"`;
    const data = parseCsv(csv);
    assert.deepEqual(data.headers, ["id", "name", "bio"]);
    assert.equal(data.rowCount, 2);
    assert.equal(data.rows[0]?.[1], "Alice");
    assert.equal(data.rows[0]?.[2], "Engineer, writer");
    assert.equal(data.rows[1]?.[2], "Line 1\nLine 2");
  });

  it("converts CSV to JSON objects with types", () => {
    const csv = `id,name,active,score\n1,Alice,true,98.5\n2,Bob,false,84`;
    const json = csvToJson(csv);
    assert.equal(json.length, 2);
    assert.equal(json[0]?.id, 1);
    assert.equal(json[0]?.name, "Alice");
    assert.equal(json[0]?.active, true);
    assert.equal(json[0]?.score, 98.5);
  });

  it("converts JSON objects to CSV string", () => {
    const data = [
      { id: 1, name: "Alice", note: "VIP, priority" },
      { id: 2, name: "Bob", note: 'Has "quoted" nickname' },
    ];
    const csv = jsonToCsv(data);
    assert.ok(csv.includes("id,name,note"));
    assert.ok(csv.includes('"VIP, priority"'));
    assert.ok(csv.includes('"Has ""quoted"" nickname"'));
  });
});
