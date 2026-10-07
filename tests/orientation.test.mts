import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { jpegOrientation } from "@/engines/image/orientation";

/** SOI, an APP1 Exif segment with one orientation entry, then SOS. */
function jpegWithOrientation(value: number, littleEndian = false): Uint8Array {
  const tiff = littleEndian
    ? [
        0x49,
        0x49,
        0x2a,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x12,
        0x01,
        0x03,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        value,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
      ]
    : [
        0x4d,
        0x4d,
        0x00,
        0x2a,
        0x00,
        0x00,
        0x00,
        0x08,
        0x00,
        0x01,
        0x01,
        0x12,
        0x00,
        0x03,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        value,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
      ];
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const length = payload.length + 2;
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 255, ...payload, 0xff, 0xda, 0x00, 0x02]);
}

describe("JPEG EXIF orientation", () => {
  it("reads the orientation in both byte orders", () => {
    assert.equal(jpegOrientation(jpegWithOrientation(6)), 6);
    assert.equal(jpegOrientation(jpegWithOrientation(3, true)), 3);
  });

  it("treats missing, invalid or truncated metadata as upright", () => {
    assert.equal(jpegOrientation(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02])), 1);
    assert.equal(jpegOrientation(jpegWithOrientation(9)), 1);
    assert.equal(jpegOrientation(jpegWithOrientation(6).slice(0, 14)), 1);
    assert.equal(jpegOrientation(new TextEncoder().encode("not a jpeg")), 1);
  });
});
