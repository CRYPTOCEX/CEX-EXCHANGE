"use client";
import { useState, useEffect, useMemo } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

// Icon categories for better organization
const ICON_CATEGORIES = {
  arrows: [
    "arrowUp",
    "arrowDown",
    "arrowLeft",
    "arrowRight",
    "chevronUp",
    "chevronDown",
    "chevronLeft",
    "chevronRight",
    "arrowUpDown",
    "moveHorizontal",
    "moveVertical",
  ],
  interface: [
    "home",
    "settings",
    "user",
    "users",
    "mail",
    "bell",
    "calendar",
    "search",
    "menu",
    "x",
    "check",
    "plus",
    "minus",
  ],
  media: [
    "image",
    "video",
    "music",
    "play",
    "pause",
    "volume",
    "volumeX",
    "mic",
  ],
  communication: [
    "mail",
    "messageSquare",
    "messageCircle",
    "send",
    "phone",
    "share",
  ],
  weather: [
    "sun",
    "moon",
    "cloud",
    "cloudRain",
    "cloudSnow",
    "cloudLightning",
    "wind",
    "umbrella",
  ],
  devices: [
    "smartphone",
    "tablet",
    "monitor",
    "tv",
    "battery",
    "wifi",
    "bluetooth",
  ],
  shapes: ["square", "circle", "triangle", "hexagon", "star", "heart"],
  files: ["file", "fileText", "folder", "save", "trash", "download", "upload"],
  ecommerce: [
    "shoppingCart",
    "shoppingBag",
    "tag",
    "creditCard",
    "dollarSign",
    "percent",
  ],
};

export function IconPicker({ selectedIcon, onSelectIcon }: IconPickerProps) {
  const t = useTranslations("components/ui/icon-picker");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("popular");
  const [allIcons, setAllIcons] = useState<string[]>([]);
  const [filteredIcons, setFilteredIcons] = useState<string[]>([]);

  // Initialize icons on component mount
  useEffect(() => {
    // Get all icon names from Lucide
    const iconNames = Object.keys(LucideIcons)
      .filter(
        (key) =>
          // Filter out non-icon exports
          key !== "default" &&
          key !== "createLucideIcon" &&
          !key.startsWith("__") &&
          typeof (LucideIcons as any)[key] === "function"
      )
      .map((key) => key.charAt(0).toLowerCase() + key.slice(1));

    setAllIcons(iconNames);
    setFilteredIcons(iconNames);
  }, []);

  // Filter icons when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredIcons(allIcons);
    } else {
      const filtered = allIcons.filter((icon) =>
        icon.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIcons(filtered);
      // Switch to search results tab when searching
      setActiveTab("search");
    }
  }, [searchTerm, allIcons]);

  // Render the selected icon
  const SelectedIcon = getIconComponent(selectedIcon);

  // Common icon categories for quick access
  const popularIcons = [
    "star",
    "heart",
    "thumbsUp",
    "check",
    "x",
    "info",
    "alertCircle",
    "bell",
    "mail",
    "phone",
    "home",
    "settings",
    "user",
    "users",
    "calendar",
    "clock",
    "map",
    "mapPin",
    "search",
    "zap",
    "award",
  ];

  // Get icons for the current category
  const currentCategoryIcons = useMemo(() => {
    if (activeTab === "popular") return popularIcons;
    if (activeTab === "search") return filteredIcons;
    return ICON_CATEGORIES[activeTab as keyof typeof ICON_CATEGORIES] || [];
  }, [activeTab, filteredIcons, popularIcons]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 flex items-center justify-center">
              {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
            </div>
            <span className="capitalize">{selectedIcon}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-1 pt-1 border-b">
            <ScrollArea className="w-full">
              <TabsList className="w-full justify-start h-8 bg-transparent">
                <TabsTrigger value="popular" className="text-xs h-7 px-2">
                  {t("Popular")}
                </TabsTrigger>
                <TabsTrigger value="interface" className="text-xs h-7 px-2">
                  {t("Interface")}
                </TabsTrigger>
                <TabsTrigger value="arrows" className="text-xs h-7 px-2">
                  {t("Arrows")}
                </TabsTrigger>
                <TabsTrigger value="media" className="text-xs h-7 px-2">
                  {t("Media")}
                </TabsTrigger>
                <TabsTrigger value="shapes" className="text-xs h-7 px-2">
                  {t("Shapes")}
                </TabsTrigger>
                <TabsTrigger value="ecommerce" className="text-xs h-7 px-2">
                  {t("Commerce")}
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs h-7 px-2">
                  {t("All")}
                </TabsTrigger>
              </TabsList>
            </ScrollArea>
          </div>

          <ScrollArea className="h-72">
            <div className="grid grid-cols-6 gap-1 p-2">
              {currentCategoryIcons.map((iconName) => {
                const Icon = getIconComponent(iconName);
                if (!Icon) return null;

                return (
                  <Button
                    key={iconName}
                    variant={selectedIcon === iconName ? "secondary" : "ghost"}
                    size="sm"
                    className="h-10 w-10 p-0 flex items-center justify-center"
                    onClick={() => onSelectIcon(iconName)}
                    title={iconName}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                );
              })}

              {currentCategoryIcons.length === 0 && (
                <div className="col-span-6 py-6 text-center text-sm text-muted-foreground">
                  {t("no_icons_found")}. {t("try_a_different_search_term")}.
                </div>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to get icon component by name
function getIconComponent(iconName: string) {
  if (!iconName) return null;
  // Convert from camelCase to PascalCase
  const pascalCase = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  return (LucideIcons as any)[pascalCase] as React.ComponentType<{
    className?: string;
  }>;
}

// Static method to render an icon by name
IconPicker.Icon = function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = getIconComponent(name);
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};
