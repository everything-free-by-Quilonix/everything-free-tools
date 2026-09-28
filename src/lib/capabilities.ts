import type { BrowserCapability } from "@/tools/registry";

/**
 * Browser capability detection.
 *
 * Each check is a feature test, never a user-agent sniff, and is safe to call during
 * static rendering (it returns false when there is no `window`). A tool lists what it
 * needs; the tool shell checks before rendering and explains what is missing instead
 * of letting the page break.
 */

const hasWindow = () => typeof window !== "undefined";

const checks: Record<BrowserCapability, () => boolean> = {
  "web-workers": () => hasWindow() && typeof Worker !== "undefined",
  "web-crypto": () => typeof globalThis.crypto?.getRandomValues === "function",
  "random-uuid": () => typeof globalThis.crypto?.randomUUID === "function",
  canvas: () => {
    if (!hasWindow()) return false;
    try {
      return Boolean(document.createElement("canvas").getContext("2d"));
    } catch {
      return false;
    }
  },
  "offscreen-canvas": () => typeof OffscreenCanvas !== "undefined",
  "create-image-bitmap": () => typeof createImageBitmap === "function",
  "clipboard-write": () => hasWindow() && typeof navigator.clipboard?.writeText === "function",
  "intl-segmenter": () => typeof Intl !== "undefined" && "Segmenter" in Intl,
  webassembly: () => typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function",
  webcodecs: () => hasWindow() && "VideoEncoder" in window,
  "file-system-access": () => hasWindow() && "showSaveFilePicker" in window,
};

export function hasCapability(capability: BrowserCapability): boolean {
  try {
    return checks[capability]();
  } catch {
    return false;
  }
}

export function missingCapabilities(required: readonly BrowserCapability[]): BrowserCapability[] {
  return required.filter((capability) => !hasCapability(capability));
}

export const capabilityLabels: Record<BrowserCapability, string> = {
  "web-workers": "Web Workers",
  "web-crypto": "the Web Crypto API",
  "random-uuid": "crypto.randomUUID",
  canvas: "the Canvas API",
  "offscreen-canvas": "OffscreenCanvas",
  "create-image-bitmap": "createImageBitmap",
  "clipboard-write": "clipboard access",
  "intl-segmenter": "Intl.Segmenter",
  webassembly: "WebAssembly",
  webcodecs: "WebCodecs",
  "file-system-access": "the File System Access API",
};
