import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeWifiValue, looksLikeBareDomain, wifiPayload } from "@/engines/qr/payload";
import { colourWarning, contrastRatio, createMatrix, modulesPath, QUIET_ZONE, svgMarkup } from "@/engines/qr/render";
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

  it("emits an SVG with only numbers and validated colours", () => {
    const matrix = createMatrix("hi", "L");
    const svg = svgMarkup(matrix, "#000000", "#FFFFFF");
    assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.ok(svg.includes('fill="#ffffff"'));
    assert.match(modulesPath(matrix), /^(M\d+ \d+h\d+v1h-\d+z)+$/);
    assert.throws(() => svgMarkup(matrix, 'red" onload="x', "#ffffff"), ToolError);
  });

  it("warns about low contrast and inverted colours", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
    assert.equal(colourWarning("#000000", "#ffffff"), null);
    assert.match(colourWarning("#ffffff", "#000000") ?? "", /inverted/i);
    assert.match(colourWarning("#777777", "#999999") ?? "", /low contrast/i);
  });
});
