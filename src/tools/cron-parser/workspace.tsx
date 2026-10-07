"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { EmptyState, Notice } from "@/components/ui/states";
import { parseCron } from "@/engines/developer/cron";

const PRESETS = [
  { label: "Every minute", expr: "* * * * *" },
  { label: "Every 5 mins", expr: "*/5 * * * *" },
  { label: "Every hour", expr: "0 * * * *" },
  { label: "Every day at midnight", expr: "0 0 * * *" },
  { label: "Every weekday at 9am", expr: "0 9 * * 1-5" },
  { label: "Every Sunday at noon", expr: "0 12 * * 0" },
];

export default function CronParserWorkspace() {
  const [expression, setExpression] = useState("0 9 * * 1-5");

  const fields = useMemo(() => {
    return expression.trim().split(/\s+/).filter(Boolean);
  }, [expression]);

  const parsed = useMemo(() => {
    if (!expression.trim()) return null;
    return parseCron(expression);
  }, [expression]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Cron Expression">
        <div className="space-y-4">
          <Field label="Schedule Expression" hint="5 fields: minute, hour, day of month, month, day of week.">
            {(context) => (
              <TextInput
                context={context}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="* * * * *"
                className="font-mono text-base"
              />
            )}
          </Field>

          <div className="space-y-1.5">
            <span className="text-xs text-fg-muted font-medium">Quick Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setExpression(p.expr)}
                  className="rounded border border-border bg-surface-raised px-2 py-1 text-xs text-fg-muted hover:text-fg hover:border-fg-subtle transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded border border-border bg-surface-raised p-3 text-xs space-y-2">
            <span className="font-semibold text-fg block">Field Breakdown:</span>
            <div className="grid grid-cols-5 gap-1 font-mono text-center">
              <div className="bg-surface p-1.5 rounded border border-border">
                <span className="text-accent font-bold block">{fields[0] ?? "-"}</span>
                <span className="text-[10px] text-fg-subtle">MIN</span>
              </div>
              <div className="bg-surface p-1.5 rounded border border-border">
                <span className="text-accent font-bold block">{fields[1] ?? "-"}</span>
                <span className="text-[10px] text-fg-subtle">HOUR</span>
              </div>
              <div className="bg-surface p-1.5 rounded border border-border">
                <span className="text-accent font-bold block">{fields[2] ?? "-"}</span>
                <span className="text-[10px] text-fg-subtle">DOM</span>
              </div>
              <div className="bg-surface p-1.5 rounded border border-border">
                <span className="text-accent font-bold block">{fields[3] ?? "-"}</span>
                <span className="text-[10px] text-fg-subtle">MON</span>
              </div>
              <div className="bg-surface p-1.5 rounded border border-border">
                <span className="text-accent font-bold block">{fields[4] ?? "-"}</span>
                <span className="text-[10px] text-fg-subtle">DOW</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setExpression("")} disabled={!expression}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpression("0 9 * * 1-5")}>
              Reset Default
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Schedule Explanation">
        {parsed ? (
          parsed.isValid ? (
            <div className="space-y-4">
              <Notice tone="success" title="Human-Readable Description">
                &quot;{parsed.humanDescription}&quot;
              </Notice>

              <div className="rounded border border-border bg-surface-raised p-3 space-y-2">
                <span className="text-xs font-semibold text-fg block">Next 5 Scheduled Runs (Local Device Time):</span>
                {parsed.nextRuns.length > 0 ? (
                  <ul className="divide-y divide-border text-xs font-mono text-fg">
                    {parsed.nextRuns.map((run: string, i: number) => (
                      <li key={i} className="py-1.5 flex items-center justify-between">
                        <span className="text-accent">#{i + 1}</span>
                        <span>{run}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-fg-muted">Calculating execution dates...</p>
                )}
              </div>
            </div>
          ) : (
            <Notice tone="danger" title="Invalid Cron Syntax">
              {parsed.error}
            </Notice>
          )
        ) : (
          <EmptyState title="No cron expression">
            Enter a standard 5-part or 6-part cron schedule on the left to see its explanation.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
