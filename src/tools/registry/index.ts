import { categoryList } from "./categories";
import { toolDefinitions } from "./definitions";
import type { ToolCategory, ToolCategoryId, ToolDefinition } from "./types";
import { findRegistryProblems } from "./validate";

export type * from "./types";
export { categories, categoryList, getCategory, getCategoryBySlug } from "./categories";

const problems = findRegistryProblems(toolDefinitions);
if (problems.length > 0) {
  throw new Error(`Tool registry is invalid:\n  - ${problems.join("\n  - ")}`);
}

/** Every tool, sorted by name for stable listings. */
export const tools: readonly ToolDefinition[] = [...toolDefinitions].sort((a, b) => a.name.localeCompare(b.name));

const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));

export function getTool(slug: string): ToolDefinition | undefined {
  return bySlug.get(slug);
}

export function toolsInCategory(id: ToolCategoryId): ToolDefinition[] {
  return tools.filter((tool) => tool.category === id || tool.alsoIn?.includes(id));
}

/** Categories that currently have at least one tool. Only these get pages. */
export function populatedCategories(): ToolCategory[] {
  return categoryList.filter((category) => toolsInCategory(category.id).length > 0);
}

/**
 * Related tools, deterministic: the tool's own list first, then other tools in the
 * same primary category, alphabetically.
 */
export function relatedTools(tool: ToolDefinition, limit = 3): ToolDefinition[] {
  const chosen: ToolDefinition[] = [];
  for (const slug of tool.related) {
    const related = bySlug.get(slug);
    if (related) chosen.push(related);
  }
  for (const candidate of toolsInCategory(tool.category)) {
    if (candidate.slug !== tool.slug && !chosen.includes(candidate)) chosen.push(candidate);
  }
  return chosen.slice(0, limit);
}
