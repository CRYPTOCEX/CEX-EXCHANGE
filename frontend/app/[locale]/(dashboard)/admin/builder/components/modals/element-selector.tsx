"use client";
import React, { useMemo } from "react";
import { Type, ImageIcon, Box, Palette, Zap, Database } from "lucide-react";
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
  const t = useTranslations("dashboard_admin");
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
      <h2 className="text-2xl font-bold mb-4 text-foreground">
        {category === "all"
          ? t("elements")
          : `${category.charAt(0).toUpperCase() + category.slice(1)} Elements`}
      </h2>
      {filteredElements.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
          {filteredElements.map((element, index) => (
            <div
              key={`${element.id}-${index}`}
              className="group relative rounded-lg overflow-hidden border border-border-strong hover:border-primary transition-all duration-300 cursor-pointer bg-card flex flex-col"
              onClick={() => handleSelectElement(element)}
            >
              <div className="p-2 bg-card flex-1 flex items-center justify-center h-16 overflow-hidden">
                <ElementPreview type={element.id} settings={element.settings} />
              </div>
              <div className="p-1.5 border-t border-border-strong bg-muted bg-muted flex items-center">
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-2 shrink-0">
                  {React.isValidElement(element.icon)
                    ? React.cloneElement(element.icon, {
                        className: "h-3 w-3",
                      })
                    : null}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-medium text-xs truncate text-foreground">
                    {element.name}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-muted rounded-lg">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Box className="h-6 w-6 text-subtle-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1 text-foreground">
            {t("no_elements_match_your_search")}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
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
    { id: "data", name: "Data", icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-1">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant="ghost"
          className={cn(
            "w-full justify-start text-foreground",
            activeView === "elements" && selectedCategory === category.id
              ? "bg-primary/10 text-foreground font-medium"
              : "hover:bg-muted"
          )}
          onClick={() => onCategoryClick(category.id)}
        >
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-2">
            {React.isValidElement(category.icon)
              ? React.cloneElement(category.icon as React.ReactElement<any>, {
                  className: "h-4 w-4",
                })
              : category.icon}
          </div>
          <span className="text-sm">{category.name}</span>
        </Button>
      ))}
    </div>
  );
};
