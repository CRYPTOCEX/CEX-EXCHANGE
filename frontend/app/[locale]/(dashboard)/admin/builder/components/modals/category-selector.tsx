"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { SectionSnapshot } from "../renderers/section-snapshot";
import type { Section } from "@/types/builder";
import { getTemplates } from "../../templates/sections";
import { useTranslations } from "next-intl";
interface CategorySelectorProps {
  category: string;
  searchTerm: string;
  onSelectTemplate: (section: Section) => void;
}
export function CategorySelector({
  category,
  searchTerm,
  onSelectTemplate,
}: CategorySelectorProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard_admin");
  const [templates, setTemplates] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotStatus, setSnapshotStatus] = useState<Record<string, boolean>>(
    {}
  );
  useEffect(() => {
    const categoryTemplates = getTemplates(category);
    setTemplates(categoryTemplates);
    setLoading(false);

    // Initialize snapshot status for each template
    const initialStatus: Record<string, boolean> = {};
    categoryTemplates.forEach((template) => {
      initialStatus[template.id] = false;
    });
    setSnapshotStatus(initialStatus);
  }, [category]);

  // Filter by template name (case-insensitive). Empty search term returns all.
  const filteredTemplates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) =>
      (template.name || "").toLowerCase().includes(q)
    );
  }, [templates, searchTerm]);

  // Memoize the snapshot callback to prevent useEffect retriggering
  const handleSnapshotGenerated = useCallback(
    (
      templateId: string,
      snapshots: {
        card: string;
        preview: string;
      }
    ) => {
      setSnapshotStatus((prev) => ({
        ...prev,
        [templateId]: true,
      }));
      setTemplates((prevTemplates) =>
        prevTemplates.map((template) =>
          template.id === templateId
            ? {
                ...template,
                snapshots,
              }
            : template
        )
      );
    },
    []
  );
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-foreground">
        {category.charAt(0).toUpperCase() + category.slice(1)} Templates
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[240px] bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {filteredTemplates.map((template) => {
            return (
              <div
                key={template.id}
                className="group relative rounded-lg overflow-hidden shadow-md border border-border-strong transition-all duration-300 cursor-pointer bg-muted hover:shadow-lg dark:hover:shadow-surface-2/40 h-full"
                onClick={() => onSelectTemplate(template)}
              >
                {/* Generate snapshot if needed */}
                {!snapshotStatus[template.id] && (
                  <SectionSnapshot
                    section={template}
                    onSnapshotGenerated={(snapshots) =>
                      handleSnapshotGenerated(template.id, snapshots)
                    }
                  />
                )}

                {/* Section preview */}
                <div className="relative h-[180px] overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-t from-overlay/70 via-overlay/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                  <div className="scale-[0.4] origin-top-left w-[250%] h-[250%] overflow-hidden">
                    <img
                      src={template.snapshots?.card || "/placeholder.svg"}
                      alt={template.name || t("template_preview")}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20">
                    <h3 className="font-medium text-overlay-foreground text-lg">
                      {template.name || tCommon("untitled_template")}
                    </h3>
                    <p className="text-sm text-overlay-foreground/80 line-clamp-2 mt-1">
                      {template.description || t("click_to_use_this_template")}
                    </p>
                  </div>
                </div>

                {/* Template info */}
                <div className="p-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {template.name || tCommon("untitled_template")}
                  </span>
                  <button
                    className="bg-primary hover:bg-primary text-primary-foreground text-sm px-3 py-1 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template);
                    }}
                  >
                    Use
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-subtle-foreground text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                <path d="M9 12h6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2 text-foreground">
              {t("no_templates_found")}
            </h3>
            <p className="text-sm">
              {t("try_selecting_a_different_category_or")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
