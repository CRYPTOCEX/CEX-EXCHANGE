"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Image as ImageIcon,
  X,
  RefreshCw,
  List,
  Calendar,
  File,
  SortAsc,
  SortDesc,
  LayoutGrid,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode, SortBy, SortOrder } from "./types";

interface MediaToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
  dateFilters: { value: string; label: string }[];
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function MediaToolbar({
  viewMode,
  onViewModeChange,
  dateFilter,
  onDateFilterChange,
  dateFilters,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  loading,
}: MediaToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("grid")}
                  className="rounded-none h-8 px-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("list")}
                  className="rounded-none h-8 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Date filter */}
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger className="w-35 h-8">
            <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            {dateFilters.map((df) => (
              <SelectItem key={df.value} value={df.value}>
                {df.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSortByChange("date")}>
              <Clock className="h-4 w-4 mr-2" />
              Date {sortBy === "date" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortByChange("name")}>
              <File className="h-4 w-4 mr-2" />
              Name {sortBy === "name" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortByChange("size")}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Size {sortBy === "size" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
              }
            >
              {sortOrder === "asc" ? (
                <>
                  <SortDesc className="h-4 w-4 mr-2" />
                  Descending
                </>
              ) : (
                <>
                  <SortAsc className="h-4 w-4 mr-2" />
                  Ascending
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-8"
          />
          {searchQuery && (
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

        {/* Refresh */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={loading}
                className="h-8 w-8"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
