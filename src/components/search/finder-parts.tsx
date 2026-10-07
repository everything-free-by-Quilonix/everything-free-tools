"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Icon, type IconName } from "@/components/icons";
import { ProcessingBadge } from "@/components/tool/privacy-notice";
import { cn } from "@/lib/cn";
import type { ProcessingKind } from "@/lib/processing";

/**
 * Pieces shared by the home page finder and the command palette: one result row,
 * and the keyboard model of a combobox with a listbox popup (WAI-ARIA APG). Focus
 * stays in the text field; the highlighted option is announced through
 * aria-activedescendant.
 */

export interface FinderOption {
  id: string;
  href: string;
  title: string;
  description?: string;
  meta?: string;
  kind?: ProcessingKind;
  icon: IconName;
}

export function useListNavigation(count: number, onPick: (index: number) => void, resetKey = "") {
  const key = `${resetKey}\u0000${count}`;
  const [active, setActive] = useState(count > 0 ? 0 : -1);
  const [previousKey, setPreviousKey] = useState(key);
  // A new result list starts with its first option highlighted.
  if (previousKey !== key) {
    setPreviousKey(key);
    setActive(count > 0 ? 0 : -1);
  }

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (count === 0) return false;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActive((index) => (index + 1) % count);
          return true;
        case "ArrowUp":
          event.preventDefault();
          setActive((index) => (index <= 0 ? count - 1 : index - 1));
          return true;
        case "Home":
          if (!event.ctrlKey) return false;
          event.preventDefault();
          setActive(0);
          return true;
        case "End":
          if (!event.ctrlKey) return false;
          event.preventDefault();
          setActive(count - 1);
          return true;
        case "Enter":
          if (active < 0) return false;
          event.preventDefault();
          onPick(active);
          return true;
        default:
          return false;
      }
    },
    [active, count, onPick],
  );

  return { active: Math.min(active, count - 1), setActive, onKeyDown };
}

/** Keeps the highlighted option in view as the arrow keys move it. */
export function useScrollActiveIntoView(listId: string, active: number) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [listId, active]);
}

export function ResultRow({
  option,
  index,
  listId,
  active,
  onHover,
  onPick,
}: {
  option: FinderOption;
  index: number;
  listId: string;
  active: boolean;
  onHover: (index: number) => void;
  onPick: (index: number) => void;
}) {
  return (
    <li
      id={`${listId}-${index}`}
      role="option"
      aria-selected={active}
      onMouseMove={() => onHover(index)}
      // Keep focus in the text field while clicking.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(index)}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-(--radius) px-3 py-2.5 transition-colors",
        active ? "bg-surface-hover" : "hover:bg-surface-raised",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md border",
          active ? "border-border-strong bg-surface text-fg" : "border-border bg-surface-raised text-fg-subtle",
        )}
      >
        <Icon name={option.icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{option.title}</span>
        {option.description ? <span className="block truncate text-xs text-fg-muted">{option.description}</span> : null}
        {option.meta || option.kind ? (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle sm:hidden">
            {option.meta ? <span>{option.meta}</span> : null}
            {option.meta && option.kind ? <span aria-hidden="true">·</span> : null}
            {option.kind ? <ProcessingBadge kind={option.kind} /> : null}
          </span>
        ) : null}
      </span>
      <span className="hidden shrink-0 items-center gap-2 text-xs text-fg-subtle sm:flex">
        {option.meta ? <span>{option.meta}</span> : null}
        {option.meta && option.kind ? <span aria-hidden="true">·</span> : null}
        {option.kind ? <ProcessingBadge kind={option.kind} /> : null}
      </span>
      <Icon
        name="corner-down-left"
        size={14}
        className={cn("hidden shrink-0 text-fg-subtle sm:block", active ? "opacity-100" : "opacity-0")}
      />
    </li>
  );
}
