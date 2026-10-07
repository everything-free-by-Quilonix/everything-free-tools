import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { repairJson } from "@/engines/data/json-repair";

describe("JSON Repair Engine", () => {
  it("repairs single quoted strings and keys", () => {
    const broken = "{'name': 'Everything.Free', 'status': 'active'}";
    const res = repairJson(broken);
    assert.equal(res.success, true);
    assert.deepEqual(JSON.parse(res.repaired), {
      name: "Everything.Free",
      status: "active",
    });
  });

  it("quotes unquoted object keys", () => {
    const broken = '{ id: 123, title: "Universal Tools" }';
    const res = repairJson(broken);
    assert.equal(res.success, true);
    assert.deepEqual(JSON.parse(res.repaired), {
      id: 123,
      title: "Universal Tools",
    });
  });

  it("removes trailing commas from objects and arrays", () => {
    const broken = '{"items": [1, 2, 3,], "valid": true,}';
    const res = repairJson(broken);
    assert.equal(res.success, true);
    assert.deepEqual(JSON.parse(res.repaired), {
      items: [1, 2, 3],
      valid: true,
    });
  });

  it("strips JavaScript and Python comments", () => {
    const broken = `
      // Configuration object
      {
        /* block comment */
        "active": true
      }
    `;
    const res = repairJson(broken);
    assert.equal(res.success, true);
    assert.deepEqual(JSON.parse(res.repaired), { active: true });
  });

  it("converts Python constants True, False, None to JSON equivalents", () => {
    const broken = '{"enabled": True, "admin": False, "profile": None}';
    const res = repairJson(broken);
    assert.equal(res.success, true);
    assert.deepEqual(JSON.parse(res.repaired), {
      enabled: true,
      admin: false,
      profile: null,
    });
  });

  it("balances missing closing braces and brackets", () => {
    const broken = '{"data": [1, 2, 3';
    const res = repairJson(broken);
    assert.equal(res.success, true);
    assert.deepEqual(JSON.parse(res.repaired), { data: [1, 2, 3] });
  });
});
