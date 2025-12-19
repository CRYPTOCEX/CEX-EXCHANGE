"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronRight,
  Menu,
  X,
  Filter,
  Tag,
  Code2,
} from "lucide-react";
import { MethodBadge, MethodFilter } from "./method-badge";
import type { ParsedEndpoint, EndpointsByTag, HttpMethod } from "../types/openapi";

interface SidebarProps {
  endpoints: ParsedEndpoint[];
  endpointsByTag: EndpointsByTag;
  tags: string[];
  selectedEndpoint: ParsedEndpoint | null;
  onSelectEndpoint: (endpoint: ParsedEndpoint) => void;
  search: string;
  onSearchChange: (search: string) => void;
  methodFilters: HttpMethod[];
  onMethodFiltersChange: (methods: HttpMethod[]) => void;
  className?: string;
}

const ALL_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "del"];

export function Sidebar({
  endpoints,
  endpointsByTag,
  tags,
  selectedEndpoint,
  onSelectEndpoint,
  search,
  onSearchChange,
  methodFilters,
  onMethodFiltersChange,
  className,
}: SidebarProps) {
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(tags));
  const [showFilters, setShowFilters] = useState(false);

  const toggleTag = (tag: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tag)) {
      newExpanded.delete(tag);
    } else {
      newExpanded.add(tag);
    }
    setExpandedTags(newExpanded);
  };

  const expandAll = () => setExpandedTags(new Set(tags));
  const collapseAll = () => setExpandedTags(new Set());

  // Count endpoints per tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tags.forEach((tag) => {
      counts[tag] = endpointsByTag[tag]?.length || 0;
    });
    return counts;
  }, [tags, endpointsByTag]);

  const sidebarContent = (
    <div className={cn("flex flex-col min-h-0 flex-1 overflow-hidden", className)}>
      {/* Search */}
      <div className="shrink-0 p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search endpoints..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            Filter by method
          </span>
          {methodFilters.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
              {methodFilters.length}
            </span>
          )}
        </Button>

        {/* Method filters */}
        {showFilters && (
          <div className="pt-2 space-y-2">
            <MethodFilter
              methods={ALL_METHODS}
              selected={methodFilters}
              onChange={onMethodFiltersChange}
            />
            {methodFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => onMethodFiltersChange([])}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tags & expand/collapse controls */}
      <div className="shrink-0 px-4 py-2 border-b flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {endpoints.length} endpoints
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={expandAll}
          >
            Expand
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={collapseAll}
          >
            Collapse
          </Button>
        </div>
      </div>

      {/* Endpoints list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No endpoints found</p>
            </div>
          ) : (
            tags.map((tag) => (
              <Collapsible
                key={tag}
                open={expandedTags.has(tag)}
                onOpenChange={() => toggleTag(tag)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        expandedTags.has(tag) && "rotate-90"
                      )}
                    />
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-sm flex-1 text-left truncate">
                      {tag}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {tagCounts[tag]}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 pl-2 border-l border-muted space-y-0.5 py-1">
                    {endpointsByTag[tag]?.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        onClick={() => onSelectEndpoint(endpoint)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                          selectedEndpoint?.id === endpoint.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <MethodBadge method={endpoint.method} size="sm" />
                        <span className="text-xs font-mono truncate flex-1">
                          {endpoint.path}
                        </span>
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-80 border-r bg-card flex-col overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (sheet) */}
      <div className="lg:hidden fixed top-20 left-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-lg">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>API Endpoints</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
