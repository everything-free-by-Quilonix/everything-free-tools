"use client";

import { useMemo, useRef, useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Announcer } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Segmented, TextArea } from "@/components/ui/field";
import { focusSoon } from "@/components/ui/focus";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { decodeToResult, encodeBytes, encodeText, sniffType } from "@/engines/data/base64";
import { MIME, textBlob } from "@/lib/downloads";
import { toUserError, type UserError } from "@/lib/errors";
import { formatBytes } from "@/lib/files";

type Direction = "encode" | "decode";
type Source = "text" | "file";

type Result =
  | { kind: "encoded"; text: string; from: string }
  | { kind: "text"; text: string; bytes: number }
  | { kind: "binary"; blob: Blob; fileName: string; bytes: number; mime: string };

export default function Base64Workspace() {
  const [direction, setDirection] = useState<Direction>("encode");
  const [source, setSource] = useState<Source>("text");
  const [input, setInput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [padding, setPadding] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<UserError | null>(null);
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState(0);
  // Every change to the result panel takes a ticket. A slow file read that finishes
  // after a newer conversion (or a Clear) sees a newer ticket and is dropped.
  const ticket = useRef(0);
  const area = useRef<HTMLTextAreaElement>(null);

  const options = { urlSafe, padding: urlSafe ? padding : true };

  const show = (next: Result | null, problem: UserError | null = null) => {
    ticket.current += 1;
    setBusy(false);
    setResult(next);
    setError(problem);
    if (next) setRuns((count) => count + 1);
  };

  const runText = () => {
    try {
      if (direction === "encode") {
        show({ kind: "encoded", text: encodeText(input, options), from: "text" });
      } else {
        const decoded = decodeToResult(input);
        if (decoded.kind === "text") show({ kind: "text", text: decoded.text, bytes: decoded.bytes.length });
        else {
          const type = sniffType(decoded.bytes);
          show({
            kind: "binary",
            blob: new Blob([decoded.bytes as Uint8Array<ArrayBuffer>], { type: type.mime }),
            fileName: `decoded.${type.extension}`,
            bytes: decoded.bytes.length,
            mime: type.mime,
          });
        }
      }
    } catch (caught) {
      show(null, toUserError(caught));
    }
  };

  const encodeFile = async (file: File) => {
    show(null);
    const mine = ticket.current;
    setBusy(true);
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch (caught) {
      if (mine === ticket.current) show(null, toUserError(caught, "We couldn't read this file."));
      return;
    }
    // Superseded by a newer action, which now owns the result panel.
    if (mine !== ticket.current) return;
    show({ kind: "encoded", text: encodeBytes(bytes, options), from: `${file.name} (${formatBytes(file.size)})` });
  };

  const switchDirection = (next: Direction) => {
    setDirection(next);
    if (next === "decode") setSource("text");
    show(null);
  };

  const outputText = result && result.kind !== "binary" ? result.text : "";
  // Memoised: a new Blob every render would mint a new object URL every render.
  const outputBlob = useMemo(() => (outputText ? textBlob(outputText, MIME.text) : null), [outputText]);

  const summary = !result
    ? ""
    : result.kind === "encoded"
      ? `Encoded ${result.from} to ${result.text.length.toLocaleString("en")} Base64 characters.`
      : result.kind === "text"
        ? `Decoded ${formatBytes(result.bytes)} of UTF-8 text.`
        : `This decodes to a file of ${formatBytes(result.bytes)}. A download link is in the result.`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* The run number makes repeating the same conversion announce again. */}
      <Announcer message={summary ? `${summary} (${runs})` : ""} />
      <Panel title="Input">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Segmented
              legend="Direction"
              value={direction}
              onChange={switchDirection}
              options={[
                { value: "encode", label: "Encode" },
                { value: "decode", label: "Decode" },
              ]}
            />
            {direction === "encode" ? (
              <Segmented
                legend="Source"
                value={source}
                onChange={(next) => {
                  setSource(next);
                  show(null);
                }}
                options={[
                  { value: "text", label: "Text" },
                  { value: "file", label: "File" },
                ]}
              />
            ) : null}
          </div>

          {direction === "encode" ? (
            <div className="space-y-2">
              <Checkbox
                label="URL-safe alphabet"
                description="Uses - and _ instead of + and /, for links and file names."
                checked={urlSafe}
                onChange={(event) => setUrlSafe(event.target.checked)}
              />
              {urlSafe ? (
                <Checkbox
                  label="Keep = padding"
                  checked={padding}
                  onChange={(event) => setPadding(event.target.checked)}
                />
              ) : null}
            </div>
          ) : null}

          {source === "file" && direction === "encode" ? (
            <FileDropzone
              accept={[]}
              label="Choose a file to encode"
              hint="Any type. The file is read in this page."
              onFiles={(files) => files[0] && encodeFile(files[0])}
              disabled={busy}
            />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                runText();
              }}
            >
              <Field
                label={direction === "encode" ? "Text to encode" : "Base64 to decode"}
                hint={
                  direction === "decode"
                    ? "Standard or URL-safe, with or without padding. Spaces and line breaks are ignored."
                    : "Any text, including emoji and non-Latin scripts (encoded as UTF-8)."
                }
              >
                {(context) => (
                  <TextArea
                    ref={area}
                    context={context}
                    rows={10}
                    value={input}
                    spellCheck={false}
                    className={direction === "decode" ? "font-mono" : undefined}
                    onChange={(event) => setInput(event.target.value)}
                  />
                )}
              </Field>
              <div className="flex gap-2">
                <Button type="submit" disabled={input.length === 0}>
                  {direction === "encode" ? "Encode" : "Decode"}
                </Button>
                {input ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setInput("");
                      show(null);
                      // This button disappears with the text; keep focus in the tool.
                      focusSoon(area);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </Panel>

      <Panel
        title="Result"
        actions={
          result && result.kind !== "binary" ? (
            <>
              <CopyButton text={outputText} />
              <DownloadLink
                blob={outputBlob}
                fileName={result.kind === "encoded" ? "encoded.b64.txt" : "decoded.txt"}
                label="Download"
                variant="secondary"
              />
            </>
          ) : null
        }
      >
        {error ? <ErrorState error={error} /> : null}
        {!error && !result ? (
          <EmptyState icon="code" title={busy ? "Reading the file…" : "Nothing yet"}>
            {direction === "encode"
              ? "The Base64 text will appear here."
              : "The decoded text or file will appear here."}
          </EmptyState>
        ) : null}

        {result?.kind === "encoded" || result?.kind === "text" ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">{summary}</p>
            <OutputText value={result.text} rows={10} className="break-all" />
          </div>
        ) : null}

        {result?.kind === "binary" ? (
          <div className="space-y-3">
            <Notice tone="info" title="This decodes to a file, not text">
              {formatBytes(result.bytes)}
              {result.mime !== "application/octet-stream" ? `, which looks like ${result.mime}` : ""}. Download it to
              open it.
            </Notice>
            <DownloadLink blob={result.blob} fileName={result.fileName} label={`Download ${result.fileName}`} />
          </div>
        ) : null}

        <p className="mt-4 text-xs text-fg-subtle">
          Base64 is an encoding, not encryption. Anyone can decode it, so it doesn&rsquo;t hide or protect anything.
        </p>
      </Panel>
    </div>
  );
}
