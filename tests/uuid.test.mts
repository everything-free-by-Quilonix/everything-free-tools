import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createUuidV7Generator,
  formatUuid,
  generateUuids,
  inspectUuid,
  MAX_UUIDS,
  uuidV4,
} from "@/engines/crypto/uuid";
import { ToolError } from "@/lib/errors";

const PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("UUID generator", () => {
  it("v4 has the right version and variant, with or without randomUUID", () => {
    const withoutRandomUuid = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    for (const uuid of [uuidV4(), uuidV4(withoutRandomUuid)]) {
      assert.match(uuid, PATTERN);
      assert.equal(inspectUuid(uuid)?.version, 4);
    }
  });

  it("v7 embeds the timestamp and sorts in generation order within one millisecond", () => {
    const fixed = 1_700_000_000_123;
    const next = createUuidV7Generator(undefined, () => fixed);
    const batch = Array.from({ length: 500 }, next);
    for (const uuid of batch) {
      assert.match(uuid, PATTERN);
      const info = inspectUuid(uuid);
      assert.equal(info?.version, 7);
      assert.ok(info?.timestamp === fixed || info?.timestamp === fixed + 1);
    }
    assert.deepEqual([...batch].sort(), batch, "v7 UUIDs must sort in the order they were made");
    assert.equal(new Set(batch).size, batch.length);
  });

  it("v7 stays monotonic if the clock goes backwards", () => {
    let time = 2_000_000;
    const next = createUuidV7Generator(undefined, () => time);
    const first = next();
    time -= 1000;
    const second = next();
    assert.ok(second > first);
  });

  it("generates unique batches and applies formatting", () => {
    const list = generateUuids({ version: 4, count: 1000 });
    assert.equal(new Set(list).size, 1000);
    const [braced] = generateUuids({ version: 4, count: 1, uppercase: true, compact: true, braces: true });
    assert.match(braced!, /^\{[0-9A-F]{32}\}$/);
    assert.equal(formatUuid("AB-CD", {}), "ab-cd");
  });

  it("refuses counts outside 1 to MAX_UUIDS", () => {
    for (const count of [0, -1, MAX_UUIDS + 1, Number.NaN]) {
      assert.throws(() => generateUuids({ version: 4, count }), ToolError);
    }
  });

  it("refuses to run without a secure random source (never falls back to Math.random)", () => {
    assert.throws(() => uuidV4({} as unknown as Crypto), ToolError);
    assert.throws(() => createUuidV7Generator({} as unknown as Crypto), ToolError);
  });
});
