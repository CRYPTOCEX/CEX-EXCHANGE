"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal, Check, ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface PositionsFiltersProps {
  pools: { id: string; name: string }[];
  selectedPool: string | null;
  onPoolChange: (poolId: string | null) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function PositionsFilters({
  pools,
  selectedPool,
  onPoolChange,
  sortBy,
  onSortChange,
  searchTerm,
  onSearchChange,
}: PositionsFiltersProps) {
  const t = useTranslations("ext");
  const [showSearch, setShowSearch] = useState(false);

  const sortOptions = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "highest-amount", label: "Highest amount" },
    { value: "lowest-amount", label: "Lowest amount" },
    { value: "highest-rewards", label: "Highest rewards" },
  ];

  const currentSortOption = sortOptions.find(
    (option) => option.value === sortBy
  );

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      {showSearch ? (
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search positions..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-full sm:w-[200px]"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-9 px-2"
            onClick={() => {
              onSearchChange("");
              setShowSearch(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setShowSearch(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          {t("Search")}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t("Filter")}
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>{t("filter_by_pool")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={selectedPool === null}
            onCheckedChange={() => onPoolChange(null)}
          >
            {t("all_pools")}
          </DropdownMenuCheckboxItem>
          {pools.map((pool) => (
            <DropdownMenuCheckboxItem
              key={pool.id}
              checked={selectedPool === pool.id}
              onCheckedChange={() => onPoolChange(pool.id)}
            >
              {pool.name}
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("sort_by")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className="flex items-center justify-between"
            >
              {option.label}
              {option.value === sortBy && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
