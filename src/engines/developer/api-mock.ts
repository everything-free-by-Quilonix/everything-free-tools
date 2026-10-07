/**
 * Native API Mock & Client Snippet Generator Engine.
 *
 * Generates client request snippets across cURL, JavaScript fetch, Python requests,
 * and TypeScript data contracts from an API mock definition. 100% local, zero network.
 */

export interface ApiMockConfig {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseBody?: string;
}

export interface GeneratedSnippets {
  curl: string;
  javascript: string;
  python: string;
  typescriptInterface: string;
}

/**
 * Generates multi-language client code from mock config.
 */
export function generateApiSnippets(config: ApiMockConfig): GeneratedSnippets {
  const { endpoint, method, headers, requestBody } = config;
  const url = endpoint.startsWith("http") ? endpoint : `https://api.example.com${endpoint}`;

  // 1. cURL
  let curl = `curl -X ${method} "${url}"`;
  for (const [k, v] of Object.entries(headers)) {
    curl += ` \\\n  -H "${k}: ${v}"`;
  }
  if (requestBody && method !== "GET") {
    curl += ` \\\n  -d '${requestBody.replace(/'/g, "'\\''")}'`;
  }

  // 2. JavaScript fetch
  const jsHeaders = JSON.stringify(headers, null, 2)
    .split("\n")
    .map((l, i) => (i === 0 ? l : "    " + l))
    .join("\n");

  let js = `// Fetch API Client\nconst response = await fetch("${url}", {\n  method: "${method}",\n  headers: ${jsHeaders},\n`;
  if (requestBody && method !== "GET") {
    js += `  body: JSON.stringify(${requestBody.trim()}),\n`;
  }
  js += "});\n\nconst data = await response.json();\nconsole.log(data);";

  // 3. Python requests
  let py = `import requests\n\nurl = "${url}"\nheaders = ${JSON.stringify(headers, null, 4)}\n`;
  if (requestBody && method !== "GET") {
    py += `payload = ${requestBody.trim()}\n\n`;
    py += `response = requests.${method.toLowerCase()}(url, json=payload, headers=headers)\n`;
  } else {
    py += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers)\n`;
  }
  py += "print(response.status_code)\nprint(response.json())";

  // 4. TypeScript Interface
  let tsInterface = "// Inferred Response Type Contract\n";
  try {
    if (config.responseBody && config.responseBody.trim()) {
      const parsed = JSON.parse(config.responseBody);
      tsInterface += inferTypeContract("ApiResponse", parsed);
    } else {
      tsInterface += "export interface ApiResponse {\n  [key: string]: unknown;\n}";
    }
  } catch {
    tsInterface += "export interface ApiResponse {\n  [key: string]: unknown;\n}";
  }

  return {
    curl,
    javascript: js,
    python: py,
    typescriptInterface: tsInterface,
  };
}

function inferTypeContract(name: string, val: unknown): string {
  if (typeof val !== "object" || val === null) {
    return `export type ${name} = ${typeof val};\n`;
  }

  if (Array.isArray(val)) {
    const item = val[0];
    const itemType = item !== undefined && typeof item === "object" ? "ItemType" : typeof item;
    let extra = "";
    if (itemType === "ItemType") {
      extra = inferTypeContract("ItemType", item) + "\n";
    }
    return `${extra}export type ${name} = ${itemType}[];\n`;
  }

  const obj = val as Record<string, unknown>;
  let code = `export interface ${name} {\n`;
  for (const [k, v] of Object.entries(obj)) {
    const typeName = v === null ? "null" : Array.isArray(v) ? "unknown[]" : typeof v;
    const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : `"${k}"`;
    code += `  ${safeKey}: ${typeName};\n`;
  }
  code += "}\n";
  return code;
}
