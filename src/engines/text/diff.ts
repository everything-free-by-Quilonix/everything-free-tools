/**
 * Text and Code Diff Engine.
 *
 * Implements a line-by-line diff algorithm to compute additions, deletions,
 * and unchanged spans. Runs entirely locally in browser memory.
 */

export type DiffChangeType = "equal" | "insert" | "delete";

export interface DiffLine {
  type: DiffChangeType;
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
}

/**
 * Computes line-by-line differences between original and modified text.
 */
export function computeTextDiff(originalText: string, modifiedText: string): DiffResult {
  const origLines = originalText.split(/\r?\n/);
  const modLines = modifiedText.split(/\r?\n/);

  // Handle trivial edge cases
  if (originalText === modifiedText) {
    return {
      lines: origLines.map((text, i) => ({
        type: "equal",
        text,
        oldLineNumber: i + 1,
        newLineNumber: i + 1,
      })),
      additions: 0,
      deletions: 0,
      unchanged: origLines.length,
    };
  }

  // Longest Common Subsequence (LCS) matrix for line arrays
  const n = origLines.length;
  const m = modLines.length;
  const stride = m + 1;
  const dp = new Int32Array((n + 1) * stride);

  const getDp = (r: number, c: number): number => dp[r * stride + c] ?? 0;
  const setDp = (r: number, c: number, val: number) => {
    dp[r * stride + c] = val;
  };

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (origLines[i] === modLines[j]) {
        setDp(i + 1, j + 1, getDp(i, j) + 1);
      } else {
        setDp(i + 1, j + 1, Math.max(getDp(i + 1, j), getDp(i, j + 1)));
      }
    }
  }

  // Backtrack to build the diff
  let i = n;
  let j = m;
  const diffLinesReversed: DiffLine[] = [];

  while (i > 0 || j > 0) {
    const origLine = i > 0 ? (origLines[i - 1] ?? "") : "";
    const modLine = j > 0 ? (modLines[j - 1] ?? "") : "";

    if (i > 0 && j > 0 && origLine === modLine) {
      diffLinesReversed.push({
        type: "equal",
        text: origLine,
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || getDp(i, j - 1) >= getDp(i - 1, j))) {
      diffLinesReversed.push({
        type: "insert",
        text: modLine,
        newLineNumber: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || getDp(i, j - 1) < getDp(i - 1, j))) {
      diffLinesReversed.push({
        type: "delete",
        text: origLine,
        oldLineNumber: i,
      });
      i--;
    } else {
      break;
    }
  }

  const lines = diffLinesReversed.reverse();

  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const line of lines) {
    if (line.type === "insert") additions++;
    else if (line.type === "delete") deletions++;
    else unchanged++;
  }

  return { lines, additions, deletions, unchanged };
}
