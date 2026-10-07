"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { computeTextDiff, type DiffResult } from "@/engines/text/diff";

export default function TextDiffWorkspace() {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");

  const diff: DiffResult | null = useMemo(() => {
    if (!original && !modified) return null;
    return computeTextDiff(original, modified);
  }, [original, modified]);

  const diffText = useMemo(() => {
    if (!diff) return "";
    return diff.lines
      .map((l) => {
        const prefix = l.type === "insert" ? "+ " : l.type === "delete" ? "- " : "  ";
        return prefix + l.text;
      })
      .join("\n");
  }, [diff]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Original Text">
          <Field label="Original / Left">
            {(context) => (
              <TextArea
                context={context}
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="Paste original text here..."
                rows={8}
              />
            )}
          </Field>
        </Panel>

        <Panel title="Modified Text">
          <Field label="Modified / Right">
            {(context) => (
              <TextArea
                context={context}
                value={modified}
                onChange={(e) => setModified(e.target.value)}
                placeholder="Paste updated text here..."
                rows={8}
              />
            )}
          </Field>
        </Panel>
      </div>

      <Panel title="Comparison Diff">
        {diff ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-fg-muted">Summary:</span>
                <span className="px-2 py-0.5 rounded bg-success-soft text-success-fg font-medium">
                  +{diff.additions} additions
                </span>
                <span className="px-2 py-0.5 rounded bg-danger-soft text-danger-fg font-medium">
                  -{diff.deletions} deletions
                </span>
                <span className="text-fg-subtle">{diff.unchanged} unchanged lines</span>
              </div>
              <div className="flex gap-2">
                <CopyButton text={diffText} label="Copy Diff Text" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setOriginal("");
                    setModified("");
                  }}
                >
                  Clear Both
                </Button>
              </div>
            </div>

            <div className="max-h-[480px] overflow-auto rounded border border-border bg-surface-raised font-mono text-xs">
              {diff.lines.map((line, idx) => {
                const isAdd = line.type === "insert";
                const isDel = line.type === "delete";
                const bg = isAdd
                  ? "bg-success-soft text-success-fg"
                  : isDel
                    ? "bg-danger-soft text-danger-fg"
                    : "text-fg-muted";
                const sign = isAdd ? "+" : isDel ? "-" : " ";

                return (
                  <div key={idx} className={`flex px-2 py-0.5 border-b border-border/20 ${bg}`}>
                    <span className="w-10 select-none text-right pr-2 text-fg-subtle">{line.oldLineNumber ?? ""}</span>
                    <span className="w-10 select-none text-right pr-2 text-fg-subtle">{line.newLineNumber ?? ""}</span>
                    <span className="w-4 select-none font-bold">{sign}</span>
                    <span className="flex-1 whitespace-pre-wrap break-all">{line.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState title="No text to compare">
            Paste original and modified texts above to see the line-by-line differences.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
