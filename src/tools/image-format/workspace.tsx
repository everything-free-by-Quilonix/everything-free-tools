"use client";

import { useEffect, useRef, useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { formatFileName, SUPPORTED_TARGET_FORMATS, type TargetImageFormat } from "@/engines/image/format";
import { formatBytes } from "@/lib/files";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"] as const;

export default function ImageFormatWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [targetMime, setTargetMime] = useState<TargetImageFormat>("image/png");
  const [quality, setQuality] = useState(0.85);

  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFile = (chosen: File) => {
    setFile(chosen);
    setConvertedBlob(null);
    if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    setConvertedUrl(null);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
    };
    img.src = URL.createObjectURL(chosen);
  };

  const convert = () => {
    if (!imgRef.current || !file) return;
    setBusy(true);

    try {
      const img = imgRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setBusy(false);
        return;
      }

      // If converting to JPEG, fill canvas with white first to handle transparency gracefully
      if (targetMime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          setBusy(false);
          if (!blob) return;
          setConvertedBlob(blob);
          if (convertedUrl) URL.revokeObjectURL(convertedUrl);
          setConvertedUrl(URL.createObjectURL(blob));
        },
        targetMime,
        quality,
      );
    } catch {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    };
  }, [convertedUrl]);

  const selectedFormatDef = SUPPORTED_TARGET_FORMATS.find((f) => f.mime === targetMime);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Select & Target Format">
        <div className="space-y-4">
          <FileDropzone
            onFiles={(files) => files[0] && handleFile(files[0])}
            accept={ACCEPT}
            label="Choose an image or drop it here"
            hint="Supports JPEG, PNG, WebP, AVIF, and BMP input."
          />

          {file && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex justify-between items-center text-xs text-fg-muted">
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span>Original: {formatBytes(file.size)}</span>
              </div>

              <Segmented
                legend="Convert To Format"
                value={targetMime}
                onChange={(val) => setTargetMime(val as TargetImageFormat)}
                options={SUPPORTED_TARGET_FORMATS.map((f) => ({
                  value: f.mime,
                  label: f.label,
                }))}
              />

              {selectedFormatDef?.supportsQuality && (
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

              <Button variant="primary" onClick={convert} disabled={busy} className="w-full">
                {busy ? "Converting..." : "Convert Image Format"}
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Converted Output">
        {convertedUrl && convertedBlob && file ? (
          <div className="space-y-4">
            <div className="rounded border border-border p-2 bg-surface-raised flex justify-center items-center max-h-72 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={convertedUrl} alt="Converted preview" className="max-h-64 object-contain rounded" />
            </div>

            <div className="rounded border border-border p-3 text-xs bg-surface-raised flex justify-between items-center">
              <div>
                <span className="font-semibold text-fg">Target: </span>
                <span className="text-fg-muted">{selectedFormatDef?.extension.toUpperCase()}</span>
              </div>
              <div>
                <span className="font-semibold text-fg">Result Size: </span>
                <span className="text-fg-muted">{formatBytes(convertedBlob.size)}</span>
              </div>
            </div>

            <a
              href={convertedUrl}
              download={formatFileName(file.name, selectedFormatDef?.extension || "png")}
              className="inline-flex w-full items-center justify-center rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover transition-colors"
            >
              Download Converted Image
            </a>
          </div>
        ) : (
          <EmptyState title="No converted image yet">
            Choose an image on the left and select your desired format to convert.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
