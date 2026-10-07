/**
 * Cryptographically Secure Password & Passphrase Engine.
 *
 * Randomness is strictly derived from Web Crypto (crypto.getRandomValues).
 * Math.random is never used.
 */

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous?: boolean;
}

const UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const UPPERCASE_AMBIGUOUS = "IO";
const LOWERCASE_CHARS = "abcdefghijkmnopqrstuvwxyz";
const LOWERCASE_AMBIGUOUS = "l";
const NUMBER_CHARS = "23456789";
const NUMBER_AMBIGUOUS = "01";
const SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

const PASSPHRASE_WORDS = [
  "almond",
  "beacon",
  "breeze",
  "cactus",
  "castle",
  "canyon",
  "cherry",
  "clover",
  "cobalt",
  "crater",
  "crystal",
  "dolphin",
  "dragon",
  "eagle",
  "ember",
  "falcon",
  "feather",
  "forest",
  "galaxy",
  "glacier",
  "granite",
  "harbor",
  "horizon",
  "island",
  "jungle",
  "lagoon",
  "lantern",
  "magnet",
  "meadow",
  "meteor",
  "nebula",
  "nectar",
  "oasis",
  "ocean",
  "orbit",
  "palace",
  "pebble",
  "planet",
  "quartz",
  "rainbow",
  "river",
  "rocket",
  "ruby",
  "shadow",
  "silver",
  "solar",
  "stream",
  "summit",
  "sunset",
  "timber",
  "titan",
  "topaz",
  "valley",
  "velvet",
  "vessel",
  "volcano",
  "voyage",
  "walnut",
  "willow",
  "winter",
  "zenith",
  "zephyr",
];

function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let randomVal = 0;
  do {
    crypto.getRandomValues(array);
    const val = array[0];
    if (val !== undefined) {
      randomVal = val;
    }
  } while (randomVal >= limit);
  return randomVal % max;
}

export function generatePassword(options: PasswordOptions): string {
  const len = Math.max(4, Math.min(128, options.length));
  let pool = "";
  const guaranteed: string[] = [];

  const addSet = (chars: string, ambiguous: string, enabled: boolean) => {
    if (!enabled) return;
    const available = options.excludeAmbiguous ? chars : chars + ambiguous;
    if (available.length > 0) {
      pool += available;
      const char = available[secureRandomInt(available.length)];
      if (char) guaranteed.push(char);
    }
  };

  addSet(UPPERCASE_CHARS, UPPERCASE_AMBIGUOUS, options.uppercase);
  addSet(LOWERCASE_CHARS, LOWERCASE_AMBIGUOUS, options.lowercase);
  addSet(NUMBER_CHARS, NUMBER_AMBIGUOUS, options.numbers);
  addSet(SYMBOL_CHARS, "", options.symbols);

  if (pool.length === 0) {
    // Default fallback if all sets disabled
    pool = LOWERCASE_CHARS + UPPERCASE_CHARS + NUMBER_CHARS;
  }

  const result: string[] = [...guaranteed];
  while (result.length < len) {
    const char = pool[secureRandomInt(pool.length)];
    if (char) result.push(char);
  }

  // Fisher-Yates shuffle with secure random
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const itemI = result[i];
    const itemJ = result[j];
    if (itemI !== undefined && itemJ !== undefined) {
      result[i] = itemJ;
      result[j] = itemI;
    }
  }

  return result.join("");
}

export function generatePassphrase(wordCount = 4, separator = "-"): string {
  const count = Math.max(3, Math.min(10, wordCount));
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const word = PASSPHRASE_WORDS[secureRandomInt(PASSPHRASE_WORDS.length)] ?? "secure";
    words.push(word);
  }
  return words.join(separator);
}

export interface PasswordStrength {
  bits: number;
  label: "Weak" | "Fair" | "Strong" | "Very Strong";
}

export function calculateEntropy(password: string): PasswordStrength {
  if (!password) return { bits: 0, label: "Weak" };

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) poolSize = 10;

  const bits = Math.round(password.length * (Math.log(poolSize) / Math.log(2)));

  let label: PasswordStrength["label"] = "Weak";
  if (bits >= 80) label = "Very Strong";
  else if (bits >= 60) label = "Strong";
  else if (bits >= 36) label = "Fair";

  return { bits, label };
}
