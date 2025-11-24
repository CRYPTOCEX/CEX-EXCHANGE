"use client";
import { useState } from "react";
import React from "react";

import type {
  Column as ColumnType,
  Element as ElementType,
} from "@/types/builder";
import { useBuilderStore } from "@/store/builder-store";
import { cn } from "@/lib/utils";
import { AddContentModal } from "../../modals/add-content-modal";
import { ResizableStructure, Element } from "../resizable";
import Row from "./row";
import StructureAddButton from "./structure-add-button";
import {
  ColumnDragSource,
  ColumnDropTarget,
  ElementDragSource,
  ElementDropTarget,
} from "../dnd";
import ReorderControls from "./reorder-controls";
import { useTheme } from "next-themes";

interface ColumnProps {
  column: ColumnType;
  sectionId: string;
  rowId: string;
  gutter: number;
  parentRowId?: string;
  nestingLevel?: number;
  index: number;
  totalColumns: number;
  isEditMode: boolean;
}

export default function Column({
  column,
  sectionId,
  rowId,
  gutter,
  parentRowId,
  nestingLevel = 1,
  index,
  totalColumns,
  isEditMode,
}: ColumnProps) {
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const { theme } = useTheme();

  const {
    updateColumn,
    deleteColumn,
    selectColumn,
    selectedElementId,
    selectedColumnId,
  } = useBuilderStore();

  const isSelected = selectedColumnId === column.id;
  const isEmpty =
    column.elements.length === 0 && (!column.rows || column.rows.length === 0);

  const maxNestingReached = nestingLevel >= 2;

  const handleAddElement = (element: ElementType) => {
    const newElement = {
      ...element,
      id: `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    const currentColumn = column;

    const updatedElements = [...currentColumn.elements, newElement];

    updateColumn(
      sectionId,
      rowId,
      column.id,
      {
        ...currentColumn,
        elements: updatedElements,
      },
      parentRowId
    );

    setTimeout(() => {
      useBuilderStore.getState().selectElement(newElement.id, {
        sectionId,
        rowId: parentRowId || rowId,
        columnId: column.id,
      });
    }, 50);
  };

  const handleAddRow = (newRow: any) => {
    const updatedRows = column.rows ? [...column.rows] : [];

    updatedRows.push(newRow);

    updateColumn(
      sectionId,
      rowId,
      column.id,
      {
        ...column,
        rows: updatedRows,
      },
      parentRowId
    );

    useBuilderStore.getState().selectRow(sectionId, newRow.id, column.id);
  };

  // Only use inline styles for non-color properties
  const getColumnStyles = () => {
    const styles: React.CSSProperties = {
      height: "100%",
      width: "100%",
      position: "relative",
    };

    if (column.settings?.border) {
      styles.border = column.settings.border;
    }

    if (column.settings?.borderRadius) {
      styles.borderRadius = `${column.settings.borderRadius}px`;
    }

    // Add padding styles
    if (column.settings?.paddingTop)
      styles.paddingTop = `${column.settings.paddingTop}px`;
    if (column.settings?.paddingRight)
      styles.paddingRight = `${column.settings.paddingRight}px`;
    if (column.settings?.paddingBottom)
      styles.paddingBottom = `${column.settings.paddingBottom}px`;
    if (column.settings?.paddingLeft)
      styles.paddingLeft = `${column.settings.paddingLeft}px`;

    return styles;
  };

  // Get Tailwind classes for the column, similar to section-renderer.tsx
  const getColumnClasses = () => {
    const classes = [
      isEmpty ? "min-h-[80px]" : "min-h-[100px]",
      "pointer-events-auto",
      "column-container",
    ];

    // Handle background color
    if (column.settings?.backgroundColor) {
      if (typeof column.settings.backgroundColor === "object") {
        // Type guard for GradientColor
        if (
          "type" in column.settings.backgroundColor &&
          column.settings.backgroundColor.type === "gradient" &&
          column.settings.backgroundColor.gradient
        ) {
          // It's a gradient
          const gradient = column.settings.backgroundColor.gradient;
          classes.push(
            `bg-gradient-${gradient.direction}`,
            `from-${gradient.from}`,
            gradient.via ? `via-${gradient.via}` : "",
            `to-${gradient.to}`
          );
        } else {
          // It's a theme-aware color
          if (
            !("type" in column.settings.backgroundColor) &&
            column.settings.backgroundColor.light?.includes("-")
          ) {
            classes.push(`bg-${column.settings.backgroundColor.light}`);
          }
          if (
            !("type" in column.settings.backgroundColor) &&
            column.settings.backgroundColor.dark?.includes("-")
          ) {
            classes.push(`dark:bg-${column.settings.backgroundColor.dark}`);
          }
          // For non-Tailwind colors, we still need to use inline style
          if (
            !("type" in column.settings.backgroundColor) &&
            !column.settings.backgroundColor.light?.includes("-") &&
            !column.settings.backgroundColor.dark?.includes("-")
          ) {
            // We'll handle this in a special case below
            classes.push("bg-custom");
          }
        }
      } else if (column.settings.backgroundColor.includes("-")) {
        // It's a Tailwind class
        classes.push(`bg-${column.settings.backgroundColor}`);
      } else {
        // It's a direct color value
        classes.push("bg-custom");
      }
    }

    return classes.filter(Boolean);
  };

  // Get custom background color for non-Tailwind colors
  const getCustomBackgroundColor = () => {
    if (!column.settings?.backgroundColor) return undefined;

    if (typeof column.settings.backgroundColor === "object") {
      if (
        !("type" in column.settings.backgroundColor) &&
        !column.settings.backgroundColor.light?.includes("-") &&
        !column.settings.backgroundColor.dark?.includes("-")
      ) {
        return theme === "dark"
          ? column.settings.backgroundColor.dark
          : column.settings.backgroundColor.light;
      }
    } else if (!column.settings.backgroundColor.includes("-")) {
      return column.settings.backgroundColor;
    }

    return undefined;
  };

  const formattedWidth = column.width.toFixed(2);

  const handleDeleteColumn = () => {
    deleteColumn(
      sectionId,
      parentRowId || rowId,
      column.id,
      parentRowId ? rowId : undefined
    );
  };

  const handleAddButtonClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowAddContentModal(true);
  };

  const renderAddContentButton = () => {
    if (isEmpty) return null;

    return (
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-30">
        <StructureAddButton
          position="center"
          color="green"
          onClick={handleAddButtonClick}
          isVisible={isSelected}
          size="sm"
          label="Add Content"
        />
      </div>
    );
  };

  const renderEmptyColumnContent = () => {
    if (!isEmpty) return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <StructureAddButton
          position="center"
          color="green"
          onClick={handleAddButtonClick}
          isVisible={true}
          size="sm"
          label="Add Content"
        />
      </div>
    );
  };

  // Helper function to check if an element should be rendered inline
  const isInlineElement = (element: ElementType) => {
    return (
      element.type === "button" || element.settings?.display === "inline-block"
    );
  };

  // Group consecutive inline elements
  const renderElements = () => {
    const processedElements = new Set<number>();
    const result: React.ReactNode[] = [];

    // Process elements
    for (let i = 0; i < column.elements.length; i++) {
      if (processedElements.has(i)) continue;

      const element = column.elements[i];

      // Check if this is the start of an inline group
      if (isInlineElement(element)) {
        // Find consecutive inline elements
        const inlineGroup = [i];
        let j = i + 1;
        while (
          j < column.elements.length &&
          isInlineElement(column.elements[j])
        ) {
          inlineGroup.push(j);
          j++;
        }

        // If we have multiple inline elements, group them
        if (inlineGroup.length > 1) {
          // Mark all as processed
          inlineGroup.forEach((idx) => processedElements.add(idx));

          // Create a flex container for the inline group
          result.push(
            <div
              key={`inline-group-${i}`}
              className="flex flex-wrap items-center justify-center gap-4 w-full mb-4"
            >
              {inlineGroup.map((idx) => {
                const inlineElement = column.elements[idx];
                return (
                  <ElementDragSource
                    key={inlineElement.id}
                    id={inlineElement.id}
                    sectionId={sectionId}
                    rowId={rowId}
                    columnId={column.id}
                    index={idx}
                    className="pointer-events-auto inline-block"
                  >
                    <Element
                      element={inlineElement}
                      isSelected={selectedElementId === inlineElement.id}
                      containerInfo={{
                        type: "column",
                        sectionId,
                        rowId: parentRowId || rowId,
                        columnId: column.id,
                      }}
                    />
                  </ElementDragSource>
                );
              })}
            </div>
          );

          // Add drop target after the group
          if (j < column.elements.length) {
            result.push(
              <ElementDropTarget
                key={`drop-target-${element.id}`}
                id={`drop-target-${element.id}`}
                sectionId={sectionId}
                rowId={rowId}
                columnId={column.id}
                index={j}
                className="min-h-[10px] w-full"
              >
                <div className="min-h-[10px] w-full"></div>
              </ElementDropTarget>
            );
          }

          continue;
        }
      }

      // Handle single element (not part of an inline group)
      processedElements.add(i);

      result.push(
        <React.Fragment key={element.id}>
          <div className="w-full block">
            <ElementDragSource
              id={element.id}
              sectionId={sectionId}
              rowId={rowId}
              columnId={column.id}
              index={i}
              className="pointer-events-auto w-full block"
            >
              <div className="w-full block">
                <Element
                  element={element}
                  isSelected={selectedElementId === element.id}
                  containerInfo={{
                    type: "column",
                    sectionId,
                    rowId: parentRowId || rowId,
                    columnId: column.id,
                  }}
                />
              </div>
            </ElementDragSource>
          </div>

          {i < column.elements.length - 1 && (
            <ElementDropTarget
              id={`drop-target-${element.id}`}
              sectionId={sectionId}
              rowId={rowId}
              columnId={column.id}
              index={i + 1}
              className="min-h-[10px] w-full"
            >
              <div className="min-h-[10px] w-full"></div>
            </ElementDropTarget>
          )}
        </React.Fragment>
      );
    }

    return result;
  };

  return (
    <>
      <ColumnDragSource
        id={column.id}
        sectionId={sectionId}
        rowId={rowId}
        parentRowId={parentRowId}
        nestingLevel={nestingLevel}
        index={index}
        className="relative"
      >
        <ColumnDropTarget
          id={column.id}
          sectionId={sectionId}
          rowId={rowId}
          parentRowId={parentRowId}
          nestingLevel={nestingLevel}
          index={index}
          className="relative"
        >
          <ResizableStructure
            type="column"
            id={column.id}
            sectionId={sectionId}
            rowId={rowId}
            isSelected={isSelected}
            onSelect={(e) => {
              if (e) e.stopPropagation();
              selectColumn(sectionId, rowId, column.id, parentRowId);
            }}
            onDelete={handleDeleteColumn}
            onAdd={isEmpty ? undefined : handleAddButtonClick}
            addButtonPosition={isEmpty ? undefined : "bottom"}
            color="green"
            label={`Column: ${formattedWidth}%${nestingLevel > 1 ? ` (Nested Level ${nestingLevel})` : ""}`}
            style={{
              ...getColumnStyles(),
              ...(getCustomBackgroundColor()
                ? { backgroundColor: getCustomBackgroundColor() }
                : {}),
            }}
            className={cn(...getColumnClasses())}
            settings={column.settings || {}}
            updateSettings={(key, value) => {
              console.log(`Updating column setting: ${key}`, value);
              const updatedSettings = { ...column.settings, [key]: value };
              updateColumn(
                sectionId,
                rowId,
                column.id,
                {
                  ...column,
                  settings: updatedSettings,
                },
                parentRowId
              );
            }}
            addButtonLabel="Add Content"
            extraControls={
              <ReorderControls
                onMoveUp={() => {
                  useBuilderStore
                    .getState()
                    .reorderColumn(
                      column.id,
                      sectionId,
                      rowId,
                      parentRowId,
                      "up"
                    );
                }}
                onMoveDown={() => {
                  useBuilderStore
                    .getState()
                    .reorderColumn(
                      column.id,
                      sectionId,
                      rowId,
                      parentRowId,
                      "down"
                    );
                }}
                isFirst={index === 0}
                isLast={index === totalColumns - 1}
                color="green"
              />
            }
          >
            <div className="h-full w-full flex flex-col">
              {renderElements()}

              {column.rows?.map((row, rowIndex) => (
                <div key={row.id}>
                  <Row
                    row={row}
                    sectionId={sectionId}
                    parentColumnId={column.id}
                    nestingLevel={nestingLevel + 1}
                    index={rowIndex}
                    totalRows={column.rows?.length || 0}
                    isEditMode={isEditMode}
                  />
                </div>
              ))}

              {renderEmptyColumnContent()}
            </div>
          </ResizableStructure>
        </ColumnDropTarget>
      </ColumnDragSource>

      {renderAddContentButton()}

      {showAddContentModal && (
        <AddContentModal
          onClose={() => setShowAddContentModal(false)}
          onAddElement={handleAddElement}
          onAddRow={maxNestingReached ? undefined : handleAddRow}
          nestingLevel={nestingLevel}
          columnId={column.id}
          sectionId={sectionId}
          rowId={rowId}
        />
      )}
    </>
  );
}
