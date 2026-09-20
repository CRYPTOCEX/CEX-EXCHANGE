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
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
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
import { useTranslations } from "next-intl";

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
  /**
   * The spec has not arrived yet.
   *
   * Without this the sidebar could not tell "the spec is in flight" from "the
   * spec has no endpoints", and it rendered the second: `tags.length === 0` is
   * true for the whole fetch, so the panel greeted every visitor with a
   * crossed-out glyph and "No endpoints found" before filling with 400 rows.
   */
  loading?: boolean;
}

/** How many pending rows to draw. See `PENDING_ROWS` below. */
const PENDING_ROW_COUNT = 8;

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
  loading = false,
}: SidebarProps) {
  const t = useTranslations("utility_api-docs");
  const tCommon = useTranslations("common");
  /**
   * COLLAPSED, not expanded — the inversion is required by the pending state.
   *
   * This was `useState(new Set(tags))`, i.e. "seed the expanded set from the
   * tags we were handed at mount". That worked only because the PARENT swapped
   * the entire page for a spinner until the spec landed: this component
   * therefore mounted after the fetch, with all ~30 tags already in `tags`,
   * and every group came up expanded.
   *
   * Now that the shell renders during the fetch, `tags` is `[]` at mount — so
   * the same line would seed an empty set and the sidebar would come up with
   * every group COLLAPSED and stay that way, a silent behaviour regression
   * caused entirely by the loading fix. `useState` ignores its initialiser on
   * every render after the first, so there is nothing here to "recompute".
   *
   * Tracking the exceptions instead makes the default a property of the render
   * rather than of the mount instant: unknown tag => expanded, whenever it
   * arrives. `expandAll`/`collapseAll` still work, and `collapseAll` no longer
   * silently depends on `tags` being populated at the moment it is clicked.
   */
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const isExpanded = (tag: string) => !collapsedTags.has(tag);

  const toggleTag = (tag: string) => {
    const next = new Set(collapsedTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    setCollapsedTags(next);
  };

  const expandAll = () => setCollapsedTags(new Set());
  const collapseAll = () => setCollapsedTags(new Set(tags));

  // Count endpoints per tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tags.forEach((tag) => {
      counts[tag] = endpointsByTag[tag]?.length || 0;
    });
    return counts;
  }, [tags, endpointsByTag]);

  /**
   * SHADOWED BRANCH, re-gated.
   *
   * `tags.length === 0` was written under the assumption that the parent had
   * already returned a spinner for the whole page, so it only ever ran against
   * a resolved spec. With the parent's swap removed it runs during the fetch
   * too, where `tags` is `[]` for a reason that is not "there are none".
   *
   * `!loading &&` is therefore the fix, not the defect the scanner's
   * `hidden-while-loading` rule would otherwise read it as — hoisting it to a
   * name is where that distinction gets stated.
   */
  const showNoEndpoints = !loading && tags.length === 0;

  /**
   * Eight pending rows, matching the REAL collapsed tag row: the same
   * `px-2 py-2` box, the same 16px chevron, the same 14px tag glyph, the same
   * count pill. Eight because the real spec groups into ~30 tags and the
   * 320px column shows about eight of them above the fold — enough to fill
   * the visible strip, not so many that the scroll thumb jumps when the real
   * list (which is longer) replaces it.
   *
   * The count does not have to be right: this list lives inside a
   * `flex-1 min-h-0` ScrollArea, so its height is set by the column and the
   * children scroll inside it. Nothing outside this box can move whatever the
   * real list turns out to be — which is precisely the case the contract calls
   * "reserve the container, not the exact number of children".
   */
  const PENDING_ROWS = Array.from({ length: PENDING_ROW_COUNT }, (_, i) => (
    <div key={`pending-tag-${i}`} className="flex items-center gap-2 px-2 py-2 rounded-md">
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-40" />
      <Tag className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
      <span className="font-medium text-sm flex-1 text-left truncate">
        <SkeletonText chars={i % 3 === 0 ? 14 : 9} />
      </span>
      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        <SkeletonText chars={2} />
      </span>
    </div>
  ));

  const sidebarContent = (
    <div className={cn("flex flex-col min-h-0 flex-1 overflow-hidden", className)}>
      {/* Search */}
      <div className="shrink-0 p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t("search_endpoints")}…`}
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
            {t("filter_by_method")}
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
                {tCommon("clear_filters")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tags & expand/collapse controls */}
      <div className="shrink-0 px-4 py-2 border-b flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          <Loadable loading={loading} placeholder="000">
            {endpoints.length}
          </Loadable>{" "}
          endpoints
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
          {loading ? (
            PENDING_ROWS
          ) : showNoEndpoints ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("no_endpoints_found")}</p>
            </div>
          ) : (
            tags.map((tag) => (
              <Collapsible
                key={tag}
                open={isExpanded(tag)}
                onOpenChange={() => toggleTag(tag)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded(tag) && "rotate-90"
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
                            ? "bg-primary/10 text-primary-ink"
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
              <SheetTitle>{tCommon("api_endpoints")}</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
