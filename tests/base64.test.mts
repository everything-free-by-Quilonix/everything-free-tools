import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeBase64, decodeToResult, encodeBytes, encodeText, sniffType } from "@/engines/data/base64";
import { ToolError } from "@/lib/errors";

describe("Base64", () => {
  it("matches Node's encoder for every length remainder", () => {
    for (const text of ["", "f", "fo", "foo", "foob", "fooba", "foobar"]) {
      assert.equal(encodeText(text), Buffer.from(text, "utf8").toString("base64"));
    }
  });

  it("encodes UTF-8 text, including emoji and non-Latin scripts", () => {
    const text = "héllo wörld 😀 ನಮಸ್ಕಾರ";
    const encoded = encodeText(text);
    assert.equal(encoded, Buffer.from(text, "utf8").toString("base64"));
    const decoded = decodeToResult(encoded);
    assert.equal(decoded.kind, "text");
    if (decoded.kind === "text") assert.equal(decoded.text, text);
  });

  it("supports the URL-safe alphabet with and without padding", () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    assert.equal(encodeBytes(bytes), "+//+");
    assert.equal(encodeBytes(bytes, { urlSafe: true }), "-__-");
    assert.equal(encodeText("a", { urlSafe: true }), "YQ");
    assert.equal(encodeText("a", { urlSafe: true, padding: true }), "YQ==");
    assert.deepEqual([...decodeBase64("-__-").bytes], [0xfb, 0xff, 0xfe]);
    assert.equal(decodeBase64("-__-").alphabet, "url-safe");
  });

  it("decodes unpadded input and ignores line breaks", () => {
    assert.equal(new TextDecoder().decode(decodeBase64("Zm9vYg").bytes), "foob");
    assert.equal(new TextDecoder().decode(decodeBase64("Zm9v\r\nYmFy").bytes), "foobar");
  });

  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array(1000).map((_, i) => (i * 37) & 255);
    assert.deepEqual(decodeBase64(encodeBytes(bytes)).bytes, bytes);
    assert.equal(encodeBytes(bytes), Buffer.from(bytes).toString("base64"));
  });

  it("rejects invalid input with a specific reason", () => {
    const cases: [string, RegExp][] = [
      ["", /nothing to decode/i],
      ["ab$c", /“\$” at position 3/],
      ["ab\n  $c", /“\$” at position 6/],
      ["Zm9v\u00a0YmFy", /U\+00A0 at position 5/],
      ["abcde", /length/i],
      ["ab=c", /padding .* only appear at the end.* position 4/i],
      ["a+b_", /mixes/i],
      ["YQ=", /padding doesn't match/i],
      ["YQ===", /too many/i],
    ];
    for (const [input, message] of cases) {
      assert.throws(
        () => decodeBase64(input),
        (error: unknown) => error instanceof ToolError && message.test(error.message),
      );
    }
  });

  it("treats non-UTF-8 or control-character output as binary", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = decodeToResult(encodeBytes(png));
    assert.equal(result.kind, "binary");
    assert.deepEqual(sniffType(png), { mime: "image/png", extension: "png" });
    assert.equal(decodeToResult(encodeBytes(new Uint8Array([0xff, 0xfe, 0x00]))).kind, "binary");
    assert.equal(decodeToResult(encodeText("line one\nline two\ttab")).kind, "text");
  });
});

describe("Base64: hardening", () => {
  it("encodes empty input to empty output, and refuses to decode nothing", () => {
    assert.equal(encodeText(""), "");
    assert.throws(() => decodeBase64("  \n "), /nothing to decode/i);
  });

  it("decodes with or without padding, identically", () => {
    for (const text of ["a", "ab", "abc", "abcd", "😀"]) {
      const padded = encodeText(text);
      const bare = padded.replace(/=+$/, "");
      assert.deepEqual(decodeBase64(bare).bytes, decodeBase64(padded).bytes, text);
    }
  });

  it("ignores spaces, tabs and line breaks anywhere, as in MIME-wrapped text", () => {
    const wrapped = encodeText("The quick brown fox jumps over the lazy dog").replace(/(.{8})/g, "$1\r\n\t ");
    assert.equal(new TextDecoder().decode(decodeBase64(wrapped).bytes), "The quick brown fox jumps over the lazy dog");
  });

  it("reports truncated data instead of guessing", () => {
    // 5 characters can't be Base64 of anything: one character carries only 6 bits.
    assert.throws(() => decodeBase64("Zm9vY"), /length/i);
    // 7 characters is valid unpadded Base64 of 5 bytes.
    assert.equal(new TextDecoder().decode(decodeBase64("Zm9vYmE").bytes), "fooba");
  });

  it("rejects characters from outside the alphabet, including look-alikes", () => {
    for (const bad of ["Zm9v!", "Zm9v YmF\u00a0y", "Zm9vＹ", "Zm9v%3D"]) {
      assert.throws(() => decodeBase64(bad), ToolError, bad);
    }
  });

  it("accepts non-canonical trailing bits, as atob and Node do", () => {
    // "YR==" and "YQ==" both decode to "a": the spare bits are ignored, not rejected.
    assert.equal(new TextDecoder().decode(decodeBase64("YR==").bytes), "a");
    assert.equal(atob("YR=="), "a");
  });

  it("round-trips every byte value and a 5 MB buffer", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    assert.deepEqual(decodeBase64(encodeBytes(all, { urlSafe: true })).bytes, all);
    const big = new Uint8Array(5_000_000);
    crypto.getRandomValues(big.subarray(0, 65536));
    big.copyWithin(65536, 0);
    const encoded = encodeBytes(big);
    assert.equal(encoded, Buffer.from(big).toString("base64"));
    assert.deepEqual(decodeBase64(encoded).bytes, big);
  });

  it("never labels decoded bytes as a type a browser would run (HTML, SVG, script)", () => {
    for (const text of [
      "<html><script>alert(1)</script>",
      '<svg xmlns="http://www.w3.org/2000/svg" onload="x"/>',
      "<?xml version='1.0'?><svg/>",
    ]) {
      assert.deepEqual(sniffType(new TextEncoder().encode(text)), {
        mime: "application/octet-stream",
        extension: "bin",
      });
    }
  });

  it("shows decoded HTML as text, never as markup", () => {
    const result = decodeToResult(encodeText("<img src=x onerror=alert(1)>"));
    assert.equal(result.kind, "text");
    if (result.kind === "text") assert.equal(result.text, "<img src=x onerror=alert(1)>");
  });
});
