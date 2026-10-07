"use client";

import { useDeferredValue, useId, useState } from "react";

import { Icon } from "@/components/icons";
import { searchTools } from "@/lib/search";
import type { ToolSummary } from "@/lib/tool-summary";

import { ToolGrid } from "./tool-card";

/** Every tool in a category, with a filter box. The full list is static HTML. */
export function CategoryTools({
  tools,
  categoryName,
  headingId,
}: {
  tools: readonly ToolSummary[];
  categoryName: string;
  headingId: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query).trim();
  const results = deferred ? searchTools(tools, deferred).map((result) => result.tool) : tools;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id={headingId} className="font-display text-lg font-semibold text-fg">
          All {categoryName.toLowerCase()} tools{" "}
          <span className="text-sm font-normal text-fg-subtle tabular-nums">{tools.length}</span>
        </h2>
        {tools.length > 6 ? (
          <div className="relative w-full sm:w-72">
            <label htmlFor={`${id}-q`} className="sr-only">
              Filter {categoryName.toLowerCase()} tools
            </label>
            <Icon
              name="filter"
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
            />
            <input
              id={`${id}-q`}
              type="search"
              autoComplete="off"
              spellCheck={false}
              placeholder={`Filter ${categoryName.toLowerCase()} tools…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-(--radius) border border-border-strong bg-surface pr-3 pl-9 text-base text-fg transition-colors hover:border-fg-subtle focus-visible:border-accent sm:text-sm"
            />
          </div>
        ) : null}
      </div>
      <p role="status" className={deferred ? "mb-3 text-sm text-fg-muted" : "sr-only"}>
        {deferred
          ? results.length === 0
            ? `No ${categoryName.toLowerCase()} tool matches “${deferred}”.`
            : `${results.length} of ${tools.length} match “${deferred}”.`
          : ""}
      </p>
      {results.length > 0 ? (
        <ToolGrid tools={results} showCategory={false} />
      ) : (
        <div className="rounded-(--radius-lg) border border-dashed border-border-strong px-6 py-10 text-center text-sm text-fg-muted">
          Nothing in this category matches. Try the{" "}
          <button type="button" className="text-accent-text underline underline-offset-2" onClick={() => setQuery("")}>
            full list
          </button>{" "}
          or press <kbd className="font-medium text-fg">Ctrl K</kbd> to search every tool.
        </div>
      )}
    </section>
  );
}
