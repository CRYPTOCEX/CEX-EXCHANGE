"use client";
import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Plus, LayoutGrid, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAllCategories } from "../../templates/sections";
import { useSavedSectionsStore } from "@/store/saved-sections-store";
import { CategorySelector } from "./category-selector";
import { SavedSectionsGrid } from "./saved-sections-grid";
import { SearchInput } from "./utils";
import type { Section } from "@/types/builder";
import { useTranslations } from "next-intl";

interface SectionSelectorProps {
  onSelectTemplate: (section: Section) => void;
  onClose: () => void;
}

export function SectionSelector({
  onSelectTemplate,
  onClose,
}: SectionSelectorProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [showSavedSections, setShowSavedSections] = useState(false);
  const savedSections = useSavedSectionsStore((state) => state.savedSections);
  const removeSavedSection = useSavedSectionsStore(
    (state) => state.removeSection
  );
  const [importSectionOpen, setImportSectionOpen] = useState(false);
  const handleImportSection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
  };

  // Simple empty section template
  const emptySection: Section = {
    id: `section-${Date.now()}`,
    type: "regular",
    rows: [],
    settings: {
      paddingTop: 30,
      paddingRight: 20,
      paddingBottom: 30,
      paddingLeft: 20,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 40,
      marginLeft: 0,
    },
  };

  // Initialize categories once on mount
  useEffect(() => {
    const allCategories = getAllCategories().map((id) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1) + " Sections",
    }));
    setCategories(allCategories);
    if (allCategories.length > 0) setSelectedCategory(allCategories[0].id);
  }, []);

  // Memoize filtered categories based on search term
  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [categories, searchTerm]
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted border-border p-4 flex flex-col h-full">
        <div className="mb-4">
          <SearchInput
            placeholder={`${tCommon("search_categories")}…`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Saved Sections Button */}
        <Button
          variant="outline"
          className={cn(
            "h-auto flex items-center justify-start p-3 mb-4 border",
            showSavedSections
              ? "border-success bg-success/10 dark:bg-success/50"
              : "hover:border-success hover:bg-success/10 dark:hover:bg-success/30 border-border-strong bg-muted",
            "w-full text-foreground"
          )}
          onClick={() => setShowSavedSections(!showSavedSections)}
        >
          <div className="w-8 h-8 rounded-full bg-success/15 dark:bg-success/50 flex items-center justify-center mr-3">
            <Save className="h-4 w-4 text-success" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium block text-foreground">
              {t("saved_sections")}
            </span>
            <span className="text-xs text-subtle-foreground">
              {t("your_saved_section_library")}
            </span>
          </div>
        </Button>

        {/* Empty Section Option */}
        <Button
          variant="outline"
          className="h-auto flex items-center justify-start p-3 mb-4 border hover:border-primary hover:bg-primary/10 border-border-strong bg-muted text-foreground w-full"
          onClick={() => onSelectTemplate(emptySection)}
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium block text-foreground">
              {t("empty_section")}
            </span>
            <span className="text-xs text-subtle-foreground">
              {t("start_with_a_blank_section")}
            </span>
          </div>
        </Button>

        <div className="border-t my-3 border-border-strong"></div>

        {/* Category List */}
        <div className="flex-1 overflow-auto">
          <div className="space-y-1">
            {filteredCategories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left h-auto py-2 px-3",
                  selectedCategory === category.id && !showSavedSections
                    ? "bg-primary/10 text-foreground font-medium hover:bg-primary/15 hover:text-foreground"
                    : "hover:bg-muted text-foreground"
                )}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setShowSavedSections(false);
                }}
              >
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-2">
                  <LayoutGrid className="h-3 w-3" />
                </div>
                <span className="text-sm">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {showSavedSections ? (
          <SavedSectionsGrid
            sections={savedSections}
            onSelectTemplate={onSelectTemplate}
            onRemoveSection={removeSavedSection}
            setImportSectionOpen={setImportSectionOpen}
          />
        ) : selectedCategory ? (
          <CategorySelector
            category={selectedCategory}
            searchTerm={searchTerm}
            onSelectTemplate={onSelectTemplate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
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
                className="text-primary"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h10" />
                <path d="M7 12h10" />
                <path d="M7 17h10" />
              </svg>
            </div>
            <h2 className="text-xl font-medium mb-2 text-foreground">
              {tCommon("select_a_category")}
            </h2>
            <p className="text-subtle-foreground max-w-md">
              {t("choose_a_category_from_scratch")}.
            </p>
          </div>
        )}
      </div>

      {/* Import Section Dialog */}
      {importSectionOpen && (
        <Dialog open={importSectionOpen} onOpenChange={setImportSectionOpen}>
          <DialogContent className="sm:max-w-md border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {t("import_section")}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="section-file" className="text-foreground">
                  {t("upload_section_json_file")}
                </Label>
                <Input
                  id="section-file"
                  type="file"
                  accept=".json"
                  onChange={handleImportSection}
                  className="bg-muted border-border-strong text-foreground"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setImportSectionOpen(false)}
                className="bg-muted text-foreground border-border-strong dark:hover:bg-muted"
              >
                {tCommon("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
