"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { categoryIcons } from "@/components/tool/tool-card";
import { Kbd } from "@/components/ui/kbd";
import { ESSENTIAL_TOOLS, SEARCH_SUGGESTIONS } from "@/config/discovery";
import { cn } from "@/lib/cn";
import { searchTools } from "@/lib/search";
import { toolHref, toSummary, type ToolSummary } from "@/lib/tool-summary";
import { getCategory, populatedCategories, tools, toolsInCategory } from "@/tools/registry";

import { ResultRow, useListNavigation, useScrollActiveIntoView, type FinderOption } from "./finder-parts";

/**
 * The command palette: a modal search over every tool and category.
 *
 * A native <dialog> opened with showModal(), so the browser provides the focus
 * trap, Escape to close, the inert background and focus return. This module (and
 * the registry it reads) is loaded only when search is first opened.
 */

const summaries: ToolSummary[] = tools.map(toSummary);
const bySlug = new Map(summaries.map((tool) => [tool.slug, tool]));
const MAX_RESULTS = 30;

const toolOption = (tool: ToolSummary): FinderOption => ({
  id: `tool:${tool.slug}`,
  href: toolHref(tool),
  title: tool.name,
  description: tool.shortDescription,
  meta: getCategory(tool.category).name,
  kind: tool.kind,
  icon: categoryIcons[tool.category],
});

const categoryOptions: FinderOption[] = populatedCategories().map((category) => {
  const count = toolsInCategory(category.id).length;
  return {
    id: `category:${category.slug}`,
    href: `/categories/${category.slug}/`,
    title: `${category.name} tools`,
    description: category.tagline,
    meta: `${count} ${count === 1 ? "tool" : "tools"}`,
    icon: categoryIcons[category.id],
  };
});

const essentialOptions: FinderOption[] = ESSENTIAL_TOOLS.flatMap((slug) => {
  const tool = bySlug.get(slug);
  return tool ? [toolOption(tool)] : [];
});

interface Group {
  label: string;
  options: FinderOption[];
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const { groups, total } = useMemo(() => {
    if (!trimmed) {
      return {
        groups: [
          { label: "Essential tools", options: essentialOptions },
          { label: "Categories", options: categoryOptions },
        ] satisfies Group[],
        total: 0,
      };
    }
    const results = searchTools(summaries, trimmed);
    const needle = trimmed.toLowerCase();
    const categories = categoryOptions.filter(
      (option) => option.title.toLowerCase().includes(needle) || option.description?.toLowerCase().includes(needle),
    );
    const list: Group[] = [];
    if (results.length > 0)
      list.push({ label: "Tools", options: results.slice(0, MAX_RESULTS).map((result) => toolOption(result.tool)) });
    if (categories.length > 0) list.push({ label: "Categories", options: categories });
    return { groups: list, total: results.length };
  }, [trimmed]);

  const flat = useMemo(() => groups.flatMap((group) => group.options), [groups]);
  // Where each group starts in the flat option list.
  const starts = useMemo(
    () => groups.map((_, groupIndex) => groups.slice(0, groupIndex).reduce((sum, g) => sum + g.options.length, 0)),
    [groups],
  );

  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const pick = (index: number) => {
    const option = flat[index];
    if (option) go(option.href);
  };
  const { active, setActive, onKeyDown } = useListNavigation(flat.length, pick, trimmed);
  useScrollActiveIntoView(listId, active);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    input.current?.focus();
    // The page behind should not scroll while search is open.
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
      if (element.open) element.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label="Search tools"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mx-auto mt-[min(12vh,7rem)] h-auto max-h-[min(36rem,calc(100dvh-2rem))] w-[calc(100%-1.5rem)] max-w-2xl animate-pop-in flex-col overflow-hidden rounded-(--radius-lg) border border-border-strong bg-surface p-0 text-fg shadow-overlay open:flex max-sm:mt-3"
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Icon name="search" size={18} className="shrink-0 text-fg-subtle" />
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search tools and categories
        </label>
        <input
          ref={input}
          id={`${listId}-input`}
          type="text"
          inputMode="search"
          role="combobox"
          aria-expanded={flat.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Search for a tool…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-fg-muted hover:bg-surface-hover hover:text-fg"
        >
          <span className="max-sm:hidden">
            <Kbd>Esc</Kbd>
          </span>
          <span className="sm:hidden">Close</span>
          <span className="sr-only max-sm:hidden">Close search</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        <p role="status" className="sr-only">
          {trimmed
            ? total === 0
              ? `No tools match ${trimmed}.`
              : `${total} ${total === 1 ? "tool" : "tools"} found.`
            : ""}
        </p>
        {flat.length > 0 ? (
          <div id={listId} role="listbox" aria-label="Results" className="space-y-3">
            {groups.map((group, groupIndex) => (
              <ul key={group.label} role="group" aria-labelledby={`${listId}-g${groupIndex}`}>
                <li
                  role="presentation"
                  id={`${listId}-g${groupIndex}`}
                  className="px-3 pt-1 pb-1.5 text-2xs font-semibold tracking-[0.08em] text-fg-subtle uppercase"
                >
                  {group.label}
                </li>
                {group.options.map((option, optionIndex) => {
                  const index = starts[groupIndex]! + optionIndex;
                  return (
                    <ResultRow
                      key={option.id}
                      option={option}
                      index={index}
                      listId={listId}
                      active={index === active}
                      onHover={setActive}
                      onPick={pick}
                    />
                  );
                })}
              </ul>
            ))}
          </div>
        ) : (
          <NoMatches query={trimmed} onSuggest={setQuery} onCategory={go} />
        )}
        {trimmed && total > MAX_RESULTS ? (
          <p className="px-3 pt-2 text-xs text-fg-muted">
            Showing the first {MAX_RESULTS} of {total}.{" "}
            <button
              type="button"
              className="text-accent-text underline underline-offset-2"
              onClick={() => go(`/tools/?q=${encodeURIComponent(trimmed)}`)}
            >
              See all results
            </button>
          </p>
        ) : null}
      </div>

      <div className="hidden items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-fg-subtle sm:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> to open
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> to close
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Icon name="lock" size={12} className="text-success-fg" /> Search runs in your browser
        </span>
      </div>
    </dialog>
  );
}

function NoMatches({
  query,
  onSuggest,
  onCategory,
}: {
  query: string;
  onSuggest: (query: string) => void;
  onCategory: (href: string) => void;
}) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="font-display text-base font-semibold text-fg">No matching tools</p>
      <p className="mt-1 text-sm text-fg-muted">
        Nothing here does &ldquo;{query}&rdquo; yet. Try a shorter word, or one of these:
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SEARCH_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggest(suggestion)}
            className="rounded-full border border-border-strong px-3 py-1 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        {categoryOptions.slice(0, 5).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onCategory(option.href)}
            className={cn("inline-flex items-center gap-1.5 text-fg-muted hover:text-fg")}
          >
            <Icon name={option.icon} size={14} />
            {option.title}
          </button>
        ))}
      </div>
    </div>
  );
}
