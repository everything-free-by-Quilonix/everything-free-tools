import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { constrainCropRect, initialCropRect } from "@/engines/image/crop";
import { formatFileName, getFormatByExtension } from "@/engines/image/format";
import { calculateResizeDimensions } from "@/engines/image/resize";

describe("Image Transforms Engines", () => {
  describe("Resize Engine", () => {
    it("preserves aspect ratio when only width is provided", () => {
      // 1000 x 500 (ratio 2:1)
      const res = calculateResizeDimensions(1000, 500, {
        width: 500,
        maintainAspectRatio: true,
      });
      assert.deepEqual(res, { targetWidth: 500, targetHeight: 250 });
    });

    it("preserves aspect ratio when only height is provided", () => {
      // 1000 x 500 (ratio 2:1)
      const res = calculateResizeDimensions(1000, 500, {
        height: 200,
        maintainAspectRatio: true,
      });
      assert.deepEqual(res, { targetWidth: 400, targetHeight: 200 });
    });

    it("scales by percentage accurately", () => {
      const res = calculateResizeDimensions(800, 600, {
        scalePercent: 50,
        maintainAspectRatio: true,
      });
      assert.deepEqual(res, { targetWidth: 400, targetHeight: 300 });
    });

    it("allows non-proportional dimensions when maintainAspectRatio is false", () => {
      const res = calculateResizeDimensions(800, 600, {
        width: 400,
        height: 400,
        maintainAspectRatio: false,
      });
      assert.deepEqual(res, { targetWidth: 400, targetHeight: 400 });
    });
  });

  describe("Crop Engine", () => {
    it("constrains crop rectangle within image boundaries", () => {
      const constrained = constrainCropRect({ x: 950, y: 550, width: 200, height: 200 }, 1000, 600);
      assert.equal(constrained.x, 950);
      assert.equal(constrained.y, 550);
      assert.equal(constrained.width, 50); // Clamped to 1000 - 950
      assert.equal(constrained.height, 50); // Clamped to 600 - 550
    });

    it("calculates initial crop rectangle for 1:1 preset", () => {
      const crop = initialCropRect(1000, 500, "1:1");
      assert.equal(crop.width, crop.height);
      assert.ok(crop.x >= 0);
      assert.ok(crop.y >= 0);
    });

    it("calculates initial crop rectangle for 16:9 preset", () => {
      const crop = initialCropRect(1920, 1080, "16:9");
      const ratio = crop.width / crop.height;
      assert.ok(Math.abs(ratio - 16 / 9) < 0.05);
    });
  });

  describe("Format Engine", () => {
    it("resolves target format by file extension", () => {
      assert.equal(getFormatByExtension("png").mime, "image/png");
      assert.equal(getFormatByExtension("jpg").mime, "image/jpeg");
      assert.equal(getFormatByExtension("jpeg").mime, "image/jpeg");
      assert.equal(getFormatByExtension("webp").mime, "image/webp");
    });

    it("formats output file names cleanly", () => {
      assert.equal(formatFileName("photo.jpeg", "png"), "photo.png");
      assert.equal(formatFileName("my.document.photo.png", "webp"), "my.document.photo.webp");
    });
  });
});
