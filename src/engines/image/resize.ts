/**
 * Image Resizer Engine.
 *
 * Computes dimension targets, aspect-ratio constraints, and applies client-side
 * resizing using Canvas 2D / OffscreenCanvas.
 */

export interface ResizeOptions {
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  scalePercent?: number;
  format?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number;
}

export interface CalculatedDimensions {
  targetWidth: number;
  targetHeight: number;
}

/**
 * Calculates new dimensions based on resizing options.
 */
export function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  options: ResizeOptions,
): CalculatedDimensions {
  if (options.scalePercent && options.scalePercent > 0) {
    const factor = options.scalePercent / 100;
    return {
      targetWidth: Math.max(1, Math.round(originalWidth * factor)),
      targetHeight: Math.max(1, Math.round(originalHeight * factor)),
    };
  }

  const reqW = options.width && options.width > 0 ? options.width : null;
  const reqH = options.height && options.height > 0 ? options.height : null;

  if (reqW && reqH) {
    if (!options.maintainAspectRatio) {
      return { targetWidth: Math.round(reqW), targetHeight: Math.round(reqH) };
    }
    const ratio = originalWidth / originalHeight;
    // Fit within bounding box
    if (reqW / reqH > ratio) {
      return { targetWidth: Math.round(reqH * ratio), targetHeight: Math.round(reqH) };
    } else {
      return { targetWidth: Math.round(reqW), targetHeight: Math.round(reqW / ratio) };
    }
  }

  if (reqW) {
    const ratio = originalHeight / originalWidth;
    return { targetWidth: Math.round(reqW), targetHeight: Math.round(reqW * ratio) };
  }

  if (reqH) {
    const ratio = originalWidth / originalHeight;
    return { targetWidth: Math.round(reqH * ratio), targetHeight: Math.round(reqH) };
  }

  return { targetWidth: originalWidth, targetHeight: originalHeight };
}
