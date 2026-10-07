"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { jsonToXml, xmlToJson } from "@/engines/data/xml";
import { MIME, textBlob } from "@/lib/downloads";

const SAMPLE_XML = `<note>
  <to>Tove</to>
  <from>Jani</from>
  <heading>Reminder</heading>
  <body>Don't forget me this weekend!</body>
</note>`;

export default function XmlJsonWorkspace() {
  const [direction, setDirection] = useState<"xml-to-json" | "json-to-xml">("xml-to-json");
  const [input, setInput] = useState(SAMPLE_XML);

  const conversion = useMemo(() => {
    if (!input.trim()) return null;
    try {
      if (direction === "xml-to-json") {
        const obj = xmlToJson(input);
        const json = JSON.stringify(obj, null, 2);
        return { ok: true, output: json, mime: MIME.json, ext: "json" };
      } else {
        const parsed = JSON.parse(input);
        const xml = jsonToXml(parsed, "root", 2);
        return { ok: true, output: xml, mime: "text/xml;charset=utf-8", ext: "xml" };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [input, direction]);

  const downloadBlob = useMemo(() => {
    if (!conversion || !conversion.ok || !conversion.output) return null;
    return textBlob(conversion.output, conversion.mime);
  }, [conversion]);

  const switchDirection = () => {
    if (conversion && conversion.ok && conversion.output) {
      setInput(conversion.output);
    }
    setDirection((d) => (d === "xml-to-json" ? "json-to-xml" : "xml-to-json"));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title={direction === "xml-to-json" ? "Source XML" : "Source JSON"}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              legend="Direction"
              value={direction}
              onChange={(val) => setDirection(val as "xml-to-json" | "json-to-xml")}
              options={[
                { value: "xml-to-json", label: "XML → JSON" },
                { value: "json-to-xml", label: "JSON → XML" },
              ]}
            />
            <Button variant="ghost" size="sm" onClick={switchDirection}>
              Swap Direction
            </Button>
          </div>

          <Field label="Input Document">
            {(context) => (
              <TextArea
                context={context}
                rows={13}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={direction === "xml-to-json" ? "Paste XML here..." : "Paste JSON here..."}
                className="font-mono text-xs"
              />
            )}
          </Field>

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
        title={direction === "xml-to-json" ? "Converted JSON" : "Converted XML"}
        actions={
          conversion && conversion.ok && conversion.output ? (
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
          conversion.ok && conversion.output ? (
            <div className="space-y-4">
              <Notice tone="success" title="Conversion Complete">
                Structured conversion executed locally.
              </Notice>
              <OutputText value={conversion.output} rows={15} wrap="off" />
            </div>
          ) : (
            <Notice tone="danger" title="Conversion Error">
              {conversion.error ?? "Unknown error"}
            </Notice>
          )
        ) : (
          <EmptyState title="No document converted">
            Paste {direction === "xml-to-json" ? "XML" : "JSON"} on the left to transform it.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
