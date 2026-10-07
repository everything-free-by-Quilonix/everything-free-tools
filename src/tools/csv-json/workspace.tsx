"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { csvToJson, jsonToCsv } from "@/engines/data/csv";
import { MIME, textBlob } from "@/lib/downloads";

const SAMPLE_CSV = `id,name,role,department
1,Alice Johnson,Lead Engineer,Platform
2,Bob Smith,Senior Designer,Product
3,Charlie Brown,Security Analyst,Infosec`;

export default function CsvJsonWorkspace() {
  const [direction, setDirection] = useState<"csv-to-json" | "json-to-csv">("csv-to-json");
  const [input, setInput] = useState(SAMPLE_CSV);

  const conversion = useMemo(() => {
    if (!input.trim()) return null;
    try {
      if (direction === "csv-to-json") {
        const jsonArr = csvToJson(input);
        const json = JSON.stringify(jsonArr, null, 2);
        return { ok: true as const, output: json, mime: MIME.json, ext: "json" };
      } else {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed)) {
          throw new Error("Input must be a JSON array of objects");
        }
        const csv = jsonToCsv(parsed);
        return { ok: true as const, output: csv, mime: "text/csv;charset=utf-8", ext: "csv" };
      }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  }, [input, direction]);

  const downloadBlob = useMemo(() => {
    if (!conversion || !conversion.ok) return null;
    return textBlob(conversion.output, conversion.mime);
  }, [conversion]);

  const switchDirection = () => {
    if (conversion && conversion.ok) {
      setInput(conversion.output);
    }
    setDirection((d) => (d === "csv-to-json" ? "json-to-csv" : "csv-to-json"));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title={direction === "csv-to-json" ? "Source CSV" : "Source JSON"}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              legend="Direction"
              value={direction}
              onChange={(val) => setDirection(val as "csv-to-json" | "json-to-csv")}
              options={[
                { value: "csv-to-json", label: "CSV → JSON" },
                { value: "json-to-csv", label: "JSON → CSV" },
              ]}
            />
            <Button variant="ghost" size="sm" onClick={switchDirection}>
              Swap Direction
            </Button>
          </div>

          <Field label="Input data">
            {(context) => (
              <TextArea
                context={context}
                rows={13}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  direction === "csv-to-json" ? "Paste CSV spreadsheet..." : "Paste JSON array of objects..."
                }
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_CSV)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title={direction === "csv-to-json" ? "Converted JSON" : "Converted CSV"}
        actions={
          conversion && conversion.ok ? (
            <>
              <CopyButton text={conversion.output} label="Copy Output" />
              {downloadBlob && (
                <DownloadLink
                  blob={downloadBlob}
                  fileName={`converted.${conversion.ext}`}
                  label={`Download .${conversion.ext}`}
                />
              )}
            </>
          ) : null
        }
      >
        {conversion ? (
          conversion.ok ? (
            <div className="space-y-4">
              <Notice tone="success" title="Conversion Complete">
                RFC 4180 parsing with quotes and delimiter detection applied.
              </Notice>
              <OutputText value={conversion.output} rows={15} wrap="off" />
            </div>
          ) : (
            <Notice tone="danger" title="Conversion Error">
              {conversion.error}
            </Notice>
          )
        ) : (
          <EmptyState title="No content converted">
            Paste {direction === "csv-to-json" ? "CSV" : "JSON"} on the left to transform it.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
