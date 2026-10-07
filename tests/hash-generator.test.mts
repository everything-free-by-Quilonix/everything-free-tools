import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeHash, computeTextHash } from "@/engines/crypto/hash";

describe("Hash Generator Engine", () => {
  it("computes SHA-256 for known standard test vectors", async () => {
    const empty = await computeTextHash("", "SHA-256");
    assert.equal(empty, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

    const abc = await computeTextHash("abc", "SHA-256");
    assert.equal(abc, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("computes SHA-512 correctly", async () => {
    const abc = await computeTextHash("abc", "SHA-512");
    assert.equal(
      abc,
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    );
  });

  it("computes SHA-1 correctly", async () => {
    const abc = await computeTextHash("abc", "SHA-1");
    assert.equal(abc, "a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("computes MD5 correctly for standard test vectors", async () => {
    const empty = await computeTextHash("", "MD5");
    assert.equal(empty, "d41d8cd98f00b204e9800998ecf8427e");

    const abc = await computeTextHash("abc", "MD5");
    assert.equal(abc, "900150983cd24fb0d6963f7d28e17f72");

    const msg = await computeTextHash("message digest", "MD5");
    assert.equal(msg, "f96b697d7cb7938d525a2f31aaf161d0");
  });

  it("computes hash from Uint8Array byte buffer", async () => {
    const bytes = new Uint8Array([97, 98, 99]); // "abc"
    const hash = await computeHash(bytes, "SHA-256");
    assert.equal(hash, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
