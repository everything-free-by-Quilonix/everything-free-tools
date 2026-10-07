"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { renderMarkdown } from "@/engines/developer/markdown";
import { textBlob } from "@/lib/downloads";

const SAMPLE_MD = `# Everything.Free Tools

A clean, free, and privacy-first tools platform.

## Features
- **100% Local**: No network requests required
- **Zero Telemetry**: No tracking or analytics
- **No Account**: Instant access to all tools

### Example Code
\`\`\`javascript
function calculateSum(a, b) {
  return a + b;
}
\`\`\`

> "Simplicity is the prerequisite for reliability." — Edsger W. Dijkstra
`;

export default function MarkdownPreviewWorkspace() {
  const [markdown, setMarkdown] = useState(SAMPLE_MD);

  const html = useMemo(() => {
    if (!markdown.trim()) return "";
    return renderMarkdown(markdown);
  }, [markdown]);

  const downloadBlob = useMemo(() => {
    if (!html) return null;
    return textBlob(html, "text/html;charset=utf-8");
  }, [html]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Markdown Source">
        <div className="space-y-4">
          <Field label="Markdown Text" hideLabel>
            {(context) => (
              <TextArea
                context={context}
                rows={16}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Type Markdown text here..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMarkdown("")} disabled={!markdown}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMarkdown(SAMPLE_MD)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Rendered Preview"
        actions={
          html ? (
            <>
              <CopyButton text={html} label="Copy HTML" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="document.html" label="Download HTML" />}
            </>
          ) : null
        }
      >
        {html ? (
          <div
            className="prose prose-invert max-w-none rounded border border-border bg-surface-raised p-4 text-xs leading-relaxed overflow-y-auto max-h-[460px]"
            // eslint-disable-next-line react/no-danger -- sanitized by native markdown engine
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <EmptyState title="No markdown entered">
            Write or paste Markdown on the left to see the rendered HTML preview with safe XSS protection.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
