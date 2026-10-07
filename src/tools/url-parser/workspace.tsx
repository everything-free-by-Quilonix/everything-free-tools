"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { EmptyState, Notice } from "@/components/ui/states";

const SAMPLE_URL = "https://example.com:8443/products/catalog?category=tools&filter=free&page=2#reviews";

export default function UrlParserWorkspace() {
  const [urlInput, setUrlInput] = useState(SAMPLE_URL);

  const parsed = useMemo(() => {
    if (!urlInput.trim()) return null;
    try {
      const u = new URL(urlInput.trim());
      const params: { key: string; value: string }[] = [];
      u.searchParams.forEach((value, key) => {
        params.push({ key, value });
      });
      return {
        ok: true,
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || "(default)",
        pathname: u.pathname,
        search: u.search,
        hash: u.hash || "(none)",
        origin: u.origin,
        username: u.username || "(none)",
        params,
      };
    } catch {
      return { ok: false, error: "Please enter a valid absolute URL (e.g. https://domain.com/path?key=val)." };
    }
  }, [urlInput]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Input URL or Query String">
        <div className="space-y-4">
          <Field label="URL Address" hint="Parsed locally using native browser URL and URLSearchParams APIs.">
            {(context) => (
              <TextArea
                context={context}
                rows={5}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/path?arg=value#hash"
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setUrlInput("")} disabled={!urlInput}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setUrlInput(SAMPLE_URL)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="URL Components & Parameters"
        actions={parsed && parsed.ok ? <CopyButton text={JSON.stringify(parsed, null, 2)} label="Copy JSON" /> : null}
      >
        {parsed ? (
          parsed.ok && parsed.params ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-surface-raised p-2 rounded border border-border">
                  <span className="text-fg-subtle block">PROTOCOL</span>
                  <span className="text-accent font-semibold">{parsed.protocol}</span>
                </div>
                <div className="bg-surface-raised p-2 rounded border border-border">
                  <span className="text-fg-subtle block">HOSTNAME</span>
                  <span className="text-accent font-semibold">{parsed.hostname}</span>
                </div>
                <div className="bg-surface-raised p-2 rounded border border-border">
                  <span className="text-fg-subtle block">PORT</span>
                  <span>{parsed.port}</span>
                </div>
                <div className="bg-surface-raised p-2 rounded border border-border">
                  <span className="text-fg-subtle block">ORIGIN</span>
                  <span className="truncate block">{parsed.origin}</span>
                </div>
                <div className="bg-surface-raised p-2 rounded border border-border col-span-2">
                  <span className="text-fg-subtle block">PATHNAME</span>
                  <span className="text-fg font-medium">{parsed.pathname}</span>
                </div>
                <div className="bg-surface-raised p-2 rounded border border-border col-span-2">
                  <span className="text-fg-subtle block">HASH ANCHOR</span>
                  <span className="text-fg">{parsed.hash}</span>
                </div>
              </div>

              {parsed.params.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-fg">Query Parameters ({parsed.params.length}):</span>
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-xs font-mono text-left">
                      <thead className="bg-surface-raised border-b border-border">
                        <tr>
                          <th className="p-2 text-fg">Parameter Key</th>
                          <th className="p-2 text-fg">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {parsed.params.map((p, idx) => (
                          <tr key={idx}>
                            <td className="p-2 text-accent">{p.key}</td>
                            <td className="p-2 text-fg break-all">{p.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <Notice tone="info" title="No Query Parameters">
                  This URL does not contain any query string parameters.
                </Notice>
              )}
            </div>
          ) : (
            <Notice tone="danger" title="URL Parsing Error">
              {parsed.error}
            </Notice>
          )
        ) : (
          <EmptyState title="No URL provided">
            Enter a URL on the left to inspect its protocol, host, port, path, and parameters.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
