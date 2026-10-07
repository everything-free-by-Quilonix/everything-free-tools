"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { formatXml, minifyXml } from "@/engines/data/xml";
import { textBlob } from "@/lib/downloads";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?><catalog><book id="bk101"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><genre>Computer</genre><price>44.95</price><publish_date>2000-10-01</publish_date><description>An in-depth look at creating applications with XML.</description></book></catalog>`;

export default function XmlFormatterWorkspace() {
  const [input, setInput] = useState(SAMPLE_XML);
  const [mode, setMode] = useState<"format" | "minify">("format");
  const [indent, setIndent] = useState<number>(2);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      if (mode === "minify") {
        return { ok: true, output: minifyXml(input) };
      } else {
        return { ok: true, output: formatXml(input, indent) };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [input, mode, indent]);

  const downloadBlob = useMemo(() => {
    if (!result || !result.ok || !result.output) return null;
    return textBlob(result.output, "text/xml;charset=utf-8");
  }, [result]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="XML Input">
        <div className="space-y-4">
          <Field label="XML Markup">
            {(context) => (
              <TextArea
                context={context}
                rows={12}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste XML markup here..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              legend="Action"
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
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_XML)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="XML Output"
        actions={
          result && result.ok && result.output ? (
            <>
              <CopyButton text={result.output} label="Copy XML" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="formatted.xml" label="Download XML" />}
            </>
          ) : null
        }
      >
        {result ? (
          result.ok && result.output ? (
            <div className="space-y-4">
              <Notice tone="success" title={mode === "format" ? "XML Formatted" : "XML Minified"}>
                {mode === "format"
                  ? "Structured elements and tag hierarchy cleanly indented."
                  : "Whitespace, line breaks, and comments stripped."}
              </Notice>
              <OutputText value={result.output} rows={15} wrap="off" />
            </div>
          ) : (
            <Notice tone="danger" title="XML Processing Error">
              {result.error ?? "Unknown error"}
            </Notice>
          )
        ) : (
          <EmptyState title="No XML processed">
            Paste raw or messy XML markup on the left to format or minify it.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
