import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getColorDetails,
  getContrastRatio,
  getRelativeLuminance,
  hslToRgb,
  parseHex,
  rgbToHex,
  rgbToHsl,
} from "@/engines/color/convert";

describe("Color Converter & Contrast Engine", () => {
  it("parses 3-character, 6-character, and alpha hex codes", () => {
    assert.deepEqual(parseHex("#fff"), { r: 255, g: 255, b: 255, a: 1 });
    assert.deepEqual(parseHex("#3b82f6"), { r: 59, g: 130, b: 246, a: 1 });
    assert.deepEqual(parseHex("000000"), { r: 0, g: 0, b: 0, a: 1 });
    assert.equal(parseHex("invalid"), null);
  });

  it("converts RGB to Hex accurately", () => {
    assert.equal(rgbToHex({ r: 255, g: 255, b: 255 }), "#ffffff");
    assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), "#000000");
    assert.equal(rgbToHex({ r: 59, g: 130, b: 246 }), "#3b82f6");
  });

  it("converts RGB to HSL and back", () => {
    const orig = { r: 59, g: 130, b: 246 };
    const hsl = rgbToHsl(orig);
    assert.equal(hsl.h, 217);
    assert.equal(hsl.s, 91);
    assert.equal(hsl.l, 60);

    const back = hslToRgb(hsl);
    // Rounding margin within 2 points
    assert.ok(Math.abs(back.r - orig.r) <= 2);
    assert.ok(Math.abs(back.g - orig.g) <= 2);
    assert.ok(Math.abs(back.b - orig.b) <= 2);
  });

  it("computes WCAG 2.1 relative luminance and contrast ratios correctly", () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };

    assert.equal(getRelativeLuminance(white), 1);
    assert.equal(getRelativeLuminance(black), 0);

    const contrastMax = getContrastRatio(1.0, 0.0);
    assert.equal(contrastMax, 21);

    const contrastSame = getContrastRatio(1.0, 1.0);
    assert.equal(contrastSame, 1);
  });

  it("produces full color details with WCAG ratings", () => {
    const details = getColorDetails({ r: 0, g: 0, b: 0 });
    assert.equal(details.hex, "#000000");
    assert.equal(details.contrastWhite, 21);
    assert.equal(details.wcagWhite.aa, true);
    assert.equal(details.wcagWhite.aaa, true);
  });
});
