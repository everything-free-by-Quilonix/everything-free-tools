"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, controlClasses, Segmented } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState } from "@/components/ui/states";
import { decodeUrl, encodeUrl, parseUrl } from "@/engines/data/url";
import { MIME, textBlob } from "@/lib/downloads";

type Mode = "encode" | "decode" | "parse";

export default function UrlEncoderWorkspace() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [spaceAsPlus, setSpaceAsPlus] = useState(false);
  const [encodeFull, setEncodeFull] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    if (mode === "encode") {
      return encodeUrl(input, { mode: encodeFull ? "full" : "component", spaceAsPlus });
    } else if (mode === "decode") {
      return decodeUrl(input, true);
    }
    return null;
  }, [input, mode, spaceAsPlus, encodeFull]);

  const parsedUrl = useMemo(() => {
    if (mode !== "parse" || !input.trim()) return null;
    return parseUrl(input);
  }, [input, mode]);

  const downloadBlob = useMemo(() => {
    if (!result) return null;
    return textBlob(result, MIME.text);
  }, [result]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Input">
        <div className="space-y-4">
          <Segmented
            legend="Action"
            value={mode}
            onChange={(val) => setMode(val as Mode)}
            options={[
              { value: "encode", label: "Encode" },
              { value: "decode", label: "Decode" },
              { value: "parse", label: "Parse URL" },
            ]}
          />

          <div>
            <label className="text-sm font-medium text-fg block mb-1.5">
              {mode === "parse" ? "Enter full URL to parse" : "Text or URL"}
            </label>
            <textarea
              className={controlClasses}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "parse" ? "https://example.com/search?q=test&page=1#results" : "Enter or paste text here..."
              }
              rows={8}
            />
          </div>

          {mode === "encode" && (
            <div className="flex flex-col gap-2 pt-1">
              <Checkbox
                checked={spaceAsPlus}
                onChange={(e) => setSpaceAsPlus(e.target.checked)}
                label="Encode spaces as '+' instead of '%20'"
              />
              <Checkbox
                checked={encodeFull}
                onChange={(e) => setEncodeFull(e.target.checked)}
                label="Preserve URI structure (encodeURI mode)"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInput("");
              }}
              disabled={!input}
            >
              Clear
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Result">
        {mode === "parse" ? (
          parsedUrl ? (
            <div className="space-y-4">
              <div className="rounded border border-border-strong p-3 space-y-2 text-sm bg-surface-raised">
                <div>
                  <span className="font-semibold text-fg-muted">Protocol:</span> {parsedUrl.protocol}
                </div>
                <div>
                  <span className="font-semibold text-fg-muted">Host:</span> {parsedUrl.host}
                </div>
                <div>
                  <span className="font-semibold text-fg-muted">Path:</span> {parsedUrl.pathname}
                </div>
                {parsedUrl.hash && (
                  <div>
                    <span className="font-semibold text-fg-muted">Hash:</span> {parsedUrl.hash}
                  </div>
                )}
              </div>

              {parsedUrl.params.length > 0 ? (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Query Parameters ({parsedUrl.params.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto rounded border border-border-strong divide-y divide-border-strong">
                    {parsedUrl.params.map(([key, val], idx) => (
                      <div key={idx} className="flex justify-between p-2 text-xs font-mono">
                        <span className="font-semibold text-fg">{key}:</span>
                        <span className="text-fg-muted break-all pl-2">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-fg-muted">No query parameters found in URL.</p>
              )}
            </div>
          ) : (
            <EmptyState title="Awaiting URL">
              Enter a valid URL on the left to inspect its protocol, host, path, and query parameters.
            </EmptyState>
          )
        ) : result ? (
          <div className="space-y-4">
            <OutputText value={result} />
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={result} label="Copy Result" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="url-result.txt" label="Download" />}
            </div>
          </div>
        ) : (
          <EmptyState title="Awaiting Input">
            Enter text or a URL on the left to see the encoded or decoded result here.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
