"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Segmented, Select, TextArea, TextInput } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { looksLikeBareDomain, textPayload, wifiPayload, type WifiSecurity } from "@/engines/qr/payload";
import {
  colourWarning,
  createMatrix,
  modulesPath,
  pngBlob,
  QUIET_ZONE,
  svgMarkup,
  type ErrorCorrection,
  type QrMatrix,
} from "@/engines/qr/render";
import { MIME, textBlob } from "@/lib/downloads";
import { toUserError, type UserError } from "@/lib/errors";

type Mode = "text" | "wifi";

const ECC_HINT: Record<ErrorCorrection, string> = {
  L: "Low: recovers about 7% damage. Holds the most content.",
  M: "Medium: recovers about 15% damage. A good default.",
  Q: "Quartile: recovers about 25% damage.",
  H: "High: recovers about 30% damage. Best for printed codes that may get scuffed.",
};

export default function QrGeneratorWorkspace() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState<WifiSecurity>("WPA");
  const [hidden, setHidden] = useState(false);
  const [ecc, setEcc] = useState<ErrorCorrection>("M");
  const [size, setSize] = useState("1024");
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");

  const deferredText = useDeferredValue(text);

  // Build the code as the user types. Empty input is "nothing yet", not an error.
  const built = useMemo((): { matrix: QrMatrix; payload: string } | { error: UserError } | null => {
    try {
      if (mode === "text") {
        if (!deferredText) return null;
        const payload = textPayload(deferredText);
        return { matrix: createMatrix(payload, ecc), payload };
      }
      if (!ssid) return null;
      const payload = wifiPayload({ ssid, password, security, hidden });
      return { matrix: createMatrix(payload, ecc), payload };
    } catch (error) {
      return { error: toUserError(error) };
    }
  }, [mode, deferredText, ssid, password, security, hidden, ecc]);

  const matrix = built && "matrix" in built ? built.matrix : null;
  const warning = colourWarning(foreground, background);

  const svg = useMemo(
    () => (matrix ? textBlob(svgMarkup(matrix, foreground, background), MIME.svg) : null),
    [matrix, foreground, background],
  );

  // The PNG is encoded asynchronously; a finished PNG is only used while it still
  // matches the current code, size and colours.
  const pngSource = useMemo(
    () => (matrix ? { matrix, size: Number(size), foreground, background } : null),
    [matrix, size, foreground, background],
  );
  const [pngResult, setPngResult] = useState<{ source: typeof pngSource; blob: Blob } | null>(null);
  useEffect(() => {
    if (!pngSource) return;
    let live = true;
    pngBlob(pngSource.matrix, pngSource.size, pngSource.foreground, pngSource.background).then(
      (blob) => {
        if (live) setPngResult({ source: pngSource, blob });
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [pngSource]);
  const png = pngResult && pngResult.source === pngSource ? pngResult.blob : null;

  const path = useMemo(() => (matrix ? modulesPath(matrix) : ""), [matrix]);

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Panel title="Content">
        <div className="space-y-5">
          <Segmented
            legend="Type"
            value={mode}
            onChange={setMode}
            options={[
              { value: "text", label: "Link or text" },
              { value: "wifi", label: "Wi-Fi network" },
            ]}
          />

          {mode === "text" ? (
            <Field
              label="Link or text"
              hint="Links should start with https:// so phones open them."
              aside={text ? `${new TextEncoder().encode(text).length.toLocaleString("en")} bytes` : undefined}
            >
              {(context) => (
                <TextArea
                  context={context}
                  rows={4}
                  value={text}
                  placeholder="https://example.com"
                  onChange={(event) => setText(event.target.value)}
                />
              )}
            </Field>
          ) : (
            <div className="space-y-4">
              <Field label="Network name (SSID)">
                {(context) => (
                  <TextInput
                    context={context}
                    value={ssid}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => setSsid(event.target.value)}
                  />
                )}
              </Field>
              <Field label="Security">
                {(context) => (
                  <Select
                    context={context}
                    value={security}
                    onChange={(event) => setSecurity(event.target.value as WifiSecurity)}
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP (old)</option>
                    <option value="nopass">No password</option>
                  </Select>
                )}
              </Field>
              {security !== "nopass" ? (
                <Field label="Password" hint="Anyone who can see the QR code can read this password.">
                  {(context) => (
                    <TextInput
                      context={context}
                      type="text"
                      value={password}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  )}
                </Field>
              ) : null}
              <Checkbox label="Hidden network" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />
            </div>
          )}

          <details className="rounded-[var(--radius)] border border-border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-fg">Appearance and error correction</summary>
            <div className="mt-4 space-y-4">
              <Segmented
                legend="Error correction"
                value={ecc}
                onChange={setEcc}
                options={(["L", "M", "Q", "H"] as const).map((value) => ({ value, label: value }))}
                hint={ECC_HINT[ecc]}
              />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Foreground">
                  {(context) => (
                    <input
                      id={context.id}
                      type="color"
                      value={foreground}
                      onChange={(event) => setForeground(event.target.value)}
                      className="h-11 w-full cursor-pointer rounded-[var(--radius)] border border-border-strong bg-bg p-1"
                    />
                  )}
                </Field>
                <Field label="Background">
                  {(context) => (
                    <input
                      id={context.id}
                      type="color"
                      value={background}
                      onChange={(event) => setBackground(event.target.value)}
                      className="h-11 w-full cursor-pointer rounded-[var(--radius)] border border-border-strong bg-bg p-1"
                    />
                  )}
                </Field>
              </div>
              {warning ? <Notice tone="warning">{warning}</Notice> : null}
              <Field label="PNG size">
                {(context) => (
                  <Select context={context} value={size} onChange={(event) => setSize(event.target.value)}>
                    <option value="512">About 512 px</option>
                    <option value="1024">About 1024 px</option>
                    <option value="2048">About 2048 px</option>
                  </Select>
                )}
              </Field>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setForeground("#000000");
                  setBackground("#ffffff");
                }}
              >
                Reset colours
              </Button>
            </div>
          </details>
        </div>
      </Panel>

      <Panel title="QR code">
        {built && "error" in built ? <ErrorState error={built.error} /> : null}
        {!built ? (
          <EmptyState icon="qr" title="Nothing to show yet">
            {mode === "text" ? "Enter a link or some text." : "Enter the network name."} The code appears here as you
            type.
          </EmptyState>
        ) : null}
        {matrix ? (
          <div className="space-y-4">
            <div className="mx-auto w-full max-w-72 overflow-hidden rounded-[var(--radius)] border border-border">
              <svg
                viewBox={`0 0 ${matrix.size} ${matrix.size}`}
                role="img"
                aria-label={
                  mode === "wifi" ? `QR code for the Wi-Fi network ${ssid}` : "QR code for the text you entered"
                }
                shapeRendering="crispEdges"
                className="block h-auto w-full"
              >
                <rect width={matrix.size} height={matrix.size} fill={background} />
                <path d={path} fill={foreground} />
              </svg>
            </div>
            <p role="status" className="text-center text-xs text-fg-muted">
              Version {matrix.version} · {matrix.size - 2 * QUIET_ZONE} × {matrix.size - 2 * QUIET_ZONE} modules · error
              correction {ecc}
            </p>
            {mode === "text" && looksLikeBareDomain(deferredText) ? (
              <Notice tone="warning">
                This looks like a link without https://. Some phones will show it as text instead of opening it.
              </Notice>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              <DownloadLink blob={png} fileName="qr-code.png" label="Download PNG" />
              <DownloadLink blob={svg} fileName="qr-code.svg" label="Download SVG" variant="secondary" />
            </div>
            <p className="text-center text-xs text-fg-subtle">Scan it with your phone before printing it.</p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
