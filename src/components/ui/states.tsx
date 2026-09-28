import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { UserError } from "@/lib/errors";

/**
 * Result states. Every tool shows exactly one of: empty, working, error or result,
 * so users are never left looking at a blank area without knowing why.
 */

export type NoticeTone = "info" | "success" | "warning" | "danger";

const noticeTones: Record<NoticeTone, { box: string; icon: IconName; iconClass: string }> = {
  info: { box: "border-border-strong bg-surface-raised", icon: "info", iconClass: "text-fg-muted" },
  success: { box: "border-success/40 bg-success-soft", icon: "check", iconClass: "text-success-fg" },
  warning: { box: "border-warning/40 bg-warning-soft", icon: "alert", iconClass: "text-warning-fg" },
  danger: { box: "border-danger/60 bg-danger-soft", icon: "alert", iconClass: "text-danger-fg" },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  const style = noticeTones[tone];
  return (
    <div role={role} className={cn("flex gap-3 rounded-[var(--radius)] border p-3.5 text-sm", style.box, className)}>
      <Icon name={style.icon} size={18} className={cn("mt-0.5 shrink-0", style.iconClass)} />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-medium text-fg">{title}</p> : null}
        {children ? <div className="text-fg-muted">{children}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({ error, className }: { error: UserError; className?: string }) {
  return (
    <Notice tone="danger" role="alert" title={error.message} className={className}>
      {error.technical ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-fg-muted hover:text-fg">Technical details</summary>
          <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-fg-subtle">
            {error.technical}
          </pre>
        </details>
      ) : null}
    </Notice>
  );
}

export function EmptyState({
  icon = "info",
  title,
  children,
}: {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border-strong px-4 py-10 text-center">
      <Icon name={icon} size={24} className="text-fg-subtle" />
      <p className="text-sm font-medium text-fg">{title}</p>
      {children ? <p className="max-w-sm text-sm text-fg-muted">{children}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number | null; label: string }) {
  const percent = value === null ? null : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-fg-muted">
        <span>{label}</span>
        {percent !== null ? <span aria-hidden="true">{percent}%</span> : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
      >
        <div
          className={cn("h-full rounded-full bg-accent transition-[width]", percent === null && "w-1/3 animate-pulse")}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Label/value pairs for result statistics. */
export function StatList({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5">
          <dt className="text-xs text-fg-muted">{item.label}</dt>
          <dd className="mt-0.5 font-display text-lg font-semibold text-fg tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
