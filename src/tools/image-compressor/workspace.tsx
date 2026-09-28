"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { FileDropzone } from "@/components/tool/file-dropzone";
import { Panel } from "@/components/tool/panel";
import { DownloadLink } from "@/components/ui/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Segmented, Select } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice, ProgressBar } from "@/components/ui/states";
import { useObjectUrl } from "@/components/ui/use-object-url";
import type { CompressInput, CompressOutput, OutputChoice } from "@/engines/image/compress";
import { hasCapability } from "@/lib/capabilities";
import { extensionForType } from "@/lib/downloads";
import { isAbort, toUserError, type UserError } from "@/lib/errors";
import { checkFiles, derivedFileName, formatBytes, LARGE_FILE_BYTES, percentSaved } from "@/lib/files";
import { runTask } from "@/workers/run-task";

// Kept in step with ACCEPTED_TYPES in the engine; duplicated so this page doesn't
// import the engine module eagerly.
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"] as const;

const FORMAT_NAMES: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/png": "PNG",
  "image/avif": "AVIF",
  "image/bmp": "BMP",
};

type Item = {
  id: number;
  file: File;
  status: "waiting" | "working" | "done" | "error";
  output?: CompressOutput;
  error?: UserError;
};

let nextId = 1;

export default function ImageCompressorWorkspace() {
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [output, setOutput] = useState<OutputChoice>("auto");
  const [quality, setQuality] = useState(80);
  const [maxDimension, setMaxDimension] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number; value: number } | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const update = (id: number, patch: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addFiles = (files: File[]) => {
    const { accepted, rejected: refused } = checkFiles(files, ACCEPT);
    setRejected(refused.map(({ file, reason }) => `${file.name}: ${reason}`));
    setItems((list) => [...list, ...accepted.map((file) => ({ id: nextId++, file, status: "waiting" as const }))]);
  };

  const compressAll = async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const queue = items.map((item) => item.id);
    setItems((list) => list.map((item) => ({ id: item.id, file: item.file, status: "waiting" })));
    setRunning(true);

    // A worker is used when it can encode off the page (OffscreenCanvas); otherwise
    // the same engine runs on the page with a <canvas>.
    const useWorker = hasCapability("web-workers") && hasCapability("offscreen-canvas");

    for (const [index, id] of queue.entries()) {
      if (current.signal.aborted) break;
      const item = items.find((candidate) => candidate.id === id);
      if (!item) continue;
      update(id, { status: "working" });
      setProgress({ index, total: queue.length, value: 0 });

      const input: CompressInput = {
        file: item.file,
        output,
        quality: quality / 100,
        maxDimension: maxDimension ? Number(maxDimension) : null,
      };

      try {
        const result = await runTask<CompressInput, CompressOutput>({
          input,
          worker: useWorker
            ? () => new Worker(new URL("../../workers/image-compress.worker.ts", import.meta.url), { type: "module" })
            : undefined,
          fallback: () => import("@/engines/image/compress").then((engine) => engine.compressImage),
          onProgress: (value) => setProgress({ index, total: queue.length, value }),
          signal: current.signal,
        });
        update(id, { status: "done", output: result });
      } catch (error) {
        if (isAbort(error)) {
          update(id, { status: "waiting" });
          break;
        }
        update(id, { status: "error", error: toUserError(error, "We couldn't compress this image.") });
      }
    }

    if (controller.current === current) {
      controller.current = null;
      setRunning(false);
      setProgress(null);
    }
  };

  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setRunning(false);
    setProgress(null);
    setItems((list) => list.map((item) => (item.status === "working" ? { ...item, status: "waiting" } : item)));
  };

  const done = items.filter((item) => item.status === "done");
  const totalBefore = done.reduce((sum, item) => sum + item.file.size, 0);
  const totalAfter = done.reduce((sum, item) => sum + (item.output?.blob.size ?? 0), 0);
  const large = items.some((item) => item.file.size > LARGE_FILE_BYTES);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel title="Images">
          <FileDropzone
            accept={ACCEPT}
            multiple
            onFiles={addFiles}
            label="Choose images to compress"
            hint="JPEG, PNG, WebP, AVIF or BMP."
            disabled={running}
          />
          {rejected.length > 0 ? (
            <Notice tone="warning" className="mt-3" title="Some files were skipped" role="alert">
              <ul className="list-disc pl-4">
                {rejected.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {large ? (
            <Notice className="mt-3">
              Large images need a lot of memory. If your device slows down, try fewer at a time.
            </Notice>
          ) : null}
        </Panel>

        <Panel title="Settings">
          <div className="space-y-5">
            <Segmented
              legend="Output format"
              value={output}
              onChange={setOutput}
              options={[
                { value: "auto", label: "Auto" },
                { value: "image/jpeg", label: "JPEG" },
                { value: "image/webp", label: "WebP" },
                { value: "image/png", label: "PNG" },
              ]}
              hint={
                output === "auto"
                  ? "Photos become JPEG; images with transparency become WebP, so transparency is kept."
                  : output === "image/jpeg"
                    ? "JPEG has no transparency: transparent areas become white."
                    : output === "image/png"
                      ? "PNG is lossless, so quality doesn't apply. Best for graphics; usually larger for photos."
                      : "WebP keeps transparency and is usually smaller than JPEG."
              }
            />
            <Field
              label="Quality"
              aside={output === "image/png" ? "Not used for PNG" : `${quality}%`}
              hint="Lower is smaller. 70–85% is usually indistinguishable for photos."
            >
              {(context) => (
                <input
                  id={context.id}
                  aria-describedby={context.describedBy}
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  disabled={output === "image/png"}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="h-6 w-full cursor-pointer accent-(--accent) disabled:cursor-not-allowed disabled:opacity-50"
                />
              )}
            </Field>
            <Field label="Resize" hint="Scales down so the longest side fits. Images are never enlarged.">
              {(context) => (
                <Select
                  context={context}
                  value={maxDimension}
                  onChange={(event) => setMaxDimension(event.target.value)}
                >
                  <option value="">Keep original size</option>
                  <option value="3840">Longest side 3840 px (4K)</option>
                  <option value="2560">Longest side 2560 px</option>
                  <option value="1920">Longest side 1920 px (Full HD)</option>
                  <option value="1280">Longest side 1280 px</option>
                  <option value="800">Longest side 800 px</option>
                </Select>
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={compressAll} disabled={items.length === 0 || running}>
                {done.length > 0 ? "Compress again" : items.length > 1 ? `Compress ${items.length} images` : "Compress"}
              </Button>
              {running ? (
                <Button variant="secondary" onClick={cancel}>
                  Cancel
                </Button>
              ) : items.length > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setItems([]);
                    setRejected([]);
                  }}
                >
                  Remove all
                </Button>
              ) : null}
            </div>
            {progress ? (
              <ProgressBar
                value={(progress.index + progress.value) / progress.total}
                label={`Compressing image ${progress.index + 1} of ${progress.total}`}
              />
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel title="Results">
        {items.length === 0 ? (
          <EmptyState icon="image" title="No images yet">
            Choose images above. Each one is compressed on this device and you can download them one by one.
          </EmptyState>
        ) : (
          <>
            {done.length > 0 && !running ? (
              <p role="status" className="mb-4 text-sm text-fg-muted">
                Compressed {done.length} of {items.length}: {formatBytes(totalBefore)} → {formatBytes(totalAfter)} (
                {savedLabel(totalBefore, totalAfter)}).
              </p>
            ) : null}
            <ul className="space-y-3">
              {items.map((item) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  onRemove={
                    running ? undefined : () => setItems((list) => list.filter((entry) => entry.id !== item.id))
                  }
                />
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}

function savedLabel(before: number, after: number): string {
  const saved = percentSaved(before, after);
  if (saved > 0) return `${saved}% smaller`;
  if (saved < 0) return `${Math.abs(saved)}% larger`;
  return "same size";
}

function ResultRow({ item, onRemove }: { item: Item; onRemove?: () => void }) {
  const original = useObjectUrl(item.file);
  const compressed = useObjectUrl(item.output?.blob);
  const result = item.output;
  const grew = result ? result.blob.size >= item.file.size : false;

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg p-3 sm:flex-row sm:items-center">
      <div className="flex shrink-0 gap-2">
        <Thumb url={original} label="Original" />
        {result ? <Thumb url={compressed} label="Compressed" /> : null}
      </div>

      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="truncate font-medium text-fg" title={item.file.name}>
          {item.file.name}
        </p>
        <p className="text-fg-muted">
          {FORMAT_NAMES[item.file.type] ?? "Image"} · {formatBytes(item.file.size)}
          {result ? ` · ${result.originalWidth} × ${result.originalHeight}` : ""}
        </p>
        {result ? (
          <p className="text-fg">
            <Icon name="arrow-right" size={14} className="mr-1 inline text-fg-subtle" />
            {FORMAT_NAMES[result.type]} · {formatBytes(result.blob.size)} · {result.width} × {result.height}{" "}
            <Badge tone={grew ? "warning" : "success"}>{savedLabel(item.file.size, result.blob.size)}</Badge>
          </p>
        ) : null}
        {result && grew ? (
          <p className="text-xs text-warning-fg">
            The result isn&rsquo;t smaller. This image is probably already well compressed; keep the original, or try a
            lower quality or a smaller size.
          </p>
        ) : null}
        {result?.flattened ? (
          <p className="text-xs text-warning-fg">
            JPEG has no transparency, so transparent areas were filled with white.
          </p>
        ) : null}
        {result?.substitutedFor ? (
          <p className="text-xs text-warning-fg">
            Your browser can&rsquo;t create {FORMAT_NAMES[result.substitutedFor]} images, so this was saved as{" "}
            {FORMAT_NAMES[result.type]}.
          </p>
        ) : null}
        {item.status === "working" ? <p className="text-xs text-fg-muted">Compressing…</p> : null}
        {item.status === "error" && item.error ? <ErrorState error={item.error} className="mt-2" /> : null}
      </div>

      <div className="flex shrink-0 gap-2">
        {result ? (
          <DownloadLink
            blob={result.blob}
            fileName={derivedFileName(item.file.name, "compressed", extensionForType(result.type))}
            label="Download"
          />
        ) : null}
        {onRemove ? (
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${item.file.name}`}>
            <Icon name="x" size={16} />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Thumb({ url, label }: { url: string | null; label: string }) {
  return (
    <figure className="w-20">
      <div className="grid size-20 place-items-center overflow-hidden rounded-md border border-border bg-[repeating-conic-gradient(var(--surface-raised)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL; next/image can't optimise it
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        ) : null}
      </div>
      <figcaption className="mt-1 text-center text-[11px] text-fg-subtle">{label}</figcaption>
    </figure>
  );
}
