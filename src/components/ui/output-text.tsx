"use client";

import { cn } from "@/lib/cn";

import { Field, TextArea } from "./field";
import { Notice } from "./states";

/**
 * Longest result shown in an output box. Laying out a multi-megabyte textarea takes
 * seconds in Chromium (a 4.8 M-character JSON result took 3.3 s, against 0.25 s to
 * produce it), so only the start is shown. Copy and Download always use the full text.
 */
export const PREVIEW_CHARS = 100_000;

export function OutputText({
  value,
  label = "Output",
  rows = 12,
  className,
  wrap,
}: {
  value: string;
  label?: string;
  rows?: number;
  className?: string;
  wrap?: "off" | "soft";
}) {
  const truncated = value.length > PREVIEW_CHARS;
  return (
    <div className="space-y-3">
      {truncated ? (
        <Notice tone="warning">
          Showing the first {PREVIEW_CHARS.toLocaleString("en")} of {value.length.toLocaleString("en")} characters, so
          the page stays responsive. Copy and Download give you the full result.
        </Notice>
      ) : null}
      <Field label={label} hideLabel>
        {(context) => (
          <TextArea
            context={context}
            readOnly
            rows={rows}
            wrap={wrap}
            spellCheck={false}
            value={truncated ? value.slice(0, PREVIEW_CHARS) : value}
            className={cn("font-mono", className)}
          />
        )}
      </Field>
    </div>
  );
}
