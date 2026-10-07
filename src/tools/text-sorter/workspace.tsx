"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Segmented, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { sortLines, type SortMode } from "@/engines/text/sorter";

const SAMPLE_LIST = `banana
apple
Orange
Grape
apple
cherry
10 items
2 items
1 item`;

export default function TextSorterWorkspace() {
  const [text, setText] = useState(SAMPLE_LIST);
  const [mode, setMode] = useState<SortMode>("alphabetical");
  const [reverse, setReverse] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [deduplicate, setDeduplicate] = useState(false);

  const sortedResult = useMemo(() => {
    if (!text.trim()) return "";
    const res = sortLines(text, {
      mode,
      reverse,
      caseSensitive,
      deduplicate,
    });
    return res.output;
  }, [text, mode, reverse, caseSensitive, deduplicate]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Input Lines">
        <div className="space-y-4">
          <Field label="Text Lines">
            {(context) => (
              <TextArea
                context={context}
                rows={11}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter lines to sort..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <Segmented
            legend="Order Mode"
            value={mode}
            onChange={(val) => setMode(val as SortMode)}
            options={[
              { value: "alphabetical", label: "Alphabetical" },
              { value: "natural", label: "Natural (1, 2, 10)" },
              { value: "numeric", label: "Numeric" },
              { value: "length", label: "By Length" },
            ]}
          />

          <div className="flex flex-wrap gap-4 text-xs">
            <Checkbox
              label="Reverse Order (Descending)"
              checked={reverse}
              onChange={(e) => setReverse((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Case Sensitive"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Remove Duplicates"
              checked={deduplicate}
              onChange={(e) => setDeduplicate((e.target as HTMLInputElement).checked)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setText("")} disabled={!text}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE_LIST)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Sorted Result"
        actions={sortedResult ? <CopyButton text={sortedResult} label="Copy Lines" /> : null}
      >
        <div className="space-y-4">
          <OutputText value={sortedResult} rows={14} />
        </div>
      </Panel>
    </div>
  );
}
