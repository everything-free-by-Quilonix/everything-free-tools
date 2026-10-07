"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { cleanText } from "@/engines/text/cleaner";

const SAMPLE = `   Hello    world!   
This is a line with trailing spaces.   

This is a duplicate line.
This is a duplicate line.


End of text document.   `;

export default function TextCleanerWorkspace() {
  const [text, setText] = useState(SAMPLE);
  const [trimLines, setTrimLines] = useState(true);
  const [removeBlankLines, setRemoveBlankLines] = useState(true);
  const [collapseSpaces, setCollapseSpaces] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);

  const cleanResult = useMemo(() => {
    return cleanText(text, {
      trimLines,
      removeBlankLines,
      collapseSpaces,
      removeDuplicates,
    });
  }, [text, trimLines, removeBlankLines, collapseSpaces, removeDuplicates]);

  const cleaned = cleanResult.output;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Original Text">
        <div className="space-y-4">
          <Field label="Input Text">
            {(context) => (
              <TextArea
                context={context}
                rows={11}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste messy text here..."
                className="font-mono text-xs"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Checkbox
              label="Trim Lines"
              checked={trimLines}
              onChange={(e) => setTrimLines((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Remove Blank Lines"
              checked={removeBlankLines}
              onChange={(e) => setRemoveBlankLines((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Collapse Spaces"
              checked={collapseSpaces}
              onChange={(e) => setCollapseSpaces((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Remove Duplicate Lines"
              checked={removeDuplicates}
              onChange={(e) => setRemoveDuplicates((e.target as HTMLInputElement).checked)}
            />
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

      <Panel title="Cleaned Text" actions={cleaned ? <CopyButton text={cleaned} label="Copy Cleaned Text" /> : null}>
        <div className="space-y-4">
          <OutputText value={cleaned} rows={14} />
        </div>
      </Panel>
    </div>
  );
}
