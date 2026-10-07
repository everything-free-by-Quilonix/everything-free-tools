import type { ToolDefinition } from "@/tools/registry/types";

import { processingKind, type ProcessingKind } from "./processing";
import type { Searchable } from "./search";

/**
 * What the browser needs to know about a tool to list, filter and search it.
 *
 * Server components build these from the registry and pass them to client
 * components as props, so interactive lists never bundle the full registry
 * (limitations, how-it-works text, dependencies) into page JavaScript.
 */
export interface ToolSummary extends Searchable {
  kind: ProcessingKind;
  externalUrl?: string;
}

export function toSummary(tool: ToolDefinition): ToolSummary {
  return {
    slug: tool.slug,
    name: tool.name,
    shortDescription: tool.shortDescription,
    description: tool.description,
    category: tool.category,
    ...(tool.alsoIn?.length ? { alsoIn: tool.alsoIn } : {}),
    tasks: tool.tasks,
    keywords: tool.keywords,
    ...(tool.tags?.length ? { tags: tool.tags } : {}),
    ...(tool.supportedFormats?.length ? { supportedFormats: tool.supportedFormats } : {}),
    kind: processingKind(tool),
    ...(tool.externalUrl ? { externalUrl: tool.externalUrl } : {}),
  };
}

/** Where a tool lives: its own page, or (for an external tool) still its own page, which explains and links out. */
export function toolHref(tool: Pick<ToolSummary, "slug">): string {
  return `/tools/${tool.slug}/`;
}
