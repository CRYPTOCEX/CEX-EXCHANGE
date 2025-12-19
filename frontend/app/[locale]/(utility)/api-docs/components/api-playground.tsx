"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  Play,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Key,
  FileJson,
  Send,
  ExternalLink,
} from "lucide-react";
import { MethodBadge } from "./method-badge";
import { CodeBlock } from "./code-block";
import type { ParsedEndpoint, ParameterObject, SchemaObject } from "../types/openapi";
import { isReferenceObject } from "../types/openapi";
import { useUserStore } from "@/store/user";
import { Link } from "@/i18n/routing";

interface APIPlaygroundProps {
  endpoint: ParsedEndpoint;
  baseUrl: string;
  className?: string;
}

interface RequestState {
  loading: boolean;
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    time: number;
  } | null;
  error: string | null;
}

function generateDefaultValue(schema: SchemaObject | undefined, name: string): string {
  if (!schema) return "";

  if (schema.example !== undefined) return String(schema.example);
  if (schema.default !== undefined) return String(schema.default);

  switch (schema.type) {
    case "string":
      if (schema.enum?.length) return String(schema.enum[0]);
      return "";
    case "integer":
    case "number":
      return schema.minimum !== undefined ? String(schema.minimum) : "";
    case "boolean":
      return "true";
    default:
      return "";
  }
}

