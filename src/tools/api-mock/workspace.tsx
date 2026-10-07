"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea, TextInput } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { generateApiSnippets, type ApiMockConfig } from "@/engines/developer/api-mock";

const SAMPLE_BODY = `{
  "userId": 42,
  "name": "Jane Developer",
  "status": "active"
}`;

export default function ApiMockWorkspace() {
  const [url, setUrl] = useState("https://api.example.com/v1/users");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("POST");
  const [headers] = useState("Content-Type: application/json\nAuthorization: Bearer mock_token_123");
  const [body, setBody] = useState(SAMPLE_BODY);
  const [activeTab, setActiveTab] = useState<"curl" | "fetch" | "python" | "typescript">("curl");

  const config: ApiMockConfig = useMemo(() => {
    const headerObj: Record<string, string> = {};
    headers.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx !== -1) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) headerObj[k] = v;
      }
    });
    return {
      endpoint: url,
      method,
      headers: headerObj,
      requestBody: method !== "GET" ? body : undefined,
      responseStatus: 200,
    };
  }, [url, method, headers, body]);

  const snippets = useMemo(() => {
    return generateApiSnippets(config);
  }, [config]);

  const currentSnippet =
    activeTab === "curl"
      ? snippets.curl
      : activeTab === "fetch"
        ? snippets.javascript
        : activeTab === "python"
          ? snippets.python
          : snippets.typescriptInterface;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Mock API Request Setup">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <Field label="Method">
                {(context) => (
                  <select
                    id={context.id}
                    value={method}
                    onChange={(e) => setMethod(e.target.value as "GET" | "POST" | "PUT" | "DELETE")}
                    className="w-full rounded border border-border bg-bg px-2.5 py-2 text-xs font-mono font-bold text-accent"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                )}
              </Field>
            </div>
            <div className="col-span-3">
              <Field label="Endpoint URL">
                {(context) => (
                  <TextInput
                    context={context}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/..."
                    className="font-mono text-xs"
                  />
                )}
              </Field>
            </div>
          </div>

          {method !== "GET" && (
            <Field label="Sample JSON Payload">
              {(context) => (
                <TextArea
                  context={context}
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Paste request body..."
                  className="font-mono text-xs"
                />
              )}
            </Field>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setUrl("https://api.example.com/v1/resource");
                setBody("{}");
              }}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUrl("https://api.example.com/v1/users");
                setMethod("POST");
                setBody(SAMPLE_BODY);
              }}
            >
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Generated Client Snippet" actions={<CopyButton text={currentSnippet} label="Copy Snippet" />}>
        <div className="space-y-4">
          <Segmented
            legend="Language"
            value={activeTab}
            onChange={(val) => setActiveTab(val as "curl" | "fetch" | "python" | "typescript")}
            options={[
              { value: "curl", label: "cURL" },
              { value: "fetch", label: "Fetch JS" },
              { value: "python", label: "Python" },
              { value: "typescript", label: "TypeScript" },
            ]}
          />

          <OutputText value={currentSnippet} rows={14} wrap="off" />
        </div>
      </Panel>
    </div>
  );
}
