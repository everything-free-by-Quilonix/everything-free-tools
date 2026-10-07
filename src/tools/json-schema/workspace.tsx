"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { generateJsonSchema } from "@/engines/data/json-schema";
import { MIME, textBlob } from "@/lib/downloads";

const SAMPLE = `{
  "id": 101,
  "name": "Acme Widget",
  "inStock": true,
  "tags": ["hardware", "tools"],
  "dimensions": {
    "length": 12.5,
    "width": 8.0,
    "height": 4.2
  },
  "supplier": null
}`;

export default function JsonSchemaWorkspace() {
  const [inputJson, setInputJson] = useState(SAMPLE);
  const [title, setTitle] = useState("GeneratedSchema");

  const schemaResult = useMemo(() => {
    if (!inputJson.trim()) return null;
    try {
      const parsed = JSON.parse(inputJson);
      const schema = generateJsonSchema(parsed, { schemaTitle: title });
      return { ok: true as const, schema };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Invalid JSON input",
      };
    }
  }, [inputJson, title]);

  const outputString = useMemo(() => {
    if (!schemaResult || !schemaResult.ok) return "";
    return JSON.stringify(schemaResult.schema, null, 2);
  }, [schemaResult]);

  const downloadBlob = useMemo(() => {
    if (!outputString) return null;
    return textBlob(outputString, MIME.json);
  }, [outputString]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Sample JSON">
        <div className="space-y-4">
          <Field label="Schema Title">
            {(context) => (
              <TextInput
                context={context}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Model title (e.g. User, Product)"
              />
            )}
          </Field>

          <Field label="Input JSON Document" hint="Paste any valid JSON object or array to infer its schema.">
            {(context) => (
              <TextArea
                context={context}
                rows={13}
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder="Paste JSON document here..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setInputJson("")} disabled={!inputJson}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInputJson(SAMPLE)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Draft-07 JSON Schema"
        actions={
          outputString ? (
            <>
              <CopyButton text={outputString} label="Copy Schema" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="schema.json" label="Download Schema" />}
            </>
          ) : null
        }
      >
        {schemaResult ? (
          schemaResult.ok ? (
            <div className="space-y-4">
              <Notice tone="success" title="Schema Generated">
                Inferred object properties, types, nested arrays, and required fields.
              </Notice>
              <OutputText value={outputString} rows={15} wrap="off" />
            </div>
          ) : (
            <Notice tone="danger" title="JSON Parse Error">
              {schemaResult.error}
            </Notice>
          )
        ) : (
          <EmptyState title="No schema generated">
            Paste a sample JSON document on the left to infer a typed Draft-07 JSON Schema.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
