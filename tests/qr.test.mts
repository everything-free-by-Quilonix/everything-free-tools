import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeWifiValue, looksLikeBareDomain, wifiPayload } from "@/engines/qr/payload";
import { colourWarning, contrastRatio, createMatrix, QUIET_ZONE, svgMarkup } from "@/engines/qr/render";
import { ToolError } from "@/lib/errors";

describe("QR payloads", () => {
  it("escapes the Wi-Fi special characters", () => {
    assert.equal(escapeWifiValue('a\\b;c,d:e"f'), 'a\\\\b\\;c\\,d\\:e\\"f');
  });

  it("builds the WIFI: string", () => {
    assert.equal(
      wifiPayload({ ssid: "Home;Net", password: "pass:word1", security: "WPA", hidden: false }),
      "WIFI:T:WPA;S:Home\\;Net;P:pass\\:word1;;",
    );
    assert.equal(
      wifiPayload({ ssid: "Cafe", password: "", security: "nopass", hidden: true }),
      "WIFI:T:nopass;S:Cafe;H:true;;",
    );
  });

  it("rejects missing or impossible Wi-Fi details", () => {
    assert.throws(() => wifiPayload({ ssid: "", password: "x", security: "WPA", hidden: false }), ToolError);
    assert.throws(() => wifiPayload({ ssid: "a", password: "", security: "WPA", hidden: false }), ToolError);
    assert.throws(() => wifiPayload({ ssid: "a", password: "short", security: "WPA", hidden: false }), /8 to 63/);
    assert.doesNotThrow(() => wifiPayload({ ssid: "a", password: "a".repeat(63), security: "WPA", hidden: false }));
    assert.doesNotThrow(() => wifiPayload({ ssid: "a", password: "0f".repeat(32), security: "WPA", hidden: false }));
  });

  it("spots links without a scheme", () => {
    assert.equal(looksLikeBareDomain("example.com/page"), true);
    assert.equal(looksLikeBareDomain("https://example.com"), false);
    assert.equal(looksLikeBareDomain("just some text"), false);
  });
});

describe("QR rendering", () => {
  it("creates a square matrix with the quiet zone", () => {
    const matrix = createMatrix("https://example.com", "M");
    assert.equal(matrix.modules.length, matrix.size);
    assert.equal(matrix.size, 17 + 4 * matrix.version + 2 * QUIET_ZONE);
    // The quiet zone is light.
    assert.ok(matrix.modules[0]!.every((dark) => !dark));
    // The top-left finder pattern starts right after the quiet zone.
    assert.equal(matrix.modules[QUIET_ZONE]![QUIET_ZONE], true);
  });

  it("encodes non-ASCII text", () => {
    assert.doesNotThrow(() => createMatrix("héllo 😀 ನಮಸ್ಕಾರ", "H"));
  });

  it("reports content that is too long in plain words", () => {
    assert.throws(
      () => createMatrix("x".repeat(3000), "H"),
      (error: unknown) => error instanceof ToolError && /too much content/i.test(error.message),
    );
  });

  it("normalises colour case in the SVG", () => {
    assert.ok(svgMarkup(createMatrix("hi", "L"), "#000000", "#FFFFFF").includes('fill="#ffffff"'));
  });

  it("explains a broken character (lone surrogate) instead of crashing", () => {
    assert.throws(
      () => createMatrix("abc \ud83d def", "M"),
      (error: unknown) => error instanceof ToolError && /broken character/.test(error.message),
    );
  });

  it("warns about low contrast and inverted colours", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
    assert.equal(colourWarning("#000000", "#ffffff"), null);
    assert.match(colourWarning("#ffffff", "#000000") ?? "", /inverted/i);
    assert.match(colourWarning("#777777", "#999999") ?? "", /low contrast/i);
  });
});

describe("QR SVG security", () => {
  // The whole file, as it may be: shapes, numbers and #rrggbb colours, nothing else.
  const STRICT_SVG =
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) \1" width="\d+" height="\d+" shape-rendering="crispEdges"><rect width="\1" height="\1" fill="#[0-9a-f]{6}"\/><path d="(?:M\d+ \d+h\d+v1h-\d+z)*" fill="#[0-9a-f]{6}"\/><\/svg>$/;

  const HOSTILE = [
    "<svg onload=alert(1)>",
    "<script>alert(document.cookie)</script>",
    "<img src=x onerror=alert(1)>",
    '"><foreignObject><iframe src=javascript:alert(1)>',
    "' onmouseover='alert(1)",
    "&amp; &lt; &#x3C; &#60; <![CDATA[ ]]> <!-- -->",
    "javascript:alert(1)",
    "ನಮಸ್ಕಾರ 😀 \u202e\u0000",
  ];

  it("contains no trace of the encoded content, whatever it is", () => {
    for (const payload of HOSTILE) {
      const svg = svgMarkup(createMatrix(payload, "M"), "#000000", "#ffffff");
      assert.match(svg, STRICT_SVG, payload);
      assert.ok(!/[<>"'&]/.test(svg.replace(/^<svg[^>]*>|<rect[^>]*\/>|<path[^>]*\/>|<\/svg>$/g, "")), payload);
    }
  });

  it("keeps Wi-Fi details out of the markup", () => {
    const payload = wifiPayload({
      ssid: '<svg onload=x>";',
      password: "<script>x</script>",
      security: "WPA",
      hidden: false,
    });
    assert.match(svgMarkup(createMatrix(payload, "Q"), "#112233", "#fafafa"), STRICT_SVG);
  });

  it("refuses colours that could carry markup", () => {
    const matrix = createMatrix("x", "L");
    for (const colour of ['#000000" onload="alert(1)', "red", "url(javascript:x)", "#00000", "#0000000", "#gggggg"]) {
      assert.throws(() => svgMarkup(matrix, colour, "#ffffff"), ToolError, colour);
      assert.throws(() => svgMarkup(matrix, "#000000", colour), ToolError, colour);
    }
  });

  it("is deterministic: the same input gives byte-identical output", () => {
    for (const payload of ["https://example.com", HOSTILE[2]!, "ನ"]) {
      assert.equal(
        svgMarkup(createMatrix(payload, "H"), "#000000", "#ffffff"),
        svgMarkup(createMatrix(payload, "H"), "#000000", "#ffffff"),
      );
    }
  });
});
