/**
 * Color Conversion & Accessibility Contrast Engine.
 *
 * Implements bidirectional conversion between HEX, RGB, HSL, and HSV color formats,
 * alongside WCAG 2.1 relative luminance and contrast calculations.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
  a?: number;
}

export interface HsvColor {
  h: number;
  s: number;
  v: number;
  a?: number;
}

export interface ColorDetails {
  hex: string;
  rgb: string;
  hsl: string;
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  luminance: number;
  contrastWhite: number;
  contrastBlack: number;
  wcagWhite: { aa: boolean; aaa: boolean };
  wcagBlack: { aa: boolean; aaa: boolean };
}

export function parseHex(input: string): RgbColor | null {
  const clean = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3,8}$/.test(clean)) return null;

  let r = 0,
    g = 0,
    b = 0,
    a = 1;

  if (clean.length === 3 || clean.length === 4) {
    const c0 = clean[0] ?? "";
    const c1 = clean[1] ?? "";
    const c2 = clean[2] ?? "";
    const c3 = clean[3] ?? "";
    r = parseInt(c0 + c0, 16);
    g = parseInt(c1 + c1, 16);
    b = parseInt(c2 + c2, 16);
    if (clean.length === 4) a = parseInt(c3 + c3, 16) / 255;
  } else if (clean.length === 6 || clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
    if (clean.length === 8) a = parseInt(clean.slice(6, 8), 16) / 255;
  } else {
    return null;
  }

  return { r, g, b, a };
}

export function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHsl(rgb: RgbColor): HslColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: rgb.a,
  };
}

export function hslToRgb(hsl: HslColor): RgbColor {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val, a: hsl.a };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    a: hsl.a,
  };
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 */
export function getRelativeLuminance(rgb: RgbColor): number {
  const transform = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const rs = transform(rgb.r);
  const gs = transform(rgb.g);
  const bs = transform(rgb.b);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two luminance values (1:1 to 21:1).
 */
export function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

export function getColorDetails(rgb: RgbColor): ColorDetails {
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const lum = getRelativeLuminance(rgb);
  const contrastWhite = getContrastRatio(lum, 1.0);
  const contrastBlack = getContrastRatio(lum, 0.0);

  return {
    hex,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    h: hsl.h,
    s: hsl.s,
    l: hsl.l,
    luminance: Math.round(lum * 1000) / 1000,
    contrastWhite,
    contrastBlack,
    wcagWhite: { aa: contrastWhite >= 4.5, aaa: contrastWhite >= 7.0 },
    wcagBlack: { aa: contrastBlack >= 4.5, aaa: contrastBlack >= 7.0 },
  };
}
