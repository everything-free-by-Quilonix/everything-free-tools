"use client";

import { useEffect, useState } from "react";

/**
 * A polite live region that is always in the page.
 *
 * Screen readers announce changes to a live region they already know about. A
 * region inserted together with its text (a result panel appearing) is announced
 * inconsistently: NVDA and JAWS often skip it. So each workspace keeps one of these
 * mounted from the start and puts its one-line outcome here ("Valid JSON. Output
 * ready."), while the visible result panels carry no live-region role of their
 * own, which would announce the same thing twice. Errors still use role="alert",
 * which is announced on insertion.
 */
export function Announcer({ message }: { message: string }) {
  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}

/** The value, once it has stopped changing for `delay` ms. For announcing while someone types. */
export function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
