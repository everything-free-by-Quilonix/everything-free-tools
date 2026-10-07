/**
 * URL Encoder / Decoder engine.
 *
 * Implements standard RFC 3986 URL encoding, component encoding, and query parameter
 * parsing. Zero network, pure client-side processing.
 */

export interface UrlEncodeOptions {
  mode: "component" | "full" | "query-params";
  spaceAsPlus?: boolean;
}

export interface ParsedUrlDetails {
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
  params: [string, string][];
}

/**
 * Encodes text according to specified URL options.
 */
export function encodeUrl(input: string, options: UrlEncodeOptions = { mode: "component" }): string {
  if (!input) return "";

  if (options.mode === "full") {
    // Encodes a full URI while preserving structural URI characters
    const encoded = encodeURI(input);
    return options.spaceAsPlus ? encoded.replace(/%20/g, "+") : encoded;
  }

  // Component encoding
  const encoded = encodeURIComponent(input);
  return options.spaceAsPlus ? encoded.replace(/%20/g, "+") : encoded;
}

/**
 * Decodes URL-encoded text.
 */
export function decodeUrl(input: string, plusAsSpace = true): string {
  if (!input) return "";
  let prepared = input;
  if (plusAsSpace) {
    prepared = prepared.replace(/\+/g, " ");
  }
  try {
    return decodeURIComponent(prepared);
  } catch {
    // Fallback for malformed percent-encodings
    return unescape(prepared);
  }
}

/**
 * Parses a full URL into its components and key-value query parameters.
 */
export function parseUrl(input: string): ParsedUrlDetails | null {
  if (!input.trim()) return null;
  try {
    // Handle URLs without explicit protocol by prefixing https://
    const urlStr = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) ? input : `https://${input}`;
    const url = new URL(urlStr);
    const params: [string, string][] = [];
    url.searchParams.forEach((val, key) => {
      params.push([key, val]);
    });
    return {
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      params,
    };
  } catch {
    return null;
  }
}
