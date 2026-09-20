"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { X, Save, Upload, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedSectionsStore } from "@/store/saved-sections-store";
import { downloadSectionAsJson } from "@/lib/builder/export-utils";
import { SectionSnapshot } from "../renderers/section-snapshot";
import { AISectionGenerator } from "../ai-section-generator";
import type { Section } from "@/types/builder";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
interface SavedSectionsGridProps {
  sections: Section[];
  onSelectTemplate: (section: Section) => void;
  onRemoveSection: (sectionId: string) => void;
  setImportSectionOpen: (open: boolean) => void;
}
export function SavedSectionsGrid({
  sections,
  onSelectTemplate,
  onRemoveSection,
  setImportSectionOpen,
}: SavedSectionsGridProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard_admin");
  const [snapshotStatus, setSnapshotStatus] = useState<Record<string, boolean>>(
    {}
  );
  const { toast } = useToast();
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatedSection, setGeneratedSection] = useState<Section | null>(
    null
  );
  useEffect(() => {
    // Initialize snapshot status for each section
    const initialStatus: Record<string, boolean> = {};
    sections.forEach((section) => {
      initialStatus[section.id] = false;
    });
    setSnapshotStatus(initialStatus);
  }, [sections]);

  // Memoize the snapshot callback to prevent useEffect retriggering
  const handleSnapshotGenerated = useCallback(
    (
      sectionId: string,
      snapshots: {
        card: string;
        preview: string;
      }
    ) => {
      setSnapshotStatus((prev) => ({
        ...prev,
        [sectionId]: true,
      }));
    },
    []
  );
  const handleImportSection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: tCommon("error"),
        description: t("no_file_selected"),
        variant: "destructive",
      });
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          // Basic validation to check if the imported data is a section
          if (content && content.type && content.rows) {
            // Add the imported section to the saved sections store
            useSavedSectionsStore.getState().addSection(content);
            toast({
              title: tCommon("success"),
              description: t("section_imported_successfully"),
            });
          } else {
            toast({
              title: tCommon("error"),
              description: t("invalid_section_file"),
              variant: "destructive",
            });
          }
        } catch (parseError) {
          toast({
            title: tCommon("error"),
            description: t("failed_to_parse_section_file"),
            variant: "destructive",
          });
          console.error("Failed to parse section file:", parseError);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("failed_to_read_section_file"),
        variant: "destructive",
      });
      console.error("Failed to read section file:", error);
    } finally {
      setImportSectionOpen(false);
    }
  };
  const handleSectionGenerated = (section: Section) => {
    setGeneratedSection(section);
  };

  // If AI Generator is active, show it instead of the saved sections
  if (showAIGenerator) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary" />
            {t("ai_section_generator")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIGenerator(false)}
          >
            <X className="h-4 w-4 mr-1" /> {t("back_to_saved_sections")}
          </Button>
        </div>

        <AISectionGenerator
          isOpen={true}
          onClose={() => setShowAIGenerator(false)}
          isInline={true}
          onSectionGenerated={handleSectionGenerated}
        />

        {generatedSection && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                onSelectTemplate(generatedSection);
              }}
              className="bg-success hover:bg-success"
            >
              {t("use_this_section")}
            </Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center text-foreground">
        <Save className="w-5 h-5 mr-2 text-success" />
        {t("saved_sections")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Button
          variant="outline"
          className="h-auto flex items-center justify-start p-3 border hover:border-primary hover:bg-primary/10 border-border-strong bg-muted dark:hover:bg-primary/30 w-full"
          onClick={() => setImportSectionOpen(true)}
        >
          <div className="w-8 h-8 rounded-full bg-primary/50 flex items-center justify-center mr-3">
            <Upload className="h-4 w-4 text-primary-ink" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium block text-foreground">
              {t("import_section")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("import_from_json_file")}
            </span>
          </div>
        </Button>

        {/* AI Generator Button */}
        <Button
          variant="outline"
          className="h-auto flex items-center justify-start p-3 border hover:border-primary hover:bg-primary/10 border-border-strong bg-muted dark:hover:bg-primary/30 w-full"
          onClick={() => setShowAIGenerator(true)}
        >
          <div className="w-8 h-8 rounded-full bg-primary/50 flex items-center justify-center mr-3">
            <Sparkles className="h-4 w-4 text-primary-ink" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium block text-foreground">
              {t("ai_generator")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("create_with_ai")}
            </span>
          </div>
        </Button>
      </div>

      {/* Rest of the existing code */}
      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted rounded-lg">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Save className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-foreground">
            {t("no_saved_sections")}
          </h3>
          <p className="text-muted-foreground max-w-md">
            {t("you_havent_saved_any_sections_yet_1")} {t("save_sections_from_your_pages_to_reuse_them_later_1")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {sections.map((section) => {
            return (
              <div
                key={section.id}
                className="group relative rounded-lg overflow-hidden shadow-md border border-border-strong transition-all duration-300 bg-muted h-full"
              >
                {/* Generate snapshot if needed */}
                {!snapshotStatus[section.id] && (
                  <SectionSnapshot
                    section={section}
                    onSnapshotGenerated={(snapshots) =>
                      handleSnapshotGenerated(section.id, snapshots)
                    }
                  />
                )}

                {/* Section preview */}
                <div className="relative h-[180px] overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-t from-overlay/70 via-overlay/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                  <div className="scale-[0.4] origin-top-left w-[250%] h-[250%] overflow-hidden">
                    <img
                      src={section.snapshots?.card || "/placeholder.svg"}
                      alt={t("saved_section")}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-card hover:bg-primary/10 dark:hover:bg-muted border-border hover:border-primary dark:hover:border-border hover:text-primary text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSectionAsJson(section);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-card hover:bg-destructive/10 dark:hover:bg-muted border-border hover:border-destructive dark:hover:border-border hover:text-destructive text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSection(section.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20">
                    <h3 className="font-medium text-overlay-foreground text-lg">
                      {t("saved_section")}
                    </h3>
                    <p className="text-sm text-overlay-foreground/80 line-clamp-2 mt-1">
                      {t("click_to_use_this_saved_section")}
                    </p>
                  </div>
                </div>

                {/* Use section button */}
                <div className="p-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {t("saved_section")}
                  </span>
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success"
                    onClick={() => onSelectTemplate(section)}
                  >
                    Use
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
