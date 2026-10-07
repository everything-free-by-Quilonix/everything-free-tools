"use client";

import { useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { Panel } from "@/components/tool/panel";
import { DownloadLink } from "@/components/ui/actions";
import { Announcer } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextInput } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice, ProgressBar } from "@/components/ui/states";
import { fixedSizeRanges, PageRangeError, parsePageRanges, rangeLabel, type PageRange } from "@/engines/pdf/ranges";
import { ToolError } from "@/lib/errors";
import { baseName, formatBytes, safeFileName } from "@/lib/files";
import { loadPdfEngine, PDF_ACCEPT, pdfBlob, readBytes, takePdfs } from "@/tools/pdf-shared";
import { useTask } from "@/tools/use-task";

type Mode = "extract" | "ranges" | "every";

const modeLabels: Record<Mode, string> = {
  extract: "Extract pages",
  ranges: "Split by ranges",
  every: "Split every N pages",
};

interface Part {
  label: string;
  fileName: string;
  blob: Blob;
  pages: number;
}

export default function PdfSplitWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("extract");
  const [selection, setSelection] = useState("");
  const [every, setEvery] = useState("1");
  const task = useTask<Part[]>();

  const choose = async (files: File[]) => {
    const { pdfs, rejected } = takePdfs(files);
    task.reset();
    setPages(null);
    setFile(pdfs[0] ?? null);
    setProblem(rejected);
    if (!pdfs[0]) return;
    try {
      const engine = await loadPdfEngine();
      setPages(await engine.pageCount({ name: pdfs[0].name, bytes: await readBytes(pdfs[0]) }));
    } catch (error) {
      setFile(null);
      setProblem(error instanceof Error ? error.message : "This PDF couldn't be read.");
    }
  };

  // Validated as the person types, so mistakes show before anything runs.
  let ranges: PageRange[] | null = null;
  let rangeError: string | null = null;
  if (pages !== null) {
    try {
      if (mode === "every") {
        const size = Number(every);
        if (!Number.isInteger(size) || size < 1) throw new PageRangeError("Enter a whole number of pages, 1 or more.");
        ranges = fixedSizeRanges(pages, size);
      } else if (selection.trim()) ranges = parsePageRanges(selection, pages);
    } catch (error) {
      rangeError = error instanceof Error ? error.message : String(error);
    }
  }

  const run = () => {
    if (!file || !ranges) return;
    const chosen = ranges;
    const stem = baseName(file.name) || "document";
    void task.run(async ({ signal, onProgress }) => {
      const engine = await loadPdfEngine();
      const source = { name: file.name, bytes: await readBytes(file) };
      onProgress(0.3, "Copying pages…");
      if (mode === "extract") {
        const bytes = await engine.extractPages(source, chosen);
        const count = await engine.pageCount({ name: "out.pdf", bytes });
        const label = chosen.map(rangeLabel).join(",");
        return [
          {
            label: `Pages ${label}`,
            fileName: safeFileName(`${stem}-pages-${label}.pdf`, "pages.pdf"),
            blob: pdfBlob(bytes),
            pages: count,
          },
        ];
      }
      if (chosen.length > 500) throw new ToolError("That would make more than 500 files. Choose larger parts.");
      const parts = await engine.splitPdf(source, chosen, signal);
      return parts.map(({ range, bytes }) => ({
        label: `Pages ${rangeLabel(range)}`,
        fileName: safeFileName(`${stem}-${rangeLabel(range)}.pdf`, "part.pdf"),
        blob: pdfBlob(bytes),
        pages: Math.abs(range.end - range.start) + 1,
      }));
    });
  };

  const state = task.state;
  const result = state.status === "done" ? state.output : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Announcer
        message={
          result
            ? `${result.length} ${result.length === 1 ? "PDF is" : "PDFs are"} ready to download.`
            : pages !== null
              ? `${pages} pages.`
              : ""
        }
      />
      <Panel title="Your PDF">
        <div className="space-y-4">
          <FileDropzone
            accept={PDF_ACCEPT}
            onFiles={(files) => void choose(files)}
            label={file ? "Choose a different PDF" : "Choose a PDF"}
            hint="Never uploaded."
          />
          {problem ? (
            <Notice tone="warning" role="alert">
              {problem}
            </Notice>
          ) : null}
          {file && pages !== null ? (
            <>
              <p className="text-sm text-fg">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-fg-muted">
                  · {pages} {pages === 1 ? "page" : "pages"} · {formatBytes(file.size)}
                </span>
              </p>
              <Segmented
                legend="What to do"
                value={mode}
                onChange={(value) => {
                  setMode(value);
                  task.reset();
                }}
                options={(Object.keys(modeLabels) as Mode[]).map((value) => ({ value, label: modeLabels[value] }))}
              />
              {mode === "every" ? (
                <Field label="Pages per file" error={rangeError}>
                  {(context) => (
                    <TextInput
                      context={context}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={pages}
                      value={every}
                      onChange={(event) => setEvery(event.target.value)}
                    />
                  )}
                </Field>
              ) : (
                <Field
                  label="Pages"
                  hint={
                    mode === "extract"
                      ? "For example 1-3, 5, 8-. The new PDF keeps the order you type."
                      : "Each range becomes its own PDF. For example 1-3, 4-6, 7-."
                  }
                  error={rangeError}
                >
                  {(context) => (
                    <TextInput
                      context={context}
                      value={selection}
                      placeholder={mode === "extract" ? "1-3, 5" : "1-3, 4-6, 7-"}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => setSelection(event.target.value)}
                    />
                  )}
                </Field>
              )}
              <Button onClick={run} disabled={!ranges || state.status === "running"}>
                {mode === "extract"
                  ? "Extract pages"
                  : `Split into ${ranges?.length ?? "…"} ${ranges?.length === 1 ? "file" : "files"}`}
              </Button>
            </>
          ) : null}
        </div>
      </Panel>

      <Panel title="Result">
        {state.status === "idle" ? (
          <EmptyState icon="file-text" title="Nothing yet">
            Choose a PDF, say which pages you want, and download the result. Pages are copied as they are, without
            re-rendering.
          </EmptyState>
        ) : null}
        {state.status === "running" ? <ProgressBar value={state.progress} label={state.label ?? "Working…"} /> : null}
        {state.status === "error" ? <ErrorState error={state.error} /> : null}
        {result ? (
          <div className="space-y-3">
            <Notice tone="success" title={result.length === 1 ? "Ready" : `${result.length} files ready`}>
              Each one downloads separately.
            </Notice>
            <ul className="divide-y divide-border rounded-(--radius) border border-border">
              {result.map((part, index) => (
                <li
                  key={`${index}-${part.fileName}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <span className="min-w-0 text-sm">
                    <span className="block truncate text-fg">{part.fileName}</span>
                    <span className="text-xs text-fg-muted">
                      {part.pages} {part.pages === 1 ? "page" : "pages"} · {formatBytes(part.blob.size)}
                    </span>
                  </span>
                  <DownloadLink
                    blob={part.blob}
                    fileName={part.fileName}
                    label={result.length === 1 ? "Download PDF" : `Download ${part.label.toLowerCase()}`}
                    variant={result.length === 1 ? "primary" : "secondary"}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
