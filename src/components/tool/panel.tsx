import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** A bordered area of a workspace, optionally titled. */
export function Panel({
  title,
  actions,
  children,
  className,
  titleId,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  titleId?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-[var(--radius)] border border-border bg-surface p-4 sm:p-5", className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title ? (
            <h2 id={titleId} className="font-display text-base font-semibold text-fg">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
