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
import { useTranslations } from "next-intl";

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

/**
 * One labelled group of parameter inputs. Path, query and header were three
 * byte-identical copies of this apart from the `in` prefix on the state key.
 */
function ParameterFields({
  label,
  location,
  parameters,
  values,
  onChange,
}: {
  label: string;
  location: "path" | "query" | "header";
  parameters: ParameterObject[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (parameters.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{label}</Badge>
      </div>
      <div className="grid gap-4">
        {parameters.map((param) => {
          const key = `${location}-${param.name}`;
          return (
            <div key={param.name} className="space-y-2">
              <Label className="font-mono text-sm">
                {param.name}
                {param.required && (
                  <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
                )}
              </Label>
              <Input
                value={values[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={param.description || param.name}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function APIPlayground({ endpoint, baseUrl, className }: APIPlaygroundProps) {
  const t = useTranslations("utility_api-docs");
  const tCommon = useTranslations("common");
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

  /**
   * The send button's leading glyph, or nothing while the request is out.
   *
   * `null` and not a second icon: `<Button loading>` puts its own spinner in
   * that slot (see components/ui/button.tsx), so returning `Play` as well
   * would give the button two 16px glyphs. See the note at the call site.
   */
  const LeadIcon = requestState.loading ? null : Play;

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
            error: t("invalid_json_in_request_body"),
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
        error: err instanceof Error ? err.message : tCommon("request_failed"),
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
              {t("api_playground")}
            </CardTitle>
            <CardDescription>
              {t("test_this_endpoint_directly_from_the_browser")}
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
          <Label className="text-xs text-muted-foreground">{t("request_url")}</Label>
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
                  <Label>{t("auth_type")}</Label>
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
                      <SelectItem value="none">{t("no_auth")}</SelectItem>
                      <SelectItem value="apiKey">{tCommon("api_key")}</SelectItem>
                      <SelectItem value="bearer">{t("bearer_token")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {authType !== "none" && (
                  <div className="space-y-2">
                    <Label>
                      {authType === "apiKey" ? tCommon("api_key") : tCommon("token")}
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
                        <Label className="text-sm">{tCommon("your_api_keys")}</Label>
                        <Link
                          href="/user/profile?tab=api"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {t("manage_keys")}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      {apiKeyLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t("loading_your_api_keys")}…
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
                            <SelectValue placeholder={`${t("select_an_api_key")}…`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>{tCommon("your_api_keys")}</SelectLabel>
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
                          {t("no_api_keys_found")}{" "}
                          <Link
                            href="/user/profile?tab=api"
                            className="text-primary hover:underline"
                          >
                            {t("create_one")}
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
                        {tCommon("sign_in")}
                      </Link>{" "}
                      {t("to_use_your_saved_api_keys")}
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
                <ParameterFields
                  label="Path"
                  location="path"
                  parameters={parameters.path}
                  values={paramValues}
                  onChange={updateParamValue}
                />
                <ParameterFields
                  label="Query"
                  location="query"
                  parameters={parameters.query}
                  values={paramValues}
                  onChange={updateParamValue}
                />
                <ParameterFields
                  label="Headers"
                  location="header"
                  parameters={parameters.header}
                  values={paramValues}
                  onChange={updateParamValue}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Request Body */}
          {hasRequestBody && (
            <AccordionItem value="body" className="border! border-border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  {t("request_body")}
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
        {/*
          THE BUTTON OWNS ITS OWN SPINNER, and this one is an in-flight state
          rather than a pending layout — but the hand-rolled version was still
          two subtrees for one 40px control.

          `<Button loading>` renders `LoaderCircle` at `size-4` in the leading
          slot, exactly where the `Play` glyph sits, so the Play icon steps
          aside for it and the row keeps its 16px + `mr-2` + label geometry in
          both states. Resolving the icon to a VALUE rather than branching on
          it leaves one element in the JSX and removes the second copy of
          `h-4 w-4 mr-2` that had already picked up an `animate-spin` the other
          copy did not have.
        */}
        <Button
          onClick={executeRequest}
          loading={requestState.loading}
          className="w-full"
          size="lg"
        >
          {LeadIcon && <LeadIcon className="h-4 w-4 mr-2" />}
          {requestState.loading
            ? `${tCommon("sending")}…`
            : t("send_request")}
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
                  {/* Tint on the icon, the code itself on foreground: light-mode
                      `--success` is 3.39:1 as ink, short of the 4.5:1 this text
                      needs (DESIGN-SYSTEM.md header). The glyph clears 3:1. */}
                  <span className="flex items-center gap-1.5 font-medium">
                    {requestState.response.status < 400 ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {requestState.response.status} {requestState.response.statusText}
                  </span>
                </div>
              )}
            </div>

            {requestState.error ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                {/* §4a: heading stays on foreground inside a tinted status
                    panel — `text-destructive` on `bg-destructive/10` is 3.92:1. */}
                <p className="flex items-center gap-1.5 font-medium">
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  Error
                </p>
                <p className="text-sm mt-1 text-muted-foreground">{requestState.error}</p>
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
                    title={t("response_body")}
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
