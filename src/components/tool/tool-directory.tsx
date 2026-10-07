"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { Field, Select } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import { SEARCH_SUGGESTIONS } from "@/config/discovery";
import { cn } from "@/lib/cn";
import { PROCESSING_KINDS, processingLabels, type ProcessingKind } from "@/lib/processing";
import { searchTools } from "@/lib/search";
import type { ToolSummary } from "@/lib/tool-summary";
import type { ToolCategoryId } from "@/tools/registry/types";

import { categoryIcons, ToolGrid } from "./tool-card";

export interface DirectoryCategory {
  id: ToolCategoryId;
  slug: string;
  name: string;
}

interface Filters {
  q: string;
  category: string;
  processing: ProcessingKind | "";
  format: string;
}

const EMPTY: Filters = { q: "", category: "", processing: "", format: "" };

function readFilters(params: URLSearchParams | null): Filters {
  if (!params) return EMPTY;
  const processing = params.get("processing") ?? "";
  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    processing: (PROCESSING_KINDS as readonly string[]).includes(processing) ? (processing as ProcessingKind) : "",
    format: params.get("format") ?? "",
  };
}

/** The live directory: reads its starting state from the address bar. */
export function ToolDirectory(props: { tools: readonly ToolSummary[]; categories: readonly DirectoryCategory[] }) {
  const params = useSearchParams();
  return <DirectoryView {...props} initial={readFilters(params)} live />;
}

/**
 * Search, filters and results for /tools/.
 *
 * Every filter is reflected in the address bar (?q=&category=&processing=&format=),
 * so a filtered view can be bookmarked or shared. Filter counts are faceted: each
 * option shows how many tools it would leave given the other active filters.
 * Rendered in full as static HTML, so without JavaScript every tool is listed.
 */
