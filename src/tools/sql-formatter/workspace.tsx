"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { formatSql, minifySql, type SqlDialect } from "@/engines/developer/sql";
import { textBlob } from "@/lib/downloads";

const SAMPLE_SQL = `select u.id, u.username, u.email, count(o.id) as order_count, sum(o.total_amount) as lifetime_value from users u left join orders o on u.id = o.user_id where u.active = 1 and u.created_at >= '2026-01-01' group by u.id, u.username, u.email having count(o.id) > 5 order by lifetime_value desc limit 50;`;

export default function SqlFormatterWorkspace() {
  const [input, setInput] = useState(SAMPLE_SQL);
  const [dialect, setDialect] = useState<SqlDialect>("standard");
  const [keywordCase, setKeywordCase] = useState<"upper" | "lower">("upper");
  const [mode, setMode] = useState<"format" | "minify">("format");

  const formatted = useMemo(() => {
    if (!input.trim()) return null;
    try {
      if (mode === "minify") {
        return { ok: true, output: minifySql(input) };
      } else {
        return { ok: true, output: formatSql(input, { dialect, keywordCase, indentSize: 2 }) };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [input, dialect, keywordCase, mode]);

  const downloadBlob = useMemo(() => {
    if (!formatted || !formatted.ok || !formatted.output) return null;
    return textBlob(formatted.output, "text/plain;charset=utf-8");
  }, [formatted]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="SQL Query Source">
        <div className="space-y-4">
          <Field label="Input Query">
            {(context) => (
              <TextArea
                context={context}
                rows={12}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste SQL query here..."
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
                legend="Keywords"
                value={keywordCase}
                onChange={(val) => setKeywordCase(val as "upper" | "lower")}
                options={[
                  { value: "upper", label: "UPPERCASE" },
                  { value: "lower", label: "lowercase" },
                ]}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-muted">Dialect:</span>
            {(["standard", "postgresql", "mysql", "sqlite"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDialect(d)}
                className={`rounded border px-2 py-0.5 text-xs capitalize transition-colors ${
                  dialect === d ? "bg-accent text-accent-fg border-accent" : "border-border text-fg-muted hover:text-fg"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_SQL)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title={mode === "format" ? "Formatted SQL" : "Minified SQL"}
        actions={
          formatted && formatted.ok && formatted.output ? (
            <>
              <CopyButton text={formatted.output} label="Copy SQL" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="query.sql" label="Download SQL" />}
            </>
          ) : null
        }
      >
        {formatted ? (
          formatted.ok && formatted.output ? (
            <div className="space-y-4">
              <Notice tone="success" title={mode === "format" ? "Query Formatted" : "Query Minified"}>
                {mode === "format"
                  ? "Indented clauses and normalized keyword capitalization."
                  : "Single compact line with stripped comments."}
              </Notice>
              <OutputText value={formatted.output} rows={15} wrap="off" />
            </div>
          ) : (
            <Notice tone="danger" title="SQL Formatting Error">
              {formatted.error ?? "Unknown error"}
            </Notice>
          )
        ) : (
          <EmptyState title="No SQL query">Paste a SQL statement on the left to format or minify it.</EmptyState>
        )}
      </Panel>
    </div>
  );
}
