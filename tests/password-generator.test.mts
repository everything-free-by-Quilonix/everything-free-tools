import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateEntropy, generatePassphrase, generatePassword } from "@/engines/crypto/password";

describe("Password Generator Engine", () => {
  it("generates password with requested length", () => {
    const pwd16 = generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    assert.equal(pwd16.length, 16);

    const pwd32 = generatePassword({
      length: 32,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false,
    });
    assert.equal(pwd32.length, 32);
  });

  it("includes all requested character classes", () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generatePassword({
        length: 24,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      });
      assert.ok(/[A-Z]/.test(pwd), "contains uppercase");
      assert.ok(/[a-z]/.test(pwd), "contains lowercase");
      assert.ok(/[0-9]/.test(pwd), "contains number");
      assert.ok(/[^a-zA-Z0-9]/.test(pwd), "contains symbol");
    }
  });

  it("excludes ambiguous characters when enabled", () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generatePassword({
        length: 32,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: false,
        excludeAmbiguous: true,
      });
      assert.ok(!/[1lI0O]/.test(pwd), `password "${pwd}" contains ambiguous characters`);
    }
  });

  it("generates word-based passphrases with custom separators", () => {
    const phrase = generatePassphrase(4, "-");
    const words = phrase.split("-");
    assert.equal(words.length, 4);
    for (const w of words) {
      assert.ok(w.length > 2);
    }
  });

  it("calculates entropy accurately", () => {
    const weak = calculateEntropy("12345");
    assert.equal(weak.label, "Weak");

    const strong = calculateEntropy("K9#mQ!4vX@7wL$2z");
    assert.ok(strong.bits >= 60);
    assert.ok(strong.label === "Strong" || strong.label === "Very Strong");
  });
});
