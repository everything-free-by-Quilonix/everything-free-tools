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

/**
 * Categories close to this one: those that share tools with it (through `alsoIn`),
 * most shared first, then the remaining populated categories by size. Derived, so
 * it stays right as tools are added.
 */
export function relatedCategories(id: ToolCategoryId, limit = 4): ToolCategory[] {
  const own = new Set(toolsInCategory(id).map((tool) => tool.slug));
  return populatedCategories()
    .filter((category) => category.id !== id)
    .map((category) => {
      const list = toolsInCategory(category.id);
      return { category, shared: list.filter((tool) => own.has(tool.slug)).length, size: list.length };
    })
    .sort((a, b) => b.shared - a.shared || b.size - a.size || a.category.name.localeCompare(b.category.name))
    .slice(0, limit)
    .map((entry) => entry.category);
}
