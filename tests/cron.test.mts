import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCron } from "@/engines/developer/cron";

describe("Cron Expression Parser Engine", () => {
  it("parses 5-field standard cron expressions", () => {
    const res = parseCron("*/15 * * * *");
    assert.equal(res.isValid, true);
    assert.equal(res.fields.length, 5);
    assert.ok(res.humanDescription.toLowerCase().includes("15 minutes"));
    assert.equal(res.nextRuns.length, 5);
  });

  it("explains weekday schedule correctly", () => {
    const res = parseCron("0 9 * * 1-5");
    assert.equal(res.isValid, true);
    assert.ok(res.humanDescription.includes("09:00"));
    assert.ok(res.humanDescription.toLowerCase().includes("weekday"));
  });

  it("handles 6-field cron expressions with seconds", () => {
    const res = parseCron("0 30 12 * * *");
    assert.equal(res.isValid, true);
    assert.equal(res.fields.length, 6);
    assert.equal(res.fields[0]?.name, "Seconds");
  });

  it("rejects invalid field counts", () => {
    const res = parseCron("* * *");
    assert.equal(res.isValid, false);
    assert.ok(res.error);
  });
});
