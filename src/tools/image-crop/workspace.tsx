"use client";

import { useEffect, useRef, useState } from "react";

import { FileDropzone } from "@/components/tool/file-dropzone";
import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextInput } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { constrainCropRect, initialCropRect, type AspectRatioPreset, type CropRect } from "@/engines/image/crop";
import { formatBytes } from "@/lib/files";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"] as const;

export default function ImageCropWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number } | null>(null);
  const [preset, setPreset] = useState<AspectRatioPreset>("free");
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 100, height: 100 });

  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFile = (chosen: File) => {
    setFile(chosen);
    setCroppedBlob(null);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    setCroppedUrl(null);

    const img = new Image();
    img.onload = () => {
      setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      imgRef.current = img;
      const initial = initialCropRect(img.naturalWidth, img.naturalHeight, preset);
      setCrop(initial);
    };
    img.src = URL.createObjectURL(chosen);
  };

  const handlePresetChange = (nextPreset: AspectRatioPreset) => {
    setPreset(nextPreset);
    if (origDimensions) {
      const updated = initialCropRect(origDimensions.width, origDimensions.height, nextPreset);
      setCrop(updated);
    }
  };

  const applyCrop = () => {
    if (!imgRef.current || !origDimensions) return;
    setBusy(true);

    try {
      const valid = constrainCropRect(crop, origDimensions.width, origDimensions.height);
      const canvas = document.createElement("canvas");
      canvas.width = valid.width;
      canvas.height = valid.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setBusy(false);
        return;
      }

      ctx.drawImage(imgRef.current, valid.x, valid.y, valid.width, valid.height, 0, 0, valid.width, valid.height);

      canvas.toBlob((blob) => {
        setBusy(false);
        if (!blob) return;
        setCroppedBlob(blob);
        if (croppedUrl) URL.revokeObjectURL(croppedUrl);
        setCroppedUrl(URL.createObjectURL(blob));
      }, "image/png");
    } catch {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    };
  }, [croppedUrl]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Image & Crop Settings">
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

              <Segmented
                legend="Aspect Ratio Preset"
                value={preset}
                onChange={(val) => handlePresetChange(val as AspectRatioPreset)}
                options={[
                  { value: "free", label: "Freeform" },
                  { value: "1:1", label: "1:1 Square" },
                  { value: "16:9", label: "16:9" },
                  { value: "4:3", label: "4:3" },
                  { value: "3:2", label: "3:2" },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Offset X (px)">
                  {(context) => (
                    <TextInput
                      context={context}
                      type="number"
                      min={0}
                      max={origDimensions.width - 1}
                      value={crop.x}
                      onChange={(e) => setCrop({ ...crop, x: Number(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Offset Y (px)">
                  {(context) => (
                    <TextInput
                      context={context}
                      type="number"
                      min={0}
                      max={origDimensions.height - 1}
                      value={crop.y}
                      onChange={(e) => setCrop({ ...crop, y: Number(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Crop Width (px)">
                  {(context) => (
                    <TextInput
                      context={context}
                      type="number"
                      min={1}
                      max={origDimensions.width}
                      value={crop.width}
                      onChange={(e) => setCrop({ ...crop, width: Number(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Crop Height (px)">
                  {(context) => (
                    <TextInput
                      context={context}
                      type="number"
                      min={1}
                      max={origDimensions.height}
                      value={crop.height}
                      onChange={(e) => setCrop({ ...crop, height: Number(e.target.value) })}
                    />
                  )}
                </Field>
              </div>

              <Button variant="primary" onClick={applyCrop} disabled={busy} className="w-full">
                {busy ? "Cropping..." : "Execute Crop"}
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Cropped Preview">
        {croppedUrl && croppedBlob ? (
          <div className="space-y-4">
            <div className="rounded border border-border p-2 bg-surface-raised flex justify-center items-center max-h-72 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={croppedUrl} alt="Cropped output" className="max-h-64 object-contain rounded" />
            </div>

            <div className="rounded border border-border p-3 text-xs bg-surface-raised flex justify-between items-center">
              <div>
                <span className="font-semibold text-fg">Crop Dimensions: </span>
                <span className="text-fg-muted">
                  {crop.width} × {crop.height} px
                </span>
              </div>
              <div>
                <span className="font-semibold text-fg">Size: </span>
                <span className="text-fg-muted">{formatBytes(croppedBlob.size)}</span>
              </div>
            </div>

            <a
              href={croppedUrl}
              download={`cropped-${crop.width}x${crop.height}.png`}
              className="inline-flex w-full items-center justify-center rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover transition-colors"
            >
              Download Cropped Image
            </a>
          </div>
        ) : (
          <EmptyState title="No cropped image yet">
            Choose an image on the left and set your crop boundary to preview.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
