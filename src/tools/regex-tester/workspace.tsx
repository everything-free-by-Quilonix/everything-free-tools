"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, TextArea, TextInput } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { explainRegex, COMMON_REGEX_TEMPLATES, testRegex, type RegexTemplate } from "@/engines/developer/regex";

const SAMPLE_TEXT = `Contact us at support@everything.free or sales@example.com!
Order #1042 was processed on 2026-10-02 with invoice INV-9942.
Customer phone: +1 (555) 234-5678.`;

export default function RegexTesterWorkspace() {
  const [pattern, setPattern] = useState("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
  const [flags, setFlags] = useState("g");
  const [testString, setTestString] = useState(SAMPLE_TEXT);
  const [replacement, setReplacement] = useState("[hidden-email]");

  const testResult = useMemo(() => {
    if (!pattern) return null;
    return testRegex(pattern, flags, testString, replacement);
  }, [pattern, flags, testString, replacement]);

  const explanation = useMemo(() => {
    if (!pattern) return [];
    return explainRegex(pattern);
  }, [pattern]);

  const toggleFlag = (f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, "") : prev + f));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Regular Expression">
          <div className="space-y-4">
            <Field label="Pattern" hint="Enter regular expression without enclosing slashes.">
              {(context) => (
                <TextInput
                  context={context}
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="[a-z0-9]+"
                  className="font-mono text-sm"
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-medium text-fg">Flags:</span>
              <Checkbox label="g (Global)" checked={flags.includes("g")} onChange={() => toggleFlag("g")} />
              <Checkbox label="i (Ignore Case)" checked={flags.includes("i")} onChange={() => toggleFlag("i")} />
              <Checkbox label="m (Multiline)" checked={flags.includes("m")} onChange={() => toggleFlag("m")} />
              <Checkbox label="s (DotAll)" checked={flags.includes("s")} onChange={() => toggleFlag("s")} />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-fg-muted font-medium">Common Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_REGEX_TEMPLATES.slice(0, 5).map((p: RegexTemplate) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setPattern(p.pattern);
                      setFlags(p.flags);
                    }}
                    className="rounded border border-border bg-surface-raised px-2 py-0.5 text-xs text-fg-muted hover:text-fg hover:border-fg-subtle transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Substitution / Replacement" hint="Preview string replacement with match groups ($1, $2).">
              {(context) => (
                <TextInput
                  context={context}
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder="replacement string"
                  className="font-mono text-xs"
                />
              )}
            </Field>
          </div>
        </Panel>

        <Panel title="Test String">
          <div className="space-y-4">
            <Field label="Target Text" hint="Test text to match against the pattern.">
              {(context) => (
                <TextArea
                  context={context}
                  rows={8}
                  value={testString}
                  onChange={(e) => setTestString(e.target.value)}
                  placeholder="Paste text to test against..."
                  className="font-mono text-xs"
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setTestString("")} disabled={!testString}>
                Clear Text
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTestString(SAMPLE_TEXT)}>
                Reset Sample
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Matches & Substitution Preview"
        actions={
          testResult && testResult.replacement ? (
            <CopyButton text={testResult.replacement} label="Copy Replaced Text" />
          ) : null
        }
      >
        {testResult ? (
          testResult.isValid ? (
            <div className="space-y-4">
              <Notice tone="success" title={`${testResult.matches.length} Match(es) Found`}>
                Tested safely and locally with browser RegExp engine.
              </Notice>

              {testResult.matches.length > 0 && (
                <div className="rounded border border-border bg-surface-raised p-3 space-y-2">
                  <span className="text-xs font-semibold text-fg">Captured Matches:</span>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {testResult.matches.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs font-mono bg-surface p-1.5 rounded border border-border"
                      >
                        <span className="text-accent font-medium">
                          #{idx + 1}: &quot;{m.match}&quot;
                        </span>
                        <span className="text-fg-subtle">index {m.index}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {replacement && testResult.replacement && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-fg">Replacement Preview:</span>
                  <OutputText value={testResult.replacement} rows={6} />
                </div>
              )}
            </div>
          ) : (
            <Notice tone="danger" title="Invalid Regular Expression">
              {testResult.error}
            </Notice>
          )
        ) : (
          <EmptyState title="No pattern entered">
            Provide a regular expression pattern and test text to view match evaluation and capture groups.
          </EmptyState>
        )}
      </Panel>

      {explanation.length > 0 && (
        <Panel title="Structured Pattern Breakdown">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {explanation.map((item, i) => (
              <div key={i} className="rounded border border-border bg-surface-raised p-2.5 text-xs space-y-0.5">
                <span className="font-mono text-accent font-semibold block">{item.part}</span>
                <span className="text-fg-subtle text-[11px] uppercase tracking-wider block">{item.category}</span>
                <p className="text-fg-muted">{item.meaning}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
