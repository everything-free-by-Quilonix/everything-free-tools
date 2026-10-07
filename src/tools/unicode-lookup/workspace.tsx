"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { inspectUnicode } from "@/engines/text/unicode";

export default function UnicodeLookupWorkspace() {
  const [input, setInput] = useState("🚀 A π ⚡ ©");

  const results = useMemo(() => {
    if (!input) return [];
    return inspectUnicode(input);
  }, [input]);

  return (
    <div className="space-y-6">
      <Panel title="Enter Characters or Symbols">
        <div className="space-y-4">
          <Field
            label="Characters, symbols, or emoji"
            hint="Type or paste any characters to inspect their Unicode properties."
          >
            {(context) => (
              <TextInput
                context={context}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type characters or emoji..."
                className="text-lg"
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-fg-muted">Quick examples:</span>
            {["🌟 Star", "π Pi", "€ Euro", "⚡ Volt", "∑ Sum", "あ Hiragana", "中 Hanzi"].map((ex) => (
              <button
                key={ex}
                type="button"
                className="text-accent underline hover:opacity-80"
                onClick={() => setInput(ex)}
              >
                {ex}
              </button>
            ))}
            {input && (
              <Button variant="ghost" size="sm" onClick={() => setInput("")}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title={`Character Breakdown (${results.length})`}>
        {results.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {results.map((char, idx) => (
              <div
                key={idx}
                className="rounded border border-border bg-surface-raised p-3.5 space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-2xl font-sans">{char.char}</span>
                  <span className="font-bold text-accent">{char.hexCodePoint}</span>
                </div>
                <div className="space-y-1 text-fg-muted">
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Decimal:</span>
                    <span>{char.decimal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">UTF-8 Hex:</span>
                    <span>{char.utf8Hex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">UTF-16 Hex:</span>
                    <span>{char.utf16Hex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">HTML Entity:</span>
                    <span>{char.htmlEntity}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <CopyButton text={char.hexCodePoint} label="Copy Code Point" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No characters entered">
            Type or paste characters above to see code points, hex bytes, and encoding details.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
