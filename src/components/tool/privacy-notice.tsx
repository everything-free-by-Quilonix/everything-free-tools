import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/cn";
import { privacyStatement } from "@/lib/privacy";
import { processingKind, processingLabels, type ProcessingKind } from "@/lib/processing";
import type { ToolDefinition } from "@/tools/registry/types";

const kindStyle: Record<ProcessingKind, { icon: IconName; text: string; box: string }> = {
  local: { icon: "lock", text: "text-success-fg", box: "border-success/35 bg-success-soft" },
  network: { icon: "globe", text: "text-warning-fg", box: "border-warning/40 bg-warning-soft" },
  external: { icon: "arrow-up-right", text: "text-info-fg", box: "border-info/40 bg-info-soft" },
};

/**
 * The privacy indicator at the top of every tool page, above anything the user can
 * paste or upload. Its wording comes only from the tool's registry entry.
 */
export function PrivacyNotice({
  tool,
  className,
}: {
  tool: Pick<ToolDefinition, "processing" | "privacy" | "integrationMode">;
  className?: string;
}) {
  const kind = processingKind(tool);
  const style = kindStyle[kind];
  const statement = privacyStatement(tool);
  const headline = kind === "external" ? "This capability currently uses an external service." : statement.headline;
  const points =
    kind === "external"
      ? ["Opens another website", "Its own privacy terms apply"]
      : statement.points.filter((point) => point !== "Processed locally");

  return (
    <section
      aria-label="Privacy"
      data-privacy={statement.mode}
      data-processing={kind}
      className={cn(
        "flex flex-col gap-2 rounded-(--radius-lg) border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        style.box,
        className,
      )}
    >
      <p className="flex items-start gap-2.5 text-sm text-fg">
        <Icon name={style.icon} size={18} className={cn("mt-0.5 shrink-0", style.text)} />
        <span>
          {/* The local headline already says "Processed locally"; other kinds lead with their label. */}
          {kind === "local" ? null : (
            <strong className={cn("font-semibold", style.text)}>{processingLabels[kind].long}. </strong>
          )}
          <span className={kind === "local" ? "font-medium" : undefined}>{headline}</span>
        </span>
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 pl-7 text-xs text-fg-muted sm:shrink-0 sm:justify-end sm:pl-0">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-1">
            <Icon name="check" size={14} className={style.text} />
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Compact processing label for cards and result rows. */
export function ProcessingBadge({ kind, className }: { kind: ProcessingKind; className?: string }) {
  const style = kindStyle[kind];
  const label = processingLabels[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", style.text, className)}>
      <Icon name={style.icon} size={13} />
      {label.short}
      <span className="sr-only">: {label.explanation}</span>
    </span>
  );
}
