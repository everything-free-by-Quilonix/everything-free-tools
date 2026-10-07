import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateApiSnippets } from "@/engines/developer/api-mock";

describe("API Mock Generator Engine", () => {
  const config = {
    endpoint: "/api/v1/users",
    method: "POST" as const,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token123",
    },
    requestBody: JSON.stringify({ name: "Alice", role: "admin" }),
    responseStatus: 201,
    responseBody: JSON.stringify({ id: 101, name: "Alice", created: true }),
  };

  it("generates cURL command with headers and payload", () => {
    const snippets = generateApiSnippets(config);
    assert.ok(snippets.curl.includes('curl -X POST "https://api.example.com/api/v1/users"'));
    assert.ok(snippets.curl.includes('-H "Content-Type: application/json"'));
    assert.ok(snippets.curl.includes('-H "Authorization: Bearer token123"'));
    assert.ok(snippets.curl.includes("-d '"));
  });

  it("generates JavaScript fetch snippet", () => {
    const snippets = generateApiSnippets(config);
    assert.ok(snippets.javascript.includes("await fetch"));
    assert.ok(snippets.javascript.includes('method: "POST"'));
    assert.ok(snippets.javascript.includes("body: JSON.stringify"));
  });

  it("generates Python requests snippet", () => {
    const snippets = generateApiSnippets(config);
    assert.ok(snippets.python.includes("import requests"));
    assert.ok(snippets.python.includes("requests.post"));
  });

  it("infers TypeScript interface from response JSON", () => {
    const snippets = generateApiSnippets(config);
    assert.ok(snippets.typescriptInterface.includes("export interface ApiResponse"));
    assert.ok(snippets.typescriptInterface.includes("id: number;"));
    assert.ok(snippets.typescriptInterface.includes("name: string;"));
    assert.ok(snippets.typescriptInterface.includes("created: boolean;"));
  });
});
