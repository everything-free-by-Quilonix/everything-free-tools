/**
 * Native HTTP Status Code Lookup Engine & Reference.
 *
 * Provides a comprehensive, client-side static registry of standard HTTP status codes
 * (RFC 7231, RFC 6585, RFC 7538) with developer explanations, causes, and best practices.
 * 100% local, zero network.
 */

export type HttpStatusCategory = "1xx" | "2xx" | "3xx" | "4xx" | "5xx";

export interface HttpStatusEntry {
  code: number;
  phrase: string;
  category: HttpStatusCategory;
  categoryName: string;
  rfc: string;
  summary: string;
  causes: string;
  developerTips: string;
}

export const HTTP_STATUS_DATABASE: readonly HttpStatusEntry[] = [
  // 1xx Informational
  {
    code: 100,
    phrase: "Continue",
    category: "1xx",
    categoryName: "Informational",
    rfc: "RFC 7231",
    summary: "The initial part of a request has been received and the client can continue sending the remainder.",
    causes: "Used with 'Expect: 100-continue' header when uploading large payloads.",
    developerTips:
      "Wait for this status before sending a large request body to avoid uploading unnecessary bytes if rejected.",
  },
  {
    code: 101,
    phrase: "Switching Protocols",
    category: "1xx",
    categoryName: "Informational",
    rfc: "RFC 7231",
    summary: "The server agrees to switch protocol as requested via the Upgrade header.",
    causes: "WebSocket handshakes, HTTP/2 upgrade negotiation.",
    developerTips: "Returned when upgrading from standard HTTP/1.1 to full-duplex WebSocket connection.",
  },

  // 2xx Success
  {
    code: 200,
    phrase: "OK",
    category: "2xx",
    categoryName: "Success",
    rfc: "RFC 7231",
    summary: "Standard response for successful HTTP requests.",
    causes: "GET returned resource, POST/PUT completed, HEAD returned headers.",
    developerTips: "Include representation payload in body. For asynchronous jobs, prefer 202 Accepted.",
  },
  {
    code: 201,
    phrase: "Created",
    category: "2xx",
    categoryName: "Success",
    rfc: "RFC 7231",
    summary: "The request succeeded and resulted in the creation of a new resource.",
    causes: "Successful POST or PUT resource generation.",
    developerTips: "Always supply a 'Location' response header pointing to the URI of the newly created resource.",
  },
  {
    code: 202,
    phrase: "Accepted",
    category: "2xx",
    categoryName: "Success",
    rfc: "RFC 7231",
    summary: "The request has been accepted for processing, but processing has not finished.",
    causes: "Long-running asynchronous background jobs, batch jobs, queues.",
    developerTips: "Return a job identifier or status check endpoint URL so clients can poll or await Webhooks.",
  },
  {
    code: 204,
    phrase: "No Content",
    category: "2xx",
    categoryName: "Success",
    rfc: "RFC 7231",
    summary:
      "The server successfully fulfilled the request and there is no additional content to send in the response payload.",
    causes: "DELETE operations, PUT/POST updates where clients do not require refreshed representations.",
    developerTips: "Never include a response body with 204. Doing so violates HTTP standards.",
  },
  {
    code: 206,
    phrase: "Partial Content",
    category: "2xx",
    categoryName: "Success",
    rfc: "RFC 7233",
    summary: "The server is delivering only part of the resource due to a Range header sent by the client.",
    causes: "Video/audio streaming, resumable multi-part downloads.",
    developerTips: "Must include 'Content-Range' header indicating bytes delivered and total file length.",
  },

  // 3xx Redirection
  {
    code: 301,
    phrase: "Moved Permanently",
    category: "3xx",
    categoryName: "Redirection",
    rfc: "RFC 7231",
    summary: "The target resource has been assigned a new permanent URI and any future references should use this URI.",
    causes: "Site migration, canonical domain redirects (HTTP to HTTPS).",
    developerTips: "Search engines transfer SEO equity (PageRank) to the target URI. Browser caches this aggressively.",
  },
  {
    code: 302,
    phrase: "Found",
    category: "3xx",
    categoryName: "Redirection",
    rfc: "RFC 7231",
    summary: "The target resource resides temporarily under a different URI.",
    causes: "Temporary maintenance redirect, auth gate login redirection.",
    developerTips:
      "Historically browsers incorrectly changed POST to GET upon encountering 302; use 307 or 308 for strict method preservation.",
  },
  {
    code: 304,
    phrase: "Not Modified",
    category: "3xx",
    categoryName: "Redirection",
    rfc: "RFC 7232",
    summary:
      "Indicates that the resource has not been modified since the version specified by If-Modified-Since or If-None-Match.",
    causes: "Client cache validation hit with matching ETag or Last-Modified.",
    developerTips: "Saves network bandwidth. The response body MUST remain empty.",
  },
  {
    code: 307,
    phrase: "Temporary Redirect",
    category: "3xx",
    categoryName: "Redirection",
    rfc: "RFC 7231",
    summary: "Temporary redirect that guarantees the HTTP method (e.g. POST) is NOT changed when redirecting.",
    causes: "API endpoints requiring temporary relocation without method conversion.",
    developerTips: "Modern replacement for 302 whenever method preservation matters.",
  },
  {
    code: 308,
    phrase: "Permanent Redirect",
    category: "3xx",
    categoryName: "Redirection",
    rfc: "RFC 7538",
    summary: "Permanent redirect that guarantees the HTTP method is not changed.",
    causes: "Permanent API URL restructuring, maintaining POST/PUT bodies.",
    developerTips: "Modern replacement for 301 whenever preserving request verbs is essential.",
  },

  // 4xx Client Error
  {
    code: 400,
    phrase: "Bad Request",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 7231",
    summary: "The server cannot or will not process the request due to perceived client error.",
    causes: "Malformed request syntax, invalid parameters, deceptive routing.",
    developerTips:
      "Return a structured RFC 7807 (Problem Details) JSON payload describing which field failed validation.",
  },
  {
    code: 401,
    phrase: "Unauthorized",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 7235",
    summary:
      "The request has not been applied because it lacks valid authentication credentials for the target resource.",
    causes: "Missing Authorization header, expired JWT token, invalid API key.",
    developerTips: "Must include a 'WWW-Authenticate' response header defining the auth scheme.",
  },
  {
    code: 403,
    phrase: "Forbidden",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 7231",
    summary: "The server understood the request but refuses to authorize it.",
    causes: "User is authenticated, but lacks permissions (RBAC/access control failure).",
    developerTips:
      "Distinct from 401: with 403, credentials were recognized, but insufficient privileges prevent access.",
  },
  {
    code: 404,
    phrase: "Not Found",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 7231",
    summary: "The origin server did not find a current representation for the target resource.",
    causes: "Incorrect URL, deleted resource, route mismatch.",
    developerTips: "Can also be used in place of 403 to avoid disclosing the existence of sensitive resources.",
  },
  {
    code: 405,
    phrase: "Method Not Allowed",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 7231",
    summary: "The method received in the request line is known by the server but not supported by the target resource.",
    causes: "Sending POST to a read-only GET endpoint.",
    developerTips: "Must include an 'Allow' header listing permitted methods (e.g. 'Allow: GET, HEAD').",
  },
  {
    code: 409,
    phrase: "Conflict",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 7231",
    summary: "The request could not be completed due to a conflict with the current state of the target resource.",
    causes: "Duplicate unique keys, version mismatch in optimistic concurrency.",
    developerTips: "Return the diff or version information so client can resolve conflict and retry.",
  },
  {
    code: 422,
    phrase: "Unprocessable Content",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 4918",
    summary:
      "The server understands the content type and syntax, but was unable to process the contained instructions.",
    causes: "Semantic validation errors (e.g. start_date > end_date, field violates business rule).",
    developerTips: "Popular in RESTful APIs to distinguish malformed JSON (400) from invalid business data (422).",
  },
  {
    code: 429,
    phrase: "Too Many Requests",
    category: "4xx",
    categoryName: "Client Error",
    rfc: "RFC 6585",
    summary: "The user has sent too many requests in a given amount of time (rate limiting).",
    causes: "Exceeded rate limit quotas, DDoS protection triggering.",
    developerTips:
      "Include 'Retry-After' header indicating the number of seconds the client must wait before retrying.",
  },

  // 5xx Server Error
  {
    code: 500,
    phrase: "Internal Server Error",
    category: "5xx",
    categoryName: "Server Error",
    rfc: "RFC 7231",
    summary: "The server encountered an unexpected condition that prevented it from fulfilling the request.",
    causes: "Unhandled runtime exceptions, database connection crash, unhandled rejection.",
    developerTips: "Never expose raw stack traces in production 500 responses; log securely with correlation IDs.",
  },
  {
    code: 502,
    phrase: "Bad Gateway",
    category: "5xx",
    categoryName: "Server Error",
    rfc: "RFC 7231",
    summary: "The server, while acting as a gateway or proxy, received an invalid response from an inbound server.",
    causes: "Upstream microservice crashed, Node/Python app down behind Nginx.",
    developerTips: "Check reverse proxy upstream socket configurations and backend process health checks.",
  },
  {
    code: 503,
    phrase: "Service Unavailable",
    category: "5xx",
    categoryName: "Server Error",
    rfc: "RFC 7231",
    summary: "The server is currently unable to handle the request due to temporary overloading or maintenance.",
    causes: "Server overload, planned maintenance window.",
    developerTips: "Supply 'Retry-After' header to suggest when clients or load balancers should resume requests.",
  },
  {
    code: 504,
    phrase: "Gateway Timeout",
    category: "5xx",
    categoryName: "Server Error",
    rfc: "RFC 7231",
    summary:
      "The server, while acting as a gateway or proxy, did not receive a timely response from an upstream server.",
    causes: "Long query timeout, upstream deadlocks, network partitioning.",
    developerTips:
      "Increase reverse proxy timeout limits if long operations are expected, or convert to asynchronous 202 jobs.",
  },
];

/**
 * Searches HTTP status codes by number, phrase, or keyword.
 */
export function searchHttpStatus(query: string, categoryFilter?: string): HttpStatusEntry[] {
  const clean = query.trim().toLowerCase();

  return HTTP_STATUS_DATABASE.filter((entry) => {
    if (categoryFilter && categoryFilter !== "all" && entry.category !== categoryFilter) {
      return false;
    }
    if (!clean) return true;

    return (
      String(entry.code).includes(clean) ||
      entry.phrase.toLowerCase().includes(clean) ||
      entry.summary.toLowerCase().includes(clean) ||
      entry.causes.toLowerCase().includes(clean)
    );
  });
}
