"use client";

import { useEffect, useRef, useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Segmented, TextInput } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { calculateResizeDimensions } from "@/engines/image/resize";
import { formatBytes } from "@/lib/files";

const ACCEPT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp"] as const;

export default function ImageResizeWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number } | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");
  const [quality, setQuality] = useState(0.85);

  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFile = (chosen: File) => {
    setFile(chosen);
    setResizedBlob(null);
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    setResizedUrl(null);

    const img = new Image();
    img.onload = () => {
      setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      imgRef.current = img;
    };
    img.src = URL.createObjectURL(chosen);
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspect && origDimensions && origDimensions.width > 0) {
      const ratio = origDimensions.height / origDimensions.width;
      setHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspect && origDimensions && origDimensions.height > 0) {
      const ratio = origDimensions.width / origDimensions.height;
      setWidth(Math.round(val * ratio));
    }
  };

  const applyScale = (pct: number) => {
    if (!origDimensions) return;
    const target = calculateResizeDimensions(origDimensions.width, origDimensions.height, {
      scalePercent: pct,
      maintainAspectRatio: true,
    });
    setWidth(target.targetWidth);
    setHeight(target.targetHeight);
  };

  const doResize = async () => {
    if (!imgRef.current || width <= 0 || height <= 0) return;
    setBusy(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setBusy(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgRef.current, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          setBusy(false);
          if (!blob) return;
          setResizedBlob(blob);
          if (resizedUrl) URL.revokeObjectURL(resizedUrl);
          setResizedUrl(URL.createObjectURL(blob));
        },
        format,
        quality,
      );
    } catch {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    };
  }, [resizedUrl]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Select & Configure">
        <div className="space-y-4">
          <FileDropzone
            onFiles={(files) => files[0] && handleFile(files[0])}
            accept={ACCEPT}
            label="Choose an image or drop it here"
            hint="JPEG, PNG, WebP, AVIF, or BMP. Never uploaded."
          />

          {file && origDimensions && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex justify-between items-center text-xs text-fg-muted">
                <span>
                  Original: {origDimensions.width} × {origDimensions.height} px
                </span>
                <span>{formatBytes(file.size)}</span>
              </div>

              <div className="flex gap-2">
                <span className="text-xs text-fg-muted self-center">Presets:</span>
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyScale(pct)}
                    className="rounded border border-border px-2 py-0.5 text-xs hover:bg-border/30 text-fg"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Width (px)">
                  {(context) => (
                    <TextInput
                      context={context}
                      type="number"
                      min={1}
                      value={width}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                    />
                  )}
                </Field>
                <Field label="Height (px)">
                  {(context) => (
                    <TextInput
                      context={context}
                      type="number"
                      min={1}
                      value={height}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                    />
                  )}
                </Field>
              </div>

              <Checkbox
                checked={maintainAspect}
                onChange={(e) => setMaintainAspect(e.target.checked)}
                label="Maintain Aspect Ratio"
              />

              <Segmented
                legend="Target Output Format"
                value={format}
                onChange={(val) => setFormat(val as "image/png" | "image/jpeg" | "image/webp")}
                options={[
                  { value: "image/png", label: "PNG" },
                  { value: "image/jpeg", label: "JPEG" },
                  { value: "image/webp", label: "WebP" },
                ]}
              />

              {format !== "image/png" && (
                <div>
                  <div className="flex justify-between text-xs text-fg-muted mb-1">
                    <span>Quality:</span>
                    <span>{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full cursor-pointer accent-(--accent)"
                  />
                </div>
              )}

              <Button variant="primary" onClick={doResize} disabled={busy} className="w-full">
                {busy ? "Resizing..." : "Apply Resize"}
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Preview & Download">
        {resizedUrl && resizedBlob ? (
          <div className="space-y-4">
            <div className="rounded border border-border p-2 bg-surface-raised flex justify-center items-center max-h-72 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resizedUrl} alt="Resized preview" className="max-h-64 object-contain rounded" />
            </div>

            <div className="rounded border border-border p-3 text-xs bg-surface-raised flex justify-between items-center">
              <div>
                <span className="font-semibold text-fg">New Size: </span>
                <span className="text-fg-muted">
                  {width} × {height} px
                </span>
              </div>
              <div>
                <span className="font-semibold text-fg">File Size: </span>
                <span className="text-fg-muted">{formatBytes(resizedBlob.size)}</span>
              </div>
            </div>

            <a
              href={resizedUrl}
              download={`resized-${width}x${height}.${format.replace("image/", "").replace("jpeg", "jpg")}`}
              className="inline-flex w-full items-center justify-center rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover transition-colors"
            >
              Download Resized Image
            </a>
          </div>
        ) : (
          <EmptyState title="No resized image yet">
            Choose an image on the left and set your target dimensions to resize.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
