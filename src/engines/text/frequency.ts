/**
 * Native Word & Character Frequency Analysis Engine.
 *
 * Computes frequency counts, proportions, rankings, and statistical density
 * for words and characters with stop-word filtering. 100% local, zero network.
 */

export interface FrequencyItem {
  word: string;
  count: number;
  percentage: number;
  rank: number;
}

export interface FrequencyAnalysis {
  totalWords: number;
  uniqueWords: number;
  totalChars: number;
  wordFrequency: FrequencyItem[];
  charFrequency: { char: string; count: number; percentage: number }[];
}

export interface FrequencyOptions {
  caseSensitive?: boolean;
  excludeStopWords?: boolean;
  minWordLength?: number;
}

const COMMON_STOP_WORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "aren't",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can't",
  "cannot",
  "could",
  "couldn't",
  "did",
  "didn't",
  "do",
  "does",
  "doesn't",
  "doing",
  "don't",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "hadn't",
  "has",
  "hasn't",
  "have",
  "haven't",
  "having",
  "he",
  "he'd",
  "he'll",
  "he's",
  "her",
  "here",
  "here's",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "how's",
  "i",
  "i'd",
  "i'll",
  "i'm",
  "i've",
  "if",
  "in",
  "into",
  "is",
  "isn't",
  "it",
  "it's",
  "its",
  "itself",
  "let's",
  "me",
  "more",
  "most",
  "mustn't",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "ought",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "shan't",
  "she",
  "she'd",
  "she'll",
  "she's",
  "should",
  "shouldn't",
  "so",
  "some",
  "such",
  "than",
  "that",
  "that's",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "there's",
  "these",
  "they",
  "they'd",
  "they'll",
  "they're",
  "they've",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "wasn't",
  "we",
  "we'd",
  "we'll",
  "we're",
  "we've",
  "were",
  "weren't",
  "what",
  "what's",
  "when",
  "when's",
  "where",
  "where's",
  "which",
  "while",
  "who",
  "who's",
  "whom",
  "why",
  "why's",
  "with",
  "won't",
  "would",
  "wouldn't",
  "you",
  "you'd",
  "you'll",
  "you're",
  "you've",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

/**
 * Computes frequency statistics for a text corpus.
 */
export function analyzeFrequency(text: string, options: FrequencyOptions = {}): FrequencyAnalysis {
  const caseSensitive = options.caseSensitive ?? false;
  const excludeStopWords = options.excludeStopWords ?? false;
  const minLength = options.minWordLength ?? 1;

  if (!text.trim()) {
    return {
      totalWords: 0,
      uniqueWords: 0,
      totalChars: 0,
      wordFrequency: [],
      charFrequency: [],
    };
  }

  // Character frequency
  const charCounts = new Map<string, number>();
  let totalChars = 0;
  for (const ch of text) {
    if (!/\s/.test(ch)) {
      charCounts.set(ch, (charCounts.get(ch) ?? 0) + 1);
      totalChars++;
    }
  }

  const charFrequency = Array.from(charCounts.entries())
    .map(([char, count]) => ({
      char,
      count,
      percentage: totalChars > 0 ? Math.round((count / totalChars) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Word frequency
  const words = text
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= minLength);

  const wordCounts = new Map<string, number>();
  let validWordTotal = 0;

  for (const rawWord of words) {
    const cleanWord = caseSensitive ? rawWord : rawWord.toLowerCase();
    if (excludeStopWords && COMMON_STOP_WORDS.has(cleanWord.toLowerCase())) {
      continue;
    }
    wordCounts.set(cleanWord, (wordCounts.get(cleanWord) ?? 0) + 1);
    validWordTotal++;
  }

  const sortedWords = Array.from(wordCounts.entries()).sort((a, b) => b[1] - a[1]);

  const wordFrequency: FrequencyItem[] = sortedWords.map(([word, count], idx) => ({
    word,
    count,
    percentage: validWordTotal > 0 ? Math.round((count / validWordTotal) * 1000) / 10 : 0,
    rank: idx + 1,
  }));

  return {
    totalWords: validWordTotal,
    uniqueWords: sortedWords.length,
    totalChars,
    wordFrequency,
    charFrequency,
  };
}
