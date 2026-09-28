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
      ["abcde", /length/i],
      ["ab=c", /padding .* only appear at the end/i],
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
