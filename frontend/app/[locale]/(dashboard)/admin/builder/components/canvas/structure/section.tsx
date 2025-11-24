"use client";

import { useState } from "react";
import type React from "react";

import type { Section as SectionType, Row as RowType } from "@/types/builder";
import { useBuilderStore, createEmptyRow } from "@/store/builder-store";
import { useSavedSectionsStore } from "@/store/saved-sections-store";
import { cn } from "@/lib/utils";
import Row from "./row";
import { AddContentModal } from "../../modals/add-content-modal";
import { ResizableStructure } from "../resizable";
import StructureAddButton from "./structure-add-button";
import { SectionDragSource, SectionDropTarget } from "../dnd";
import ReorderControls from "./reorder-controls";
import { Save, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

interface SectionProps {
  section: SectionType;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  totalSections: number;
  isEditMode: boolean;
}

export default function Section({
  section,
  isSelected,
  onSelect,
  index,
  totalSections,
  isEditMode,
}: SectionProps) {
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [insertPosition, setInsertPosition] = useState<number | null>(null);
  const { updateSection, deleteSection, toggleAddSectionModal } =
    useBuilderStore();

  const { toast } = useToast();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const handleAddRow = (rowTemplate: RowType) => {
    const updatedRows = [...section.rows];

    if (insertPosition !== null) {
      updatedRows.splice(insertPosition, 0, rowTemplate);
    } else {
      updatedRows.push(rowTemplate);
    }

    updateSection(section.id, {
      ...section,
      rows: updatedRows,
    });

    setShowAddContentModal(false);
    setInsertPosition(null);
  };

  const handleAddRowClick = (position?: number) => {
    const emptyRow = createEmptyRow();
    const updatedRows = [...section.rows];

    if (position !== undefined) {
      updatedRows.splice(position, 0, emptyRow);
    } else {
      updatedRows.push(emptyRow);
    }

    updateSection(section.id, {
      ...section,
      rows: updatedRows,
    });

    useBuilderStore.getState().selectRow(section.id, emptyRow.id);
  };

  // Only use inline styles for non-color properties and background image
  const getBackgroundStyles = () => {
    const styles: React.CSSProperties = {};

    // Handle background image
    if (section.settings?.backgroundImage) {
      styles.backgroundImage = `url(${section.settings.backgroundImage})`;
      styles.backgroundSize = "cover";
      styles.backgroundPosition = "center";
    }

    return styles;
  };

  // Helper function to generate gradient classes
  const getGradientClasses = (gradient: any) => {
    const classes = [
      `bg-gradient-${gradient.direction}`,
      `from-${gradient.from}`,
      gradient.via ? `via-${gradient.via}` : "",
      `to-${gradient.to}`,
    ];
    return classes;
  };

  // Get Tailwind classes for the section, similar to section-renderer.tsx
  const getSectionClasses = () => {
    const classes = ["section-container"];

    // Handle background color
    if (section.settings?.backgroundColor) {
      if (typeof section.settings.backgroundColor === "object") {
        if (
          typeof section.settings.backgroundColor === "object" &&
          "type" in section.settings.backgroundColor &&
          section.settings.backgroundColor.type === "gradient" &&
          section.settings.backgroundColor.gradient
        ) {
          // It's a gradient
          classes.push(
            ...getGradientClasses(section.settings.backgroundColor.gradient)
          );
        } else if (
          section.settings.backgroundColor &&
          "light" in section.settings.backgroundColor &&
          "dark" in section.settings.backgroundColor &&
          ((section.settings.backgroundColor.light &&
            section.settings.backgroundColor.light.includes("-")) ||
            (section.settings.backgroundColor.dark &&
              section.settings.backgroundColor.dark.includes("-")))
        ) {
          // It's a theme-aware Tailwind color
          if (
            theme === "light" &&
            section.settings.backgroundColor.light &&
            section.settings.backgroundColor.light.includes("-")
          ) {
            classes.push(`bg-${section.settings.backgroundColor.light}`);
          }
          if (
            theme === "dark" &&
            section.settings.backgroundColor.dark &&
            section.settings.backgroundColor.dark.includes("-")
          ) {
            classes.push(`dark:bg-${section.settings.backgroundColor.dark}`);
          }
          // For non-Tailwind colors, we still need to use inline style
          if (
            section.settings.backgroundColor.light &&
            !section.settings.backgroundColor.light.includes("-") &&
            section.settings.backgroundColor.dark &&
            !section.settings.backgroundColor.dark.includes("-")
          ) {
            // We'll handle this in a special case below
            classes.push("bg-custom");
          }
        }
      } else if (section.settings.backgroundColor.includes("-")) {
        // It's a direct Tailwind class
        classes.push(`bg-${section.settings.backgroundColor}`);
      }
    }

    return classes.filter(Boolean);
  };

  // Get custom background color for non-Tailwind colors
  const getCustomBackgroundColor = () => {
    if (!section.settings?.backgroundColor) return undefined;

    if (
      typeof section.settings.backgroundColor === "object" &&
      "light" in section.settings.backgroundColor &&
      "dark" in section.settings.backgroundColor
    ) {
      if (
        !("type" in section.settings.backgroundColor) &&
        !section.settings.backgroundColor.light?.includes("-") &&
        !section.settings.backgroundColor.dark?.includes("-")
      ) {
        return theme === "dark"
          ? section.settings.backgroundColor.dark
          : section.settings.backgroundColor.light;
      }
    } else if (
      typeof section.settings.backgroundColor === "string" &&
      !section.settings.backgroundColor.includes("-")
    ) {
      return section.settings.backgroundColor;
    }

    return undefined;
  };

  const handleAddSection = () => {
    toggleAddSectionModal();
  };

  const exportSection = (section: SectionType) => {
    const sectionJson = JSON.stringify(section);
    const blob = new Blob([sectionJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `section-${section.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Section exported",
      description: "Section has been exported as JSON",
    });
  };

  // Get custom style for background overlay
  const getOverlayStyle = (): React.CSSProperties => {
    if (!section.settings?.backgroundOverlay) return {};

    if (
      typeof section.settings.backgroundOverlay === "object" &&
      "dark" in section.settings.backgroundOverlay &&
      "light" in section.settings.backgroundOverlay
    ) {
      const color =
        theme === "dark"
          ? section.settings.backgroundOverlay.dark
          : section.settings.backgroundOverlay.light;
      return typeof color === "string" ? { backgroundColor: color } : {};
    }

    return typeof section.settings.backgroundOverlay === "string"
      ? { backgroundColor: section.settings.backgroundOverlay }
      : {};
  };

  return (
    <SectionDragSource id={section.id} index={index} className="relative">
      <SectionDropTarget id={section.id} index={index} className="relative">
        <ResizableStructure
          type="section"
          id={section.id}
          isSelected={isSelected}
          onSelect={(e) => {
            if (e) e.stopPropagation();
            useBuilderStore.getState().selectSection(section.id);
          }}
          onDelete={() => deleteSection(section.id)}
          onAdd={handleAddSection}
          addButtonPosition="bottom"
          color="orange"
          label={`Section: ${section.type}`}
          style={{
            ...getBackgroundStyles(),
            ...(getCustomBackgroundColor()
              ? { backgroundColor: getCustomBackgroundColor() }
              : {}),
            paddingTop: section.settings?.paddingTop
              ? `${section.settings.paddingTop}px`
              : undefined,
            paddingRight: section.settings?.paddingRight
              ? `${section.settings.paddingRight}px`
              : undefined,
            paddingBottom: section.settings?.paddingBottom
              ? `${section.settings.paddingBottom}px`
              : undefined,
            paddingLeft: section.settings?.paddingLeft
              ? `${section.settings.paddingLeft}px`
              : undefined,
            marginTop: section.settings?.marginTop
              ? `${section.settings.marginTop}px`
              : undefined,
            marginBottom: section.settings?.marginBottom
              ? `${section.settings.marginBottom}px`
              : undefined,
          }}
          className={cn(
            ...getSectionClasses(),
            "transition-colors duration-200"
          )}
          settings={section.settings || {}}
          updateSettings={(key, value) => {
            console.log(`Updating section setting: ${key}`, value);
            const updatedSettings = { ...section.settings, [key]: value };
            updateSection(section.id, {
              ...section,
              settings: updatedSettings,
            });
          }}
          addButtonLabel="Add Section"
          extraControls={
            <>
              <ReorderControls
                onMoveUp={() => {
                  if (index > 0) {
                    useBuilderStore
                      .getState()
                      .moveSection(section.id, index - 1);
                  }
                }}
                onMoveDown={() => {
                  if (index < totalSections - 1) {
                    useBuilderStore
                      .getState()
                      .moveSection(section.id, index + 1);
                  }
                }}
                isFirst={index === 0}
                isLast={index === totalSections - 1}
                color="orange"
              />
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useSavedSectionsStore.getState().addSection(section);
                    toast({
                      title: "Section saved",
                      description: "Section has been saved to your library",
                    });
                  }}
                  className={`p-1 text-white hover:bg-orange-600`}
                  title="Save to library"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportSection(section);
                  }}
                  className={`p-1 text-white hover:bg-orange-600`}
                  title="Export section"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </>
          }
        >
          {section.settings?.backgroundOverlay && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={getOverlayStyle()}
            />
          )}

          <div className={cn("relative z-1 w-full h-full")}>
            {section.rows.map((row, rowIndex) => (
              <div key={row.id} className="relative">
                <Row
                  row={row}
                  sectionId={section.id}
                  index={rowIndex}
                  totalRows={section.rows.length}
                  isEditMode={isEditMode}
                />
              </div>
            ))}

            {section.rows.length === 0 && (
              <div className="py-8 text-center">
                <StructureAddButton
                  position="center"
                  color="blue"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddRowClick();
                  }}
                  isVisible={true}
                  size="sm"
                  label="Add Layout"
                />
              </div>
            )}
          </div>
        </ResizableStructure>
      </SectionDropTarget>

      {showAddContentModal && (
        <AddContentModal
          onClose={() => setShowAddContentModal(false)}
          onAddRow={handleAddRow}
          nestingLevel={1}
          sectionId={section.id}
          rowId=""
        />
      )}
    </SectionDragSource>
  );
}
