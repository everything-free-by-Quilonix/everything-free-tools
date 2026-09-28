/**
 * The tool model.
 *
 * Every tool is described once, here, as data. Discovery, search, category pages,
 * metadata, the privacy indicator, cards, the sitemap and related tools all read
 * this description, so none of them can disagree about what a tool does or where
 * its data goes.
 */

export const CATEGORY_IDS = [
  "image",
  "pdf",
  "text",
  "developer",
  "data",
  "files",
  "security",
  "qr-barcode",
  "audio",
  "video",
  "math",
  "color-design",
  "accessibility",
  "education",
  "everyday",
] as const;

export type ToolCategoryId = (typeof CATEGORY_IDS)[number];

export interface ToolCategory {
  id: ToolCategoryId;
  /** URL segment under /categories/. */
  slug: string;
  name: string;
  description: string;
}

/**
 * Where the work happens.
 *
 * LOCAL: entirely in the visitor's browser. Nothing they enter or select is sent
 * anywhere. The site's Content Security Policy (`connect-src 'self'`) enforces it.
 * NETWORK: some input must be sent to a named service. None of the current tools do.
 */
export type ProcessingMode = "LOCAL" | "NETWORK";

/** Browser features a tool may depend on. Detected at runtime in `lib/capabilities.ts`. */
export type BrowserCapability =
  | "web-workers"
  | "web-crypto"
  | "random-uuid"
  | "canvas"
  | "offscreen-canvas"
  | "create-image-bitmap"
  | "clipboard-write"
  | "intl-segmenter"
  | "webassembly"
  | "webcodecs"
  | "file-system-access";

export type ToolStatus = "AVAILABLE" | "EXPERIMENTAL";

export interface ToolInput {
  kind: "text" | "file" | "options";
  label: string;
  /** MIME types accepted, for file inputs. */
  accept?: readonly string[];
  multiple?: boolean;
}

export interface ToolOutput {
  kind: "text" | "file" | "image";
  label: string;
  formats?: readonly string[];
}

/** A third-party component a tool relies on, credited on its page. */
export interface ToolDependency {
  name: string;
  license: string;
  url: string;
}

export interface ToolPrivacy {
  /** True only if user-provided content is transmitted off the device. */
  filesLeaveDevice: boolean;
  /** True if the tool needs a network connection to do its work. */
  networkRequired: boolean;
  /** Required for NETWORK tools: who receives data, and what is sent. */
  network?: { destination: string; dataSent: string };
}

export interface ToolDefinition {
  /** Stable identifier, equal to the slug. */
  id: string;
  /** URL segment under /tools/. */
  slug: string;
  name: string;
  /** One line for cards and search results. */
  shortDescription: string;
  /** Two or three sentences for the tool page and metadata. */
  description: string;
  category: ToolCategoryId;
  /** Further categories the tool also appears under. */
  alsoIn?: readonly ToolCategoryId[];
  processing: ProcessingMode;
  privacy: ToolPrivacy;
  inputs: readonly ToolInput[];
  outputs: readonly ToolOutput[];
  capabilities: {
    /** Without these the tool cannot run, and says so instead of breaking. */
    required: readonly BrowserCapability[];
    /** Used when present; the tool degrades without them. */
    optional?: readonly BrowserCapability[];
  };
  /** Real limits of the browser or the method. Never artificial quotas. */
  limitations: readonly string[];
  /** Short, factual steps shown under "How it works". */
  howItWorks: readonly string[];
  /** Task phrases people type: "compress image", "pretty print json". */
  tasks: readonly string[];
  keywords: readonly string[];
  /** Slugs of related tools, in the order shown. */
  related: readonly string[];
  status: ToolStatus;
  /** Licence of this tool's own code. */
  license: string;
  dependencies?: readonly ToolDependency[];
}
