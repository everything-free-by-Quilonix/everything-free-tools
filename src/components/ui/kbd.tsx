import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** A keyboard key, as shown in hints. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-raised px-1 text-2xs font-medium text-fg-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
