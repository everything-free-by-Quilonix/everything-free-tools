/**
 * Native Number Base Converter Engine.
 *
 * Converts integers of arbitrary precision across binary, octal, decimal, hexadecimal,
 * and custom bases (2 to 36) using native BigInt. 100% local, zero network.
 */

export interface NumberBaseResult {
  binary: string;
  octal: string;
  decimal: string;
  hex: string;
  bitLength: number;
  byteCount: number;
  customBaseValue?: string;
}

const BASE_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Parses an input string in a given radix into a BigInt.
 */
export function parseToBigInt(input: string, radix: number): bigint {
  const clean = input.trim().toLowerCase();
  if (!clean) throw new Error("Input string is empty");
  if (radix < 2 || radix > 36) throw new Error("Radix must be between 2 and 36");

  // Check valid chars
  const validChars = BASE_DIGITS.slice(0, radix);
  const isNegative = clean.startsWith("-");
  const numberPart = isNegative ? clean.slice(1) : clean;

  if (numberPart.length === 0) throw new Error("No digits found");

  for (const c of numberPart) {
    if (!validChars.includes(c)) {
      throw new Error(`Invalid digit '${c}' for base ${radix}`);
    }
  }

  const base = BigInt(radix);
  let result = 0n;

  for (let i = 0; i < numberPart.length; i++) {
    const digitChar = numberPart[i] ?? "0";
    const digitValue = BigInt(validChars.indexOf(digitChar));
    result = result * base + digitValue;
  }

  return isNegative ? -result : result;
}

/**
 * Formats a BigInt into a string with a given radix (2 to 36).
 */
export function formatBigIntBase(value: bigint, radix: number): string {
  if (radix < 2 || radix > 36) throw new Error("Radix must be between 2 and 36");
  if (value === 0n) return "0";

  const isNeg = value < 0n;
  let current = isNeg ? -value : value;
  const base = BigInt(radix);
  let res = "";

  while (current > 0n) {
    const remainder = Number(current % base);
    res = (BASE_DIGITS[remainder] ?? "0") + res;
    current = current / base;
  }

  return isNeg ? "-" + res : res;
}

/**
 * Converts a number in any base into all standard bases and a custom target base.
 */
export function convertBases(input: string, fromBase: number, customTargetBase?: number): NumberBaseResult {
  const bigVal = parseToBigInt(input, fromBase);

  const bin = formatBigIntBase(bigVal, 2);
  const oct = formatBigIntBase(bigVal, 8);
  const dec = formatBigIntBase(bigVal, 10);
  const hex = formatBigIntBase(bigVal, 16);

  const absVal = bigVal < 0n ? -bigVal : bigVal;
  const bitLength = absVal === 0n ? 1 : formatBigIntBase(absVal, 2).length;
  const byteCount = Math.ceil(bitLength / 8);

  let customBaseValue: string | undefined;
  if (customTargetBase && customTargetBase >= 2 && customTargetBase <= 36) {
    customBaseValue = formatBigIntBase(bigVal, customTargetBase);
  }

  return {
    binary: bin,
    octal: oct,
    decimal: dec,
    hex: hex.toUpperCase(),
    bitLength,
    byteCount,
    customBaseValue,
  };
}
