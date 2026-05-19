"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Lock,
  Unlock,
  Tag,
  FileJson,
  Send,
  Code2,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { MethodBadge } from "./method-badge";
import { CodeBlock } from "./code-block";
import { CodeGenerator } from "./code-generator";
import { ParametersTable, SchemaDisplay } from "./schema-viewer";
import type {
  ParsedEndpoint,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
} from "../types/openapi";
import { isReferenceObject } from "../types/openapi";

interface EndpointDetailProps {
  endpoint: ParsedEndpoint;
  baseUrl: string;
  className?: string;
}

function getStatusCodeColor(code: string): string {
  const num = parseInt(code, 10);
  if (num >= 200 && num < 300) return "text-green-500";
  if (num >= 300 && num < 400) return "text-blue-500";
  if (num >= 400 && num < 500) return "text-amber-500";
  if (num >= 500) return "text-red-500";
  return "text-muted-foreground";
}

function getStatusCodeIcon(code: string) {
  const num = parseInt(code, 10);
  if (num >= 200 && num < 300) return <CheckCircle className="h-4 w-4" />;
  if (num >= 400) return <XCircle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function EndpointDetail({ endpoint, baseUrl, className }: EndpointDetailProps) {
  const { operation, path, method, tags } = endpoint;

  // Extract parameters by location
  const parameters = useMemo(() => {
    const params = operation.parameters?.filter(
      (p) => !isReferenceObject(p)
    ) as ParameterObject[] | undefined;

    if (!params) return { path: [], query: [], header: [], cookie: [] };

    return {
      path: params.filter((p) => p.in === "path"),
      query: params.filter((p) => p.in === "query"),
      header: params.filter((p) => p.in === "header"),
      cookie: params.filter((p) => p.in === "cookie"),
    };
  }, [operation.parameters]);

  const allParameters = [
    ...parameters.path,
    ...parameters.query,
    ...parameters.header,
    ...parameters.cookie,
  ];

  // Extract request body
  const requestBody = useMemo(() => {
    if (!operation.requestBody || isReferenceObject(operation.requestBody)) {
      return null;
    }
    return operation.requestBody as RequestBodyObject;
  }, [operation.requestBody]);

  // Extract responses
  const responses = useMemo(() => {
    return Object.entries(operation.responses)
      .filter(([, response]) => !isReferenceObject(response))
      .map(([code, response]) => ({
        code,
        response: response as ResponseObject,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [operation.responses]);

  // Generate example response
  const generateExampleResponse = (response: ResponseObject): string => {
    const jsonContent = response.content?.["application/json"];
    if (!jsonContent?.schema) return "{}";

    if (isReferenceObject(jsonContent.schema)) {
      return `{\n  "// Reference": "${jsonContent.schema.$ref}"\n}`;
    }

    const schema = jsonContent.schema as SchemaObject;
    if (jsonContent.example) {
      return JSON.stringify(jsonContent.example, null, 2);
    }
    if (schema.example) {
      return JSON.stringify(schema.example, null, 2);
    }

    // Generate sample from schema
    const generateSample = (s: SchemaObject): unknown => {
      switch (s.type) {
        case "object":
          if (s.properties) {
            const obj: Record<string, unknown> = {};
            Object.entries(s.properties).forEach(([key, value]) => {
              if (!isReferenceObject(value)) {
                obj[key] = generateSample(value as SchemaObject);
              }
            });
            return obj;
          }
          return {};
        case "array":
          if (s.items && !isReferenceObject(s.items)) {
            return [generateSample(s.items as SchemaObject)];
          }
          return [];
        case "string":
          return s.example || s.enum?.[0] || "string";
        case "integer":
        case "number":
          return s.example || 0;
        case "boolean":
          return s.example ?? true;
        default:
          return null;
      }
    };

    return JSON.stringify(generateSample(schema), null, 2);
  };

  const hasAuth = operation.security && operation.security.length > 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start gap-3">
            <MethodBadge method={method} size="lg" />
            <div className="flex-1 min-w-0">
              <CardTitle className="font-mono text-xl break-all">
                {path}
              </CardTitle>
              {operation.summary && (
                <CardDescription className="mt-2 text-base">
                  {operation.summary}
                </CardDescription>
              )}
            </div>
            {/* Auth indicator */}
            <Badge
              variant={hasAuth ? "default" : "secondary"}
              className="shrink-0"
            >
              {hasAuth ? (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Auth Required
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  Public
                </>
              )}
            </Badge>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Deprecated warning */}
          {operation.deprecated && (
            <div className="mt-4 flex items-center gap-2 text-amber-500 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>This endpoint is deprecated and may be removed in future versions.</span>
            </div>
          )}
        </CardHeader>

        {operation.description && (
          <CardContent className="pt-0">
            <p className="text-muted-foreground">{operation.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="parameters" className="space-y-4">
        <TabsList className="w-full justify-start bg-muted/50 h-11 overflow-x-auto">
          <TabsTrigger value="parameters" className="gap-2">
            <FileJson className="h-4 w-4" />
            Parameters
            {allParameters.length > 0 && (
              <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 rounded">
                {allParameters.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="responses" className="gap-2">
            <Send className="h-4 w-4" />
            Responses
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 rounded">
              {responses.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-2">
            <Code2 className="h-4 w-4" />
            Code
          </TabsTrigger>
        </TabsList>

        {/* Parameters Tab */}
        <TabsContent value="parameters" className="space-y-6">
          {/* Path parameters */}
          {parameters.path.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline">Path</Badge>
                Parameters
              </h3>
              <ParametersTable parameters={parameters.path} />
            </div>
          )}

          {/* Query parameters */}
          {parameters.query.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline">Query</Badge>
                Parameters
              </h3>
              <ParametersTable parameters={parameters.query} />
            </div>
          )}

          {/* Header parameters */}
          {parameters.header.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline">Header</Badge>
                Parameters
              </h3>
              <ParametersTable parameters={parameters.header} />
            </div>
          )}

          {/* Request body */}
          {requestBody && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline">Body</Badge>
                Request Body
                {requestBody.required && (
                  <Badge variant="destructive" className="text-xs">
                    Required
                  </Badge>
                )}
              </h3>
              {requestBody.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {requestBody.description}
                </p>
              )}
              {Object.entries(requestBody.content).map(([contentType, mediaType]) => (
                <div key={contentType} className="space-y-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {contentType}
                  </Badge>
                  {mediaType.schema && (
                    <SchemaDisplay schema={mediaType.schema} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No parameters message */}
          {allParameters.length === 0 && !requestBody && (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileJson className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>This endpoint has no parameters</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="responses" className="space-y-4">
          {responses.map(({ code, response }) => (
            <Card key={code}>
              <CardHeader className="py-3">
                <div className="flex items-center gap-3">
                  <span className={cn("flex items-center gap-1.5", getStatusCodeColor(code))}>
                    {getStatusCodeIcon(code)}
                    <span className="font-mono font-bold">{code}</span>
                  </span>
                  <span className="text-muted-foreground">{response.description}</span>
                </div>
              </CardHeader>
              {response.content?.["application/json"] && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Schema */}
                    {response.content["application/json"].schema && (
                      <SchemaDisplay
                        schema={response.content["application/json"].schema}
                        title="Response Schema"
                      />
                    )}
                    {/* Example */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Example Response
                      </h4>
                      <CodeBlock
                        code={generateExampleResponse(response)}
                        language="json"
                        maxHeight={300}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Code Examples</CardTitle>
              <CardDescription>
                Generate code snippets for this endpoint in multiple programming languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeGenerator endpoint={endpoint} baseUrl={baseUrl} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
