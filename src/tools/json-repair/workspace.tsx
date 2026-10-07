"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { repairJson } from "@/engines/data/json-repair";
import { MIME, textBlob } from "@/lib/downloads";

export default function JsonRepairWorkspace() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState<number>(2);

  const repairResult = useMemo(() => {
    if (!input.trim()) return null;
    return repairJson(input, indent);
  }, [input, indent]);

  const downloadBlob = useMemo(() => {
    if (!repairResult || !repairResult.repaired) return null;
    return textBlob(repairResult.repaired, MIME.json);
  }, [repairResult]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Broken or Informal JSON">
        <div className="space-y-4">
          <Field label="Paste JSON">
            {(context) => (
              <TextArea
                context={context}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste broken JSON here (unquoted keys, single quotes, trailing commas, comments, Python booleans)..."
                rows={12}
              />
            )}
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Segmented
                legend="Indent"
                value={String(indent)}
                onChange={(val) => setIndent(Number(val))}
                options={[
                  { value: "2", label: "2 spaces" },
                  { value: "4", label: "4 spaces" },
                ]}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Repaired JSON">
        {repairResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs px-2 py-0.5 rounded border font-medium ${
                  repairResult.success
                    ? "bg-success-soft text-success-fg border-success/30"
                    : "bg-warning-soft text-warning-fg border-warning/30"
                }`}
              >
                {repairResult.success ? "Valid JSON" : "Partially Repaired"}
              </span>
              <span className="text-xs text-fg-muted">{repairResult.fixes.length} fix(es) applied</span>
            </div>

            {repairResult.fixes.length > 0 && (
              <div className="rounded border border-border bg-surface-raised p-2.5 text-xs text-fg-muted space-y-1">
                <span className="font-semibold text-fg block">Modifications:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {repairResult.fixes.map((fix, idx) => (
                    <li key={idx}>{fix}</li>
                  ))}
                </ul>
              </div>
            )}

            <Field label="Repaired JSON Output" hideLabel>
              {(context) => (
                <TextArea
                  context={context}
                  readOnly
                  rows={12}
                  value={repairResult.repaired}
                  spellCheck={false}
                  className="font-mono text-xs"
                />
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              <CopyButton text={repairResult.repaired} label="Copy Repaired JSON" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="repaired.json" label="Download JSON" />}
            </div>
          </div>
        ) : (
          <EmptyState title="No JSON to repair">
            Paste informal, single-quoted, or malformed JSON on the left to repair it automatically.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
