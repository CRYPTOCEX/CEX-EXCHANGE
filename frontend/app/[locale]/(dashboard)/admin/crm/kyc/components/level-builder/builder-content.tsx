"use client";

import React from "react";
import type { RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Layers, Plus } from "lucide-react";
import { FieldListView } from "./field-list-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

// Helper function to get the color for each field type
const getFieldTypeColor = (type: string): string => {
  switch (type) {
    case "TEXT":
    case "TEXTAREA":
    case "NUMBER":
      return "blue";
    case "SELECT":
    case "MULTISELECT":
    case "CHECKBOX":
    case "RADIO":
      return "purple";
    case "DATE":
    case "FILE":
      return "amber";
    case "EMAIL":
    case "PHONE":
    case "ADDRESS":
      return "emerald";
    default:
      return "gray";
  }
};

interface BuilderContentProps {
  loading?: boolean;
  levelNumber: number;
  handleAddField: (type: any, position?: number) => void;
  localError: string | null;
  filteredFields: KycField[];
  selectedField: KycField | null;
  setSelectedField: (field: KycField | null) => void;
  handleDuplicateField: (fieldId: string) => void;
  handleRemoveField: (fieldId: string) => void;
  fieldContainerRef: RefObject<HTMLDivElement | null>;
  handleReorderFields: (sourceIndex: number, destinationIndex: number) => void;
  setRightSidebarOpen: (open: boolean) => void;
}

