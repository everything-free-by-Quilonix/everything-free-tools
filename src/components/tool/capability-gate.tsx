"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { Notice } from "@/components/ui/states";
import { capabilityLabels, missingCapabilities } from "@/lib/capabilities";
import type { BrowserCapability } from "@/tools/registry";

const noop = () => () => {};
const NONE: BrowserCapability[] = [];

/**
 * Renders a tool only if the browser has what it needs, and otherwise says exactly
 * what is missing. During static rendering nothing is known, so the tool renders;
 * the check runs once the page is live.
 */
export function CapabilityGate({
  required,
  children,
}: {
  required: readonly BrowserCapability[];
  children: ReactNode;
}) {
  const key = required.join(",");
  const missing = useSyncExternalStore(
    noop,
    () => cached(key, required),
    () => NONE,
  );

  if (missing.length > 0) {
    return (
      <Notice tone="warning" role="alert" title="This tool can't run in this browser">
        It needs {missing.map((capability) => capabilityLabels[capability]).join(", ")}, which this browser
        doesn&rsquo;t provide. A current version of Chrome, Edge, Firefox or Safari will work.
      </Notice>
    );
  }
  return <>{children}</>;
}

// useSyncExternalStore needs a stable snapshot between renders.
const cache = new Map<string, BrowserCapability[]>();
function cached(key: string, required: readonly BrowserCapability[]): BrowserCapability[] {
  let value = cache.get(key);
  if (!value) {
    value = missingCapabilities(required);
    cache.set(key, value);
  }
  return value;
}
