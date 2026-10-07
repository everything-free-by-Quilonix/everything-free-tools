import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeJwt } from "@/engines/developer/jwt";

describe("JWT Decoder Engine", () => {
  // Standard test token with payload: {"sub":"1234567890","name":"John Doe","iat":1516239022,"exp":1999999999,"iss":"auth.example.com"}
  const sampleToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5OTk5OTk5OTksImlzcyI6ImF1dGguZXhhbXBsZS5jb20ifQ." +
    "4flKqKjK5e2L3P2ZqK5e2L3P2ZqK5e2L3P2ZqK5e2L0";

  it("decodes valid JWT header and payload", () => {
    const res = decodeJwt(sampleToken);
    assert.equal(res.validFormat, true);
    assert.equal(res.algorithm, "HS256");
    assert.equal(res.payload?.name, "John Doe");
    assert.equal(res.payload?.sub, "1234567890");
    assert.equal(res.claims.issuer, "auth.example.com");
    assert.equal(res.claims.expiresAt?.isExpired, false);
    assert.equal(res.claims.issuedAt?.timestamp, 1516239022);
  });

  it("detects expired tokens", () => {
    // Expired in 2020: exp = 1577836800
    const expiredPayload = Buffer.from(JSON.stringify({ sub: "user1", exp: 1577836800 })).toString("base64url");
    const token = `eyJhbGciOiJIUzI1NiJ9.${expiredPayload}.dummy_sig`;
    const res = decodeJwt(token);
    assert.equal(res.validFormat, true);
    assert.equal(res.claims.expiresAt?.isExpired, true);
  });

  it("rejects invalid token structure", () => {
    const res = decodeJwt("not.a.valid.jwt.string");
    assert.equal(res.validFormat, false);
    assert.ok(res.error);
  });
});
