import type { ParameterObject, RequestBodyObject, SchemaObject } from "../types/openapi";
import { isReferenceObject } from "../types/openapi";

export type CodeLanguage = "curl" | "javascript" | "typescript" | "python" | "php" | "go" | "ruby";

export interface CodeGeneratorOptions {
  baseUrl: string;
  path: string;
  method: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  headers?: Record<string, string>;
  authType?: "bearer" | "apiKey" | "basic" | "none";
  authValue?: string;
}

function generateSampleValue(schema: SchemaObject | undefined, name: string): unknown {
  if (!schema) return `<${name}>`;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  switch (schema.type) {
    case "string":
      if (schema.enum?.length) return schema.enum[0];
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "date") return "2024-01-15";
      if (schema.format === "date-time") return "2024-01-15T10:00:00Z";
      if (schema.format === "uuid") return "550e8400-e29b-41d4-a716-446655440000";
      if (schema.format === "uri" || schema.format === "url") return "https://example.com";
      return `<${name}>`;
    case "integer":
    case "number":
      if (schema.minimum !== undefined) return schema.minimum;
      return 1;
    case "boolean":
      return true;
    case "array":
      if (schema.items && !isReferenceObject(schema.items)) {
        return [generateSampleValue(schema.items as SchemaObject, "item")];
      }
      return [];
    case "object":
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        Object.entries(schema.properties).forEach(([key, value]) => {
          if (!isReferenceObject(value)) {
            obj[key] = generateSampleValue(value as SchemaObject, key);
          }
        });
        return obj;
      }
      return {};
    default:
      return `<${name}>`;
  }
}

function generateBodySample(requestBody: RequestBodyObject | undefined): unknown {
  if (!requestBody?.content) return {};

  const jsonContent = requestBody.content["application/json"];
  if (!jsonContent?.schema) return {};

  if (isReferenceObject(jsonContent.schema)) {
    return { "/* Reference schema */": "..." };
  }

  return generateSampleValue(jsonContent.schema as SchemaObject, "body");
}

function buildUrl(baseUrl: string, path: string, parameters?: ParameterObject[]): string {
  let url = `${baseUrl}${path}`;

  // Replace path parameters
  const pathParams = parameters?.filter((p) => p.in === "path") || [];
  pathParams.forEach((param) => {
    const schema = param.schema && !isReferenceObject(param.schema)
      ? param.schema as SchemaObject
      : undefined;
    const value = generateSampleValue(schema, param.name);
    url = url.replace(`{${param.name}}`, String(value));
  });

  // Add query parameters
  const queryParams = parameters?.filter((p) => p.in === "query") || [];
  if (queryParams.length > 0) {
    const queryParts = queryParams.map((param) => {
      const schema = param.schema && !isReferenceObject(param.schema)
        ? param.schema as SchemaObject
        : undefined;
      const value = generateSampleValue(schema, param.name);
      return `${param.name}=${encodeURIComponent(String(value))}`;
    });
    url += `?${queryParts.join("&")}`;
  }

  return url;
}

function getAuthHeader(authType: string, authValue?: string): Record<string, string> {
  switch (authType) {
    case "bearer":
      return { Authorization: `Bearer ${authValue || "<your-token>"}` };
    case "apiKey":
      return { "X-API-Key": authValue || "<your-api-key>" };
    case "basic":
      return { Authorization: `Basic ${authValue || "<base64-credentials>"}` };
    default:
      return {};
  }
}

// cURL template
function generateCurl(options: CodeGeneratorOptions): string {
  const { baseUrl, path, method, parameters, requestBody, headers = {}, authType = "none", authValue } = options;

  const url = buildUrl(baseUrl, path, parameters);
  const authHeaders = getAuthHeader(authType, authValue);
  const allHeaders = { ...headers, ...authHeaders };

  let hasBody = false;
  let bodyJson = "";
  if (requestBody && ["post", "put", "patch"].includes(method.toLowerCase())) {
    const body = generateBodySample(requestBody);
    bodyJson = JSON.stringify(body, null, 2);
    hasBody = true;
    allHeaders["Content-Type"] = "application/json";
  }

  const lines: string[] = [`curl -X ${method.toUpperCase()} "${url}"`];

  Object.entries(allHeaders).forEach(([key, value]) => {
    lines.push(`  -H "${key}: ${value}"`);
  });

  if (hasBody) {
    lines.push(`  -d '${bodyJson}'`);
  }

  return lines.join(" \\\n");
}

