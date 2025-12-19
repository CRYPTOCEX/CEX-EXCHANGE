"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import {
  generateCode,
  SUPPORTED_LANGUAGES,
  type CodeLanguage,
  type CodeGeneratorOptions,
} from "../utils/code-templates";
import type { ParsedEndpoint, ParameterObject, RequestBodyObject } from "../types/openapi";
import { isReferenceObject } from "../types/openapi";

interface CodeGeneratorProps {
  endpoint: ParsedEndpoint;
  baseUrl: string;
  authType?: "bearer" | "apiKey" | "basic" | "none";
  authValue?: string;
  className?: string;
}

export function CodeGenerator({
  endpoint,
  baseUrl,
  authType = "apiKey",
  authValue,
  className,
}: CodeGeneratorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>("curl");

  const options = useMemo<CodeGeneratorOptions>(() => {
    const parameters = endpoint.operation.parameters?.filter(
      (p) => !isReferenceObject(p)
    ) as ParameterObject[] | undefined;

    const requestBody = endpoint.operation.requestBody && !isReferenceObject(endpoint.operation.requestBody)
      ? endpoint.operation.requestBody as RequestBodyObject
      : undefined;

    return {
      baseUrl,
      path: endpoint.path,
      method: endpoint.method,
      parameters,
      requestBody,
      authType,
      authValue,
    };
  }, [endpoint, baseUrl, authType, authValue]);

  const code = useMemo(() => {
    return generateCode(selectedLanguage, options);
  }, [selectedLanguage, options]);

  // Get the file extension for the language
  const getLanguageExtension = (lang: CodeLanguage): string => {
    const extensions: Record<CodeLanguage, string> = {
      curl: "bash",
      javascript: "javascript",
      typescript: "typescript",
      python: "python",
      php: "php",
      go: "go",
      ruby: "ruby",
    };
    return extensions[lang] || "text";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Language selector tabs */}
      <Tabs
        value={selectedLanguage}
        onValueChange={(v) => setSelectedLanguage(v as CodeLanguage)}
      >
        <TabsList className="h-9 bg-muted/50 overflow-x-auto w-full justify-start">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TabsTrigger
              key={lang.value}
              value={lang.value}
              className="text-xs px-3"
            >
              {lang.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Generated code */}
      <CodeBlock
        code={code}
        language={getLanguageExtension(selectedLanguage)}
        title={`${endpoint.method.toUpperCase()} ${endpoint.path}`}
        showLineNumbers={code.split("\n").length > 5}
        collapsible={code.split("\n").length > 15}
      />
    </div>
  );
}
