"use client";

import { useEffect, useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, controlClasses, Segmented } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { computeHash, computeTextHash, type HashAlgorithm } from "@/engines/crypto/hash";
import { formatBytes } from "@/lib/files";

type InputType = "text" | "file";

const ALGORITHMS: HashAlgorithm[] = ["SHA-256", "SHA-512", "SHA-1", "MD5"];

export default function HashGeneratorWorkspace() {
  const [inputType, setInputType] = useState<InputType>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uppercase, setUppercase] = useState(false);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (inputType === "text") {
        if (!text) {
          setHashes({});
          return;
        }
        setBusy(true);
        const result: Record<string, string> = {};
        for (const algo of ALGORITHMS) {
          result[algo] = await computeTextHash(text, algo);
        }
        if (!cancelled) {
          setHashes(result);
          setBusy(false);
        }
      } else if (inputType === "file" && file) {
        setBusy(true);
        try {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const result: Record<string, string> = {};
          for (const algo of ALGORITHMS) {
            result[algo] = await computeHash(bytes, algo);
          }
          if (!cancelled) {
            setHashes(result);
            setBusy(false);
          }
        } catch {
          if (!cancelled) setBusy(false);
        }
      } else {
        setHashes({});
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [text, file, inputType]);

  const hasResults = Object.keys(hashes).length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Input">
        <div className="space-y-4">
          <Segmented
            legend="Input Type"
            value={inputType}
            onChange={(val) => {
              setInputType(val as InputType);
              setHashes({});
            }}
            options={[
              { value: "text", label: "Text" },
              { value: "file", label: "File" },
            ]}
          />

          {inputType === "text" ? (
            <div>
              <label className="text-sm font-medium text-fg block mb-1.5">Text to Hash</label>
              <textarea
                className={controlClasses}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text to compute hashes..."
                rows={8}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <FileDropzone
                accept={["*/*"]}
                onFiles={(files: File[]) => {
                  if (files[0]) setFile(files[0]);
                }}
                label="Choose a file or drop it here"
                hint="Computed entirely in local memory. Never uploaded."
              />
              {file && (
                <div className="rounded border border-border-strong p-3 text-xs flex justify-between items-center bg-surface-raised">
                  <span className="font-medium text-fg truncate">{file.name}</span>
                  <span className="text-fg-muted ml-2">{formatBytes(file.size)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Checkbox
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              label="Uppercase hexadecimal"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setText("");
                setFile(null);
                setHashes({});
              }}
              disabled={!text && !file}
            >
              Clear
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Calculated Hashes">
        {busy ? (
          <div className="flex h-48 items-center justify-center text-sm text-fg-muted">
            Computing cryptographic hashes...
          </div>
        ) : hasResults ? (
          <div className="space-y-4">
            {ALGORITHMS.map((algo) => {
              const raw = hashes[algo] || "";
              const formatted = uppercase ? raw.toUpperCase() : raw.toLowerCase();
              return (
                <div key={algo} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    <span>{algo}</span>
                    <CopyButton text={formatted} label="Copy" />
                  </div>
                  <div className="rounded border border-border-strong bg-surface-raised p-2.5 font-mono text-xs text-fg break-all select-all">
                    {formatted}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Awaiting Input">
            Provide text or choose a file on the left to compute SHA-256, SHA-512, SHA-1, and MD5 hashes.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
