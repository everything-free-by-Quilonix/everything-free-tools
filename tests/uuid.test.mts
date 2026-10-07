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

describe("UUID generator: randomness and bit layout", () => {
  const bits = (uuid: string) =>
    [...uuid.replace(/-/g, "")].map((digit) => Number.parseInt(digit, 16).toString(2).padStart(4, "0")).join("");

  it("never calls Math.random", () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error("Math.random was called");
    };
    try {
      generateUuids({ version: 4, count: 100 });
      generateUuids({ version: 7, count: 100 });
      uuidV4({ getRandomValues: crypto.getRandomValues.bind(crypto) });
    } finally {
      Math.random = original;
    }
  });

  it("sets exactly the version and variant bits, and leaves every other bit random", () => {
    // Positions (0-based, of 128) fixed by RFC 9562: version 48–51, variant 64–65.
    for (const version of [4, 7] as const) {
      const samples = generateUuids({ version, count: 1000 }).map(bits);
      const ones = Array.from(
        { length: 128 },
        (_, position) => samples.filter((sample) => sample[position] === "1").length,
      );
      assert.equal(samples[0]!.slice(48, 52), version === 4 ? "0100" : "0111");
      assert.ok(
        samples.every((sample) => sample.slice(64, 66) === "10"),
        "variant must be 10",
      );
      // Random bits: v4 is random outside the fixed fields; v7 from bit 80 on (after the timestamp and counter).
      const randomFrom = version === 4 ? 0 : 80;
      for (let position = randomFrom; position < 128; position += 1) {
        if ((position >= 48 && position < 52) || position === 64 || position === 65) continue;
        // 1000 fair coin flips land between 380 and 620 with overwhelming probability; a stuck bit gives 0 or 1000.
        assert.ok(
          ones[position]! > 380 && ones[position]! < 620,
          `bit ${position} looks stuck (${ones[position]}/1000)`,
        );
      }
    }
  });

  it("is not deterministic: separate batches share no values", () => {
    const first = new Set(generateUuids({ version: 4, count: 1000 }));
    assert.ok(generateUuids({ version: 4, count: 1000 }).every((uuid) => !first.has(uuid)));
    const firstV7 = new Set(generateUuids({ version: 7, count: 1000 }));
    assert.ok(generateUuids({ version: 7, count: 1000 }).every((uuid) => !firstV7.has(uuid)));
  });

  it("v7 sorts across millisecond boundaries and survives counter overflow", () => {
    let time = 1_750_000_000_000;
    const next = createUuidV7Generator(undefined, () => time);
    const list: string[] = [];
    for (let ms = 0; ms < 3; ms += 1) {
      // More than the 4,096 values the 12-bit counter holds, all in one millisecond.
      for (let i = 0; i < 5000; i += 1) list.push(next());
      time += 1;
    }
    assert.deepEqual([...list].sort(), list);
    assert.equal(new Set(list).size, list.length);
    // Borrowing future milliseconds on overflow keeps the timestamp within a few ms of the clock.
    const last = inspectUuid(list.at(-1)!)!.timestamp!;
    assert.ok(last - time < 10, `timestamp ran ${last - time} ms ahead`);
  });

  it("v7 timestamps carry the current time", () => {
    const before = Date.now();
    const [uuid] = generateUuids({ version: 7, count: 1 });
    const stamp = inspectUuid(uuid!)!.timestamp!;
    assert.ok(stamp >= before && stamp <= Date.now());
  });
});
