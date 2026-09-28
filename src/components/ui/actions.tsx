"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { safeFileName } from "@/lib/files";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";
import { useObjectUrl } from "./use-object-url";

/**
 * Copy and download actions.
 *
 * Copy reports what actually happened: "Copied" only after the clipboard write
 * resolves, and a clear message if the browser refused. Download is a plain
 * `<a download>` to an object URL, so it works with the keyboard, can be opened in
 * a new tab, and needs no permission.
 */

export function CopyButton({
  text,
  label = "Copy",
  variant = "secondary",
  size = "sm",
  disabled,
}: {
  text: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 2500);
  };

  return (
    <>
      <button type="button" onClick={copy} disabled={disabled} className={buttonClasses({ variant, size })}>
        <Icon name={state === "copied" ? "check" : "copy"} size={16} />
        {state === "copied" ? "Copied" : label}
      </button>
      <span role="status" className={state === "failed" ? "text-xs text-danger-fg" : "sr-only"}>
        {state === "copied"
          ? "Copied to the clipboard."
          : state === "failed"
            ? "Couldn’t copy. Select the text and copy it manually."
            : ""}
      </span>
    </>
  );
}

export function DownloadLink({
  blob,
  fileName,
  label = "Download",
  variant = "primary",
  size = "sm",
}: {
  blob: Blob | null;
  fileName: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const url = useObjectUrl(blob);
  if (!url) {
    return (
      <span aria-disabled="true" className={buttonClasses({ variant, size })}>
        <Icon name="download" size={16} />
        {label}
      </span>
    );
  }
  return (
    <a href={url} download={safeFileName(fileName)} className={buttonClasses({ variant, size })}>
      <Icon name="download" size={16} />
      {label}
    </a>
  );
}
