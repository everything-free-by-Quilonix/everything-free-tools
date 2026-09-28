"use client";

import { useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Segmented, TextArea, TextInput } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { generateUuids, MAX_UUIDS, type UuidVersion } from "@/engines/crypto/uuid";
import { textBlob } from "@/lib/downloads";
import { toUserError, type UserError } from "@/lib/errors";

export default function UuidGeneratorWorkspace() {
  const [version, setVersion] = useState<UuidVersion>(4);
  const [count, setCount] = useState("1");
  const [uppercase, setUppercase] = useState(false);
  const [compact, setCompact] = useState(false);
  const [braces, setBraces] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<UserError | null>(null);

  const parsed = Number(count);
  const countError =
    count.trim() === "" || !Number.isInteger(parsed) || parsed < 1 || parsed > MAX_UUIDS
      ? `Enter a whole number from 1 to ${MAX_UUIDS.toLocaleString("en")}.`
      : null;

  const generate = () => {
    if (countError) return;
    try {
      const list = generateUuids({ version, count: parsed, uppercase, compact, braces });
      setUuids(list);
      setBlob(textBlob(`${list.join("\n")}\n`));
      setError(null);
    } catch (caught) {
      setUuids([]);
      setBlob(null);
      setError(toUserError(caught));
    }
  };

  const text = uuids.join("\n");

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
      <Panel title="Options">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            generate();
          }}
        >
          <Segmented
            legend="Version"
            value={String(version) as "4" | "7"}
            onChange={(value) => setVersion(Number(value) as UuidVersion)}
            options={[
              { value: "4", label: "v4 · random" },
              { value: "7", label: "v7 · time-ordered" },
            ]}
            hint={
              version === 7
                ? "Starts with the creation time, so IDs sort in order. The time can be read from the ID."
                : "Fully random. Reveals nothing about when or where it was made."
            }
          />
          <Field
            label="How many"
            hint={`1 to ${MAX_UUIDS.toLocaleString("en")}.`}
            error={count && countError ? countError : null}
          >
            {(context) => (
              <TextInput
                context={context}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_UUIDS}
                step={1}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="max-w-40"
              />
            )}
          </Field>
          <fieldset className="space-y-2.5">
            <legend className="mb-2 text-sm font-medium text-fg">Format</legend>
            <Checkbox label="Uppercase" checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} />
            <Checkbox label="Remove hyphens" checked={compact} onChange={(event) => setCompact(event.target.checked)} />
            <Checkbox
              label="Wrap in braces { }"
              checked={braces}
              onChange={(event) => setBraces(event.target.checked)}
            />
          </fieldset>
          <Button type="submit" disabled={Boolean(countError)}>
            Generate
          </Button>
        </form>
      </Panel>

      <Panel
        title="UUIDs"
        actions={
          uuids.length > 0 ? (
            <>
              <CopyButton text={text} label={uuids.length === 1 ? "Copy" : "Copy all"} />
              <DownloadLink blob={blob} fileName={`uuids-v${version}.txt`} label="Download .txt" variant="secondary" />
            </>
          ) : null
        }
      >
        {error ? <ErrorState error={error} /> : null}
        {!error && uuids.length === 0 ? (
          <EmptyState icon="code" title="Nothing generated yet">
            Choose your options and select Generate.
          </EmptyState>
        ) : null}
        {uuids.length > 0 ? (
          <div className="space-y-3">
            <p role="status" className="text-sm text-fg-muted">
              Generated {uuids.length.toLocaleString("en")} version {version} {uuids.length === 1 ? "UUID" : "UUIDs"}.
            </p>
            <Field label="Generated UUIDs" hideLabel>
              {(context) => (
                <TextArea
                  context={context}
                  readOnly
                  rows={Math.min(14, Math.max(3, uuids.length))}
                  value={text}
                  spellCheck={false}
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
            <Notice>UUIDs are identifiers, not secrets. Don&rsquo;t use them as passwords or access tokens.</Notice>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
