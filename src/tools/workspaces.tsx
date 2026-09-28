"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { CapabilityGate } from "@/components/tool/capability-gate";
import type { BrowserCapability } from "@/tools/registry";

/**
 * Tool slug → workspace component.
 *
 * Each workspace is its own chunk, loaded only on its own page: the JSON page never
 * downloads the image engine or the QR library. Workspaces are still rendered into
 * the static HTML, so the controls are visible before JavaScript arrives.
 */
const workspaces: Record<string, ComponentType> = {
  "json-formatter": dynamic(() => import("./json-formatter/workspace")),
  "text-counter": dynamic(() => import("./text-counter/workspace")),
  "uuid-generator": dynamic(() => import("./uuid-generator/workspace")),
  base64: dynamic(() => import("./base64/workspace")),
  "image-compressor": dynamic(() => import("./image-compressor/workspace")),
  "qr-generator": dynamic(() => import("./qr-generator/workspace")),
};

export function hasWorkspace(slug: string): boolean {
  return slug in workspaces;
}

export function ToolWorkspace({ slug, required }: { slug: string; required: readonly BrowserCapability[] }) {
  const Workspace = workspaces[slug];
  if (!Workspace) return null;
  return (
    <CapabilityGate required={required}>
      <Workspace />
    </CapabilityGate>
  );
}
