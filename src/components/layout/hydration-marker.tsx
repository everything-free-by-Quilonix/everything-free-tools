"use client";

import { useEffect } from "react";

/**
 * Sets `data-hydrated="1"` on <html> once React has taken over the page. The browser
 * smoke test waits for it before interacting, and CSS could use it to reveal
 * JavaScript-only controls.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return null;
}
