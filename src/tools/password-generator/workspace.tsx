"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Segmented } from "@/components/ui/field";
import {
  calculateEntropy,
  generatePassphrase,
  generatePassword,
  type PasswordStrength,
} from "@/engines/crypto/password";

type Mode = "password" | "passphrase";

export default function PasswordGeneratorWorkspace() {
  const [mode, setMode] = useState<Mode>("password");
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");

  const [nonce, setNonce] = useState(0);

  const output = useMemo(() => {
    void nonce;
    if (mode === "password") {
      return generatePassword({
        length,
        uppercase,
        lowercase,
        numbers,
        symbols,
        excludeAmbiguous,
      });
    }
    return generatePassphrase(wordCount, separator);
  }, [mode, length, uppercase, lowercase, numbers, symbols, excludeAmbiguous, wordCount, separator, nonce]);

  const strength: PasswordStrength = useMemo(() => calculateEntropy(output), [output]);

  const regenerate = () => setNonce((n) => n + 1);

  const strengthColor = {
    Weak: "text-danger-fg bg-danger-soft border-danger/40",
    Fair: "text-warning-fg bg-warning-soft border-warning/40",
    Strong: "text-accent bg-accent/10 border-accent/30",
    "Very Strong": "text-success-fg bg-success-soft border-success/40",
  }[strength.label];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Configuration">
        <div className="space-y-5">
          <Segmented
            legend="Generator Mode"
            value={mode}
            onChange={(val) => setMode(val as Mode)}
            options={[
              { value: "password", label: "Random Password" },
              { value: "passphrase", label: "Memorable Passphrase" },
            ]}
          />

          {mode === "password" ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium text-fg mb-1">
                  <span>Password Length:</span>
                  <span className="font-mono text-accent font-bold">{length} characters</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full cursor-pointer accent-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Checkbox
                  checked={uppercase}
                  onChange={(e) => setUppercase(e.target.checked)}
                  label="Uppercase (A-Z)"
                />
                <Checkbox
                  checked={lowercase}
                  onChange={(e) => setLowercase(e.target.checked)}
                  label="Lowercase (a-z)"
                />
                <Checkbox checked={numbers} onChange={(e) => setNumbers(e.target.checked)} label="Numbers (0-9)" />
                <Checkbox checked={symbols} onChange={(e) => setSymbols(e.target.checked)} label="Symbols (!@#$...)" />
              </div>

              <div className="pt-1">
                <Checkbox
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  label="Avoid ambiguous characters (1, l, I, 0, O)"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium text-fg mb-1">
                  <span>Number of Words:</span>
                  <span className="font-mono text-accent font-bold">{wordCount} words</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full cursor-pointer accent-accent"
                />
              </div>

              <Segmented
                legend="Word Separator"
                value={separator}
                onChange={(val) => setSeparator(val)}
                options={[
                  { value: "-", label: "Hyphen (-)" },
                  { value: " ", label: "Space" },
                  { value: ".", label: "Dot (.)" },
                  { value: "_", label: "Underscore (_)" },
                ]}
              />
            </div>
          )}

          <div className="pt-2">
            <Button variant="primary" onClick={regenerate} className="w-full sm:w-auto">
              Generate New
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Generated Secret">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Result</span>
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${strengthColor}`}>
                {strength.label} (~{strength.bits} bits entropy)
              </span>
            </div>
            <div className="rounded border border-border-strong bg-surface-raised p-4 font-mono text-base text-fg break-all select-all flex items-center min-h-[72px]">
              {output}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CopyButton text={output} label="Copy Secret" />
            <Button variant="secondary" size="sm" onClick={regenerate}>
              Regenerate
            </Button>
          </div>

          <p className="text-xs text-fg-muted pt-2 border-t border-border-strong">
            Entropy is sourced directly from your browser&rsquo;s cryptographic hardware random engine
            (crypto.getRandomValues). Secrets are never transmitted, logged, or saved.
          </p>
        </div>
      </Panel>
    </div>
  );
}
