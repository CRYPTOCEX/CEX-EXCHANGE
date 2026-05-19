"use client";
import type React from "react";

import type { Row as RowType, Column as ColumnType } from "@/types/builder";
import { useBuilderStore } from "@/store/builder-store";
import Column from "./column";
import { ResizableStructure } from "../resizable";
import StructureAddButton from "./structure-add-button";
import { RowDragSource, RowDropTarget } from "../dnd";
import ReorderControls from "./reorder-controls";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface RowProps {
  row: RowType;
  sectionId: string;
  parentColumnId?: string;
  nestingLevel?: number;
  index: number;
  totalRows: number;
  isEditMode: boolean;
}

export default function Row({
  row,
  sectionId,
  parentColumnId,
  nestingLevel = 1,
  index,
  totalRows,
  isEditMode,
}: RowProps) {
  const { updateRow, deleteRow, selectRow, selectedRowId } = useBuilderStore();
  const { theme } = useTheme();

  const isSelected = selectedRowId === row.id;

  const handleAddColumn = (position?: number) => {
    const newColumn: ColumnType = {
      id: `column-${Date.now()}`,
      width: 0,
      elements: [],
      settings: {
        paddingTop: 15,
        paddingRight: 15,
        paddingBottom: 15,
        paddingLeft: 15,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      },
      nestingLevel,
    };

    const insertPos = position !== undefined ? position : row.columns.length;

    const updatedColumns = [...row.columns];

    updatedColumns.splice(insertPos, 0, newColumn);

    const newColumnWidth = 100 / updatedColumns.length;

    const columnsWithUpdatedWidths = updatedColumns.map((col) => ({
      ...col,
      width: Number.parseFloat(newColumnWidth.toFixed(2)),
    }));

    updateRow(
      sectionId,
      row.id,
      {
        ...row,
        columns: columnsWithUpdatedWidths,
      },
      parentColumnId
    );

    useBuilderStore
      .getState()
      .selectColumn(sectionId, row.id, newColumn.id, parentColumnId);
  };

  // Only use inline styles for non-color properties
  const getRowStyles = () => {
    const styles: React.CSSProperties = {
      display: "flex",
      flexWrap: "wrap",
      width: "100%",
    };

    if (row.settings?.maxWidth) {
      styles.maxWidth = row.settings.maxWidth;
    }

    if (row.settings?.verticalAlign) {
      switch (row.settings.verticalAlign) {
        case "top":
          styles.alignItems = "flex-start";
          break;
        case "middle":
          styles.alignItems = "center";
          break;
        case "bottom":
          styles.alignItems = "flex-end";
          break;
      }
    }

    // Add padding styles
    if (row.settings?.paddingTop)
      styles.paddingTop = `${row.settings.paddingTop}px`;
    if (row.settings?.paddingRight)
      styles.paddingRight = `${row.settings.paddingRight}px`;
    if (row.settings?.paddingBottom)
      styles.paddingBottom = `${row.settings.paddingBottom}px`;
    if (row.settings?.paddingLeft)
      styles.paddingLeft = `${row.settings.paddingLeft}px`;

    return styles;
  };

  // Get Tailwind classes for the row, similar to section-renderer.tsx
  const getRowClasses = () => {
    const classes = ["row-container"];

    // Handle background color
    if (row.settings?.backgroundColor) {
      if (typeof row.settings.backgroundColor === "object") {
        // Type guard for GradientColor
        const bg = row.settings.backgroundColor as any;
        if (
          typeof bg === "object" &&
          "type" in bg &&
          bg.type === "gradient" &&
          bg.gradient
        ) {
          // It's a gradient
          const gradient = bg.gradient;
          classes.push(
            `bg-gradient-${gradient.direction}`,
            `from-${gradient.from}`,
            gradient.via ? `via-${gradient.via}` : "",
            `to-${gradient.to}`
          );
        } else {
          // It's a theme-aware color
          if (bg.light?.includes("-")) {
            classes.push(`bg-${bg.light}`);
          }
          if (bg.dark?.includes("-")) {
            classes.push(`dark:bg-${bg.dark}`);
          }
          // For non-Tailwind colors, we still need to use inline style
          if (!bg.light?.includes("-") && !bg.dark?.includes("-")) {
            // We'll handle this in a special case below
            classes.push("bg-custom");
          }
        }
      } else if (row.settings.backgroundColor.includes("-")) {
        // It's a Tailwind class
        classes.push(`bg-${row.settings.backgroundColor}`);
      } else {
        // It's a direct color value
        classes.push("bg-custom");
      }
    }

    return classes.filter(Boolean);
  };

  // Get custom background color for non-Tailwind colors
  const getCustomBackgroundColor = () => {
    if (!row.settings?.backgroundColor) return undefined;

    if (typeof row.settings.backgroundColor === "object") {
      const bg = row.settings.backgroundColor as {
        light?: string;
        dark?: string;
      };
      // Only treat as ThemeColor if it does NOT have a 'type' property (i.e., not GradientColor)
      if (
        !("type" in row.settings.backgroundColor) &&
        !bg.light?.includes("-") &&
        !bg.dark?.includes("-")
      ) {
        return theme === "dark" ? bg.dark : bg.light;
      }
    } else if (!row.settings.backgroundColor.includes("-")) {
      return row.settings.backgroundColor;
    }

    return undefined;
  };

  const handleAddRow = () => {
    const newRow: RowType = {
      id: `row-${Date.now()}`,
      columns: [],
      settings: {
        gutter: 20,
        paddingTop: 20,
        paddingRight: 0,
        paddingBottom: 20,
        paddingLeft: 0,
        verticalAlign: "top",
      },
      nestingLevel: nestingLevel,
    };

    useBuilderStore.getState().addRow(sectionId, newRow, parentColumnId);
  };

  return (
    <RowDragSource
      id={row.id}
      sectionId={sectionId}
      parentColumnId={parentColumnId}
      nestingLevel={nestingLevel}
      index={index}
      className="relative"
    >
      <RowDropTarget
        id={row.id}
        sectionId={sectionId}
        parentColumnId={parentColumnId}
        nestingLevel={nestingLevel}
        index={index}
        className="relative"
      >
        <ResizableStructure
          type="row"
          id={row.id}
          sectionId={sectionId}
          rowId={row.id}
          isSelected={isSelected}
          onSelect={(e) => {
            if (e) e.stopPropagation();
            selectRow(sectionId, row.id, parentColumnId);
          }}
          onDelete={() => deleteRow(sectionId, row.id, parentColumnId)}
          onAdd={handleAddRow}
          addButtonPosition="bottom"
          color="blue"
          label={`Row${nestingLevel > 1 ? ` (Nested Level ${nestingLevel})` : ""}`}
          style={{
            ...getRowStyles(),
            ...(getCustomBackgroundColor()
              ? { backgroundColor: getCustomBackgroundColor() }
              : {}),
          }}
          className={cn(...getRowClasses())}
          settings={row.settings || {}}
          updateSettings={(key, value) => {
            console.log(`Updating row setting: ${key}`, value);
            const updatedSettings = { ...row.settings, [key]: value };
            updateRow(
              sectionId,
              row.id,
              {
                ...row,
                settings: updatedSettings,
              },
              parentColumnId
            );
          }}
          addButtonLabel="Add Row"
          extraControls={
            <ReorderControls
              onMoveUp={() => {
                useBuilderStore
                  .getState()
                  .reorderRow(row.id, sectionId, parentColumnId, "up");
              }}
              onMoveDown={() => {
                useBuilderStore
                  .getState()
                  .reorderRow(row.id, sectionId, parentColumnId, "down");
              }}
              isFirst={index === 0}
              isLast={index === totalRows - 1}
              color="blue"
            />
          }
        >
          {row.columns.map((column, columnIndex) => (
            <div
              key={column.id}
              className="relative pointer-events-auto"
              style={{
                width: `${column.width.toFixed(2)}%`,
                paddingLeft: row.settings?.gutter
                  ? `${row.settings.gutter / 2}px`
                  : undefined,
                paddingRight: row.settings?.gutter
                  ? `${row.settings.gutter / 2}px`
                  : undefined,
              }}
            >
              <Column
                column={column}
                sectionId={sectionId}
                rowId={row.id}
                gutter={row.settings?.gutter || 0}
                parentRowId={parentColumnId ? row.id : undefined}
                nestingLevel={nestingLevel}
                index={columnIndex}
                totalColumns={row.columns.length}
                isEditMode={isEditMode}
              />

              {columnIndex < row.columns.length - 1 && (
                <StructureAddButton
                  position="right"
                  color="green"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddColumn(columnIndex + 1);
                  }}
                  isVisible={isSelected}
                  size="xs"
                  rounded="sm"
                  label="Add Column"
                />
              )}
            </div>
          ))}

          {row.columns.length === 0 && (
            <div className="w-full py-6 text-center">
              <StructureAddButton
                position="center"
                color="green"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddColumn();
                }}
                isVisible={true}
                size="sm"
                label="Add Column"
              />
            </div>
          )}

          {row.columns.length > 0 && (
            <StructureAddButton
              position="right"
              color="green"
              onClick={(e) => {
                e.stopPropagation();
                handleAddColumn();
              }}
              isVisible={isSelected}
              size="xs"
              rounded="sm"
              label="Add Column"
            />
          )}
        </ResizableStructure>
      </RowDropTarget>
    </RowDragSource>
  );
}
