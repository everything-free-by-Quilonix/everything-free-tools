"use client";

import { useId, useRef, useState, type DragEvent } from "react";

import { Icon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * File input with drag and drop.
 *
 * The visible "Choose files" button is a real <label> for a native file input, so
 * it works with the keyboard, screen readers and on phones, where drag and drop
 * isn't available. Dropping is an extra, never the only way.
 */
export function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  label,
  hint,
  disabled,
}: {
  accept: readonly string[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (!disabled) take(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border-2 border-dashed px-4 py-8 text-center transition-colors",
        over ? "border-accent bg-accent-soft" : "border-border-strong bg-surface",
      )}
    >
      <Icon name="upload" size={28} className="text-fg-subtle" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-muted">
          {hint ? `${hint} ` : ""}
          <span className="hidden sm:inline">You can also drop {multiple ? "files" : "a file"} here.</span>
        </p>
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept.join(",")}
        multiple={multiple}
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => {
          take(event.target.files);
          // Allow choosing the same file again.
          event.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        className={buttonClasses({
          variant: "secondary",
          className: cn(
            "cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            disabled && "pointer-events-none opacity-50",
          ),
        })}
      >
        {multiple ? "Choose files" : "Choose a file"}
      </label>
    </div>
  );
}
