/**
 * Native JWT Decoder & Inspector Engine.
 *
 * Decodes header, payload, standard claims, and expiration timestamps from JSON Web Tokens.
 * 100% local, zero network.
 *
 * NOTE: This is a token decoder and inspector. It does not verify cryptographic
 * signatures without an explicit verification key.
 */

export interface JwtClaimSummary {
  issuer?: string;
  subject?: string;
  audience?: string | string[];
  issuedAt?: { timestamp: number; formatted: string };
  notBefore?: { timestamp: number; formatted: string };
  expiresAt?: { timestamp: number; formatted: string; isExpired: boolean; remainingSeconds: number };
  jwtId?: string;
}

export interface DecodedJwt {
  validFormat: boolean;
  error?: string;
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  claims: JwtClaimSummary;
  algorithm: string;
}

/**
 * Decodes and inspects a JWT string without verifying the signature.
 */
export function decodeJwt(tokenString: string): DecodedJwt {
  const clean = tokenString.trim();

  if (!clean) {
    return {
      validFormat: false,
      error: "Empty token",
      header: null,
      payload: null,
      signature: "",
      claims: {},
      algorithm: "Unknown",
    };
  }

  const parts = clean.split(".");
  if (parts.length !== 3) {
    return {
      validFormat: false,
      error: `Invalid JWT format. Expected 3 segments separated by dots, got ${parts.length}.`,
      header: null,
      payload: null,
      signature: "",
      claims: {},
      algorithm: "Unknown",
    };
  }

  const [headerB64, payloadB64, sigB64] = parts;

  try {
    const headerJson = base64UrlDecode(headerB64 ?? "");
    const payloadJson = base64UrlDecode(payloadB64 ?? "");

    const header = JSON.parse(headerJson) as Record<string, unknown>;
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const signature = sigB64 ?? "";
    const algorithm = typeof header.alg === "string" ? header.alg : "Unknown";

    const claims: JwtClaimSummary = {};

    if (typeof payload.iss === "string") claims.issuer = payload.iss;
    if (typeof payload.sub === "string") claims.subject = payload.sub;
    if (typeof payload.aud === "string" || Array.isArray(payload.aud)) {
      claims.audience = payload.aud as string | string[];
    }
    if (typeof payload.jti === "string") claims.jwtId = payload.jti;

    const nowSeconds = Math.floor(Date.now() / 1000);

    if (typeof payload.iat === "number") {
      claims.issuedAt = {
        timestamp: payload.iat,
        formatted: new Date(payload.iat * 1000).toISOString(),
      };
    }

    if (typeof payload.nbf === "number") {
      claims.notBefore = {
        timestamp: payload.nbf,
        formatted: new Date(payload.nbf * 1000).toISOString(),
      };
    }

    if (typeof payload.exp === "number") {
      const isExpired = payload.exp <= nowSeconds;
      const remainingSeconds = payload.exp - nowSeconds;
      claims.expiresAt = {
        timestamp: payload.exp,
        formatted: new Date(payload.exp * 1000).toISOString(),
        isExpired,
        remainingSeconds,
      };
    }

    return {
      validFormat: true,
      header,
      payload,
      signature,
      claims,
      algorithm,
    };
  } catch (err) {
    return {
      validFormat: false,
      error: err instanceof Error ? err.message : String(err),
      header: null,
      payload: null,
      signature: sigB64 ?? "",
      claims: {},
      algorithm: "Unknown",
    };
  }
}

/**
 * Decodes base64url string to UTF-8 text.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  if (typeof atob !== "undefined") {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (m) => m.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  // Node.js Buffer fallback
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  throw new Error("Base64 decoding not supported in this runtime");
}
