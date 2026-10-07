"use client";

import { jpegOrientation } from "@/engines/image/orientation";
import type { ImageInput } from "@/engines/pdf/operations";
import { ToolError } from "@/lib/errors";

/**
 * Image preparation for Image to PDF.
 *
 * Loaded on first use together with the PDF engine (see `loadImagePrep` in
 * `pdf-shared.ts`), so the image decoding path is not part of the page's
 * up-front JavaScript, as `check:bundle` requires for every tool page.
 *
 * JPEG and PNG go into the PDF exactly as they are, unless a JPEG is stored
 * rotated. Everything else (WebP, AVIF, BMP, the first frame of a GIF, rotated
 * photos) is drawn by the browser, upright, and saved as PNG or JPEG first.
 */
export async function prepareImage(file: File): Promise<ImageInput> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/png") return { bytes, type: "image/png" };
  if (file.type === "image/jpeg" && jpegOrientation(bytes) === 1) return { bytes, type: "image/jpeg" };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    throw new ToolError(`“${file.name}” couldn't be read as an image.`, String(error));
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new ToolError("Your browser couldn't prepare this image.");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  // Photos stay JPEG; formats that can be transparent become PNG so nothing turns black.
  const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  if (!blob) throw new ToolError(`“${file.name}” is too large for your browser to convert. Try a smaller image.`);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type };
}
