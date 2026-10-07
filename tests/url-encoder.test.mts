import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeUrl, encodeUrl, parseUrl } from "@/engines/data/url";

describe("URL Encoder / Decoder Engine", () => {
  it("encodes component strings with special characters", () => {
    assert.equal(encodeUrl("hello world & foo=bar"), "hello%20world%20%26%20foo%3Dbar");
    assert.equal(encodeUrl("hello world", { mode: "component", spaceAsPlus: true }), "hello+world");
  });

  it("encodes full URI preserving protocol and path structure", () => {
    assert.equal(
      encodeUrl("https://example.com/search?q=hello world", { mode: "full" }),
      "https://example.com/search?q=hello%20world",
    );
  });

  it("decodes percent-encoded and plus-encoded text", () => {
    assert.equal(decodeUrl("hello%20world%20%26%20foo%3Dbar"), "hello world & foo=bar");
    assert.equal(decodeUrl("hello+world", true), "hello world");
    assert.equal(decodeUrl("%E4%BD%A0%E5%A5%BD"), "你好");
  });

  it("parses full URL into components and query parameters", () => {
    const parsed = parseUrl("https://example.com:8080/path/test?q=query&page=2#section");
    assert.ok(parsed !== null);
    assert.equal(parsed.protocol, "https:");
    assert.equal(parsed.host, "example.com:8080");
    assert.equal(parsed.pathname, "/path/test");
    assert.equal(parsed.hash, "#section");
    assert.deepEqual(parsed.params, [
      ["q", "query"],
      ["page", "2"],
    ]);
  });

  it("handles malformed URLs gracefully", () => {
    assert.equal(parseUrl(""), null);
  });
});
