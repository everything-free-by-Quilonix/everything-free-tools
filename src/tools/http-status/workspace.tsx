"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { HTTP_STATUS_DATABASE, searchHttpStatus, type HttpStatusEntry } from "@/engines/developer/http-status";

const CATEGORY_COLORS: Record<string, string> = {
  Informational: "border-info/30 bg-info-soft text-info-fg",
  Success: "border-success/30 bg-success-soft text-success-fg",
  Redirection: "border-warning/30 bg-warning-soft text-warning-fg",
  "Client Error": "border-danger/40 bg-danger-soft text-danger-fg",
  "Server Error": "border-border-strong bg-surface-raised text-fg",
};

export default function HttpStatusWorkspace() {
  const [query, setQuery] = useState("");
  const defaultEntry = HTTP_STATUS_DATABASE.find((s) => s.code === 200) ?? HTTP_STATUS_DATABASE[0] ?? null;
  const [selected, setSelected] = useState<HttpStatusEntry | null>(defaultEntry);

  const list = useMemo(() => {
    if (!query.trim()) return [...HTTP_STATUS_DATABASE];
    return searchHttpStatus(query);
  }, [query]);

  return (
    <div className="space-y-6">
      <Panel title="Search HTTP Status Codes">
        <div className="space-y-4">
          <Field label="Status Code or Term" hint="e.g. 200, 404, 429, 502, unauthorized, rate limit">
            {(context) => (
              <TextInput
                context={context}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code or description..."
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-fg-muted">Common codes:</span>
            {[200, 201, 204, 301, 304, 400, 401, 403, 404, 429, 500, 502, 503].map((code) => (
              <button
                key={code}
                type="button"
                className="text-accent underline hover:opacity-80"
                onClick={() => {
                  setQuery(String(code));
                  const found = HTTP_STATUS_DATABASE.find((s: HttpStatusEntry) => s.code === code);
                  if (found) setSelected(found);
                }}
              >
                {code}
              </button>
            ))}
            {query && (
              <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
                Reset
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 max-h-[500px] overflow-y-auto space-y-1.5 rounded border border-border p-2 bg-surface">
          {list.map((item: HttpStatusEntry) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setSelected(item)}
              className={`w-full text-left p-2.5 rounded border transition-colors flex items-center justify-between text-xs ${
                selected?.code === item.code
                  ? "bg-accent/10 border-accent/40 text-fg font-medium"
                  : "bg-surface-raised border-border text-fg-muted hover:text-fg hover:border-fg-subtle"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-accent">{item.code}</span>
                <span>{item.phrase}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[item.categoryName] ?? ""}`}>
                {item.category}
              </span>
            </button>
          ))}
          {list.length === 0 && (
            <p className="text-xs text-fg-muted p-4 text-center">No status code matching &quot;{query}&quot;.</p>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Panel title={`${selected.code} — ${selected.phrase}`}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded border font-medium ${
                      CATEGORY_COLORS[selected.categoryName] ?? ""
                    }`}
                  >
                    {selected.categoryName} ({selected.category})
                  </span>
                  <span className="text-xs text-fg-subtle font-mono">{selected.rfc}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-fg">RFC Definition:</span>
                  <p className="text-xs text-fg-muted leading-relaxed">{selected.summary}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-fg">Common Causes:</span>
                  <p className="text-xs text-fg-muted leading-relaxed">{selected.causes}</p>
                </div>

                <div className="rounded border border-border bg-surface-raised p-3 space-y-1.5 text-xs">
                  <span className="font-semibold text-fg block">Developer Context & Tips:</span>
                  <p className="text-fg-muted leading-relaxed">{selected.developerTips}</p>
                </div>
              </div>
            </Panel>
          ) : (
            <EmptyState title="Select a status code">
              Click on an HTTP status code from the catalog to view its RFC specifications and troubleshooting advice.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
