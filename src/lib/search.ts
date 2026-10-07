import { getCategory } from "@/tools/registry/categories";
import type { ToolDefinition } from "@/tools/registry/types";

/**
 * Deterministic tool search.
 *
 * No model, no index service. A query is normalised into words, each word is
 * mapped through a small, explicit synonym table ("pretty" means "format", "pic"
 * means "image"), and a tool matches only if every word is found in its name, task
 * phrases, keywords, formats, category or description. Each word is matched as
 * strongly as it can be:
 *
 *   whole word  >  start of a word ("compre")  >  inside a word ("script")  >  a typo ("fromat")
 *
 * Typos are only forgiven in the fields people actually aim for (name, tasks,
 * keywords, tags, formats, category), never in long descriptions, so a misspelt
 * word cannot pull in a tool by accident. Scores are sorted, then names, so the same
 * query always gives the same order.
 *
 * Works on anything shaped like a tool definition, including the slim summaries the
 * browser receives, and imports only the category table, so it stays small in the
 * client bundle.
 */

/** The parts of a tool that search reads. A full ToolDefinition fits. */
export type Searchable = Pick<
  ToolDefinition,
  "slug" | "name" | "shortDescription" | "category" | "alsoIn" | "tasks" | "keywords" | "tags" | "supportedFormats"
> & { description?: string };

/** Words that carry no meaning in a tool search. */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "to",
  "of",
  "for",
  "in",
  "on",
  "my",
  "me",
  "i",
  "want",
  "need",
  "how",
  "do",
  "can",
  "online",
  "free",
  "tool",
  "tools",
  "app",
  "please",
  "with",
  "from",
  "into",
]);

/**
 * Words that mean the same thing for search. Every value is a word that appears in
 * some tool's metadata; the unit tests check the ones used by the examples.
 */
const SYNONYMS: Record<string, string> = {
  pretty: "format",
  prettify: "format",
  prettier: "format",
  beautify: "format",
  beautifier: "format",
  beautiful: "format",
  indent: "format",
  formatter: "format",
  formatting: "format",
  minifier: "minify",
  compact: "minify",
  uglify: "minify",
  validator: "validate",
  validation: "validate",
  verify: "validate",
  lint: "validate",
  linter: "validate",
  compressor: "compress",
  compression: "compress",
  shrink: "compress",
  reduce: "compress",
  optimize: "compress",
  optimise: "compress",
  smaller: "compress",
  pic: "image",
  pics: "image",
  picture: "image",
  pictures: "image",
  photo: "image",
  photos: "image",
  img: "image",
  images: "image",
  jpg: "jpeg",
  guid: "uuid",
  guids: "uuid",
  uuids: "uuid",
  counter: "count",
  counting: "count",
  words: "word",
  characters: "character",
  chars: "character",
  char: "character",
  letters: "letter",
  b64: "base64",
  decoder: "decode",
  encoder: "encode",
  generator: "generate",
  create: "generate",
  make: "generate",
  wi: "wifi",
  wlan: "wifi",
  qrcode: "qr",
  barcode: "qr",
  colors: "color",
  colour: "color",
  colours: "color",
  palette: "color",
  diffs: "diff",
  difference: "diff",
  differences: "diff",
  compare: "diff",
  comparing: "diff",
  comparison: "diff",
  fix: "repair",
  repairing: "repair",
  fixes: "repair",
  timestamps: "timestamp",
  epoch: "timestamp",
  passwords: "password",
  passphrase: "password",
  hashes: "hash",
  checksum: "hash",
  digest: "hash",
  units: "unit",
  scale: "resize",
  resizing: "resize",
  resizer: "resize",
  dimensions: "resize",
  cropper: "crop",
  cropping: "crop",
};

export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/wi[\s-]?fi/g, "wifi")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function canonical(word: string): string {
  const mapped = SYNONYMS[word];
  if (mapped) return mapped;
  // Plural "s" only, and never on short words: "css" and "js" stay as they are.
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) {
    const singular = word.slice(0, -1);
    return SYNONYMS[singular] ?? singular;
  }
  return word;
}

export function queryTerms(query: string): string[] {
  const words = normalize(query).split(" ").filter(Boolean);
  const meaningful = words.filter((word) => !STOPWORDS.has(word));
  return [...new Set(meaningful.map(canonical))];
}

