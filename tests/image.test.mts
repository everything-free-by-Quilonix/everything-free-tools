import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chooseOutputType,
  clampQuality,
  hasTransparentPixel,
  mayHaveTransparency,
  scaleDimensions,
} from "@/engines/image/compress";
import { checkFiles, derivedFileName, formatBytes, percentSaved, safeFileName } from "@/lib/files";

describe("Image compressor decisions", () => {
  it("Auto keeps transparency (WebP) and uses JPEG for opaque images", () => {
    assert.equal(chooseOutputType("auto", true), "image/webp");
    assert.equal(chooseOutputType("auto", false), "image/jpeg");
    assert.equal(chooseOutputType("image/png", false), "image/png");
    assert.equal(chooseOutputType("image/jpeg", true), "image/jpeg");
  });

  it("detects transparent pixels", () => {
    assert.equal(hasTransparentPixel(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255])), false);
    assert.equal(hasTransparentPixel(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 254])), true);
    assert.equal(mayHaveTransparency("image/jpeg"), false);
    assert.equal(mayHaveTransparency("image/png"), true);
  });

  it("scales down to fit, keeps the aspect ratio and never enlarges", () => {
    assert.deepEqual(scaleDimensions(4000, 3000, 1920), { width: 1920, height: 1440 });
    assert.deepEqual(scaleDimensions(3000, 4000, 1920), { width: 1440, height: 1920 });
    assert.deepEqual(scaleDimensions(800, 600, 1920), { width: 800, height: 600 });
    assert.deepEqual(scaleDimensions(800, 600, null), { width: 800, height: 600 });
    assert.deepEqual(scaleDimensions(10000, 1, 100), { width: 100, height: 1 });
  });

  it("clamps quality to 0.1–1", () => {
    assert.equal(clampQuality(0), 0.1);
    assert.equal(clampQuality(2), 1);
    assert.equal(clampQuality(Number.NaN), 0.8);
  });
});

describe("File helpers", () => {
  it("formats sizes in decimal units", () => {
    assert.equal(formatBytes(1), "1 byte");
    assert.equal(formatBytes(999), "999 bytes");
    assert.equal(formatBytes(1500), "1.5 KB");
    assert.equal(formatBytes(4_800_000), "4.8 MB");
    assert.equal(formatBytes(-1), "—");
  });

  it("reports savings, negative when the file grew", () => {
    assert.equal(percentSaved(1000, 250), 75);
    assert.equal(percentSaved(1000, 1100), -10);
    assert.equal(percentSaved(0, 10), 0);
  });

  it("derives safe download names and never reuses the original name", () => {
    assert.equal(derivedFileName("holiday.png", "compressed", "webp"), "holiday-compressed.webp");
    const hostile = derivedFileName("../../etc/passwd", "compressed", "jpg");
    assert.ok(!/[\\/]/.test(hostile), hostile);
    assert.match(hostile, /-compressed\.jpg$/);
    assert.equal(derivedFileName("photo.final.JPG", "compressed", "jpg"), "photo.final-compressed.jpg");
    assert.equal(safeFileName(".."), "download");
    assert.equal(safeFileName('a<b>:"c|?*'), "a-b---c---");
  });

  it("accepts by MIME type, with the extension as a fallback", () => {
    const accept = ["image/jpeg", "image/png"];
    const files = [
      new File(["x"], "a.jpg", { type: "image/jpeg" }),
      new File(["x"], "b.PNG", { type: "" }),
      new File(["x"], "c.gif", { type: "image/gif" }),
      new File(["x"], "d", { type: "" }),
    ];
    const { accepted, rejected } = checkFiles(files, accept);
    assert.deepEqual(
      accepted.map((file) => file.name),
      ["a.jpg", "b.PNG"],
    );
    assert.deepEqual(
      rejected.map(({ file }) => file.name),
      ["c.gif", "d"],
    );
  });
});
