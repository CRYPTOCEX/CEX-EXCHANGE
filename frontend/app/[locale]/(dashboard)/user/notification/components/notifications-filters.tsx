"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BellIcon,
  MessageSquareIcon,
  UserIcon,
  AlertTriangleIcon,
  InfoIcon,
  FilterIcon,
  XIcon,
  CheckIcon,
  SearchIcon,
  StarIcon,
  ClockIcon,
  SaveIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Settings2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotificationsStore } from "@/store/notification-store";
import { useTranslations } from "next-intl";

interface NotificationsFiltersProps {
  onFilterChange: (filters: string[]) => void;
  activeFilters: string[];
  counts?: {
    investment: number;
    message: number;
    alert: number;
    system: number;
    user: number;
  };
}

interface FilterPreset {
  id: string;
  name: string;
  filters: string[];
  icon: React.ReactNode;
}

export function NotificationsFilters({
  onFilterChange,
  activeFilters,
}: NotificationsFiltersProps) {
  const t = useTranslations("common");
  const tDashboardUser = useTranslations("dashboard_user");
  const { stats } = useNotificationsStore();
  const counts = stats.types;
  const [selectedFilters, setSelectedFilters] =
    useState<string[]>(activeFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const filterPresets: FilterPreset[] = [
    {
      id: "important",
      name: "Important",
      filters: ["investment", "alert"],
      icon: <StarIcon className="h-4 w-4 text-warning" />,
    },
    {
      id: "recent",
      name: "Recent Activity",
      filters: ["investment", "message", "alert"],
      icon: <ClockIcon className="h-4 w-4 text-primary" />,
    },
    {
      id: "system",
      name: "System Updates",
      filters: ["system"],
      icon: <InfoIcon className="h-4 w-4 text-subtle-foreground" />,
    },
  ];

  const filterOptions = [
    {
      id: "investment",
      label: t("investments"),
      icon: <BellIcon className="h-4 w-4 text-primary" />,
      color:
        "bg-primary/15 dark:bg-primary/20 text-primary-ink border-primary/30",
      count: counts.investment,
    },
    {
      id: "message",
      label: t("messages"),
      icon: (
        <MessageSquareIcon className="h-4 w-4 text-success" />
      ),
      color:
        "bg-success/10 text-foreground border-success/30",
      count: counts.message,
    },
    {
      id: "alert",
      label: t("alerts_1"),
      icon: (
        <AlertTriangleIcon className="h-4 w-4 text-warning" />
      ),
      color:
        "bg-warning/10 text-foreground border-warning/30",
      count: counts.alert,
    },
    {
      id: "user",
      label: t("user"),
      icon: (
        <UserIcon className="h-4 w-4 text-primary" />
      ),
      color:
        "bg-primary/10 text-foreground border-primary/30",
      count: counts.user,
    },
    {
      id: "system",
      label: t("system"),
      icon: <InfoIcon className="h-4 w-4 text-muted-foreground" />,
      color:
        "bg-muted dark:bg-surface-2/20 text-muted-foreground border-border",
      count: counts.system,
    },
  ];

  useEffect(() => {
    onFilterChange(selectedFilters);
  }, [selectedFilters, onFilterChange]);

  const handleFilterToggle = (filterId: string) => {
    setSelectedFilters((prev) => {
      const newFilters = prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId];
      setActivePreset(null);
      return newFilters;
    });
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    setActivePreset(null);
  };

  const selectAllFilters = () => {
    setSelectedFilters(filterOptions.map((option) => option.id));
    setActivePreset(null);
  };

  const applyPreset = (preset: FilterPreset) => {
    setSelectedFilters(preset.filters);
    setActivePreset(preset.id);
  };

  const filteredOptions = filterOptions.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">{t("filters")}</h3>
        </div>
        <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isExpanded ? t("collapse_filters") : t("expand_filters")}
              </TooltipContent>
            </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2Icon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{tDashboardUser("filter_actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={selectAllFilters}>
                <CheckIcon className="mr-2 h-4 w-4" />
                {t("select_all")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearFilters}>
                <XIcon className="mr-2 h-4 w-4" />
                {t("clear_all")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowPresets(!showPresets)}>
                <BookmarkIcon className="mr-2 h-4 w-4" />
                {showPresets ? t("hide_presets") : t("show_presets")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Search input */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${tDashboardUser("search_filters")}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter presets */}
            <AnimatePresence>
              {showPresets && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      {t("presets")}
                    </Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <SaveIcon className="mr-1 h-3 w-3" />
                      {t("save_current")}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filterPresets.map((preset) => (
                      <Button
                        key={preset.id}
                        variant={
                          activePreset === preset.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="h-7 gap-1.5"
                      >
                        {preset.icon}
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>

            {/* Active filters summary */}
            {selectedFilters.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedFilters.length}{" "}
                    {t("active")}{" "}
                    {selectedFilters.length === 1 ? "filter" : "filters"}
                  </span>
                  <div className="flex -space-x-1">
                    {selectedFilters.map((filterId) => {
                      const filter = filterOptions.find(
                        (f) => f.id === filterId
                      );
                      return (
                        filter && (
                          <div
                            key={filterId}
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full border-2 border-background",
                              filter.color
                            )}
                          >
                            {filter.icon}
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs hover:text-foreground"
                >
                  {t("clear")}
                </Button>
              </div>
            )}

            {/* Filter options */}
            <div className="space-y-2">
              {filteredOptions.map((option) => (
                <m.div
                  key={option.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={cn(
                      "flex items-center space-x-3 rounded-lg border p-3 transition-all duration-200",
                      selectedFilters.includes(option.id)
                        ? option.color
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleFilterToggle(option.id)}
                  >
                    <Checkbox
                      id={`filter-${option.id}`}
                      checked={selectedFilters.includes(option.id)}
                      onCheckedChange={() => handleFilterToggle(option.id)}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200",
                            selectedFilters.includes(option.id)
                              ? "bg-background"
                              : option.color.split("untitled")[0],
                            selectedFilters.includes(option.id) &&
                              "transform scale-110"
                          )}
                        >
                          {option.icon}
                        </div>
                        <Label
                          htmlFor={`filter-${option.id}`}
                          className="cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "ml-auto transition-transform",
                          selectedFilters.includes(option.id) &&
                            "transform scale-110"
                        )}
                      >
                        {option.count}
                      </Badge>
                    </div>
                  </div>
                </m.div>
              ))}

              {filteredOptions.length === 0 && (
                <div className="flex items-center justify-center rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    {tDashboardUser("no_matching_filters_found")}
                  </p>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
