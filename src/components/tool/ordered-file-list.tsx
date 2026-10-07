"use client";

import type { ReactNode } from "react";

import { Icon } from "@/components/icons";
import { formatBytes } from "@/lib/files";

/**
 * An ordered list of chosen files, for tools where order matters (merging, building
 * a PDF from images). Each row has Move up, Move down and Remove buttons: plain
 * buttons, so reordering works with a keyboard, a screen reader and on a phone,
 * with no drag and drop required.
 */
export interface OrderedFile {
  id: string;
  file: File;
  /** Extra detail shown under the name, such as a page count. */
  detail?: ReactNode;
}

export function OrderedFileList({
  items,
  onChange,
  label,
}: {
  items: readonly OrderedFile[];
  onChange: (items: OrderedFile[]) => void;
  /** Accessible name for the list, such as "PDFs to merge". */
  label: string;
}) {
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <ol aria-label={label} className="divide-y divide-border overflow-hidden rounded-(--radius) border border-border">
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3 bg-surface px-3 py-2">
          <span className="w-5 shrink-0 text-right text-xs text-fg-subtle tabular-nums">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-fg">{item.file.name}</span>
            <span className="block text-xs text-fg-muted">
              {formatBytes(item.file.size)}
              {item.detail ? <> · {item.detail}</> : null}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            <RowButton label={`Move ${item.file.name} up`} disabled={index === 0} onClick={() => move(index, -1)}>
              <Icon name="chevron-down" size={16} className="rotate-180" />
            </RowButton>
            <RowButton
              label={`Move ${item.file.name} down`}
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              <Icon name="chevron-down" size={16} />
            </RowButton>
            <RowButton
              label={`Remove ${item.file.name}`}
              onClick={() => onChange(items.filter((other) => other.id !== item.id))}
            >
              <Icon name="x" size={16} />
            </RowButton>
          </span>
        </li>
      ))}
    </ol>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

let counter = 0;
/** A stable id for a chosen file within this page. */
export function fileId(): string {
  counter += 1;
  return `f${counter}`;
}