export function BuilderContent({
  loading,
  levelNumber,
  handleAddField,
  localError,
  filteredFields,
  selectedField,
  setSelectedField,
  handleDuplicateField,
  handleRemoveField,
  fieldContainerRef,
  handleReorderFields,
  setRightSidebarOpen,
}: BuilderContentProps) {
  const t = useTranslations("dashboard");
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [dropPosition, setDropPosition] = React.useState<{
    index: number;
    y: number;
  } | null>(null);
  const [draggedFieldType, setDraggedFieldType] = React.useState<string | null>(
    null
  );

  // Handle drag over for the entire content area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Add this to prevent event bubbling

    // Check if we're dragging from library by checking dataTransfer types
    const isFromLibrary = e.dataTransfer.types.includes("text/plain");

    if (isFromLibrary) {
      setIsDraggingOver(true);

      // Get content area bounds
      const contentRect = fieldContainerRef.current?.getBoundingClientRect();
      if (!contentRect) return;

      // Find the closest drop position
      const fieldElements = Array.from(
        fieldContainerRef.current?.querySelectorAll("[data-field-id]") || []
      );

      // If no fields, position at the top of the content area
      if (fieldElements.length === 0) {
        setDropPosition({
          index: 0,
          y: 20, // Some padding from the top
        });
        return;
      }

      // Find the closest field to the cursor
      let closestIndex = -1;
      let closestDistance = Number.MAX_VALUE;
      let insertPosition = 0;

      fieldElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const fieldMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(e.clientY - fieldMiddle);

        if (distance < closestDistance) {
          closestDistance = distance;

          // Determine if we should insert before or after this field
          if (e.clientY < fieldMiddle) {
            // Insert before
            insertPosition = rect.top - contentRect.top;
            closestIndex = index;
          } else {
            // Insert after
            insertPosition = rect.bottom - contentRect.top;
            closestIndex = index + 1;
          }
        }
      });

      // Set the drop position
      setDropPosition({
        index: closestIndex,
        y: insertPosition,
      });
    }
  };

  // Handle drag enter
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    // Check if this is a drag from the field library
    if (e.dataTransfer.types.includes("text/plain")) {
      setIsDraggingOver(true);

      // Try to get the field type from the dataTransfer
      try {
        const data = e.dataTransfer.getData("text/plain");
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.fieldType) {
            setDraggedFieldType(parsed.fieldType);
          }
        }
      } catch (error) {
        // Silently fail if we can't parse the data
      }
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're actually leaving the content area, not just moving between child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
      setDropPosition(null);
    }
  };

  // Handle drop from the field library
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    try {
      // Get the data from dataTransfer
      const data = e.dataTransfer.getData("text/plain");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.fieldType) {
            const fieldType = parsed.fieldType as KycFieldType;

            // Add field at the calculated position
            if (dropPosition !== null) {
              console.log(
                `Dropping field of type ${fieldType} at position ${dropPosition.index}`
              );

              // IMPORTANT: Use handleAddField instead of addField
              // This is the key fix - we need to use the component prop function
              handleAddField(fieldType, dropPosition.index);
            } else {
              // Fallback to adding at the end
              handleAddField(fieldType);
            }
          }
        } catch (parseError) {
          console.error("Error parsing drop data:", parseError);
        }
      }
    } catch (error) {
      console.error("Error in drop:", error);
    }

    // Reset state
    setIsDraggingOver(false);
    setDropPosition(null);
    setDraggedFieldType(null);
  };

  // Get field icon based on type
  const getFieldIcon = (type: string) => {
    switch (type) {
      case "TEXT":
        return "T";
      case "TEXTAREA":
        return "¶";
      case "SELECT":
        return "▼";
      case "CHECKBOX":
        return "☑";
      case "RADIO":
        return "○";
      case "DATE":
        return "📅";
      case "FILE":
        return "📎";
      case "NUMBER":
        return "#";
      case "EMAIL":
        return "@";
      case "PHONE":
        return "☎";
      case "ADDRESS":
        return "🏠";
      case "IDENTITY":
        return "🪪";
      default:
        return "?";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Builder Content */}
      <div
        className="flex-1 overflow-auto overflow-x-hidden p-4 relative"
        ref={fieldContainerRef}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-droppable="true"
      >
        {/* Drop indicator line when dragging from field library */}
        {isDraggingOver && dropPosition && (
          <>
            {/* Enhanced drop indicator line */}
            <div
              className="absolute left-4 right-4 pointer-events-none z-50"
              style={{ top: dropPosition.y }}
            >
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary dark:bg-zinc-100 text-white dark:text-black rounded-full p-2 shadow-lg">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Preview of dragged field */}
            {draggedFieldType && (
              <div
                className="absolute left-4 right-4 pointer-events-none z-40"
                style={{
                  top: dropPosition.y + 10, // Just below the drop indicator line
                  opacity: 0.8,
                }}
              >
                <Card
                  className={`border-2 border-dashed border-${draggedFieldType ? getFieldTypeColor(draggedFieldType) : "primary"}-400 bg-${draggedFieldType ? getFieldTypeColor(draggedFieldType) : "primary"}-50/80 dark:bg-${draggedFieldType ? getFieldTypeColor(draggedFieldType) : "primary"}-900/20 shadow-md`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center h-8 w-8 rounded-md bg-${draggedFieldType ? getFieldTypeColor(draggedFieldType) : "primary"}-100 dark:bg-${draggedFieldType ? getFieldTypeColor(draggedFieldType) : "primary"}-800/30 text-${draggedFieldType ? getFieldTypeColor(draggedFieldType) : "primary"}-600 dark:text-${draggedFieldType ? getFieldTypeColor(draggedFieldType) : "primary"}-400 font-medium`}
                    >
                      {getFieldIcon(draggedFieldType || "")}
                    </div>
                    <div>
                      <div className="font-medium dark:text-zinc-300">
                        {t("New")}{" "}
                        {draggedFieldType
                          ? draggedFieldType.charAt(0) +
                            draggedFieldType.slice(1).toLowerCase()
                          : ""}{" "}
                        {t("Field")}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-zinc-400">
                        {draggedFieldType}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {localError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{'Error'}</AlertTitle>
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            <div className="relative">
              <div className="transition-all duration-200">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-18 mb-2" />
                ))}
              </div>
            </div>
          </div>
        ) : filteredFields.length === 0 ? (
          <Card className="shadow-sm border-dashed border-gray-300 dark:border-zinc-700 dark:bg-zinc-800/50 bg-gray-50/50">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4 shadow-sm">
                <Layers className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-zinc-300">
                {t("no_fields_added_to_level")}
                {levelNumber}
              </h3>
              <p className="text-sm text-muted-foreground text-center mt-2 max-w-md dark:text-zinc-400">
                {`Drag fields from the Field Library on the left sidebar and drop them here to build Level ${levelNumber}.`}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs border border-blue-100 dark:border-blue-800/30">
                  {t("basic_fields")}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs border border-purple-100 dark:border-purple-800/30">
                  {t("choice_fields")}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs border border-amber-100 dark:border-amber-800/30">
                  {t("special_fields")}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-100 dark:border-emerald-800/30">
                  {t("contact_fields")}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <FieldListView
            filteredFields={filteredFields}
            selectedField={selectedField}
            setSelectedField={(field) => {
              setSelectedField(field);
              if (field) {
                setRightSidebarOpen(true); // Open the right sidebar when selecting a field
              }
            }}
            handleDuplicateField={handleDuplicateField}
            handleRemoveField={handleRemoveField}
            handleReorderFields={handleReorderFields}
          />
        )}
      </div>
    </div>
  );
}
