"use client";

import { useSyncExternalStore } from "react";

import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * Light and dark theme.
 *
 * The site follows the operating system setting. This button overrides it for the
 * rest of the visit by setting `.light` or `.dark` on <html>. The choice lives in
 * memory only: the site stores nothing in the browser (see the Privacy page), so a
 * full reload returns to the system setting.
 */

type Theme = "light" | "dark";

let override: Theme | null = null;
const listeners = new Set<() => void>();
const QUERY = "(prefers-color-scheme: light)";

function systemTheme(): Theme {
  return window.matchMedia(QUERY).matches ? "light" : "dark";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

const getSnapshot = (): Theme => override ?? systemTheme();
const getServerSnapshot = (): Theme | null => null;

function setTheme(theme: Theme) {
  override = theme;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  for (const listener of listeners) listener();
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
      title={theme ? `Switch to ${next} theme` : "Switch theme"}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-(--radius) text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
        className,
      )}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
    </button>
  );
}
