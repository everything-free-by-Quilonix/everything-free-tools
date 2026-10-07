"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, TextArea, TextInput } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { Notice } from "@/components/ui/states";
import { executeFindReplace } from "@/engines/text/find-replace";

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog.
The dog was not amused by the fox's quick jump.`;

export default function FindReplaceWorkspace() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [findStr, setFindStr] = useState("fox");
  const [replaceStr, setReplaceStr] = useState("cat");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const result = useMemo(() => {
    return executeFindReplace(text, {
      find: findStr,
      replace: replaceStr,
      isRegex: useRegex,
      caseSensitive,
      matchWholeWord: wholeWord,
    });
  }, [text, findStr, replaceStr, useRegex, caseSensitive, wholeWord]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Find & Replace Settings">
        <div className="space-y-4">
          <Field label="Original Text">
            {(context) => (
              <TextArea
                context={context}
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text..."
                className="text-xs font-mono"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Find">
              {(context) => (
                <TextInput
                  context={context}
                  value={findStr}
                  onChange={(e) => setFindStr(e.target.value)}
                  placeholder="Text to find..."
                  className="font-mono text-xs"
                />
              )}
            </Field>

            <Field label="Replace With">
              {(context) => (
                <TextInput
                  context={context}
                  value={replaceStr}
                  onChange={(e) => setReplaceStr(e.target.value)}
                  placeholder="Replacement..."
                  className="font-mono text-xs"
                />
              )}
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <Checkbox
              label="Regex Mode"
              checked={useRegex}
              onChange={(e) => setUseRegex((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Case Sensitive"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              label="Whole Word Only"
              checked={wholeWord}
              disabled={useRegex}
              onChange={(e) => setWholeWord((e.target as HTMLInputElement).checked)}
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

      <Panel
        title="Replacement Result"
        actions={result.output ? <CopyButton text={result.output} label="Copy Result" /> : null}
      >
        <div className="space-y-4">
          {result.error ? (
            <Notice tone="danger" title="Regex Syntax Error">
              {result.error}
            </Notice>
          ) : (
            <Notice tone="success" title={`${result.matchCount} Occurrence(s) Replaced`}>
              Safely substituted across the document.
            </Notice>
          )}

          <OutputText value={result.output} rows={12} />
        </div>
      </Panel>
    </div>
  );
}
