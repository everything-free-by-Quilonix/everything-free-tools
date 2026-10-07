"use client";

import { useRef, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Announcer } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field, Segmented, TextArea } from "@/components/ui/field";
import { focusSoon } from "@/components/ui/focus";
import { OutputText } from "@/components/ui/output-text";
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
  /** Made with the result, so an older run can never supply the download. */
  blob: Blob | null;
}

export default function JsonFormatterWorkspace() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<JsonMode>("format");
  const [indent, setIndent] = useState<Indent>(2);
  const input = useRef<HTMLTextAreaElement>(null);
  const submit = useRef<HTMLButtonElement>(null);
  const task = useTask<Outcome>();

  const run = (nextMode = mode, nextIndent = indent) => {
    const payload: JsonTaskInput = { text, mode: nextMode, indent: nextIndent };
    void task.run(async ({ signal }) => {
      const result = await runTask<JsonTaskInput, JsonResult>({
        input: payload,
        worker: () => new Worker(new URL("../../workers/json.worker.ts", import.meta.url), { type: "module" }),
        fallback: () => import("@/engines/data/json").then((engine) => engine.runJson),
        signal,
      });
      const blob = result.ok && nextMode !== "validate" ? textBlob(result.output, MIME.json) : null;
      return { mode: nextMode, result, blob };
    });
  };

  const goToError = (offset: number) => {
    const area = input.current;
    if (!area) return;
    // Offsets are counted after a leading byte order mark, which the parser skips.
    const start = offset + (area.value.charCodeAt(0) === 0xfeff ? 1 : 0);
    area.focus();
    area.setSelectionRange(start, Math.min(start + 1, area.value.length));
  };

  const state = task.state;
  const done = state.status === "done" ? state.output : null;
  const failure = done && !done.result.ok ? done.result.error : null;
  const success = done && done.result.ok ? { mode: done.mode, result: done.result } : null;
  const output = done?.blob ?? null;

  const announcement =
    state.status === "running"
      ? "Working…"
      : success
        ? success.mode === "validate"
          ? "Valid JSON."
          : `Valid JSON. The ${success.mode === "minify" ? "minified" : "formatted"} output is ready.`
        : "";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Announcer message={announcement} />
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
                className="font-mono"
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
            <Button ref={submit} type="submit" disabled={!text.trim() || state.status === "running"}>
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
                  task.reset();
                  // This button disappears with the text; keep focus in the tool.
                  focusSoon(input);
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                task.cancel();
                focusSoon(submit);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : null}

        {state.status === "error" ? <ErrorState error={state.error} /> : null}

        {failure ? (
          <div className="space-y-3">
            <Notice tone="danger" role="alert" title={`Line ${failure.line}, column ${failure.column}`}>
              {failure.message}
            </Notice>
            <Button variant="secondary" size="sm" onClick={() => goToError(failure.offset)}>
              Show in input
            </Button>
          </div>
        ) : null}

        {success ? (
          <div className="space-y-3">
            <Notice tone="success" title="Valid JSON">
              {success.result.stats.values.toLocaleString("en")} values,{" "}
              {success.result.stats.keys.toLocaleString("en")} keys, nested {success.result.stats.depth} deep. Numbers
              and strings are kept exactly as written.
            </Notice>
            {success.mode !== "validate" ? <OutputText value={success.result.output} rows={14} wrap="off" /> : null}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
