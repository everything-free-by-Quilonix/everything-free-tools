import { getCategory, type ToolDefinition } from "@/tools/registry";

/**
 * Deterministic tool search.
 *
 * No model, no index service: a query is normalised into words, each word is
 * mapped through a small, explicit synonym table ("pretty" means "format", "pic"
 * means "image"), and a tool matches only if every word is found in its name, task
 * phrases, keywords, category or description. Matches are scored by where the words
 * were found and sorted by score, then by name, so the same query always gives the
 * same order.
 */

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

interface Field {
  words: string[];
  weight: number;
}

function fieldsOf(tool: ToolDefinition): Field[] {
  const words = (text: string) => normalize(text).split(" ").filter(Boolean).map(canonical);
  return [
    { words: words(tool.name), weight: 40 },
    { words: tool.tasks.flatMap(words), weight: 30 },
    { words: tool.keywords.flatMap(words), weight: 25 },
    { words: words(tool.slug), weight: 25 },
    { words: [tool.category, ...(tool.alsoIn ?? [])].flatMap((id) => words(getCategory(id).name)), weight: 15 },
    { words: words(tool.shortDescription), weight: 8 },
    { words: words(tool.description), weight: 4 },
  ];
}

export interface SearchResult {
  tool: ToolDefinition;
  score: number;
}

export function searchTools(tools: readonly ToolDefinition[], query: string): SearchResult[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const tool of tools) {
    const fields = fieldsOf(tool);
    let score = 0;
    let matchedAll = true;

    for (const term of terms) {
      let best = 0;
      for (const field of fields) {
        if (field.words.includes(term)) best = Math.max(best, field.weight);
        // Partial words while typing: "compre" finds "compress". Worth less than a whole word.
        else if (term.length >= 3 && field.words.some((word) => word.startsWith(term))) {
          best = Math.max(best, field.weight * 0.6);
        }
      }
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
    }

    if (!matchedAll) continue;
    if (normalize(tool.name) === normalize(query)) score += 100;
    results.push({ tool, score });
  }

  return results.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
}
