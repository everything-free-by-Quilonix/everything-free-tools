"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/states";
import { convertBases } from "@/engines/math/number-base";

export default function NumberBaseWorkspace() {
  const [val, setVal] = useState("255");
  const [sourceBase, setSourceBase] = useState<number>(10);

  const conversions = useMemo(() => {
    if (!val.trim()) return null;
    try {
      const res = convertBases(val, sourceBase);
      return { ok: true as const, bin: res.binary, oct: res.octal, dec: res.decimal, hex: res.hex };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  }, [val, sourceBase]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Input Number">
        <div className="space-y-4">
          <Field label="Value" hint="Supports large integers safely via BigInt arbitrary-precision arithmetic.">
            {(context) => (
              <TextInput
                context={context}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="Enter number..."
                className="font-mono text-sm"
              />
            )}
          </Field>

          <div className="space-y-1.5">
            <span className="text-xs text-fg-muted font-medium">Source Radix:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Decimal (10)", base: 10 },
                { label: "Hex (16)", base: 16 },
                { label: "Binary (2)", base: 2 },
                { label: "Octal (8)", base: 8 },
              ].map((b) => (
                <button
                  key={b.base}
                  type="button"
                  onClick={() => setSourceBase(b.base)}
                  className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                    sourceBase === b.base
                      ? "bg-accent text-accent-fg border-accent font-medium"
                      : "border-border text-fg-muted hover:text-fg hover:border-fg-subtle"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setVal("")} disabled={!val}>
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setVal("255");
                setSourceBase(10);
              }}
            >
              Reset 255
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Base Representations">
        {conversions ? (
          conversions.ok ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="rounded border border-border bg-surface-raised p-3 space-y-1">
                <div className="flex justify-between items-center text-fg-subtle">
                  <span>HEXADECIMAL (BASE 16)</span>
                  <CopyButton text={conversions.hex} size="sm" />
                </div>
                <p className="text-sm font-bold text-accent break-all">{conversions.hex}</p>
              </div>

              <div className="rounded border border-border bg-surface-raised p-3 space-y-1">
                <div className="flex justify-between items-center text-fg-subtle">
                  <span>DECIMAL (BASE 10)</span>
                  <CopyButton text={conversions.dec} size="sm" />
                </div>
                <p className="text-sm font-bold text-fg break-all">{conversions.dec}</p>
              </div>

              <div className="rounded border border-border bg-surface-raised p-3 space-y-1">
                <div className="flex justify-between items-center text-fg-subtle">
                  <span>OCTAL (BASE 8)</span>
                  <CopyButton text={conversions.oct} size="sm" />
                </div>
                <p className="text-sm font-bold text-fg break-all">{conversions.oct}</p>
              </div>

              <div className="rounded border border-border bg-surface-raised p-3 space-y-1">
                <div className="flex justify-between items-center text-fg-subtle">
                  <span>BINARY (BASE 2)</span>
                  <CopyButton text={conversions.bin} size="sm" />
                </div>
                <p className="text-sm font-bold text-fg break-all">{conversions.bin}</p>
              </div>
            </div>
          ) : (
            <Notice tone="danger" title="Invalid Digits for Base">
              {conversions.error}
            </Notice>
          )
        ) : (
          <p className="text-xs text-fg-muted p-4 text-center">Enter a number to see base conversions.</p>
        )}
      </Panel>
    </div>
  );
}
