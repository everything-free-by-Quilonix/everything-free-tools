import Link from "next/link";

import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/cn";
import { toolHref, type ToolSummary } from "@/lib/tool-summary";
import { getCategory } from "@/tools/registry/categories";
import type { ToolCategoryId } from "@/tools/registry/types";

import { ProcessingBadge } from "./privacy-notice";

export const categoryIcons: Record<ToolCategoryId, IconName> = {
  image: "image",
  pdf: "file-text",
  text: "text",
  developer: "code",
  data: "database",
  files: "folder",
  security: "shield",
  "qr-barcode": "qr",
  audio: "music",
  video: "film",
  math: "calculator",
  "color-design": "palette",
  accessibility: "person",
  education: "book",
  everyday: "wrench",
};

/**
 * A tool in a list. The whole card is one link, named by the tool's title; the
 * meta line says where it belongs and where it runs, nothing more.
 */
export function ToolCard({
  tool,
  headingLevel = 3,
  showCategory = true,
}: {
  tool: ToolSummary;
  headingLevel?: 2 | 3;
  showCategory?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const formats = (tool.supportedFormats ?? []).slice(0, 3);
  return (
    <article
      data-tool={tool.slug}
      className="group relative flex h-full flex-col rounded-(--radius-lg) border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <Heading className="font-display text-[0.9375rem] leading-snug font-semibold text-fg">
          <Link href={toolHref(tool)} className="outline-none after:absolute after:inset-0 after:content-['']">
            {tool.name}
          </Link>
        </Heading>
        <Icon
          name="arrow-right"
          size={16}
          className="mt-0.5 shrink-0 -translate-x-1 text-fg-subtle opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
        />
      </div>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-fg-muted">{tool.shortDescription}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
        {showCategory ? (
          <>
            <span>{getCategory(tool.category).name}</span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <ProcessingBadge kind={tool.kind} />
        {formats.length > 0 ? (
          <span className="ml-auto hidden gap-1 sm:flex">
            <span className="sr-only">Formats: {formats.join(", ")}</span>
            {formats.map((format) => (
              <span
                key={format}
                aria-hidden="true"
                className="rounded border border-border px-1.5 font-mono text-2xs text-fg-subtle uppercase"
              >
                {format}
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function ToolGrid({
  tools,
  headingLevel,
  showCategory,
  columns = 3,
  className,
}: {
  tools: readonly ToolSummary[];
  headingLevel?: 2 | 3;
  showCategory?: boolean;
  columns?: 3 | 4;
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3", className)}>
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} headingLevel={headingLevel} showCategory={showCategory} />
        </li>
      ))}
    </ul>
  );
}

/** A dense, linked list of tools: for related tools and other secondary places. */
export function ToolList({ tools, className }: { tools: readonly ToolSummary[]; className?: string }) {
  return (
    <ul
      className={cn(
        "divide-y divide-border overflow-hidden rounded-(--radius-lg) border border-border bg-surface",
        className,
      )}
    >
      {tools.map((tool) => (
        <li key={tool.slug}>
          <Link
            href={toolHref(tool)}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-raised focus-visible:-outline-offset-2"
          >
            <Icon name={categoryIcons[tool.category]} size={18} className="shrink-0 text-fg-subtle" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-fg">{tool.name}</span>
              <span className="block truncate text-xs text-fg-muted">{tool.shortDescription}</span>
            </span>
            <ProcessingBadge kind={tool.kind} className="hidden sm:inline-flex" />
            <Icon name="chevron-right" size={16} className="shrink-0 text-fg-subtle group-hover:text-fg" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
