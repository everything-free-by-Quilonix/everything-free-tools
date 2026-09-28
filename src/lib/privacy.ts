import type { ToolDefinition } from "@/tools/registry";

/**
 * Privacy wording, generated from a tool's definition.
 *
 * No page writes its own privacy claim. Every statement below is derived from the
 * structured `processing` and `privacy` fields, which the registry validates, so a
 * tool cannot show a stronger claim than its definition makes.
 */

export interface PrivacyStatement {
  mode: "LOCAL" | "NETWORK";
  headline: string;
  points: string[];
}

export function privacyStatement(tool: Pick<ToolDefinition, "processing" | "privacy">): PrivacyStatement {
  if (tool.processing === "LOCAL") {
    return {
      mode: "LOCAL",
      headline: "Processed locally in your browser. Your files don't leave your device.",
      points: ["Processed locally", "No account required", "Nothing is uploaded"],
    };
  }

  const network = tool.privacy.network;
  return {
    mode: "NETWORK",
    headline: "This tool requires a network service to process your data.",
    points: [
      "No account required",
      network ? `Sent to: ${network.destination}` : "Sent to a network service",
      network ? `What is sent: ${network.dataSent}` : "Some input is transmitted",
    ],
  };
}
