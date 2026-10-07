import assert from "node:assert/strict";
import { describe, it } from "node:test";

// @ts-expect-error -- plain JavaScript build script, no type declarations
import { buildPolicy, policyProblems } from "../scripts/csp.mjs";

/**
 * The policy is what enforces "your files don't leave your device" and blocks
 * injected script. These tests fail if it is ever loosened.
 */
describe("Content Security Policy", () => {
  const policy: string = buildPolicy(["abc123+/="]);

  it("meets every invariant", () => {
    assert.deepEqual(policyProblems(policy), []);
  });

  it("allows no inline code, eval, other origins, frames or plugins", () => {
    assert.ok(!/unsafe-inline|unsafe-eval|\*/.test(policy));
    assert.match(policy, /connect-src 'self'(;|$)/);
    assert.match(policy, /worker-src 'self'(;|$)/);
    assert.match(policy, /frame-src 'none'/);
    assert.match(policy, /object-src 'none'/);
    assert.match(policy, /script-src 'self' 'sha256-abc123\+\/='(;|$)/);
  });

  it("rejects loosened versions", () => {
    const loosened = [
      policy.replace("connect-src 'self'", "connect-src 'self' https://api.example.com"),
      policy.replace("connect-src 'self'", "connect-src *"),
      policy.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"),
      policy.replace("script-src 'self'", "script-src 'self' 'unsafe-eval'"),
      policy.replace("worker-src 'self'", "worker-src 'self' blob:"),
      policy.replace("frame-src 'none'", "frame-src https:"),
      policy.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'"),
      policy.replace("img-src 'self' data: blob:", "img-src https:"),
      policy.replace(/; object-src 'none'/, ""),
    ];
    for (const weaker of loosened) {
      assert.notEqual(weaker, policy);
      assert.ok(policyProblems(weaker).length > 0, weaker);
    }
  });
});
