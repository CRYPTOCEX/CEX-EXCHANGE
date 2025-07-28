"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown, Filter } from "lucide-react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

type SearchSortBarProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  sortOrder: "name" | "role" | "recent";
  setSortOrder: (order: "name" | "role" | "recent") => void;
};

export default function SearchSortBar({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  sortOrder,
  setSortOrder,
}: SearchSortBarProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 w-full sm:w-[250px]"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="h-9 w-9"
              >
                {/* Grid Icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M1.5 1H6.5V6H1.5V1ZM8.5 1H13.5V6H8.5V1ZM1.5 8H6.5V13H1.5V8ZM8.5 8H13.5V13H8.5V8Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("grid_view")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-9 w-9"
              >
                {/* List Icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M1.5 3H13.5M1.5 7.5H13.5M1.5 12H13.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("list_view")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("sort_by")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortOrder}
              onValueChange={(value) =>
                setSortOrder(value as "name" | "role" | "recent")
              }
            >
              <DropdownMenuRadioItem value="recent">
                <ChevronDown className="h-4 w-4 mr-2" />
                {t("most_recent")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name">
                {/* Name Icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="h-4 w-4 mr-2"
                >
                  <path
                    d="M3.5 2.5L3.5 12.5M3.5 2.5L1 5M3.5 2.5L6 5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.5 5.5H13.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.5 8H11.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.5 10.5H10"
                    stroke="currentColor"
                    strokeLinecap="round"
                  />
                </svg>
                {t("name_(a-z)")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="role">
                {/* Role Icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="h-4 w-4 mr-2"
                >
                  <path
                    d="M3.5 2.5L3.5 12.5M3.5 2.5L1 5M3.5 2.5L6 5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.5 5.5H13.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.5 8H11.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.5 10.5H10"
                    stroke="currentColor"
                    strokeLinecap="round"
                  />
                </svg>
                {t("role_(a-z)")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
