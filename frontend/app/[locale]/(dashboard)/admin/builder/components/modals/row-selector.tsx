"use client";

import { useMemo } from "react";
import { rowTemplates, createRowFromTemplate } from "../../templates/rows";
import RowSkeleton from "../shared/row-skeleton";
import { filterItems } from "./utils";
import type { Row } from "@/types/builder";
interface RowSelectorProps {
  searchTerm: string;
  onSelectTemplate: (row: Row) => void;
}
export function RowSelector({
  searchTerm,
  onSelectTemplate,
}: RowSelectorProps) {
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
      <h2 className="text-2xl font-bold mb-4 dark:text-zinc-100">
        Row Templates
      </h2>
      {filteredRowTemplates.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
          {filteredRowTemplates.map((template) => {
            return (
              <div
                key={template.id}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 group flex flex-col bg-white dark:bg-zinc-900"
                onClick={() => handleSelectRowTemplate(template.id)}
              >
                <div className="aspect-video bg-zinc-50 dark:bg-zinc-800 p-2 flex items-center justify-center">
                  {template.id === "empty-row" ? (
                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-md">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        Empty Row
                      </span>
                    </div>
                  ) : (
                    <RowSkeleton
                      columns={template.columns}
                      height={40}
                      className="group-hover:border group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-colors"
                      showContent={false}
                    />
                  )}
                </div>
                <div className="p-2 mt-auto">
                  <h3 className="font-medium text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground dark:text-zinc-400 truncate">
                    {template.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <p className="text-muted-foreground dark:text-zinc-400">
            No row templates match your search.
          </p>
        </div>
      )}
    </>
  );
}
