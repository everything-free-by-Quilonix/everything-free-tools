import Link from "next/link";

import { Icon, type IconName } from "@/components/icons";
import { getCategory, type ToolCategoryId, type ToolDefinition } from "@/tools/registry";

import { PrivacyLabel } from "./privacy-notice";

export const categoryIcons: Record<ToolCategoryId, IconName> = {
  image: "image",
  pdf: "file",
  text: "text",
  developer: "code",
  data: "database",
  files: "file",
  security: "shield",
  "qr-barcode": "qr",
  audio: "file",
  video: "file",
  math: "grid",
  "color-design": "image",
  accessibility: "info",
  education: "book",
  everyday: "calendar",
};

/** A tool in a list. The whole card is one link, named by the tool's title. */
export function ToolCard({ tool, headingLevel = 3 }: { tool: ToolDefinition; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex h-full flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-accent">
      <div className="flex items-center gap-2 text-xs text-fg-subtle">
        <Icon name={categoryIcons[tool.category]} size={16} />
        {getCategory(tool.category).name}
      </div>
      <Heading className="font-display text-base font-semibold text-fg">
        <Link href={`/tools/${tool.slug}/`} className="outline-none after:absolute after:inset-0 after:content-['']">
          {tool.name}
        </Link>
      </Heading>
      <p className="flex-1 text-sm text-fg-muted">{tool.shortDescription}</p>
      <PrivacyLabel tool={tool} />
    </article>
  );
}

export function ToolGrid({ tools, headingLevel }: { tools: readonly ToolDefinition[]; headingLevel?: 2 | 3 }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
