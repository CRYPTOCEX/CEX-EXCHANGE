"use client";

import { useMemo } from "react";
import { rowTemplates, createRowFromTemplate } from "../../templates/rows";
import RowSkeleton from "../shared/row-skeleton";
import { filterItems } from "./utils";
import type { Row } from "@/types/builder";
import { useTranslations } from "next-intl";
interface RowSelectorProps {
  searchTerm: string;
  onSelectTemplate: (row: Row) => void;
}
export function RowSelector({
  searchTerm,
  onSelectTemplate,
}: RowSelectorProps) {
  const t = useTranslations("dashboard_admin");
  const filteredRowTemplates = useMemo(
    () => filterItems(rowTemplates, searchTerm),
    [searchTerm]
  );
  const handleSelectRowTemplate = (templateId: string) => {
    const row = createRowFromTemplate(templateId);
    onSelectTemplate(row);
  };
  return (
    <>
      <h2 className="text-2xl font-bold mb-4 text-foreground">
        {t("row_templates")}
      </h2>
      {filteredRowTemplates.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
          {filteredRowTemplates.map((template) => {
            return (
              <div
                key={template.id}
                className="border border-border-strong rounded-lg overflow-hidden transition-all duration-200 cursor-pointer hover:border-primary group flex flex-col bg-card"
                onClick={() => handleSelectRowTemplate(template.id)}
              >
                <div className="aspect-video bg-muted p-2 flex items-center justify-center">
                  {template.id === "empty-row" ? (
                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-border-strong rounded-md">
                      <span className="text-xs text-subtle-foreground">
                        {t("empty_row")}
                      </span>
                    </div>
                  ) : (
                    <RowSkeleton
                      columns={template.columns}
                      height={40}
                      className="group-hover:border group-hover:border-primary transition-colors"
                      showContent={false}
                    />
                  )}
                </div>
                <div className="p-2 mt-auto">
                  <h3 className="font-medium text-xs text-foreground text-foreground group-hover:text-primary transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {template.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-muted rounded-lg">
          <p className="text-muted-foreground">
            {t("no_row_templates_match_your_search_1")}
          </p>
        </div>
      )}
    </>
  );
}
