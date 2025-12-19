"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronRight, Braces, List, Hash, Type, ToggleLeft } from "lucide-react";
import type { SchemaObject, ReferenceObject } from "../types/openapi";
import { isReferenceObject } from "../types/openapi";

interface SchemaViewerProps {
  schema: SchemaObject | ReferenceObject;
  name?: string;
  required?: boolean;
  depth?: number;
  className?: string;
}

function getTypeIcon(type: string | undefined) {
  switch (type) {
    case "object":
      return <Braces className="h-3.5 w-3.5" />;
    case "array":
      return <List className="h-3.5 w-3.5" />;
    case "integer":
    case "number":
      return <Hash className="h-3.5 w-3.5" />;
    case "boolean":
      return <ToggleLeft className="h-3.5 w-3.5" />;
    default:
      return <Type className="h-3.5 w-3.5" />;
  }
}

function getTypeColor(type: string | undefined) {
  switch (type) {
    case "object":
      return "text-purple-400";
    case "array":
      return "text-cyan-400";
    case "integer":
    case "number":
      return "text-amber-400";
    case "boolean":
      return "text-green-400";
    case "string":
      return "text-blue-400";
    default:
      return "text-muted-foreground";
  }
}

function formatType(schema: SchemaObject): string {
  if (schema.type === "array" && schema.items) {
    if (isReferenceObject(schema.items)) {
      const refParts = schema.items.$ref.split("/");
      return `${refParts[refParts.length - 1]}[]`;
    }
    return `${(schema.items as SchemaObject).type || "any"}[]`;
  }

  if (schema.enum) {
    return `enum(${schema.enum.slice(0, 3).join(" | ")}${schema.enum.length > 3 ? " | ..." : ""})`;
  }

  let type = schema.type || "any";
  if (schema.format) {
    type += `<${schema.format}>`;
  }

  return type;
}

export function SchemaViewer({
  schema,
  name,
  required = false,
  depth = 0,
  className,
}: SchemaViewerProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  // Handle reference objects
  if (isReferenceObject(schema)) {
    const refParts = schema.$ref.split("/");
    const refName = refParts[refParts.length - 1];
    return (
      <div className={cn("flex items-center gap-2 py-1", className)}>
        {name && (
          <>
            <span className="font-mono text-sm">{name}</span>
            {required && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                required
              </Badge>
            )}
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className="text-purple-400 font-mono text-sm">${refName}</span>
      </div>
    );
  }

  const hasProperties = schema.type === "object" && schema.properties;
  const hasItems = schema.type === "array" && schema.items;
  const isExpandable = hasProperties || hasItems;

  // Simple property (no children)
  if (!isExpandable) {
    return (
      <div className={cn("flex items-center gap-2 py-1", className)}>
        {name && (
          <>
            <span className={cn("flex items-center gap-1.5", getTypeColor(schema.type))}>
              {getTypeIcon(schema.type)}
            </span>
            <span className="font-mono text-sm">{name}</span>
            {required && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                required
              </Badge>
            )}
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className={cn("font-mono text-sm", getTypeColor(schema.type))}>
          {formatType(schema)}
        </span>
        {schema.description && (
          <span className="text-xs text-muted-foreground truncate max-w-xs">
            — {schema.description}
          </span>
        )}
        {schema.default !== undefined && (
          <span className="text-xs text-muted-foreground">
            (default: {JSON.stringify(schema.default)})
          </span>
        )}
      </div>
    );
  }

  // Expandable property (object or array)
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-auto py-1 px-0 hover:bg-transparent"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform mr-1",
              isExpanded && "rotate-90"
            )}
          />
          <span className={cn("flex items-center gap-1.5", getTypeColor(schema.type))}>
            {getTypeIcon(schema.type)}
          </span>
          {name && (
            <>
              <span className="font-mono text-sm ml-1.5">{name}</span>
              {required && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">
                  required
                </Badge>
              )}
              <span className="text-muted-foreground ml-1">:</span>
            </>
          )}
          <span className={cn("font-mono text-sm ml-1", getTypeColor(schema.type))}>
            {formatType(schema)}
          </span>
          {schema.description && (
            <span className="text-xs text-muted-foreground ml-2 truncate max-w-xs">
              — {schema.description}
            </span>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className={cn(
            "ml-4 pl-3 border-l border-muted",
            depth > 3 && "border-dashed"
          )}
        >
          {/* Object properties */}
          {hasProperties &&
            Object.entries(schema.properties!).map(([propName, propSchema]) => (
              <SchemaViewer
                key={propName}
                schema={propSchema}
                name={propName}
                required={schema.required?.includes(propName)}
                depth={depth + 1}
              />
            ))}

          {/* Array items */}
          {hasItems && (
            <SchemaViewer
              schema={schema.items!}
              name="[items]"
              depth={depth + 1}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Wrapper component for displaying a complete schema
interface SchemaDisplayProps {
  schema: SchemaObject | ReferenceObject | undefined;
  title?: string;
  className?: string;
}

export function SchemaDisplay({ schema, title, className }: SchemaDisplayProps) {
  if (!schema) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No schema defined
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      )}
      <div className="rounded-lg border bg-muted/30 p-3">
        <SchemaViewer schema={schema} />
      </div>
    </div>
  );
}

// Table view for parameters
interface ParametersTableProps {
  parameters: Array<{
    name: string;
    in: string;
    description?: string;
    required?: boolean;
    schema?: SchemaObject | ReferenceObject;
    example?: unknown;
  }>;
  className?: string;
}

export function ParametersTable({ parameters, className }: ParametersTableProps) {
  if (parameters.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No parameters
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left py-3 px-4 font-medium">Name</th>
            <th className="text-left py-3 px-4 font-medium">Location</th>
            <th className="text-left py-3 px-4 font-medium">Type</th>
            <th className="text-left py-3 px-4 font-medium">Required</th>
            <th className="text-left py-3 px-4 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param, idx) => {
            const schema = param.schema && !isReferenceObject(param.schema)
              ? param.schema
              : undefined;

            return (
              <tr
                key={`${param.in}-${param.name}`}
                className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
              >
                <td className="py-3 px-4">
                  <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">
                    {param.name}
                  </code>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs font-mono">
                    {param.in}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                  {schema ? formatType(schema) : "any"}
                </td>
                <td className="py-3 px-4">
                  {param.required ? (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Optional
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {param.description || "—"}
                  {param.example !== undefined && (
                    <span className="block text-xs mt-1">
                      Example: <code>{JSON.stringify(param.example)}</code>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
