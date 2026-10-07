import type { RefObject } from "react";

/**
 * Moves focus to an element after the current update has rendered.
 *
 * For buttons that remove themselves (Clear, Cancel, Remove all): without this,
 * keyboard and screen-reader users are dropped at the top of the page. The next
 * frame is used because the target may only become enabled in the same update.
 */
export function focusSoon(target: RefObject<HTMLElement | null>): void {
  requestAnimationFrame(() => target.current?.focus());
}
