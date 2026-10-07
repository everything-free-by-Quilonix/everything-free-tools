"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { jsonToYaml, yamlToJson } from "@/engines/data/yaml";
import { MIME, textBlob } from "@/lib/downloads";

const SAMPLE_YAML = `server:
  host: localhost
  port: 8080
  debug: true
database:
  name: app_production
  pool: 10
  tags:
    - primary
    - read-write
`;

export default function JsonYamlWorkspace() {
  const [direction, setDirection] = useState<"yaml-to-json" | "json-to-yaml">("yaml-to-json");
  const [input, setInput] = useState(SAMPLE_YAML);

  const conversion = useMemo(() => {
    if (!input.trim()) return null;
    try {
      if (direction === "yaml-to-json") {
        const json = yamlToJson(input, 2);
        return { ok: true as const, output: json, mime: MIME.json, ext: "json" };
      } else {
        const yaml = jsonToYaml(input, 2);
        return { ok: true as const, output: yaml, mime: "text/yaml;charset=utf-8", ext: "yaml" };
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
    setDirection((d) => (d === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json"));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title={direction === "yaml-to-json" ? "Source YAML" : "Source JSON"}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              legend="Direction"
              value={direction}
              onChange={(val) => setDirection(val as "yaml-to-json" | "json-to-yaml")}
              options={[
                { value: "yaml-to-json", label: "YAML → JSON" },
                { value: "json-to-yaml", label: "JSON → YAML" },
              ]}
            />
            <Button variant="ghost" size="sm" onClick={switchDirection}>
              Swap Direction
            </Button>
          </div>

          <Field label="Input document">
            {(context) => (
              <TextArea
                context={context}
                rows={13}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={direction === "yaml-to-json" ? "Paste YAML here..." : "Paste JSON here..."}
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_YAML)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title={direction === "yaml-to-json" ? "Converted JSON" : "Converted YAML"}
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
              <Notice tone="success" title="Conversion Successful">
                Converted cleanly without sending any data over the network.
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
            Paste {direction === "yaml-to-json" ? "YAML" : "JSON"} on the left to transform it.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
