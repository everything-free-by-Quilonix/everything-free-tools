"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Whether the current page is in a section ("/tools" covers /tools/ and every tool page). */
function useInSection(section: string | undefined): boolean {
  const pathname = usePathname() ?? "";
  if (!section) return false;
  return pathname === section || pathname.startsWith(`${section}/`);
}

export function NavLink({ href, section, children }: { href: string; section: string; children: ReactNode }) {
  const active = useInSection(section);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-(--radius) px-3 text-sm transition-colors",
        active ? "bg-surface-raised font-medium text-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

const noop = () => () => {};

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere. Unknown until the page is live. */
export function ShortcutHint({ className }: { className?: string }) {
  const apple = useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center gap-0.5 rounded border border-border-strong bg-surface-raised px-1.5 text-2xs font-medium text-fg-subtle",
        className,
      )}
    >
      {apple ? "⌘" : "Ctrl"}
      <span>K</span>
    </kbd>
  );
}

/**
 * The phone menu. A <details> disclosure, so it opens without JavaScript; with
 * JavaScript it also closes on navigation, on Escape and on a click outside.
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const element = details.current;
    if (!element) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && element.open) {
        element.open = false;
        element.querySelector("summary")?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (element.open && event.target instanceof Node && !element.contains(event.target)) element.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <details ref={details} className="group relative md:hidden">
      <summary
        aria-label="Menu"
        className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-(--radius) text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg [&::-webkit-details-marker]:hidden"
      >
        <Icon name="menu" size={20} className="group-open:hidden" />
        <Icon name="x" size={20} className="hidden group-open:block" />
      </summary>
      <div className="absolute top-full right-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] animate-pop-in rounded-(--radius-lg) border border-border-strong bg-surface p-2 shadow-overlay">
        {children}
      </div>
    </details>
  );
}

export function MobileNavLink({
  href,
  section,
  children,
  description,
}: {
  href: string;
  section?: string;
  children: ReactNode;
  description?: string;
}) {
  const active = useInSection(section);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col rounded-(--radius) px-3 py-2.5 transition-colors hover:bg-surface-hover",
        active && "bg-surface-raised",
      )}
    >
      <span className="text-sm font-medium text-fg">{children}</span>
      {description ? <span className="text-xs text-fg-muted">{description}</span> : null}
    </Link>
  );
}
