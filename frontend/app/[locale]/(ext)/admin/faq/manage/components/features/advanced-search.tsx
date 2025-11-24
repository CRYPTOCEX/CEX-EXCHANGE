"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  SlidersHorizontal,
  X,
  Tag,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  categories: string[];
  tags: string[];
  onClear: () => void;
  showFilters: boolean;
  onToggleFilters: (show: boolean) => void;
}

export interface SearchFilters {
  query: string;
  category?: string;
  tags: string[];
  status?: "active" | "inactive" | "all";
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export function AdvancedSearch({
  onSearch,
  categories,
  tags,
  onClear,
  showFilters,
  onToggleFilters,
}: AdvancedSearchProps) {
  const t = useTranslations("ext");
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: undefined,
    tags: [],
    status: "all",
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.category && filters.category !== "all") count++;
    if (filters.tags.length > 0) count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;

    if (count !== activeFiltersCount) {
      setActiveFiltersCount(count);
    }
  }, [filters, activeFiltersCount]);

  const handleSearch = () => {
    // Only call onSearch if there are actual changes
    onSearch({ ...filters });
  };

  const handleClear = () => {
    setFilters({
      query: "",
      category: undefined,
      tags: [],
      status: "all",
    });
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleTag = (tag: string) => {
    if (filters.tags.includes(tag)) {
      setFilters({
        ...filters,
        tags: filters.tags.filter((t) => t !== tag),
      });
    } else {
      setFilters({
        ...filters,
        tags: [...filters.tags, tag],
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Input
          placeholder="Search FAQs..."
          className="pl-8"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          onKeyDown={handleKeyDown}
          icon="mdi:magnify"
        />
        {filters.query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9"
            onClick={() => setFilters({ ...filters, query: "" })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="default"
          className="gap-2"
          onClick={() => onToggleFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{t("Filters")}</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        <Button size="default" onClick={handleSearch}>{t("Search")}</Button>

        {(filters.query || activeFiltersCount > 0) && (
          <Button variant="ghost" size="default" onClick={handleClear}>
            <X className="h-4 w-4 mr-2" />
            {t("Clear")}
          </Button>
        )}
      </div>
    </div>
  );
}

// New separate component for the filter panel
export function AdvancedSearchFilters({
  showFilters,
  categories,
  tags,
  onFiltersChange,
}: {
  showFilters: boolean;
  categories: string[];
  tags: string[];
  onFiltersChange: (filters: SearchFilters) => void;
}) {
  const t = useTranslations("ext");
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: undefined,
    tags: [],
    status: "all",
  });

  const toggleTag = (tag: string) => {
    const newFilters = {
      ...filters,
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag],
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleCategoryChange = (value: string) => {
    const newFilters = {
      ...filters,
      category: value === "all" ? undefined : value,
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleStatusChange = (value: "active" | "inactive" | "all") => {
    const newFilters = {
      ...filters,
      status: value,
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <AnimatePresence>
      {showFilters && (
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-2">
            <Label>{t("Category")}</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_categories")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("Tags")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  role="combobox"
                >
                  <span className="truncate">
                    {filters.tags.length > 0
                      ? `${filters.tags.length} tag${filters.tags.length > 1 ? "s" : ""} selected`
                      : "Select tags"}
                  </span>
                  <Tag className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandList>
                    <CommandEmpty>{t("no_tags_found")}.</CommandEmpty>
                    <CommandGroup>
                      {tags.map((tag) => (
                        <CommandItem
                          key={tag}
                          onSelect={() => toggleTag(tag)}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              filters.tags.includes(tag)
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <span>{tag}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filters.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("Status")}</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_status")}</SelectItem>
                <SelectItem
                  value="active"
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{t("Active")}</span>
                </SelectItem>
                <SelectItem
                  value="inactive"
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>{t("Inactive")}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("date_range")}</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{t("select_dates")}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("filter_by_creation_or_update_date")}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
