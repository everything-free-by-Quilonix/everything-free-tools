/**
 * QR symbol generation and rendering.
 *
 * Encoding is done by uqr (MIT). Rendering is ours: the module matrix becomes one
 * SVG path (for the preview and the SVG download) or pixels on a canvas (PNG). No
 * markup is ever built from user input: the only strings in the SVG are numbers and
 * validated hex colours.
 */

import { encode } from "uqr";

import { ToolError } from "@/lib/errors";

export type ErrorCorrection = "L" | "M" | "Q" | "H";

export interface QrMatrix {
  /** Modules per side, including the quiet zone. */
  size: number;
  version: number;
  /** `true` is a dark module. Row-major. */
  modules: boolean[][];
}

/** Quiet zone the QR specification asks for, in modules. */
export const QUIET_ZONE = 4;

export function createMatrix(payload: string, ecc: ErrorCorrection): QrMatrix {
  try {
    const result = encode(payload, { ecc, border: QUIET_ZONE });
    return { size: result.size, version: result.version, modules: result.data };
  } catch (error) {
    const technical = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    if (error instanceof Error && /too long/i.test(error.message)) {
      throw new ToolError(
        ecc === "L"
          ? "This is too much content for a QR code. Shorten the text or link."
          : "This is too much content for a QR code at this error-correction level. Choose a lower level or shorten the text.",
        technical,
      );
    }
    if (error instanceof URIError) {
      throw new ToolError("This text contains a broken character that can't be encoded. Try retyping it.", technical);
    }
    throw new ToolError("We couldn't create a QR code from this content.", technical);
  }
}

/** One path of 1×1 squares, merged into horizontal runs, in module units. */
export function modulesPath(matrix: QrMatrix): string {
  const parts: string[] = [];
  matrix.modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      parts.push(`M${start} ${y}h${x - start}v1h${start - x}z`);
    }
  });
  return parts.join("");
}

const HEX = /^#[0-9a-f]{6}$/i;

export function assertColour(value: string): string {
  if (!HEX.test(value)) throw new ToolError(`“${value}” isn't a colour in #rrggbb form.`);
  return value.toLowerCase();
}

export function svgMarkup(matrix: QrMatrix, foreground: string, background: string, pixelsPerModule = 10): string {
  const fg = assertColour(foreground);
  const bg = assertColour(background);
  const size = matrix.size;
  const px = size * pixelsPerModule;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${px}" height="${px}" shape-rendering="crispEdges">`,
    `<rect width="${size}" height="${size}" fill="${bg}"/>`,
    `<path d="${modulesPath(matrix)}" fill="${fg}"/>`,
    `</svg>`,
  ].join("");
}

/** Draws the code onto a 2D context sized `size * scale` square. */
export function drawMatrix(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  matrix: QrMatrix,
  scale: number,
  foreground: string,
  background: string,
): void {
  context.fillStyle = assertColour(background);
  context.fillRect(0, 0, matrix.size * scale, matrix.size * scale);
  context.fillStyle = assertColour(foreground);
  matrix.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) context.fillRect(x * scale, y * scale, scale, scale);
    });
  });
}

export function pngBlob(matrix: QrMatrix, targetPixels: number, foreground: string, background: string): Promise<Blob> {
  // Whole pixels per module keep edges sharp, which scanners need.
  const scale = Math.max(1, Math.floor(targetPixels / matrix.size));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = matrix.size * scale;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new ToolError("Your browser couldn't create an image for the download."));
  drawMatrix(context, matrix, scale, foreground, background);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ToolError("The browser couldn't create the PNG."))),
      "image/png",
    ),
  );
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #rrggbb colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(assertColour(a)), luminance(assertColour(b))].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** Why a colour pair might not scan, or null if it should. */
export function colourWarning(foreground: string, background: string): string | null {
  if (!HEX.test(foreground) || !HEX.test(background)) return null;
  if (luminance(foreground) > luminance(background)) {
    return "Light modules on a dark background are inverted. Some phone cameras can't read inverted codes.";
  }
  if (contrastRatio(foreground, background) < 4) {
    return "These colours have low contrast, so the code may not scan reliably. Use a darker foreground or lighter background.";
  }
  return null;
}
