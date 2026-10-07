"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, TextArea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { analyzeFrequency } from "@/engines/text/frequency";

const SAMPLE_TEXT = `Everything.Free is a universal, free, and privacy-first online tools platform.
Free tools should run locally on your device without sending any personal data to servers.
Local processing ensures that your tools work offline and your privacy remains protected.`;

export default function WordFrequencyWorkspace() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [excludeStopWords, setExcludeStopWords] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const analysis = useMemo(() => {
    if (!text.trim()) return null;
    return analyzeFrequency(text, {
      excludeStopWords,
      caseSensitive,
    });
  }, [text, excludeStopWords, caseSensitive]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Text to Analyze">
        <div className="space-y-4">
          <Field label="Text Input">
            {(context) => (
              <TextArea
                context={context}
                rows={11}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or write text here to analyze word frequencies..."
                className="text-xs"
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-4 text-xs">
            <Checkbox
              label="Case Sensitive"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Exclude Common Stop Words"
              description="Filters out the, and, is, to, in, etc."
              checked={excludeStopWords}
              onChange={(e) => setExcludeStopWords((e.target as HTMLInputElement).checked)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setText("")} disabled={!text}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE_TEXT)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Frequency Table">
        {analysis ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-fg-muted">
              <span>{analysis.totalWords} total words</span>
              <span>{analysis.uniqueWords} unique terms</span>
            </div>

            <div className="max-h-[380px] overflow-y-auto rounded border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-raised border-b border-border font-semibold text-fg">
                  <tr>
                    <th className="p-2.5">Rank</th>
                    <th className="p-2.5">Word</th>
                    <th className="p-2.5">Count</th>
                    <th className="p-2.5">Density</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analysis.wordFrequency.slice(0, 50).map((w, idx) => (
                    <tr key={w.word} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="p-2.5 text-fg-subtle">#{idx + 1}</td>
                      <td className="p-2.5 font-medium text-accent font-mono">{w.word}</td>
                      <td className="p-2.5 font-mono">{w.count}</td>
                      <td className="p-2.5 font-mono">{w.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="No text to analyze">
            Paste text on the left to see occurrence counts, rankings, and percentage density.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
