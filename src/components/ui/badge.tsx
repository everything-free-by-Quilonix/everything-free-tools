import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "success" | "warning" | "accent";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border-strong bg-surface-raised text-fg-muted",
  success: "border-success/40 bg-success-soft text-success-fg",
  warning: "border-warning/40 bg-warning-soft text-warning-fg",
  accent: "border-accent/40 bg-accent-soft text-accent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
