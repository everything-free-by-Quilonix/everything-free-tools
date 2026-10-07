"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { evaluateJsonPath } from "@/engines/data/jsonpath";
import { MIME, textBlob } from "@/lib/downloads";

const SAMPLE_JSON = `{
  "store": {
    "book": [
      { "category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95 },
      { "category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99 },
      { "category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "isbn": "0-553-21311-3", "price": 8.99 }
    ],
    "bicycle": {
      "color": "red",
      "price": 19.95
    }
  }
}`;

export default function JsonPathWorkspace() {
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [path, setPath] = useState("$.store.book[*].title");

  const evaluation = useMemo(() => {
    if (!jsonText.trim() || !path.trim()) return null;
    try {
      const parsed = JSON.parse(jsonText);
      return evaluateJsonPath(parsed, path);
    } catch (e) {
      return {
        success: false,
        matches: [],
        count: 0,
        error: e instanceof Error ? `Invalid JSON: ${e.message}` : "Invalid JSON input",
      };
    }
  }, [jsonText, path]);

  const outputString = useMemo(() => {
    if (!evaluation || !evaluation.success) return "";
    return JSON.stringify(
      evaluation.matches.map((m) => m.value),
      null,
      2,
    );
  }, [evaluation]);

  const downloadBlob = useMemo(() => {
    if (!outputString) return null;
    return textBlob(outputString, MIME.json);
  }, [outputString]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="JSON & Expression">
        <div className="space-y-4">
          <Field label="JSONPath Expression" hint="e.g. $.store.book[*].title, $..price, or $[0:2]">
            {(context) => (
              <TextInput
                context={context}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="$.store.book[*].title"
                className="font-mono text-sm"
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-fg-muted">Quick examples:</span>
            <button
              type="button"
              className="text-accent underline hover:opacity-80"
              onClick={() => setPath("$.store.book[*].title")}
            >
              All titles
            </button>
            <button
              type="button"
              className="text-accent underline hover:opacity-80"
              onClick={() => setPath("$..price")}
            >
              All prices (deep)
            </button>
            <button
              type="button"
              className="text-accent underline hover:opacity-80"
              onClick={() => setPath("$.store.book[0]")}
            >
              First book
            </button>
          </div>

          <Field label="JSON Document">
            {(context) => (
              <TextArea
                context={context}
                rows={12}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Paste JSON document here..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setJsonText("")} disabled={!jsonText}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setJsonText(SAMPLE_JSON)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Matching Results"
        actions={
          outputString ? (
            <>
              <CopyButton text={outputString} label="Copy Results" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="jsonpath-result.json" label="Download" />}
            </>
          ) : null
        }
      >
        {evaluation ? (
          evaluation.success ? (
            <div className="space-y-4">
              <Notice tone="success" title={`${evaluation.count} match(es) found`}>
                Expression evaluated successfully across the JSON structure.
              </Notice>
              <OutputText value={outputString} rows={14} wrap="off" />
            </div>
          ) : (
            <Notice tone="danger" title="Evaluation Error">
              {evaluation.error}
            </Notice>
          )
        ) : (
          <EmptyState title="No JSONPath evaluated">
            Enter a JSON document and JSONPath expression on the left to see matching nodes.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
