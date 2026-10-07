"use client";

import { useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { fileId, OrderedFileList, type OrderedFile } from "@/components/tool/ordered-file-list";
import { Panel } from "@/components/tool/panel";
import { DownloadLink } from "@/components/ui/actions";
import { Announcer } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextInput } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice, ProgressBar } from "@/components/ui/states";
import type { ImageInput, PageSizeChoice } from "@/engines/pdf/operations";
import { checkFiles, formatBytes, safeFileName } from "@/lib/files";
import { loadImagePrep, loadPdfEngine, pdfBlob } from "@/tools/pdf-shared";
import { useTask } from "@/tools/use-task";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp", "image/gif"];
const ACCEPT = [...IMAGE_TYPES, ".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp", ".gif"];

const MARGINS = { none: 0, small: 18, normal: 36 } as const;
type Margin = keyof typeof MARGINS;

interface Built {
  blob: Blob;
  pages: number;
}

export default function ImageToPdfWorkspace() {
  const [items, setItems] = useState<OrderedFile[]>([]);
  const [skipped, setSkipped] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSizeChoice>("a4");
  const [margin, setMargin] = useState<Margin>("small");
  const [name, setName] = useState("images");
  const task = useTask<Built>();

  const add = (files: File[]) => {
    const { accepted, rejected } = checkFiles(files, IMAGE_TYPES);
    setSkipped(
      rejected.length
        ? `${rejected.map((entry) => `“${entry.file.name}”`).join(", ")} ${rejected.length === 1 ? "isn't an image this tool can read" : "aren't images this tool can read"}, so ${rejected.length === 1 ? "it was" : "they were"} skipped.`
        : null,
    );
    task.reset();
    setItems((current) => [...current, ...accepted.map((file) => ({ id: fileId(), file }))]);
  };

  const build = () =>
    void task.run(async ({ signal, onProgress }) => {
      const [engine, { prepareImage }] = await Promise.all([loadPdfEngine(), loadImagePrep()]);
      const images: ImageInput[] = [];
      for (const [index, item] of items.entries()) {
        signal.throwIfAborted();
        onProgress(index / (items.length + 1), `Preparing image ${index + 1} of ${items.length}…`);
        images.push(await prepareImage(item.file));
      }
      onProgress(items.length / (items.length + 1), "Building the PDF…");
      const bytes = await engine.imagesToPdf(images, { pageSize, margin: MARGINS[margin] }, signal);
      return { blob: pdfBlob(bytes), pages: images.length };
    });

  const state = task.state;
  const result = state.status === "done" ? state.output : null;
  const fileName = safeFileName(`${name.trim() || "images"}.pdf`, "images.pdf");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Announcer message={result ? `PDF with ${result.pages} pages is ready to download.` : ""} />
      <Panel title="Images">
        <div className="space-y-4">
          <FileDropzone
            accept={ACCEPT}
            multiple
            onFiles={add}
            label={items.length ? "Add more images" : "Choose images"}
            hint="JPEG, PNG, WebP, AVIF, BMP or GIF. One page each, in the order listed. Never uploaded."
          />
          {skipped ? <Notice tone="warning">{skipped}</Notice> : null}
          {items.length > 0 ? (
            <>
              <OrderedFileList
                label="Images, in page order"
                items={items}
                onChange={(next) => {
                  setItems(next);
                  task.reset();
                }}
              />
              <div className="flex flex-wrap gap-4">
                <Segmented
                  legend="Page size"
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(value);
                    task.reset();
                  }}
                  options={[
                    { value: "a4", label: "A4" },
                    { value: "letter", label: "Letter" },
                    { value: "fit", label: "Same as image" },
                  ]}
                />
                {pageSize !== "fit" ? (
                  <Segmented
                    legend="Margin"
                    value={margin}
                    onChange={(value) => {
                      setMargin(value);
                      task.reset();
                    }}
                    options={[
                      { value: "none", label: "None" },
                      { value: "small", label: "Small" },
                      { value: "normal", label: "Normal" },
                    ]}
                  />
                ) : null}
              </div>
              <Field label="File name" hint="“.pdf” is added for you.">
                {(context) => (
                  <TextInput context={context} value={name} onChange={(event) => setName(event.target.value)} />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button onClick={build} disabled={state.status === "running"}>
                  Make PDF ({items.length} {items.length === 1 ? "page" : "pages"})
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
            </>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="PDF"
        actions={result ? <DownloadLink blob={result.blob} fileName={fileName} label="Download PDF" /> : null}
      >
        {state.status === "idle" ? (
          <EmptyState icon="file-text" title="No PDF yet">
            Add photos or scans, put them in order, and make one PDF. Useful for submitting documents, assignments and
            receipts.
          </EmptyState>
        ) : null}
        {state.status === "running" ? <ProgressBar value={state.progress} label={state.label ?? "Working…"} /> : null}
        {state.status === "error" ? <ErrorState error={state.error} /> : null}
        {result ? (
          <Notice tone="success" title="Ready">
            {result.pages} {result.pages === 1 ? "page" : "pages"}, {formatBytes(result.blob.size)}. Saved as “
            {fileName}”.
          </Notice>
        ) : null}
      </Panel>
    </div>
  );
}
