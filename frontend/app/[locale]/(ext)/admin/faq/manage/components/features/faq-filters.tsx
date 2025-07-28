"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { useFAQAdminStore } from "@/store/faq/admin";
import { useTranslations } from "next-intl";

interface FAQFiltersProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function FAQFilters({ viewMode, onViewModeChange }: FAQFiltersProps) {
  const t = useTranslations("ext");
  const { filters, categories, setFilters } = useFAQAdminStore();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setFilters({ search: e.currentTarget.value });
    }
  };

  const handleClearSearch = () => {
    setFilters({ search: "" });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search FAQs..."
          className="pl-8 pr-8"
          defaultValue={filters.search}
          onKeyDown={handleSearch}
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Select
        value={filters.category || "all"}
        onValueChange={(value) =>
          setFilters({ category: value === "all" ? undefined : value })
        }
      >
        <SelectTrigger className="w-[180px]">
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

      <Select
        value={filters.status || "all"}
        onValueChange={(value) => setFilters({ status: value as any })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("all_status")}</SelectItem>
          <SelectItem value="active">{t("Active")}</SelectItem>
          <SelectItem value="inactive">{t("Inactive")}</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex border rounded-md bg-background">
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("grid")}
          className="rounded-r-none border-0"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("list")}
          className="rounded-l-none border-0"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
