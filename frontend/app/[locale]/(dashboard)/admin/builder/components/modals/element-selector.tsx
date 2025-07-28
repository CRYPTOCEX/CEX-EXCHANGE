"use client";
import React, { useMemo } from "react";
import { Type, ImageIcon, Box, Palette, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  elementTemplates,
  getElementsByCategory,
  createElementFromTemplate,
} from "../../templates/elements";
import ElementPreview from "../shared/element-preview";
import { filterItems } from "./utils";
import type { Element } from "@/types/builder";
import { useTranslations } from "next-intl";

interface ElementSelectorProps {
  searchTerm: string;
  category?: string;
  onSelectElement: (element: Element) => void;
}

export function ElementSelector({
  searchTerm,
  category = "all",
  onSelectElement,
}: ElementSelectorProps) {
  const t = useTranslations("dashboard");
  // Get filtered elements based on category and search term
  const getFilteredElements = (categoryFilter = category) => {
    let elements: any[] = [];
    if (categoryFilter === "all") {
      Object.values(elementTemplates).forEach((categoryElements) => {
        elements = [...elements, ...categoryElements];
      });
    } else {
      elements = getElementsByCategory(categoryFilter) || [];
    }
    return filterItems(elements, searchTerm);
  };

  const filteredElements = useMemo(
    () => getFilteredElements(),
    [category, searchTerm]
  );

  const handleSelectElement = (template: any) => {
    const templateCategory =
      Object.keys(elementTemplates).find((cat) =>
        elementTemplates[cat].some((el) => el.id === template.id)
      ) || "text";
    const element = createElementFromTemplate(templateCategory, template.id);
    if (element) {
      onSelectElement(element);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4 dark:text-zinc-100">
        {category === "all"
          ? "Elements"
          : `${category.charAt(0).toUpperCase() + category.slice(1)} Elements`}
      </h2>
      {filteredElements.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
          {filteredElements.map((element, index) => (
            <div
              key={`${element.id}-${index}`}
              className="group relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-md transition-all duration-300 cursor-pointer bg-white dark:bg-zinc-900 flex flex-col"
              onClick={() => handleSelectElement(element)}
            >
              <div className="p-2 bg-white dark:bg-zinc-900 flex-1 flex items-center justify-center h-16 overflow-hidden">
                <ElementPreview type={element.id} settings={element.settings} />
              </div>
              <div className="p-1.5 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center">
                <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-2 shrink-0">
                  {React.isValidElement(element.icon)
                    ? React.cloneElement(element.icon, {
                        className:
                          "h-3 w-3 text-purple-500 dark:text-purple-400",
                      })
                    : null}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-medium text-xs truncate dark:text-zinc-100">
                    {element.name}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Box className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-base font-medium mb-1 dark:text-zinc-100">
            {t("no_elements_match_your_search")}
          </h3>
          <p className="text-muted-foreground dark:text-zinc-400 max-w-md mx-auto text-sm">
            {t("try_adjusting_your_by_category")}.
          </p>
        </div>
      )}
    </>
  );
}

// Categories component for the element sidebar
ElementSelector.Categories = function Categories({
  activeView,
  selectedCategory,
  onCategoryClick,
}: {
  activeView: string;
  selectedCategory: string;
  onCategoryClick: (category: string) => void;
}) {
  const categories = [
    { id: "text", name: "Text", icon: <Type className="h-4 w-4" /> },
    { id: "media", name: "Media", icon: <ImageIcon className="h-4 w-4" /> },
    { id: "layout", name: "Layout", icon: <Box className="h-4 w-4" /> },
    {
      id: "components",
      name: "Components",
      icon: <Palette className="h-4 w-4" />,
    },
    {
      id: "interactive",
      name: "Interactive",
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-1">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant="ghost"
          className={cn(
            "w-full justify-start dark:text-zinc-100",
            activeView === "elements" && selectedCategory === category.id
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
          onClick={() => onCategoryClick(category.id)}
        >
          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-2">
            {React.isValidElement(category.icon)
              ? React.cloneElement(category.icon as React.ReactElement<any>, {
                  className: "h-4 w-4 text-purple-500 dark:text-purple-400",
                })
              : category.icon}
          </div>
          <span className="text-sm">{category.name}</span>
        </Button>
      ))}
    </div>
  );
};
