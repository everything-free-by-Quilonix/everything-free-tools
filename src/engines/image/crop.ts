/**
 * Image Cropping Engine.
 *
 * Computes crop bounds, validates coordinates, and provides aspect ratio presets.
 */

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatioPreset = "free" | "1:1" | "16:9" | "4:3" | "3:2";

export function getPresetRatio(preset: AspectRatioPreset): number | null {
  switch (preset) {
    case "1:1":
      return 1;
    case "16:9":
      return 16 / 9;
    case "4:3":
      return 4 / 3;
    case "3:2":
      return 3 / 2;
    case "free":
    default:
      return null;
  }
}

/**
 * Constrains a crop rectangle within the boundary of an image of size (imageWidth, imageHeight).
 */
export function constrainCropRect(crop: CropRect, imageWidth: number, imageHeight: number): CropRect {
  const x = Math.max(0, Math.min(crop.x, imageWidth - 1));
  const y = Math.max(0, Math.min(crop.y, imageHeight - 1));
  const maxWidth = imageWidth - x;
  const maxHeight = imageHeight - y;
  const width = Math.max(1, Math.min(crop.width, maxWidth));
  const height = Math.max(1, Math.min(crop.height, maxHeight));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Calculates initial centered crop rect for an aspect ratio preset.
 */
export function initialCropRect(imageWidth: number, imageHeight: number, preset: AspectRatioPreset = "free"): CropRect {
  const ratio = getPresetRatio(preset);
  if (!ratio) {
    // 80% default centered crop
    const w = Math.round(imageWidth * 0.8);
    const h = Math.round(imageHeight * 0.8);
    return {
      x: Math.round((imageWidth - w) / 2),
      y: Math.round((imageHeight - h) / 2),
      width: w,
      height: h,
    };
  }

  const imageRatio = imageWidth / imageHeight;
  let w = imageWidth * 0.8;
  let h = imageHeight * 0.8;

  if (imageRatio > ratio) {
    h = imageHeight * 0.8;
    w = h * ratio;
  } else {
    w = imageWidth * 0.8;
    h = w / ratio;
  }

  w = Math.round(w);
  h = Math.round(h);

  return {
    x: Math.round((imageWidth - w) / 2),
    y: Math.round((imageHeight - h) / 2),
    width: w,
    height: h,
  };
}
