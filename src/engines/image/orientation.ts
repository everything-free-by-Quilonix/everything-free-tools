/**
 * Reads the EXIF orientation of a JPEG (1–8), or 1 if it has none.
 *
 * Phone cameras save photos sideways and record how to turn them in this tag.
 * Browsers apply it when displaying an image, but a JPEG embedded in a PDF as-is
 * would appear sideways, so the Image to PDF tool re-draws only the photos that
 * need turning and embeds every other JPEG untouched.
 */
export function jpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if ((marker & 0xff00) !== 0xff00 || length < 2) return 1;
    // APP1 holding "Exif\0\0".
    if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
      return readTiffOrientation(view, offset + 10, Math.min(view.byteLength, offset + 2 + length));
    }
    // Start of scan: image data follows, no more metadata.
    if (marker === 0xffda) return 1;
    offset += 2 + length;
  }
  return 1;
}

function readTiffOrientation(view: DataView, start: number, end: number): number {
  if (start + 8 > end) return 1;
  const little = view.getUint16(start) === 0x4949;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const ifd = start + u32(start + 4);
  if (ifd + 2 > end) return 1;
  const entries = u16(ifd);
  for (let index = 0; index < entries; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) return 1;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}
