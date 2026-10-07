"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { generateHtmlTable, generateMarkdownTable } from "@/engines/data/table";
import { MIME, textBlob } from "@/lib/downloads";

const SAMPLE_DATA = `Project,Status,Budget,Progress
Apollo,Active,$120,000,85%
Hermes,Planning,$45,000,20%
Artemis,Review,$95,000,98%`;

export default function TableGeneratorWorkspace() {
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const [input, setInput] = useState(SAMPLE_DATA);

  const generated = useMemo(() => {
    if (!input.trim()) return null;
    const lines = input
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    if (lines.length === 0) return null;

    const firstLine = lines[0] ?? "";
    const delim = firstLine.includes("\t") ? "\t" : ",";
    const headers = firstLine.split(delim).map((h) => h.trim());
    const rows = lines.slice(1).map((l) => l.split(delim).map((c) => c.trim()));

    if (format === "markdown") {
      const md = generateMarkdownTable({ headers, rows });
      return { output: md, ext: "md", mime: MIME.text };
    } else {
      const html = generateHtmlTable({ headers, rows });
      return { output: html, ext: "html", mime: "text/html;charset=utf-8" };
    }
  }, [input, format]);

  const downloadBlob = useMemo(() => {
    if (!generated) return null;
    return textBlob(generated.output, generated.mime);
  }, [generated]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Tabular Source">
        <div className="space-y-4">
          <Segmented
            legend="Output Format"
            value={format}
            onChange={(val) => setFormat(val as "markdown" | "html")}
            options={[
              { value: "markdown", label: "Markdown Table" },
              { value: "html", label: "HTML <table>" },
            ]}
          />

          <Field
            label="Table Data (CSV or TSV)"
            hint="First line is used as headers. Columns separated by commas or tabs."
          >
            {(context) => (
              <TextArea
                context={context}
                rows={12}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Header 1, Header 2, Header 3..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_DATA)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title={format === "markdown" ? "Markdown Table Code" : "HTML Table Code"}
        actions={
          generated ? (
            <>
              <CopyButton text={generated.output} label="Copy Code" />
              {downloadBlob && (
                <DownloadLink
                  blob={downloadBlob}
                  fileName={`table.${generated.ext}`}
                  label={`Download .${generated.ext}`}
                />
              )}
            </>
          ) : null
        }
      >
        {generated ? (
          <div className="space-y-4">
            <Notice tone="success" title="Table Formatted">
              Ready to paste directly into your Markdown documentation or HTML website.
            </Notice>
            <OutputText value={generated.output} rows={14} wrap="off" />
          </div>
        ) : (
          <EmptyState title="No table generated">
            Enter CSV or tab-separated data on the left to generate Markdown or HTML table code.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
