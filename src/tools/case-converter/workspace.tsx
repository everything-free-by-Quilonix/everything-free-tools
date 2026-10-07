"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { convertCase, type CaseStyle } from "@/engines/text/case";

const STYLES: { label: string; style: CaseStyle }[] = [
  { label: "camelCase", style: "camel" },
  { label: "snake_case", style: "snake" },
  { label: "kebab-case", style: "kebab" },
  { label: "PascalCase", style: "pascal" },
  { label: "CONSTANT_CASE", style: "constant" },
  { label: "UPPERCASE", style: "upper" },
  { label: "lowercase", style: "lower" },
  { label: "Title Case", style: "title" },
  { label: "Sentence case", style: "sentence" },
];

const SAMPLE = "Everything.Free universal tool platform";

export default function CaseConverterWorkspace() {
  const [text, setText] = useState(SAMPLE);
  const [selectedStyle, setSelectedStyle] = useState<CaseStyle>("camel");

  const converted = useMemo(() => {
    if (!text.trim()) return "";
    return convertCase(text, selectedStyle);
  }, [text, selectedStyle]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Input Text">
        <div className="space-y-4">
          <Field label="Text to transform">
            {(context) => (
              <TextArea
                context={context}
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text or code identifiers..."
                className="text-xs"
              />
            )}
          </Field>

          <div className="space-y-1.5">
            <span className="text-xs text-fg-muted font-medium">Choose Casing Style:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.style}
                  type="button"
                  onClick={() => setSelectedStyle(s.style)}
                  className={`rounded border px-2 py-1.5 text-xs text-left transition-colors ${
                    selectedStyle === s.style
                      ? "bg-accent text-accent-fg border-accent font-semibold"
                      : "border-border text-fg-muted hover:text-fg hover:border-fg-subtle"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setText("")} disabled={!text}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Converted Result" actions={converted ? <CopyButton text={converted} label="Copy Result" /> : null}>
        <div className="space-y-4">
          <OutputText value={converted} rows={12} />
        </div>
      </Panel>
    </div>
  );
}
