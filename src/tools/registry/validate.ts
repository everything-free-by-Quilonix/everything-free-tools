import { CATEGORY_IDS, type ToolDefinition } from "./types";

/**
 * Registry rules. Returns every problem found; an empty list means the registry is
 * consistent. Run at module load (so the build fails) and by the unit tests.
 */
export function findRegistryProblems(tools: readonly ToolDefinition[]): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();

  for (const tool of tools) {
    const where = `"${tool.slug}"`;
    if (slugs.has(tool.slug)) problems.push(`duplicate slug ${where}`);
    slugs.add(tool.slug);
    if (tool.id !== tool.slug) problems.push(`${where} has id "${tool.id}" that differs from its slug`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) problems.push(`${where} is not a lowercase hyphenated slug`);
    if (!CATEGORY_IDS.includes(tool.category)) problems.push(`${where} has unknown category "${tool.category}"`);
    for (const extra of tool.alsoIn ?? []) {
      if (!CATEGORY_IDS.includes(extra)) problems.push(`${where} lists unknown category "${extra}"`);
      if (extra === tool.category) problems.push(`${where} repeats its primary category in alsoIn`);
    }
    if (tool.shortDescription.length > 100) problems.push(`${where} short description is over 100 characters`);
    if (tool.limitations.length === 0) problems.push(`${where} documents no limitations`);
    if (tool.howItWorks.length === 0) problems.push(`${where} does not explain how it works`);
    if (tool.tasks.length === 0) problems.push(`${where} lists no task phrases for search`);

    // The privacy claim has to match the processing mode, in both directions.
    if (tool.processing === "LOCAL") {
      if (tool.privacy.filesLeaveDevice) problems.push(`${where} is LOCAL but says data leaves the device`);
      if (tool.privacy.networkRequired) problems.push(`${where} is LOCAL but says it needs the network`);
      if (tool.privacy.network) problems.push(`${where} is LOCAL but names a network destination`);
    } else {
      if (!tool.privacy.networkRequired) problems.push(`${where} is NETWORK but says no network is required`);
      if (!tool.privacy.network?.destination || !tool.privacy.network.dataSent) {
        problems.push(`${where} is NETWORK but does not say where data goes and what is sent`);
      }
    }

    const overlap = tool.capabilities.required.filter((c) => tool.capabilities.optional?.includes(c));
    if (overlap.length > 0) problems.push(`${where} lists ${overlap.join(", ")} as both required and optional`);
  }

  for (const tool of tools) {
    for (const related of tool.related) {
      if (!slugs.has(related)) problems.push(`"${tool.slug}" relates to unknown tool "${related}"`);
      if (related === tool.slug) problems.push(`"${tool.slug}" relates to itself`);
    }
  }

  return problems;
}
