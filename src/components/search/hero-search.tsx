"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";

import { Icon } from "@/components/icons";
import { categoryIcons } from "@/components/tool/tool-card";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import { searchTools } from "@/lib/search";
import { toolHref, type ToolSummary } from "@/lib/tool-summary";
import { getCategory } from "@/tools/registry/categories";

import { ResultRow, useListNavigation, useScrollActiveIntoView, type FinderOption } from "./finder-parts";

const MAX = 7;

/**
 * The home page tool finder: an editable combobox with list autocomplete.
 *
 * It is a plain GET form to /tools/?q=…, so it works before and without
 * JavaScript. Once live, results appear as you type; arrows move through them,
 * Enter opens the highlighted tool, and Enter with nothing highlighted (or the
 * Search button) opens the full results.
 */
export function HeroSearch({ action, tools }: { action: string; tools: readonly ToolSummary[] }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const trimmed = query.trim();

  const { options, total } = useMemo(() => {
    if (!trimmed) return { options: [] as FinderOption[], total: 0 };
    const results = searchTools(tools, trimmed);
    const list: FinderOption[] = results.slice(0, MAX).map(({ tool }) => ({
      id: tool.slug,
      href: toolHref(tool),
      title: tool.name,
      description: tool.shortDescription,
      meta: getCategory(tool.category).name,
      kind: tool.kind,
      icon: categoryIcons[tool.category],
    }));
    if (results.length > MAX) {
      list.push({
        id: "__all",
        href: `/tools/?q=${encodeURIComponent(trimmed)}`,
        title: `See all ${results.length} results`,
        description: `for “${trimmed}”`,
        icon: "list",
      });
    }
    return { options: list, total: results.length };
  }, [tools, trimmed]);

  const expanded = open && trimmed.length > 0;
  const pick = (index: number) => {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    router.push(option.href);
  };
  const { active, setActive, onKeyDown } = useListNavigation(expanded ? options.length : 0, pick, trimmed);
  useScrollActiveIntoView(listId, active);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = (input.current?.value ?? query).trim();
    if (!value) {
      input.current?.focus();
      return;
    }
    setOpen(false);
    router.push(`/tools/?q=${encodeURIComponent(value)}`);
  };

  return (
    <form role="search" action={action} method="get" onSubmit={submit} className="relative">
      <label htmlFor={`${id}-input`} className="sr-only">
        Search for a tool
      </label>
      <div
        className={cn(
          "flex items-center rounded-(--radius-lg) border bg-surface shadow-raised transition-colors",
          expanded ? "border-border-strong" : "border-border-strong hover:border-fg-subtle",
          "has-[input:focus-visible]:border-accent",
        )}
      >
        <Icon name="search" size={20} className="ml-4 shrink-0 text-fg-subtle" />
        <input
          ref={input}
          id={`${id}-input`}
          data-primary-search
          type="text"
          inputMode="search"
          name="q"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Search for a tool…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              if (expanded) setOpen(false);
              else setQuery("");
              return;
            }
            if (!expanded && event.key === "ArrowDown" && trimmed) {
              setOpen(true);
              return;
            }
            if (expanded) onKeyDown(event);
          }}
          // The focus ring is drawn on the wrapper, so the button can sit inside it.
          className="h-14 min-w-0 flex-1 bg-transparent px-3 text-base text-fg outline-none"
        />
        <span className="mr-2 hidden items-center gap-1 text-xs text-fg-subtle sm:flex" aria-hidden="true">
          <Kbd>/</Kbd>
        </span>
        <button
          type="submit"
          className="mr-1.5 inline-flex h-11 items-center rounded-(--radius) bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Search
        </button>
      </div>
      <p id={`${id}-hint`} className="sr-only">
        Results appear as you type. Use the up and down arrows to choose, and Enter to open.
      </p>

      <div
        className={cn(
          "absolute inset-x-0 top-full z-20 mt-2 animate-pop-in overflow-hidden rounded-(--radius-lg) border border-border-strong bg-surface text-left shadow-overlay",
          !expanded && "hidden",
        )}
      >
        {options.length > 0 ? (
          <ul id={listId} role="listbox" aria-label="Matching tools" className="max-h-[22rem] overflow-y-auto p-1.5">
            {options.map((option, index) => (
              <ResultRow
                key={option.id}
                option={option}
                index={index}
                listId={listId}
                active={index === active}
                onHover={setActive}
                onPick={pick}
              />
            ))}
          </ul>
        ) : (
          <div id={listId} className="px-4 py-5 text-sm">
            <p className="font-medium text-fg">No matching tools</p>
            <p className="mt-1 text-fg-muted">
              Try a shorter word, like &ldquo;json&rdquo;, &ldquo;image&rdquo; or &ldquo;text&rdquo;.
            </p>
          </div>
        )}
      </div>
      <p role="status" className="sr-only">
        {expanded ? (total === 0 ? "No matching tools." : `${total} ${total === 1 ? "tool" : "tools"} found.`) : ""}
      </p>
    </form>
  );
}
