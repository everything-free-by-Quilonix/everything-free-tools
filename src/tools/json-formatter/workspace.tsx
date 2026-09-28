"use client";

import { useRef, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice, ProgressBar } from "@/components/ui/states";
import type { Indent, JsonMode, JsonResult, JsonTaskInput } from "@/engines/data/json";
import { MIME, textBlob } from "@/lib/downloads";
import { useTask } from "@/tools/use-task";
import { runTask } from "@/workers/run-task";

const SAMPLE = `{"id":12345678901234567890,"name":"Everything.Free","price":1.10,"tags":["free","local"],"nested":{"ok":true,"none":null}}`;

const modeLabels: Record<JsonMode, string> = { format: "Format", minify: "Minify", validate: "Validate" };

interface Outcome {
  mode: JsonMode;
  result: JsonResult;
}

export default function JsonFormatterWorkspace() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<JsonMode>("format");
  const [indent, setIndent] = useState<Indent>(2);
  const [output, setOutput] = useState<Blob | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const task = useTask<Outcome>();

  const run = (nextMode = mode, nextIndent = indent) => {
    const payload: JsonTaskInput = { text, mode: nextMode, indent: nextIndent };
    setOutput(null);
    void task.run(async ({ signal }) => {
      const result = await runTask<JsonTaskInput, JsonResult>({
        input: payload,
        worker: () => new Worker(new URL("../../workers/json.worker.ts", import.meta.url), { type: "module" }),
        fallback: () => import("@/engines/data/json").then((engine) => engine.runJson),
        signal,
      });
      if (result.ok && nextMode !== "validate") setOutput(textBlob(result.output, MIME.json));
      return { mode: nextMode, result };
    });
  };

  const goToError = (offset: number) => {
    const area = input.current;
    if (!area) return;
    area.focus();
    area.setSelectionRange(offset, Math.min(offset + 1, area.value.length));
  };

  const state = task.state;
  const done = state.status === "done" ? state.output : null;
  const failure = done && !done.result.ok ? done.result.error : null;
  const success = done && done.result.ok ? { mode: done.mode, result: done.result } : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Your JSON">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            run();
          }}
        >
          <Field
            label="JSON to process"
            hideLabel
            aside={text ? `${text.length.toLocaleString("en")} characters` : undefined}
            hint="Paste or type JSON. Press Ctrl+Enter (⌘+Enter on Mac) to run."
          >
            {(context) => (
              <TextArea
                ref={input}
                context={context}
                rows={14}
                value={text}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                placeholder='{"hello": "world"}'
                className="font-mono text-[13px]"
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    run();
                  }
                }}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-4">
            <Segmented
              legend="Action"
              value={mode}
              onChange={setMode}
              options={(["format", "minify", "validate"] as const).map((value) => ({
                value,
                label: modeLabels[value],
              }))}
            />
            {mode === "format" ? (
              <Segmented
                legend="Indent"
                value={String(indent) as "2" | "4" | "tab"}
                onChange={(value) => setIndent(value === "tab" ? "tab" : (Number(value) as 2 | 4))}
                options={[
                  { value: "2", label: "2 spaces" },
                  { value: "4", label: "4 spaces" },
                  { value: "tab", label: "Tabs" },
                ]}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!text.trim() || state.status === "running"}>
              {modeLabels[mode]} JSON
            </Button>
            <Button variant="ghost" onClick={() => setText(SAMPLE)}>
              Load example
            </Button>
            {text ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setText("");
                  setOutput(null);
                  task.reset();
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel
        title="Result"
        actions={
          success && success.mode !== "validate" ? (
            <>
              <CopyButton text={success.result.output} />
              <DownloadLink blob={output} fileName="formatted.json" label="Download .json" />
            </>
          ) : null
        }
      >
        {state.status === "idle" ? (
          <EmptyState icon="code" title="Nothing yet">
            Your formatted JSON, or the exact location of any error, will appear here.
          </EmptyState>
        ) : null}

        {state.status === "running" ? (
          <div className="space-y-3">
            <ProgressBar value={null} label="Working…" />
            <Button variant="secondary" size="sm" onClick={task.cancel}>
              Cancel
            </Button>
          </div>
        ) : null}

        {state.status === "error" ? <ErrorState error={state.error} /> : null}

        {failure ? (
          <div className="space-y-3" role="alert">
            <Notice tone="danger" title={`Line ${failure.line}, column ${failure.column}`}>
              {failure.message}
            </Notice>
            <Button variant="secondary" size="sm" onClick={() => goToError(failure.offset)}>
              Show in input
            </Button>
          </div>
        ) : null}

        {success ? (
          <div className="space-y-3">
            <Notice tone="success" role="status" title="Valid JSON">
              {success.result.stats.values.toLocaleString("en")} values,{" "}
              {success.result.stats.keys.toLocaleString("en")} keys, nested {success.result.stats.depth} deep. Numbers
              and strings are kept exactly as written.
            </Notice>
            {success.mode !== "validate" ? (
              <Field label="Output" hideLabel>
                {(context) => (
                  <TextArea
                    context={context}
                    readOnly
                    rows={14}
                    wrap="off"
                    spellCheck={false}
                    value={success.result.output}
                    className="font-mono text-[13px]"
                  />
                )}
              </Field>
            ) : null}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
