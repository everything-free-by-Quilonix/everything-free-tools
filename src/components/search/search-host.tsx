"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

/**
 * Global search: open state, keyboard shortcuts and the lazily loaded palette.
 *
 * The palette and the tool index it searches are a separate chunk, fetched from
 * this site the first time search is opened (or hinted at by hovering or focusing
 * the search button). Pages that never open search never download it.
 *
 * Shortcuts:
 *   Ctrl+K / ⌘K   open or close search, from anywhere, even while typing
 *   /             focus the page's own search box if it has one, otherwise open search
 *                 (ignored while typing in a field)
 */

const loadPalette = () => import("./command-palette");
const CommandPalette = dynamic(loadPalette, { ssr: false });

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setSearchOpen(value: boolean) {
  if (open === value) return;
  open = value;
  emit();
}

/** Starts downloading the palette before it is needed. */
export function preloadSearch() {
  void loadPalette();
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

export function SearchHost() {
  const isOpen = useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(!open);
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target)) {
        if (open) return;
        event.preventDefault();
        const primary = document.querySelector<HTMLInputElement>("[data-primary-search]");
        if (primary && primary.offsetParent !== null) {
          primary.focus();
          primary.select();
        } else setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return isOpen ? <CommandPalette onClose={() => setSearchOpen(false)} /> : null;
}

/**
 * Opens search. Rendered as a link to the tools directory, so it still leads
 * somewhere useful before JavaScript has loaded or if it never does.
 */
export function SearchTrigger({
  href,
  className,
  children,
  label,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setSearchOpen(true);
  };
  return (
    <a
      href={href}
      onClick={onClick}
      onPointerEnter={preloadSearch}
      onFocus={preloadSearch}
      aria-label={label}
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      className={className}
    >
      {children}
    </a>
  );
}
