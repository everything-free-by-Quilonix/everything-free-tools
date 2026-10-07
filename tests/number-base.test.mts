import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { convertBases, parseToBigInt } from "@/engines/math/number-base";

describe("Number Base Converter Engine", () => {
  it("converts decimal integer across standard bases", () => {
    const res = convertBases("255", 10);
    assert.equal(res.binary, "11111111");
    assert.equal(res.octal, "377");
    assert.equal(res.decimal, "255");
    assert.equal(res.hex, "FF");
    assert.equal(res.bitLength, 8);
    assert.equal(res.byteCount, 1);
  });

  it("handles arbitrary large numbers with BigInt", () => {
    // 2^64 = 18446744073709551616
    const bigNum = "18446744073709551616";
    const res = convertBases(bigNum, 10);
    assert.equal(res.hex, "10000000000000000");
    assert.equal(res.bitLength, 65);
    assert.equal(res.byteCount, 9);
  });

  it("converts to custom target base", () => {
    const res = convertBases("255", 10, 36);
    assert.equal(res.customBaseValue, "73");
  });

  it("rejects invalid characters for a base", () => {
    assert.throws(() => parseToBigInt("102", 2), /Invalid digit/);
    assert.throws(() => parseToBigInt("GG", 16), /Invalid digit/);
  });
});
