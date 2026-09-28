"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useId, useState } from "react";

import { Icon } from "@/components/icons";
import { controlClasses } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { searchTools } from "@/lib/search";
import { tools } from "@/tools/registry";

import { ToolGrid } from "./tool-card";

/**
 * Search box. A plain GET form, so it works without JavaScript (the home page form
 * submits here); with JavaScript it filters as you type and keeps the address bar
 * in step so a search can be shared.
 */
export function SearchForm({
  action,
  defaultValue,
  value,
  onChange,
  autoFocus,
  size = "md",
}: {
  action: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  const id = useId();
  return (
    <form
      role="search"
      action={action}
      method="get"
      className="relative"
      onSubmit={onChange ? (e) => e.preventDefault() : undefined}
    >
      <label htmlFor={id} className="sr-only">
        Search tools
      </label>
      <Icon
        name="search"
        size={size === "lg" ? 20 : 18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle"
      />
      <input
        id={id}
        type="search"
        name="q"
        autoComplete="off"
        spellCheck={false}
        placeholder="Try “compress image” or “json pretty”"
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        autoFocus={autoFocus}
        className={cn(controlClasses, "pr-24 pl-11", size === "lg" ? "h-14 text-base" : "h-12")}
      />
      <button
        type="submit"
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover"
      >
        Search
      </button>
    </form>
  );
}

export function ToolSearch({ action }: { action: string }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();
  const results = trimmed ? searchTools(tools, trimmed).map((result) => result.tool) : tools;

  const update = (value: string) => {
    setQuery(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="space-y-6">
      <SearchForm action={action} value={query} onChange={update} />
      <p role="status" className="text-sm text-fg-muted">
        {trimmed
          ? results.length === 0
            ? `No tools match “${trimmed}”.`
            : `${results.length} ${results.length === 1 ? "tool matches" : "tools match"} “${trimmed}”.`
          : `All ${tools.length} tools.`}
      </p>
      {results.length > 0 ? (
        <ToolGrid tools={results} headingLevel={2} />
      ) : (
        <EmptyState icon="search" title="There isn't a tool for that yet">
          We&rsquo;d rather say so than show something that doesn&rsquo;t do the job. Try different words, or{" "}
          <Link href="/tools/" onClick={() => update("")} className="text-accent underline underline-offset-2">
            see every tool
          </Link>
          .
        </EmptyState>
      )}
    </div>
  );
}
