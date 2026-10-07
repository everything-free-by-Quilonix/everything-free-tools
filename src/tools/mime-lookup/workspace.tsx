"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { MIME_DATABASE, searchMime } from "@/engines/developer/mime";

export default function MimeLookupWorkspace() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return MIME_DATABASE.slice(0, 15);
    return searchMime(query);
  }, [query]);

  return (
    <div className="space-y-6">
      <Panel title="Search File Extensions & MIME Types">
        <div className="space-y-4">
          <Field label="Search by extension or MIME type" hint="e.g. .json, pdf, svg, application/json, audio, video">
            {(context) => (
              <TextInput
                context={context}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search .png, video/mp4, text/html..."
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-fg-muted">Quick filters:</span>
            {["json", "pdf", "webp", "wasm", "svg", "mp4", "zip"].map((ext) => (
              <button
                key={ext}
                type="button"
                className="text-accent underline hover:opacity-80"
                onClick={() => setQuery(ext)}
              >
                .{ext}
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

      <Panel title={`MIME Types & File Extensions (${results.length})`}>
        {results.length > 0 ? (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-raised border-b border-border font-semibold text-fg">
                <tr>
                  <th className="p-2.5">Extension</th>
                  <th className="p-2.5">MIME Type</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {results.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="p-2.5 text-accent font-bold">.{entry.extension}</td>
                    <td className="p-2.5 text-fg font-medium">{entry.mime}</td>
                    <td className="p-2.5 text-fg-muted font-sans">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No matching MIME types found">
            Try searching for another file extension or content category (e.g. image, audio, application).
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
