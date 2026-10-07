/**
 * Native Text Case Converter Engine.
 *
 * Converts text across 10 programming and publishing casing styles:
 * camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE,
 * Title Case, Sentence case, lowercase, and UPPERCASE.
 * 100% local, zero network.
 */

export type CaseType = "camel" | "pascal" | "snake" | "kebab" | "constant" | "title" | "sentence" | "lower" | "upper";

export type CaseStyle = CaseType;

export interface CaseResults {
  camel: string;
  pascal: string;
  snake: string;
  kebab: string;
  constant: string;
  title: string;
  sentence: string;
  lower: string;
  upper: string;
}

/**
 * Splits arbitrary input text into word tokens based on camelCase boundaries,
 * spaces, underscores, and hyphens.
 */
export function extractWords(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // split acronyms
    .replace(/[_\-./\\]+/g, " ") // replace delimiters
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Converts text into all supported case formats simultaneously.
 */
export function convertAllCases(input: string): CaseResults {
  const words = extractWords(input);
  if (words.length === 0) {
    return {
      camel: "",
      pascal: "",
      snake: "",
      kebab: "",
      constant: "",
      title: "",
      sentence: "",
      lower: "",
      upper: "",
    };
  }

  const lowerWords = words.map((w) => w.toLowerCase());
  const capWords = lowerWords.map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : ""));

  // camelCase
  const camel = lowerWords[0] + capWords.slice(1).join("");

  // PascalCase
  const pascal = capWords.join("");

  // snake_case
  const snake = lowerWords.join("_");

  // kebab-case
  const kebab = lowerWords.join("-");

  // CONSTANT_CASE
  const constant = lowerWords.map((w) => w.toUpperCase()).join("_");

  // Title Case
  const title = capWords.join(" ");

  // Sentence case
  const fullSentence = input.trim();
  const sentence = fullSentence ? fullSentence[0]?.toUpperCase() + fullSentence.slice(1).toLowerCase() : "";

  // Plain lower and upper
  const lower = input.toLowerCase();
  const upper = input.toUpperCase();

  return {
    camel,
    pascal,
    snake,
    kebab,
    constant,
    title,
    sentence,
    lower,
    upper,
  };
}

/**
 * Converts text into a single specified casing style.
 */
export function convertCase(input: string, style: CaseStyle): string {
  const all = convertAllCases(input);
  return all[style];
}