/**
 * Edit distance with adjacent transpositions ("fromat" → "format" is one edit),
 * giving up as soon as it must exceed `max`. Bounded, so it stays cheap per word.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2]! + 1);
      }
      row.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length]!;
}

/** How many typos a word of this length may contain and still match. */
function typoAllowance(length: number): number {
  if (length >= 8) return 2;
  if (length >= 4) return 1;
  return 0;
}

interface Field {
  words: readonly string[];
  weight: number;
  /** Whether a misspelling may match here. */
  forgiving: boolean;
}

const fieldCache = new WeakMap<object, Field[]>();

function fieldsOf(tool: Searchable): Field[] {
  const cached = fieldCache.get(tool);
  if (cached) return cached;
  const words = (text: string) => normalize(text).split(" ").filter(Boolean).map(canonical);
  const unique = (list: string[]) => [...new Set(list)];
  const fields: Field[] = [
    { words: unique(words(tool.name)), weight: 40, forgiving: true },
    { words: unique(tool.tasks.flatMap(words)), weight: 30, forgiving: true },
    { words: unique(tool.keywords.flatMap(words)), weight: 25, forgiving: true },
    { words: unique((tool.tags ?? []).flatMap(words)), weight: 25, forgiving: true },
    { words: unique(words(tool.slug)), weight: 25, forgiving: false },
    { words: unique((tool.supportedFormats ?? []).flatMap(words)), weight: 20, forgiving: true },
    {
      words: unique([tool.category, ...(tool.alsoIn ?? [])].flatMap((id) => words(getCategory(id).name))),
      weight: 15,
      forgiving: true,
    },
    { words: unique(words(tool.shortDescription)), weight: 8, forgiving: false },
    { words: unique(words(tool.description ?? "")), weight: 4, forgiving: false },
  ];
  fieldCache.set(tool, fields);
  return fields;
}

/** The best score one query word earns against one tool, or 0 if it is not found. */
function termScore(term: string, fields: readonly Field[]): number {
  let best = 0;
  for (const field of fields) {
    if (field.words.includes(term)) {
      best = Math.max(best, field.weight);
      continue;
    }
    // Partial words while typing: "compre" finds "compress".
    if (term.length >= 2 && field.words.some((word) => word.startsWith(term))) {
      best = Math.max(best, field.weight * (term.length >= 3 ? 0.6 : 0.4));
      continue;
    }
    if (term.length >= 4 && field.words.some((word) => word.includes(term))) {
      best = Math.max(best, field.weight * 0.35);
    }
  }
  if (best > 0) return best;

  const allowance = typoAllowance(term.length);
  if (allowance === 0) return 0;
  for (const field of fields) {
    if (!field.forgiving) continue;
    if (field.words.some((word) => word.length >= 4 && editDistance(term, word, allowance) <= allowance)) {
      best = Math.max(best, field.weight * 0.3);
    }
  }
  return best;
}

export interface SearchResult<T extends Searchable = Searchable> {
  tool: T;
  score: number;
}

/** Recent queries per tool list. Search runs on every keystroke; repeats are free. */
const resultCache = new WeakMap<readonly Searchable[], Map<string, SearchResult[]>>();
const CACHE_LIMIT = 64;

export function searchTools<T extends Searchable>(tools: readonly T[], query: string): SearchResult<T>[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const key = `${terms.join(" ")}\u0000${normalize(query)}`;
  let cache = resultCache.get(tools);
  if (!cache) {
    cache = new Map();
    resultCache.set(tools, cache);
  }
  const hit = cache.get(key);
  if (hit) return hit as SearchResult<T>[];

  const normalizedQuery = normalize(query);
  const results: SearchResult<T>[] = [];
  for (const tool of tools) {
    const fields = fieldsOf(tool);
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      const earned = termScore(term, fields);
      if (earned === 0) {
        matchedAll = false;
        break;
      }
      score += earned;
    }
    if (!matchedAll) continue;
    const name = normalize(tool.name);
    if (name === normalizedQuery) score += 100;
    else if (name.startsWith(normalizedQuery)) score += 20;
    results.push({ tool, score });
  }

  // Ties go alphabetically by the name as read, ignoring symbols such as "?".
  results.sort((a, b) => b.score - a.score || normalize(a.tool.name).localeCompare(normalize(b.tool.name)));
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(key, results);
  return results;
}
