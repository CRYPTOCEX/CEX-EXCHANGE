"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  BarChart,
  Calendar,
  SortAsc,
  SortDesc,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type RoadmapToolbarProps = {
  activeTab: string;
  setActiveTab: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortOrder: "newest" | "oldest" | "title";
  setSortOrder: (order: "newest" | "oldest" | "title") => void;
  viewMode: "cards" | "timeline";
  setViewMode: (mode: "cards" | "timeline") => void;
  totalItems: number;
  completedItems: number;
  upcomingItems: number;
};

export default function RoadmapToolbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  totalItems,
  completedItems,
  upcomingItems,
}: RoadmapToolbarProps) {
  const t = useTranslations("common");
  const tExtIco = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full md:w-auto"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all" className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">{tExtIco("all_items")}</span>
            <span className="sm:hidden">{tCommon("all")}</span>
            <Badge variant="outline" className="ml-1">
              {totalItems}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1">
            <span className="hidden sm:inline">{tCommon("completed")}</span>
            <span className="sm:hidden">{tCommon("done")}</span>
            <Badge variant="outline" className="ml-1">
              {completedItems}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{tCommon("upcoming")}</span>
            <span className="sm:hidden">{tCommon("next")}</span>
            <Badge variant="outline" className="ml-1">
              {upcomingItems}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tExtIco("search_roadmap_items_ellipsis")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-full"
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

        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("cards")}
                  className="h-9 w-9"
                >
                  <BarChart className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tCommon("card_view")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "timeline" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("timeline")}
                  className="h-9 w-9"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tExtIco("timeline_view")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <SortAsc className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{tCommon("sort_by")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortOrder}
                onValueChange={(value) =>
                  setSortOrder(value as "newest" | "oldest" | "title")
                }
              >
                <DropdownMenuRadioItem value="newest">
                  <SortDesc className="h-4 w-4 mr-2" />
                  {tCommon("newest_first")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">
                  <SortAsc className="h-4 w-4 mr-2" />
                  {tCommon("oldest_first")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title">
                  <Filter className="h-4 w-4 mr-2" />
                  {tCommon("title")} (A-Z)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
