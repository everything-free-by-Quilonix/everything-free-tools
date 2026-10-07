"use client";

import { useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { fileId, OrderedFileList, type OrderedFile } from "@/components/tool/ordered-file-list";
import { Panel } from "@/components/tool/panel";
import { DownloadLink } from "@/components/ui/actions";
import { Announcer } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice, ProgressBar } from "@/components/ui/states";
import { formatBytes, safeFileName } from "@/lib/files";
import { loadPdfEngine, PDF_ACCEPT, pdfBlob, readBytes, takePdfs } from "@/tools/pdf-shared";
import { useTask } from "@/tools/use-task";

interface Merged {
  blob: Blob;
  pages: number;
  files: number;
}

export default function PdfMergeWorkspace() {
  const [items, setItems] = useState<OrderedFile[]>([]);
  const [skipped, setSkipped] = useState<string | null>(null);
  const [name, setName] = useState("merged");
  const task = useTask<Merged>();

  const add = async (files: File[]) => {
    const { pdfs, rejected } = takePdfs(files);
    setSkipped(rejected);
    task.reset();
    const added = pdfs.map((file) => ({ id: fileId(), file, detail: "reading…" }) satisfies OrderedFile);
    setItems((current) => [...current, ...added]);
    // Page counts are shown so people can check they picked the right files.
    const engine = await loadPdfEngine();
    for (const item of added) {
      let detail: string;
      try {
        const pages = await engine.pageCount({ name: item.file.name, bytes: await readBytes(item.file) });
        detail = `${pages} ${pages === 1 ? "page" : "pages"}`;
      } catch (error) {
        detail = error instanceof Error && /password/.test(error.message) ? "password-protected" : "not readable";
      }
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, detail } : entry)));
    }
  };

  const merge = () =>
    void task.run(async ({ signal, onProgress }) => {
      const engine = await loadPdfEngine();
      onProgress(0.1, "Reading files…");
      const sources = await Promise.all(
        items.map(async (item) => ({ name: item.file.name, bytes: await readBytes(item.file) })),
      );
      onProgress(0.4, "Merging…");
      const bytes = await engine.mergePdfs(sources, signal);
      const pages = await engine.pageCount({ name: "merged.pdf", bytes });
      return { blob: pdfBlob(bytes), pages, files: sources.length };
    });

  const state = task.state;
  const result = state.status === "done" ? state.output : null;
  const fileName = safeFileName(`${name.trim() || "merged"}.pdf`, "merged.pdf");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Announcer
        message={
          result ? `Merged ${result.files} files into one PDF with ${result.pages} pages. Ready to download.` : ""
        }
      />
      <Panel title="PDFs to merge">
        <div className="space-y-4">
          <FileDropzone
            accept={PDF_ACCEPT}
            multiple
            onFiles={(files) => void add(files)}
            label={items.length ? "Add more PDFs" : "Choose PDFs to merge"}
            hint="They are joined in the order listed. Never uploaded."
          />
          {skipped ? <Notice tone="warning">{skipped}</Notice> : null}
          {items.length > 0 ? (
            <>
              <OrderedFileList
                label="PDFs to merge, in order"
                items={items}
                onChange={(next) => {
                  setItems(next);
                  task.reset();
                }}
              />
              <Field label="File name" hint="“.pdf” is added for you.">
                {(context) => (
                  <TextInput context={context} value={name} onChange={(event) => setName(event.target.value)} />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button onClick={merge} disabled={items.length < 2 || state.status === "running"}>
                  Merge {items.length} PDFs
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setItems([]);
                    setSkipped(null);
                    task.reset();
                  }}
                >
                  Clear
                </Button>
              </div>
              {items.length < 2 ? <p className="text-xs text-fg-muted">Add at least one more PDF to merge.</p> : null}
            </>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="Merged PDF"
        actions={result ? <DownloadLink blob={result.blob} fileName={fileName} label="Download PDF" /> : null}
      >
        {state.status === "idle" ? (
          <EmptyState icon="file-text" title="Nothing merged yet">
            Choose two or more PDFs, put them in order, then merge. Pages are copied as they are, so text stays
            selectable and quality is unchanged.
          </EmptyState>
        ) : null}
        {state.status === "running" ? <ProgressBar value={state.progress} label={state.label ?? "Working…"} /> : null}
        {state.status === "error" ? <ErrorState error={state.error} /> : null}
        {result ? (
          <Notice tone="success" title="Merged">
            {result.files} files, {result.pages} pages, {formatBytes(result.blob.size)}. Saved as “{fileName}”.
          </Notice>
        ) : null}
      </Panel>
    </div>
  );
}
