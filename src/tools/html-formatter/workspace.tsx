"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { formatHtml, minifyHtml } from "@/engines/developer/html";
import { textBlob } from "@/lib/downloads";

const SAMPLE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Everything.Free</title></head><body><header><h1>Welcome to Everything.Free</h1><nav><a href="/">Home</a><a href="/tools/">Tools</a></nav></header><main><p>Zero-telemetry tools that run entirely in your browser.</p></main></body></html>`;

export default function HtmlFormatterWorkspace() {
  const [input, setInput] = useState(SAMPLE_HTML);
  const [mode, setMode] = useState<"format" | "minify">("format");
  const [indent, setIndent] = useState<number>(2);

  const formatted = useMemo(() => {
    if (!input.trim()) return null;
    try {
      if (mode === "minify") {
        return { ok: true as const, output: minifyHtml(input) };
      } else {
        return { ok: true as const, output: formatHtml(input, indent) };
      }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  }, [input, mode, indent]);

  const downloadBlob = useMemo(() => {
    if (!formatted || !formatted.ok) return null;
    return textBlob(formatted.output, "text/html;charset=utf-8");
  }, [formatted]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="HTML Source">
        <div className="space-y-4">
          <Field label="HTML Code">
            {(context) => (
              <TextArea
                context={context}
                rows={12}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste HTML markup here..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Segmented
              legend="Mode"
              value={mode}
              onChange={(val) => setMode(val as "format" | "minify")}
              options={[
                { value: "format", label: "Format" },
                { value: "minify", label: "Minify" },
              ]}
            />
            {mode === "format" && (
              <Segmented
                legend="Indent"
                value={String(indent)}
                onChange={(val) => setIndent(Number(val))}
                options={[
                  { value: "2", label: "2 spaces" },
                  { value: "4", label: "4 spaces" },
                ]}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_HTML)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title={mode === "format" ? "Formatted HTML" : "Minified HTML"}
        actions={
          formatted && formatted.ok ? (
            <>
              <CopyButton text={formatted.output} label="Copy HTML" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="index.html" label="Download HTML" />}
            </>
          ) : null
        }
      >
        {formatted ? (
          formatted.ok ? (
            <div className="space-y-4">
              <Notice tone="success" title={mode === "format" ? "HTML Formatted" : "HTML Minified"}>
                {mode === "format"
                  ? "Hierarchical elements indented with void tag safety."
                  : "Comments, newlines, and extraneous spaces stripped."}
              </Notice>
              <OutputText value={formatted.output} rows={15} wrap="off" />
            </div>
          ) : (
            <Notice tone="danger" title="HTML Formatting Error">
              {formatted.error}
            </Notice>
          )
        ) : (
          <EmptyState title="No HTML code">Paste HTML markup on the left to format or minify it.</EmptyState>
        )}
      </Panel>
    </div>
  );
}
