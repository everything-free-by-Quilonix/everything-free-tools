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
  "url-encoder": dynamic(() => import("./url-encoder/workspace")),
  "hash-generator": dynamic(() => import("./hash-generator/workspace")),
  "password-generator": dynamic(() => import("./password-generator/workspace")),
  "timestamp-converter": dynamic(() => import("./timestamp-converter/workspace")),
  "color-picker": dynamic(() => import("./color-picker/workspace")),
  "unit-converter": dynamic(() => import("./unit-converter/workspace")),
  "text-diff": dynamic(() => import("./text-diff/workspace")),
  "json-repair": dynamic(() => import("./json-repair/workspace")),
  "image-resize": dynamic(() => import("./image-resize/workspace")),
  "image-crop": dynamic(() => import("./image-crop/workspace")),
  "image-format": dynamic(() => import("./image-format/workspace")),
  "json-path": dynamic(() => import("./json-path/workspace")),
  "json-schema": dynamic(() => import("./json-schema/workspace")),
  "json-yaml": dynamic(() => import("./json-yaml/workspace")),
  "xml-formatter": dynamic(() => import("./xml-formatter/workspace")),
  "xml-json": dynamic(() => import("./xml-json/workspace")),
  "csv-json": dynamic(() => import("./csv-json/workspace")),
  "csv-viewer": dynamic(() => import("./csv-viewer/workspace")),
  "table-generator": dynamic(() => import("./table-generator/workspace")),
  "regex-tester": dynamic(() => import("./regex-tester/workspace")),
  "sql-formatter": dynamic(() => import("./sql-formatter/workspace")),
  "html-formatter": dynamic(() => import("./html-formatter/workspace")),
  "html-preview": dynamic(() => import("./html-preview/workspace")),
  "markdown-preview": dynamic(() => import("./markdown-preview/workspace")),
  "jwt-debugger": dynamic(() => import("./jwt-debugger/workspace")),
  "cron-parser": dynamic(() => import("./cron-parser/workspace")),
  "url-parser": dynamic(() => import("./url-parser/workspace")),
  "mime-lookup": dynamic(() => import("./mime-lookup/workspace")),
  "http-status": dynamic(() => import("./http-status/workspace")),
  "api-mock": dynamic(() => import("./api-mock/workspace")),
  "number-base": dynamic(() => import("./number-base/workspace")),
  "case-converter": dynamic(() => import("./case-converter/workspace")),
  "text-cleaner": dynamic(() => import("./text-cleaner/workspace")),
  "text-sorter": dynamic(() => import("./text-sorter/workspace")),
  "find-replace": dynamic(() => import("./find-replace/workspace")),
  "word-frequency": dynamic(() => import("./word-frequency/workspace")),
  "unicode-lookup": dynamic(() => import("./unicode-lookup/workspace")),
  "pdf-merge": dynamic(() => import("./pdf-merge/workspace")),
  "pdf-split": dynamic(() => import("./pdf-split/workspace")),
  "image-to-pdf": dynamic(() => import("./image-to-pdf/workspace")),
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
