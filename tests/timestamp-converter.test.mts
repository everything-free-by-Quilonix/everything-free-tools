import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fromIsoOrDate, fromUnix } from "@/engines/data/timestamp";

describe("Timestamp Converter Engine", () => {
  it("converts Unix timestamp in seconds to ISO and UTC", () => {
    // 1700000000 = 2023-11-14T22:13:20.000Z
    const res = fromUnix(1700000000, true);
    assert.ok(res !== null);
    assert.equal(res.seconds, 1700000000);
    assert.equal(res.milliseconds, 1700000000000);
    assert.equal(res.iso, "2023-11-14T22:13:20.000Z");
  });

  it("converts Unix timestamp in milliseconds", () => {
    const res = fromUnix(1700000000123, false);
    assert.ok(res !== null);
    assert.equal(res.seconds, 1700000000);
    assert.equal(res.milliseconds, 1700000000123);
    assert.equal(res.iso, "2023-11-14T22:13:20.123Z");
  });

  it("converts ISO date string to Unix timestamps", () => {
    const res = fromIsoOrDate("2023-11-14T22:13:20.000Z");
    assert.ok(res !== null);
    assert.equal(res.seconds, 1700000000);
    assert.equal(res.milliseconds, 1700000000000);
  });

  it("returns null for invalid inputs", () => {
    assert.equal(fromUnix(NaN), null);
    assert.equal(fromIsoOrDate("not a date"), null);
    assert.equal(fromIsoOrDate(""), null);
  });
});
