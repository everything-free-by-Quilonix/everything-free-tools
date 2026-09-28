/**
 * Text statistics.
 *
 * Characters are counted as grapheme clusters (what a reader sees as one symbol),
 * so "é" written as e + combining accent, a flag, or a family emoji each count as
 * one. Words and sentences use `Intl.Segmenter` when the browser has it, and a
 * Unicode-aware regular expression otherwise.
 */

export const WORDS_PER_MINUTE = 230;

export interface TextStats {
  /** Visible characters (grapheme clusters). */
  characters: number;
  /** Visible characters, excluding whitespace. */
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  /** Lines, counting an empty final line after a trailing newline as no line. 0 for empty text. */
  lines: number;
  /** Blocks of text separated by one or more blank lines. */
  paragraphs: number;
  /** Size of the text encoded as UTF-8. */
  bytes: number;
  /** Estimated reading time in whole minutes, at least 1 when there are words. */
  readingMinutes: number;
  /** Whether Intl.Segmenter was used. False means the regular-expression fallback. */
  segmenter: boolean;
}

type SegmenterLike = {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
};

type SegmenterCtor = new (
  locale: string | undefined,
  options: { granularity: "grapheme" | "word" | "sentence" },
) => SegmenterLike;

function segmenterCtor(): SegmenterCtor | undefined {
  const ctor = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return typeof ctor === "function" ? ctor : undefined;
}

const WHITESPACE = /^\s+$/u;
const WORD_FALLBACK = /[\p{L}\p{N}\p{M}]+(?:['’\-.][\p{L}\p{N}\p{M}]+)*/gu;
const SENTENCE_FALLBACK = /[^.!?…。！？]*[\p{L}\p{N}][^.!?…。！？]*(?:[.!?…。！？]+|$)/gu;

function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines.length;
}

function countParagraphs(text: string): number {
  return text.split(/(?:\r\n|\r|\n)\s*(?:\r\n|\r|\n)/).filter((block) => block.trim().length > 0).length;
}

export interface CountOptions {
  /** Force the fallback, for tests and old browsers. */
  useSegmenter?: boolean;
  locale?: string;
}

export function countText(text: string, options: CountOptions = {}): TextStats {
  const Segmenter = options.useSegmenter === false ? undefined : segmenterCtor();

  let characters = 0;
  let charactersNoSpaces = 0;
  let words = 0;
  let sentences = 0;

  if (Segmenter) {
    for (const { segment } of new Segmenter(options.locale, { granularity: "grapheme" }).segment(text)) {
      characters += 1;
      if (!WHITESPACE.test(segment)) charactersNoSpaces += 1;
    }
    for (const part of new Segmenter(options.locale, { granularity: "word" }).segment(text)) {
      if (part.isWordLike) words += 1;
    }
    for (const { segment } of new Segmenter(options.locale, { granularity: "sentence" }).segment(text)) {
      if (/[\p{L}\p{N}]/u.test(segment)) sentences += 1;
    }
  } else {
    // Code points, with combining marks folded into the previous character.
    for (const char of text.replace(/\p{M}+/gu, "")) {
      characters += 1;
      if (!WHITESPACE.test(char)) charactersNoSpaces += 1;
    }
    words = text.match(WORD_FALLBACK)?.length ?? 0;
    sentences = text.match(SENTENCE_FALLBACK)?.filter((s) => /[\p{L}\p{N}]/u.test(s)).length ?? 0;
  }

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    lines: countLines(text),
    paragraphs: countParagraphs(text),
    bytes: utf8Length(text),
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    segmenter: Boolean(Segmenter),
  };
}