export function APIPlayground({ endpoint, baseUrl, className }: APIPlaygroundProps) {
  const { operation, path, method } = endpoint;

  // User API keys from store
  const user = useUserStore((state) => state.user);
  const apiKeys = useUserStore((state) => state.apiKeys);
  const fetchApiKeys = useUserStore((state) => state.fetchApiKeys);
  const apiKeyLoading = useUserStore((state) => state.apiKeyLoading);

  // Fetch API keys on mount if user is logged in
  useEffect(() => {
    if (user?.id) {
      fetchApiKeys();
    }
  }, [user?.id, fetchApiKeys]);

  // Authentication state
  const [authType, setAuthType] = useState<"none" | "bearer" | "apiKey">("apiKey");
  const [authValue, setAuthValue] = useState("");
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");

  // Parameter values
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  // Request body
  const [requestBody, setRequestBody] = useState("");

  // Request state
  const [requestState, setRequestState] = useState<RequestState>({
    loading: false,
    response: null,
    error: null,
  });

  // Extract parameters
  const parameters = useMemo(() => {
    const params = operation.parameters?.filter(
      (p) => !isReferenceObject(p)
    ) as ParameterObject[] | undefined;

    if (!params) return { path: [], query: [], header: [] };

    return {
      path: params.filter((p) => p.in === "path"),
      query: params.filter((p) => p.in === "query"),
      header: params.filter((p) => p.in === "header"),
    };
  }, [operation.parameters]);

  // Initialize param values
  useMemo(() => {
    const initial: Record<string, string> = {};
    [...parameters.path, ...parameters.query, ...parameters.header].forEach((param) => {
      const schema = param.schema && !isReferenceObject(param.schema)
        ? param.schema as SchemaObject
        : undefined;
      initial[`${param.in}-${param.name}`] = generateDefaultValue(schema, param.name);
    });
    setParamValues(initial);
  }, [parameters]);

  // Check if endpoint has request body
  const hasRequestBody = operation.requestBody && ["post", "put", "patch"].includes(method);

  // Initialize request body with sample
  useMemo(() => {
    if (hasRequestBody && !requestBody) {
      const body = operation.requestBody;
      if (body && !isReferenceObject(body)) {
        const jsonContent = body.content?.["application/json"];
        if (jsonContent?.schema) {
          if (jsonContent.example) {
            setRequestBody(JSON.stringify(jsonContent.example, null, 2));
          } else if (!isReferenceObject(jsonContent.schema)) {
            const schema = jsonContent.schema as SchemaObject;
            if (schema.example) {
              setRequestBody(JSON.stringify(schema.example, null, 2));
            }
          }
        }
      }
    }
  }, [hasRequestBody, operation.requestBody, requestBody]);

  // Build the request URL
  const buildUrl = useCallback(() => {
    let url = `${baseUrl}${path}`;

    // Replace path parameters
    parameters.path.forEach((param) => {
      const value = paramValues[`path-${param.name}`] || `{${param.name}}`;
      url = url.replace(`{${param.name}}`, encodeURIComponent(value));
    });

    // Add query parameters
    const queryParts: string[] = [];
    parameters.query.forEach((param) => {
      const value = paramValues[`query-${param.name}`];
      if (value) {
        queryParts.push(`${param.name}=${encodeURIComponent(value)}`);
      }
    });

    if (queryParts.length > 0) {
      url += `?${queryParts.join("&")}`;
    }

    return url;
  }, [baseUrl, path, parameters, paramValues]);

  // Execute the request
  const executeRequest = async () => {
    setRequestState({ loading: true, response: null, error: null });

    const startTime = performance.now();

    try {
      const url = buildUrl();

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add auth header
      if (authType === "bearer" && authValue) {
        headers["Authorization"] = `Bearer ${authValue}`;
      } else if (authType === "apiKey" && authValue) {
        headers["X-API-Key"] = authValue;
      }

      // Add custom headers
      parameters.header.forEach((param) => {
        const value = paramValues[`header-${param.name}`];
        if (value) {
          headers[param.name] = value;
        }
      });

      // Build fetch options
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers,
        credentials: "include",
      };

      // Add body for POST/PUT/PATCH
      if (hasRequestBody && requestBody) {
        try {
          // Validate JSON
          JSON.parse(requestBody);
          fetchOptions.body = requestBody;
        } catch {
          setRequestState({
            loading: false,
            response: null,
            error: "Invalid JSON in request body",
          });
          return;
        }
      }

      const response = await fetch(url, fetchOptions);
      const endTime = performance.now();

      // Parse response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response body
      let body: unknown;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      setRequestState({
        loading: false,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body,
          time: Math.round(endTime - startTime),
        },
        error: null,
      });
    } catch (err) {
      setRequestState({
        loading: false,
        response: null,
        error: err instanceof Error ? err.message : "Request failed",
      });
    }
  };

  const updateParamValue = (key: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              API Playground
            </CardTitle>
            <CardDescription>
              Test this endpoint directly from the browser
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <MethodBadge method={method} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Preview */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Request URL</Label>
          <div className="font-mono text-sm bg-muted p-3 rounded-lg break-all">
            {buildUrl()}
          </div>
        </div>

        <Accordion type="multiple" defaultValue={["auth", "params"]} className="space-y-3">
          {/* Authentication */}
          <AccordionItem value="auth" className="border! border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Authentication
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Auth Type</Label>
                  <Select
                    value={authType}
                    onValueChange={(v) => {
                      setAuthType(v as typeof authType);
                      setSelectedApiKeyId("");
                      setAuthValue("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Auth</SelectItem>
                      <SelectItem value="apiKey">API Key</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {authType !== "none" && (
                  <div className="space-y-2">
                    <Label>
                      {authType === "apiKey" ? "API Key" : "Token"}
                    </Label>
                    <Input
                      type="password"
                      value={authValue}
                      onChange={(e) => {
                        setAuthValue(e.target.value);
                        setSelectedApiKeyId("");
                      }}
                      placeholder={
                        authType === "apiKey"
                          ? "sk_live_your_api_key"
                          : "your_bearer_token"
                      }
                    />
                  </div>
                )}
              </div>

              {/* User's saved API keys */}
              {authType === "apiKey" && (
                <div className="space-y-3 pt-2 border-t">
                  {user?.id ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Your API Keys</Label>
                        <Link
                          href="/user/profile?tab=api"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Manage Keys
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      {apiKeyLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading your API keys...
                        </div>
                      ) : apiKeys.length > 0 ? (
                        <Select
                          value={selectedApiKeyId}
                          onValueChange={(keyId) => {
                            setSelectedApiKeyId(keyId);
                            const selectedKey = apiKeys.find((k) => k.id === keyId);
                            if (selectedKey) {
                              setAuthValue(selectedKey.key);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an API key..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Your API Keys</SelectLabel>
                              {apiKeys.map((key) => (
                                <SelectItem key={key.id} value={key.id}>
                                  <div className="flex items-center gap-2">
                                    <Key className="h-3 w-3" />
                                    <span>{key.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({key.key.substring(0, 8)}...)
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No API keys found.{" "}
                          <Link
                            href="/user/profile?tab=api"
                            className="text-primary hover:underline"
                          >
                            Create one
                          </Link>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <Link
                        href="/login"
                        className="text-primary hover:underline font-medium"
                      >
                        Sign in
                      </Link>{" "}
                      to use your saved API keys, or enter one manually above.
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Parameters */}
          {(parameters.path.length > 0 ||
            parameters.query.length > 0 ||
            parameters.header.length > 0) && (
            <AccordionItem value="params" className="border! border-border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Parameters
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-6">
                {/* Path parameters */}
                {parameters.path.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Path</Badge>
                    </div>
                    <div className="grid gap-4">
                      {parameters.path.map((param) => (
                        <div key={param.name} className="space-y-2">
                          <Label className="font-mono text-sm">
                            {param.name}
                            {param.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          <Input
                            value={paramValues[`path-${param.name}`] || ""}
                            onChange={(e) => updateParamValue(`path-${param.name}`, e.target.value)}
                            placeholder={param.description || param.name}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Query parameters */}
                {parameters.query.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Query</Badge>
                    </div>
                    <div className="grid gap-4">
                      {parameters.query.map((param) => (
                        <div key={param.name} className="space-y-2">
                          <Label className="font-mono text-sm">
                            {param.name}
                            {param.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          <Input
                            value={paramValues[`query-${param.name}`] || ""}
                            onChange={(e) => updateParamValue(`query-${param.name}`, e.target.value)}
                            placeholder={param.description || param.name}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Header parameters */}
                {parameters.header.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Headers</Badge>
                    </div>
                    <div className="grid gap-4">
                      {parameters.header.map((param) => (
                        <div key={param.name} className="space-y-2">
                          <Label className="font-mono text-sm">
                            {param.name}
                            {param.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          <Input
                            value={paramValues[`header-${param.name}`] || ""}
                            onChange={(e) => updateParamValue(`header-${param.name}`, e.target.value)}
                            placeholder={param.description || param.name}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Request Body */}
          {hasRequestBody && (
            <AccordionItem value="body" className="border! border-border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Request Body
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="font-mono text-sm min-h-[200px]"
                />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Send button */}
        <Button
          onClick={executeRequest}
          disabled={requestState.loading}
          className="w-full"
          size="lg"
        >
          {requestState.loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Send Request
            </>
          )}
        </Button>

        {/* Response */}
        {(requestState.response || requestState.error) && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Response</h3>
              {requestState.response && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {requestState.response.time}ms
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-medium",
                      requestState.response.status < 400
                        ? "text-green-500"
                        : "text-red-500"
                    )}
                  >
                    {requestState.response.status < 400 ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {requestState.response.status} {requestState.response.statusText}
                  </span>
                </div>
              )}
            </div>

            {requestState.error ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{requestState.error}</p>
              </div>
            ) : (
              requestState.response && (
                <ScrollArea className="max-h-[400px]">
                  <CodeBlock
                    code={
                      typeof requestState.response.body === "string"
                        ? requestState.response.body
                        : JSON.stringify(requestState.response.body, null, 2)
                    }
                    language="json"
                    title="Response Body"
                  />
                </ScrollArea>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
