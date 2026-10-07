import type { ToolDefinition } from "@/tools/registry";

/**
 * Where a tool does its work, in the words people see.
 *
 * The registry speaks in engineering terms (`processing`, `integrationMode`); the
 * interface only ever shows these three kinds. Derived from the definition, so a
 * label can never be stronger than the registry entry behind it.
 */

export type ProcessingKind = "local" | "network" | "external";

export const PROCESSING_KINDS: readonly ProcessingKind[] = ["local", "network", "external"];

export const processingLabels: Record<
  ProcessingKind,
  { short: string; long: string; filter: string; explanation: string }
> = {
  local: {
    short: "Local",
    long: "Processed locally",
    filter: "Runs in your browser",
    explanation: "Your data stays in your browser.",
  },
  network: {
    short: "Network",
    long: "Network processing",
    filter: "Uses a network service",
    explanation: "Data is sent to a processing service.",
  },
  external: {
    short: "External",
    long: "External service",
    filter: "Opens another service",
    explanation: "This capability opens another service.",
  },
};

export function processingKind(tool: Pick<ToolDefinition, "processing" | "integrationMode">): ProcessingKind {
  if (tool.integrationMode === "external") return "external";
  return tool.processing === "NETWORK" ? "network" : "local";
}
