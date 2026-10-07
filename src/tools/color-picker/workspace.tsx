"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { getColorDetails, parseHex, type RgbColor } from "@/engines/color/convert";

export default function ColorPickerWorkspace() {
  const [hexInput, setHexInput] = useState("#3b82f6");
  const [rgb, setRgb] = useState<RgbColor>({ r: 59, g: 130, b: 246 });

  const details = useMemo(() => getColorDetails(rgb), [rgb]);

  const handleHexChange = (val: string) => {
    setHexInput(val);
    const parsed = parseHex(val);
    if (parsed) {
      setRgb(parsed);
    }
  };

  const handleColorPicker = (val: string) => {
    setHexInput(val);
    const parsed = parseHex(val);
    if (parsed) {
      setRgb(parsed);
    }
  };

  const sampleEyeDropper = async () => {
    // Check EyeDropper support
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dropper = new (window as any).EyeDropper();
        const result = await dropper.open();
        if (result?.sRGBHex) {
          handleHexChange(result.sRGBHex);
        }
      } catch {
        // User canceled or failed
      }
    }
  };

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Color Selection">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={details.hex.slice(0, 7)}
              onChange={(e) => handleColorPicker(e.target.value)}
              className="h-16 w-24 cursor-pointer rounded border border-border p-1 bg-bg"
            />
            <div className="flex-1 space-y-1">
              <Field label="HEX Code">
                {(context) => (
                  <TextInput
                    context={context}
                    value={hexInput}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder="#3b82f6"
                  />
                )}
              </Field>
            </div>
          </div>

          {hasEyeDropper && (
            <Button variant="secondary" size="sm" onClick={sampleEyeDropper} className="w-full">
              Sample Pixel with EyeDropper
            </Button>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2">
            <Field label="Red (0-255)">
              {(context) => (
                <TextInput
                  context={context}
                  type="number"
                  min={0}
                  max={255}
                  value={rgb.r}
                  onChange={(e) => {
                    const r = Math.max(0, Math.min(255, Number(e.target.value) || 0));
                    const next = { ...rgb, r };
                    setRgb(next);
                    setHexInput(getColorDetails(next).hex);
                  }}
                />
              )}
            </Field>
            <Field label="Green (0-255)">
              {(context) => (
                <TextInput
                  context={context}
                  type="number"
                  min={0}
                  max={255}
                  value={rgb.g}
                  onChange={(e) => {
                    const g = Math.max(0, Math.min(255, Number(e.target.value) || 0));
                    const next = { ...rgb, g };
                    setRgb(next);
                    setHexInput(getColorDetails(next).hex);
                  }}
                />
              )}
            </Field>
            <Field label="Blue (0-255)">
              {(context) => (
                <TextInput
                  context={context}
                  type="number"
                  min={0}
                  max={255}
                  value={rgb.b}
                  onChange={(e) => {
                    const b = Math.max(0, Math.min(255, Number(e.target.value) || 0));
                    const next = { ...rgb, b };
                    setRgb(next);
                    setHexInput(getColorDetails(next).hex);
                  }}
                />
              )}
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Formats & Contrast Analysis">
        <div className="space-y-4">
          <div
            className="h-20 w-full rounded border border-border flex items-center justify-center font-mono text-sm font-semibold shadow-inner"
            style={{
              backgroundColor: details.hex,
              color: details.contrastWhite > details.contrastBlack ? "#ffffff" : "#000000",
            }}
          >
            {details.hex}
          </div>

          <div className="rounded border border-border divide-y divide-border text-xs bg-surface-raised">
            <div className="flex justify-between items-center p-2.5">
              <span className="font-semibold text-fg-muted">HEX:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-fg">{details.hex}</span>
                <CopyButton text={details.hex} />
              </div>
            </div>
            <div className="flex justify-between items-center p-2.5">
              <span className="font-semibold text-fg-muted">RGB:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-fg">{details.rgb}</span>
                <CopyButton text={details.rgb} />
              </div>
            </div>
            <div className="flex justify-between items-center p-2.5">
              <span className="font-semibold text-fg-muted">HSL:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-fg">{details.hsl}</span>
                <CopyButton text={details.hsl} />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block">
              Accessibility Contrast (WCAG 2.1)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border p-3 space-y-1 bg-white text-black">
                <div className="text-xs font-bold flex justify-between">
                  <span>On White</span>
                  <span>{details.contrastWhite}:1</span>
                </div>
                <div className="text-[10px] space-x-1">
                  <span
                    className={`px-1 py-0.5 rounded ${details.wcagWhite.aa ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    AA {details.wcagWhite.aa ? "Pass" : "Fail"}
                  </span>
                  <span
                    className={`px-1 py-0.5 rounded ${details.wcagWhite.aaa ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    AAA {details.wcagWhite.aaa ? "Pass" : "Fail"}
                  </span>
                </div>
              </div>

              <div className="rounded border border-border p-3 space-y-1 bg-black text-white">
                <div className="text-xs font-bold flex justify-between">
                  <span>On Black</span>
                  <span>{details.contrastBlack}:1</span>
                </div>
                <div className="text-[10px] space-x-1">
                  <span
                    className={`px-1 py-0.5 rounded ${details.wcagBlack.aa ? "bg-green-800 text-green-100" : "bg-red-800 text-red-100"}`}
                  >
                    AA {details.wcagBlack.aa ? "Pass" : "Fail"}
                  </span>
                  <span
                    className={`px-1 py-0.5 rounded ${details.wcagBlack.aaa ? "bg-green-800 text-green-100" : "bg-red-800 text-red-100"}`}
                  >
                    AAA {details.wcagBlack.aaa ? "Pass" : "Fail"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
