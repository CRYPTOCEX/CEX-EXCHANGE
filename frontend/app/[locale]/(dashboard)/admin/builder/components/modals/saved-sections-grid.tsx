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
        title: "Error",
        description: "No file selected.",
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
              title: "Success",
              description: "Section imported successfully.",
            });
          } else {
            toast({
              title: "Error",
              description: "Invalid section file.",
              variant: "destructive",
            });
          }
        } catch (parseError) {
          toast({
            title: "Error",
            description: "Failed to parse section file.",
            variant: "destructive",
          });
          console.error("Failed to parse section file:", parseError);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read section file.",
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
            <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
            AI Section Generator
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIGenerator(false)}
          >
            <X className="h-4 w-4 mr-1" /> Back to Saved Sections
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
              className="bg-green-600 hover:bg-green-700"
            >
              Use This Section
            </Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center dark:text-zinc-100">
        <Save className="w-5 h-5 mr-2 text-green-500" />
        Saved Sections
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Button
          variant="outline"
          className="h-auto flex items-center justify-start p-3 border hover:border-purple-500 hover:bg-purple-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 w-full"
          onClick={() => setImportSectionOpen(true)}
        >
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-3">
            <Upload className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium block dark:text-zinc-100">
              Import Section
            </span>
            <span className="text-xs text-muted-foreground">
              Import from JSON file
            </span>
          </div>
        </Button>

        {/* AI Generator Button */}
        <Button
          variant="outline"
          className="h-auto flex items-center justify-start p-3 border hover:border-purple-500 hover:bg-purple-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-purple-950/30 dark:hover:border-purple-600 w-full"
          onClick={() => setShowAIGenerator(true)}
        >
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-3">
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium block dark:text-zinc-100">
              AI Generator
            </span>
            <span className="text-xs text-muted-foreground">
              Create with AI
            </span>
          </div>
        </Button>
      </div>

      {/* Rest of the existing code */}
      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mb-4">
            <Save className="h-6 w-6 text-zinc-400 dark:text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium mb-2 dark:text-zinc-100">
            No Saved Sections
          </h3>
          <p className="text-muted-foreground max-w-md">
            You haven't saved any sections yet. Save sections from your pages to
            reuse them later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {sections.map((section) => {
            return (
              <div
                key={section.id}
                className="group relative rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-zinc-700 transition-all duration-300 bg-gray-50 dark:bg-zinc-800 h-full"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                  <div className="scale-[0.4] origin-top-left w-[250%] h-[250%] overflow-hidden">
                    <img
                      src={section.snapshots?.card || "/placeholder.svg"}
                      alt="Saved section"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-white dark:bg-zinc-700 hover:bg-blue-50 dark:hover:bg-zinc-600 border-gray-200 dark:border-zinc-600 hover:border-blue-300 dark:hover:border-zinc-500 hover:text-blue-600 dark:text-zinc-100"
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
                      className="h-7 w-7 bg-white dark:bg-zinc-700 hover:bg-red-50 dark:hover:bg-zinc-600 border-gray-200 dark:border-zinc-600 hover:border-red-300 dark:hover:border-zinc-500 hover:text-red-600 dark:text-zinc-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSection(section.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20">
                    <h3 className="font-medium text-white text-lg">
                      Saved Section
                    </h3>
                    <p className="text-sm text-white/80 line-clamp-2 mt-1">
                      Click to use this saved section
                    </p>
                  </div>
                </div>

                {/* Use section button */}
                <div className="p-3 flex justify-between items-center">
                  <span className="text-sm font-medium dark:text-zinc-100">
                    Saved Section
                  </span>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
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
