"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Notice } from "@/components/ui/states";

const SAMPLE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 24px;
      background: #0f172a;
      color: #f8fafc;
    }
    .card {
      background: #1e293b;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #334155;
      max-width: 420px;
    }
    h2 { margin-top: 0; color: #38bdf8; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
    .badge {
      display: inline-block;
      background: #0369a1;
      color: #e0f2fe;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Sandboxed Preview</span>
    <h2>Everything.Free</h2>
    <p>This markup renders in an isolated iframe. It cannot access application storage, parent window properties, or cookies.</p>
  </div>
</body>
</html>`;

export default function HtmlPreviewWorkspace() {
  const [markup, setMarkup] = useState(SAMPLE_PAGE);

  const doc = useMemo(() => {
    return markup;
  }, [markup]);

  return (
    <div className="space-y-6">
      <Notice tone="info" title="Isolated Sandbox Security">
        Markup runs inside a sandboxed iframe without <code>allow-same-origin</code>. It cannot access cookies, local
        browser storage, or parent window properties.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="HTML / CSS / JS Editor">
          <div className="space-y-4">
            <Field label="Markup" hideLabel>
              {(context) => (
                <TextArea
                  context={context}
                  rows={16}
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  placeholder="<!DOCTYPE html><html>..."
                  className="font-mono text-xs"
                />
              )}
            </Field>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMarkup("")} disabled={!markup}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMarkup(SAMPLE_PAGE)}>
                Reset Sample
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Live Isolated Preview">
          <div className="overflow-hidden rounded border border-border bg-white min-h-[360px] h-[400px]">
            <iframe
              title="Sandboxed HTML Preview"
              srcDoc={doc}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
