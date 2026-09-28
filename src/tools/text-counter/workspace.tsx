"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Notice, StatList } from "@/components/ui/states";
import { countText, WORDS_PER_MINUTE } from "@/engines/text/count";
import { formatBytes } from "@/lib/files";

const number = (value: number) => value.toLocaleString("en");

export default function TextCounterWorkspace() {
  const [text, setText] = useState("");
  // Counting follows typing without blocking it, even for long documents.
  const deferred = useDeferredValue(text);
  const stats = useMemo(() => countText(deferred), [deferred]);

  const summary = `${number(stats.words)} ${stats.words === 1 ? "word" : "words"}, ${number(stats.characters)} ${
    stats.characters === 1 ? "character" : "characters"
  }`;

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Panel title="Your text">
        <Field label="Text to count" hideLabel hint="Type or paste. Counts update as you type.">
          {(context) => (
            <TextArea
              context={context}
              rows={14}
              value={text}
              placeholder="Start typing or paste your text here."
              onChange={(event) => setText(event.target.value)}
            />
          )}
        </Field>
        {text ? (
          <div className="mt-3 flex gap-2">
            <CopyButton text={text} label="Copy text" />
            <Button variant="ghost" size="sm" onClick={() => setText("")}>
              Clear
            </Button>
          </div>
        ) : null}
      </Panel>

      <Panel title="Counts">
        {/* Announced politely and only as a short summary, so a screen reader isn't interrupted on every keystroke. */}
        <p className="sr-only" role="status" aria-live="polite">
          {deferred ? summary : ""}
        </p>
        <StatList
          className="sm:grid-cols-2"
          items={[
            { label: "Words", value: number(stats.words) },
            { label: "Characters", value: number(stats.characters) },
            { label: "Characters without spaces", value: number(stats.charactersNoSpaces) },
            { label: "Sentences", value: number(stats.sentences) },
            { label: "Paragraphs", value: number(stats.paragraphs) },
            { label: "Lines", value: number(stats.lines) },
            {
              label: "Reading time",
              value:
                stats.words === 0
                  ? "—"
                  : stats.readingMinutes <= 1
                    ? "About 1 min"
                    : `About ${stats.readingMinutes} min`,
            },
            { label: "Size (UTF-8)", value: formatBytes(stats.bytes) },
          ]}
        />
        <p className="mt-3 text-xs text-fg-subtle">Reading time assumes {WORDS_PER_MINUTE} words per minute.</p>
        {!stats.segmenter && deferred ? (
          <Notice tone="warning" className="mt-3">
            Your browser doesn&rsquo;t have Intl.Segmenter, so words are split on spaces and punctuation. Counts may be
            less accurate for languages written without spaces.
          </Notice>
        ) : null}
      </Panel>
    </div>
  );
}
