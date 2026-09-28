import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { privacyStatement } from "@/lib/privacy";
import type { ToolDefinition } from "@/tools/registry";

/** The privacy indicator. Its wording comes only from the tool's registry entry. */
export function PrivacyNotice({ tool, className }: { tool: ToolDefinition; className?: string }) {
  const statement = privacyStatement(tool);
  const local = statement.mode === "LOCAL";

  return (
    <section
      aria-label="Privacy"
      data-privacy={statement.mode}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        local ? "border-success/40 bg-success-soft" : "border-warning/40 bg-warning-soft",
        className,
      )}
    >
      <p className="flex items-start gap-2 text-sm font-medium text-fg">
        <Icon
          name={local ? "lock" : "globe"}
          size={18}
          className={cn("mt-0.5 shrink-0", local ? "text-success-fg" : "text-warning-fg")}
        />
        {statement.headline}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted sm:justify-end">
        {statement.points.map((point) => (
          <li key={point} className="flex items-center gap-1">
            <Icon name="check" size={14} className={local ? "text-success-fg" : "text-warning-fg"} />
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Compact label for cards. */
export function PrivacyLabel({ tool }: { tool: ToolDefinition }) {
  const local = tool.processing === "LOCAL";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", local ? "text-success-fg" : "text-warning-fg")}>
      <Icon name={local ? "lock" : "globe"} size={13} />
      {local ? "Runs in your browser" : "Uses a network service"}
    </span>
  );
}