// JavaScript/TypeScript template
function generateJavaScript(options: CodeGeneratorOptions, isTypeScript = false): string {
  const { baseUrl, path, method, parameters, requestBody, headers = {}, authType = "none", authValue } = options;

  const url = buildUrl(baseUrl, path, parameters);
  const authHeaders = getAuthHeader(authType, authValue);
  const allHeaders = { ...headers, ...authHeaders };

  let hasBody = false;
  let bodyCode = "";
  if (requestBody && ["post", "put", "patch"].includes(method.toLowerCase())) {
    const body = generateBodySample(requestBody);
    bodyCode = JSON.stringify(body, null, 2);
    hasBody = true;
    allHeaders["Content-Type"] = "application/json";
  }

  const headerEntries = Object.entries(allHeaders)
    .map(([key, value]) => `    "${key}": "${value}"`)
    .join(",\n");

  let code = "";

  if (isTypeScript) {
    code += `interface Response {\n  // Define your response type\n  [key: string]: unknown;\n}\n\n`;
  }

  code += `const response = await fetch("${url}", {\n`;
  code += `  method: "${method.toUpperCase()}",\n`;
  code += `  headers: {\n${headerEntries}\n  }`;

  if (hasBody) {
    code += `,\n  body: JSON.stringify(${bodyCode})`;
  }

  code += `\n});\n\n`;

  if (isTypeScript) {
    code += `const data: Response = await response.json();\n`;
  } else {
    code += `const data = await response.json();\n`;
  }

  code += `console.log(data);`;

  return code;
}

// Python template
function generatePython(options: CodeGeneratorOptions): string {
  const { baseUrl, path, method, parameters, requestBody, headers = {}, authType = "none", authValue } = options;

  const url = buildUrl(baseUrl, path, parameters);
  const authHeaders = getAuthHeader(authType, authValue);
  const allHeaders = { ...headers, ...authHeaders };

  let hasBody = false;
  let bodyCode = "";
  if (requestBody && ["post", "put", "patch"].includes(method.toLowerCase())) {
    const body = generateBodySample(requestBody);
    bodyCode = JSON.stringify(body, null, 4).replace(/"/g, "'").replace(/true/g, "True").replace(/false/g, "False").replace(/null/g, "None");
    hasBody = true;
    allHeaders["Content-Type"] = "application/json";
  }

  const headerDict = Object.entries(allHeaders)
    .map(([key, value]) => `    "${key}": "${value}"`)
    .join(",\n");

  let code = `import requests\n\n`;
  code += `url = "${url}"\n`;
  code += `headers = {\n${headerDict}\n}\n`;

  if (hasBody) {
    code += `data = ${bodyCode}\n\n`;
    code += `response = requests.${method.toLowerCase()}(url, headers=headers, json=data)\n`;
  } else {
    code += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers)\n`;
  }

  code += `print(response.json())`;

  return code;
}

// PHP template
function generatePhp(options: CodeGeneratorOptions): string {
  const { baseUrl, path, method, parameters, requestBody, headers = {}, authType = "none", authValue } = options;

  const url = buildUrl(baseUrl, path, parameters);
  const authHeaders = getAuthHeader(authType, authValue);
  const allHeaders = { ...headers, ...authHeaders };

  let hasBody = false;
  let bodyCode = "";
  if (requestBody && ["post", "put", "patch"].includes(method.toLowerCase())) {
    const body = generateBodySample(requestBody);
    bodyCode = JSON.stringify(body, null, 4);
    hasBody = true;
    allHeaders["Content-Type"] = "application/json";
  }

  const headerLines = Object.entries(allHeaders)
    .map(([key, value]) => `    "${key}: ${value}"`)
    .join(",\n");

  let code = `<?php\n\n`;
  code += `$ch = curl_init();\n\n`;
  code += `curl_setopt($ch, CURLOPT_URL, "${url}");\n`;
  code += `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n`;
  code += `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method.toUpperCase()}");\n`;
  code += `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${headerLines}\n]);\n`;

  if (hasBody) {
    code += `curl_setopt($ch, CURLOPT_POSTFIELDS, '${bodyCode}');\n`;
  }

  code += `\n$response = curl_exec($ch);\n`;
  code += `curl_close($ch);\n\n`;
  code += `$data = json_decode($response, true);\n`;
  code += `print_r($data);\n`;

  return code;
}

