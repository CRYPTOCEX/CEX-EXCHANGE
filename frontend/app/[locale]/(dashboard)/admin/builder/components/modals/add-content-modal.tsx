"use client";
import { useState, useEffect } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createEmptyRow } from "@/store/builder-store";
import Modal from "@/components/ui/modal";
import { RowSelector } from "./row-selector";
import { ElementSelector } from "./element-selector";
import { SearchInput, useLastSelection } from "./utils";
import type { Element, Row } from "@/types/builder";
import { useTranslations } from "next-intl";

interface AddContentModalProps {
  onClose: () => void;
  onAddElement?: (element: Element) => void;
  onAddRow?: (row: Row) => void;
  nestingLevel: number;
  columnId?: string;
  sectionId: string;
  rowId: string;
}

export function AddContentModal({
  onClose,
  onAddElement,
  onAddRow,
  nestingLevel,
  columnId,
  sectionId,
  rowId,
}: AddContentModalProps) {
  const t = useTranslations("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const showRowOptions = nestingLevel < 2 && !!onAddRow;
  const [lastSelection, setLastSelection] = useLastSelection({
    view: "elements",
    category: "all",
  });
  const initialView = showRowOptions ? lastSelection.view : "elements";
  const [activeView, setActiveView] = useState<"rows" | "elements">(
    initialView
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    lastSelection.category
  );

  // Update last selection when active view or category changes
  useEffect(() => {
    setLastSelection({ view: activeView, category: selectedCategory });
  }, [activeView, selectedCategory, setLastSelection]);

  const handleAddEmptyRow = () => {
    if (!onAddRow) return;
    const emptyRow = createEmptyRow(nestingLevel);
    onAddRow(emptyRow);
    onClose();
  };

  return (
    <Modal
      title={activeView === "rows" ? "Add Row" : "Add Element"}
      onClose={onClose}
      color={activeView === "rows" ? "blue" : "purple"}
      className="max-w-5xl w-[75vw] h-[75vh] dark:bg-background dark:border-border"
      showHeader={false}
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 border-r bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 p-4 flex flex-col h-full">
          <div className="mb-4">
            <SearchInput
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
              {/* Empty Row Option (only for level 1) */}
              {showRowOptions && (
                <Button
                  variant="outline"
                  className="h-auto flex items-center justify-start p-3 mb-4 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:border-blue-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 w-full"
                  onClick={handleAddEmptyRow}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-3 shrink-0">
                    <Plus className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block dark:text-zinc-100">
                      {t("empty_row")}
                    </span>
                    <span className="text-xs text-muted-foreground dark:text-zinc-400">
                      {t("start_with_a_blank_row")}
                    </span>
                  </div>
                </Button>
              )}

              {/* Row Templates Button – Only for level 1 */}
              {showRowOptions && (
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-auto py-2 px-3 mb-1 dark:text-zinc-100",
                    activeView === "rows"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                  onClick={() => setActiveView("rows")}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2 shrink-0">
                    <LayoutGrid className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                  </div>
                  <span className="text-sm">{t("row_templates")}</span>
                </Button>
              )}

              {showRowOptions && (
                <div className="border-t my-3 border-zinc-200 dark:border-zinc-700"></div>
              )}

              {/* All Elements Button */}
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start dark:text-zinc-100",
                  activeView === "elements" && selectedCategory === "all"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
                onClick={() => {
                  setSelectedCategory("all");
                  setActiveView("elements");
                }}
              >
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-2 shrink-0">
                  <LayoutGrid className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                </div>
                <span className="text-sm">{t("all_elements")}</span>
              </Button>

              {/* Element Categories */}
              <ElementSelector.Categories
                activeView={activeView}
                selectedCategory={selectedCategory}
                onCategoryClick={(cat) => {
                  setSelectedCategory(cat);
                  setActiveView("elements");
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto dark:bg-zinc-950">
          {activeView === "rows" && (
            <RowSelector
              searchTerm={searchTerm}
              onSelectTemplate={(row) => {
                if (onAddRow) {
                  onAddRow(row);
                  onClose();
                }
              }}
            />
          )}
          {activeView === "elements" && (
            <ElementSelector
              searchTerm={searchTerm}
              category={selectedCategory}
              onSelectElement={(element) => {
                if (onAddElement) {
                  onAddElement(element);
                  onClose();
                }
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