export function DirectoryView({
  tools,
  categories,
  initial = EMPTY,
  live = false,
}: {
  tools: readonly ToolSummary[];
  categories: readonly DirectoryCategory[];
  initial?: Filters;
  live?: boolean;
}) {
  const id = useId();
  const [filters, setFilters] = useState<Filters>(initial);
  const deferredQuery = useDeferredValue(filters.q);
  const query = deferredQuery.trim();

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (!live) return;
    const url = new URL(window.location.href);
    for (const key of ["q", "category", "processing", "format"] as const) {
      if (next[key].trim()) url.searchParams.set(key, next[key]);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, "", url);
  };

  const categoryBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const activeCategory = categoryBySlug.get(filters.category);

  const formats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tool of tools)
      for (const format of tool.supportedFormats ?? []) counts.set(format, (counts.get(format) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([format]) => format);
  }, [tools]);

  const view = useMemo(() => {
    const matched = query ? searchTools(tools, query).map((result) => result.tool) : [...tools];
    const inCategory = (tool: ToolSummary) =>
      !activeCategory || tool.category === activeCategory.id || Boolean(tool.alsoIn?.includes(activeCategory.id));
    const inProcessing = (tool: ToolSummary) => !filters.processing || tool.kind === filters.processing;
    const inFormat = (tool: ToolSummary) => !filters.format || Boolean(tool.supportedFormats?.includes(filters.format));

    const results = matched.filter((tool) => inCategory(tool) && inProcessing(tool) && inFormat(tool));
    const count = (keep: (tool: ToolSummary) => boolean) => matched.filter(keep).length;
    return {
      results,
      categoryCounts: new Map(
        categories.map((category) => [
          category.slug,
          count(
            (tool) =>
              (tool.category === category.id || Boolean(tool.alsoIn?.includes(category.id))) &&
              inProcessing(tool) &&
              inFormat(tool),
          ),
        ]),
      ),
      categoryTotal: count((tool) => inProcessing(tool) && inFormat(tool)),
      processingCounts: new Map(
        PROCESSING_KINDS.map((kind) => [
          kind,
          count((tool) => tool.kind === kind && inCategory(tool) && inFormat(tool)),
        ]),
      ),
      processingTotal: count((tool) => inCategory(tool) && inFormat(tool)),
      formatCounts: new Map(
        formats.map((format) => [
          format,
          count((tool) => Boolean(tool.supportedFormats?.includes(format)) && inCategory(tool) && inProcessing(tool)),
        ]),
      ),
      formatTotal: count((tool) => inCategory(tool) && inProcessing(tool)),
    };
  }, [tools, categories, formats, query, activeCategory, filters.processing, filters.format]);

  const filtered = Boolean(activeCategory || filters.processing || filters.format);
  const grouped = !query && !filtered;
  const clearAll = () => update(EMPTY);

  const describe = () => {
    const parts: string[] = [];
    if (activeCategory) parts.push(activeCategory.name);
    if (filters.processing) parts.push(processingLabels[filters.processing].short);
    if (filters.format) parts.push(filters.format.toUpperCase());
    const scope = parts.length ? ` in ${parts.join(" · ")}` : "";
    if (query)
      return view.results.length === 0
        ? `No tools match “${query}”${scope}.`
        : `${view.results.length} ${view.results.length === 1 ? "tool matches" : "tools match"} “${query}”${scope}.`;
    if (filtered) return `${view.results.length} ${view.results.length === 1 ? "tool" : "tools"}${scope}.`;
    return `All ${tools.length} tools, by category.`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      {/* Sidebar filters (large screens) */}
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-20 space-y-7">
          <FilterGroup title="Category">
            <FilterOption
              selected={!activeCategory}
              onSelect={() => update({ category: "" })}
              count={view.categoryTotal}
              label="All categories"
            />
            {categories.map((category) => (
              <FilterOption
                key={category.slug}
                selected={activeCategory?.slug === category.slug}
                onSelect={() => update({ category: category.slug })}
                count={view.categoryCounts.get(category.slug) ?? 0}
                label={category.name}
                icon={categoryIcons[category.id]}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="Processing">
            <FilterOption
              selected={!filters.processing}
              onSelect={() => update({ processing: "" })}
              count={view.processingTotal}
              label="Any"
            />
            {PROCESSING_KINDS.map((kind) => (
              <FilterOption
                key={kind}
                selected={filters.processing === kind}
                onSelect={() => update({ processing: kind })}
                count={view.processingCounts.get(kind) ?? 0}
                label={processingLabels[kind].filter}
                icon={kind === "local" ? "lock" : kind === "network" ? "globe" : "arrow-up-right"}
              />
            ))}
          </FilterGroup>
          <Field label="Format">
            {(context) => (
              <Select
                context={context}
                value={filters.format}
                onChange={(event) => update({ format: event.target.value })}
              >
                <option value="">Any format ({view.formatTotal})</option>
                {formats.map((format) => (
                  <option key={format} value={format} disabled={(view.formatCounts.get(format) ?? 0) === 0}>
                    {format.toUpperCase()} ({view.formatCounts.get(format) ?? 0})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <form role="search" action="" method="get" onSubmit={(event) => event.preventDefault()} className="relative">
          <label htmlFor={`${id}-q`} className="sr-only">
            Search tools
          </label>
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle"
          />
          <input
            id={`${id}-q`}
            data-primary-search
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Search tools…"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Escape" && filters.q) {
                event.preventDefault();
                update({ q: "" });
              }
            }}
            className="h-12 w-full rounded-(--radius-lg) border border-border-strong bg-surface pr-24 pl-11 text-base text-fg transition-colors hover:border-fg-subtle focus-visible:border-accent sm:text-sm"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 sm:block">
            {filters.q ? null : <Kbd>/</Kbd>}
          </span>
          {filters.q ? (
            <button
              type="button"
              onClick={() => update({ q: "" })}
              className="absolute top-1/2 right-2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-md px-2 text-xs text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              <Icon name="x" size={14} />
              Clear
            </button>
          ) : null}
          {/* Without JavaScript the form submits; the button is the only visible submit control. */}
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>

        {/* Compact filters (phones and tablets) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
          <Field label="Category" className="col-span-2 sm:col-span-1">
            {(context) => (
              <Select
                context={context}
                value={activeCategory?.slug ?? ""}
                onChange={(event) => update({ category: event.target.value })}
              >
                <option value="">All categories ({view.categoryTotal})</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name} ({view.categoryCounts.get(category.slug) ?? 0})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Processing">
            {(context) => (
              <Select
                context={context}
                value={filters.processing}
                onChange={(event) => update({ processing: event.target.value as ProcessingKind | "" })}
              >
                <option value="">Any ({view.processingTotal})</option>
                {PROCESSING_KINDS.map((kind) => (
                  <option key={kind} value={kind} disabled={(view.processingCounts.get(kind) ?? 0) === 0}>
                    {processingLabels[kind].short} ({view.processingCounts.get(kind) ?? 0})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Format">
            {(context) => (
              <Select
                context={context}
                value={filters.format}
                onChange={(event) => update({ format: event.target.value })}
              >
                <option value="">Any ({view.formatTotal})</option>
                {formats.map((format) => (
                  <option key={format} value={format} disabled={(view.formatCounts.get(format) ?? 0) === 0}>
                    {format.toUpperCase()} ({view.formatCounts.get(format) ?? 0})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm text-fg-muted">
            {describe()}
          </p>
          {filtered || query ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              <Icon name="x" size={14} />
              Clear all
            </button>
          ) : null}
        </div>

        {view.results.length === 0 ? (
          <NoResults
            query={query}
            filtered={filtered}
            onSuggest={(q) => update({ ...EMPTY, q })}
            onClear={clearAll}
            categories={categories}
          />
        ) : grouped ? (
          <div className="space-y-12">
            {categories.map((category) => {
              const list = view.results.filter((tool) => tool.category === category.id);
              if (list.length === 0) return null;
              return (
                <section key={category.slug} aria-labelledby={`${id}-${category.slug}`}>
                  <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2">
                    <h2
                      id={`${id}-${category.slug}`}
                      className="flex items-center gap-2 font-display text-base font-semibold text-fg"
                    >
                      <Icon name={categoryIcons[category.id]} size={16} className="text-fg-subtle" />
                      {category.name}
                      <span className="text-sm font-normal text-fg-subtle tabular-nums">{list.length}</span>
                    </h2>
                    <Link
                      href={`/categories/${category.slug}/`}
                      className="rounded-sm text-sm text-fg-muted hover:text-fg hover:underline hover:underline-offset-2"
                    >
                      View category<span className="sr-only">: {category.name}</span>
                    </Link>
                  </div>
                  <ToolGrid tools={list} showCategory={false} />
                </section>
              );
            })}
          </div>
        ) : (
          <section aria-labelledby={`${id}-results`}>
            <h2 id={`${id}-results`} className="sr-only">
              Results
            </h2>
            <ToolGrid tools={view.results} />
          </section>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-2xs font-semibold tracking-[0.08em] text-fg-subtle uppercase">{title}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  );
}

function FilterOption({
  selected,
  onSelect,
  count,
  label,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  count: number;
  label: string;
  icon?: Parameters<typeof Icon>[0]["name"];
}) {
  const disabled = count === 0 && !selected;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
        selected ? "bg-surface-raised font-medium text-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
        disabled && "cursor-default opacity-50 hover:bg-transparent hover:text-fg-muted",
      )}
    >
      {icon ? <Icon name={icon} size={15} className={selected ? "text-accent-text" : "text-fg-subtle"} /> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-fg-subtle tabular-nums">{count}</span>
    </button>
  );
}

function NoResults({
  query,
  filtered,
  onSuggest,
  onClear,
  categories,
}: {
  query: string;
  filtered: boolean;
  onSuggest: (query: string) => void;
  onClear: () => void;
  categories: readonly DirectoryCategory[];
}) {
  return (
    <div className="rounded-(--radius-lg) border border-dashed border-border-strong px-6 py-12 text-center">
      <Icon name="search" size={24} className="mx-auto text-fg-subtle" />
      <h2 className="mt-3 font-display text-lg font-semibold text-fg">No matching tools</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">
        {query ? (
          <>
            There isn&rsquo;t a tool for that yet. We&rsquo;d rather say so than show something that doesn&rsquo;t do
            the job.
          </>
        ) : (
          <>No tool fits all of these filters.</>
        )}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-fg-subtle">Try</span>
        {SEARCH_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggest(suggestion)}
            className="rounded-full border border-border-strong px-3 py-1 text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            {suggestion}
          </button>
        ))}
      </div>
      {filtered ? (
        <button type="button" onClick={onClear} className="mt-4 text-sm text-accent-text underline underline-offset-2">
          Clear all filters
        </button>
      ) : null}
      <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        {categories.slice(0, 6).map((category) => (
          <li key={category.slug}>
            <Link
              href={`/categories/${category.slug}/`}
              className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg"
            >
              <Icon name={categoryIcons[category.id]} size={14} />
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