// Go template
function generateGo(options: CodeGeneratorOptions): string {
  const { baseUrl, path, method, parameters, requestBody, headers = {}, authType = "none", authValue } = options;

  const url = buildUrl(baseUrl, path, parameters);
  const authHeaders = getAuthHeader(authType, authValue);
  const allHeaders = { ...headers, ...authHeaders };

  let hasBody = false;
  let bodyCode = "";
  if (requestBody && ["post", "put", "patch"].includes(method.toLowerCase())) {
    const body = generateBodySample(requestBody);
    bodyCode = JSON.stringify(body);
    hasBody = true;
    allHeaders["Content-Type"] = "application/json";
  }

  const headerLines = Object.entries(allHeaders)
    .map(([key, value]) => `\treq.Header.Set("${key}", "${value}")`)
    .join("\n");

  let code = `package main\n\n`;
  code += `import (\n\t"fmt"\n\t"io"\n\t"net/http"\n`;
  if (hasBody) code += `\t"strings"\n`;
  code += `)\n\n`;
  code += `func main() {\n`;

  if (hasBody) {
    code += `\tbody := strings.NewReader(\`${bodyCode}\`)\n`;
    code += `\treq, err := http.NewRequest("${method.toUpperCase()}", "${url}", body)\n`;
  } else {
    code += `\treq, err := http.NewRequest("${method.toUpperCase()}", "${url}", nil)\n`;
  }

  code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n\n`;
  code += `${headerLines}\n\n`;
  code += `\tclient := &http.Client{}\n`;
  code += `\tresp, err := client.Do(req)\n`;
  code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n`;
  code += `\tdefer resp.Body.Close()\n\n`;
  code += `\tdata, _ := io.ReadAll(resp.Body)\n`;
  code += `\tfmt.Println(string(data))\n`;
  code += `}`;

  return code;
}

// Ruby template
function generateRuby(options: CodeGeneratorOptions): string {
  const { baseUrl, path, method, parameters, requestBody, headers = {}, authType = "none", authValue } = options;

  const url = buildUrl(baseUrl, path, parameters);
  const authHeaders = getAuthHeader(authType, authValue);
  const allHeaders = { ...headers, ...authHeaders };

  let hasBody = false;
  let bodyCode = "";
  if (requestBody && ["post", "put", "patch"].includes(method.toLowerCase())) {
    const body = generateBodySample(requestBody);
    bodyCode = JSON.stringify(body, null, 2);
    hasBody = true;
    allHeaders["Content-Type"] = "application/json";
  }

  const headerLines = Object.entries(allHeaders)
    .map(([key, value]) => `request["${key}"] = "${value}"`)
    .join("\n");

  let code = `require "net/http"\n`;
  code += `require "json"\n\n`;
  code += `uri = URI("${url}")\n`;
  code += `http = Net::HTTP.new(uri.host, uri.port)\n`;
  code += `http.use_ssl = uri.scheme == "https"\n\n`;

  const methodClass = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  code += `request = Net::HTTP::${methodClass}.new(uri)\n`;
  code += `${headerLines}\n`;

  if (hasBody) {
    code += `request.body = '${bodyCode}'\n`;
  }

  code += `\nresponse = http.request(request)\n`;
  code += `puts JSON.parse(response.body)`;

  return code;
}

// Main generator function
export function generateCode(language: CodeLanguage, options: CodeGeneratorOptions): string {
  switch (language) {
    case "curl":
      return generateCurl(options);
    case "javascript":
      return generateJavaScript(options, false);
    case "typescript":
      return generateJavaScript(options, true);
    case "python":
      return generatePython(options);
    case "php":
      return generatePhp(options);
    case "go":
      return generateGo(options);
    case "ruby":
      return generateRuby(options);
    default:
      return "// Language not supported";
  }
}

export const SUPPORTED_LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "curl", label: "cURL" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
  { value: "go", label: "Go" },
  { value: "ruby", label: "Ruby" },
];
