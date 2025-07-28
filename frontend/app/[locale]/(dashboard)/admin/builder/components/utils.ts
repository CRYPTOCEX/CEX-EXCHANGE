import type React from "react";
import type { Section } from "@/types/builder";
import { BuilderRegistry } from "@/store/builder-store";
import type { ResizeDirection } from "./canvas/resizable";

// Check if dropping would create a circular reference
export function wouldCreateCircularReference(
  dragItem: {
    type: string;
    id: string;
    sectionId?: string;
    rowId?: string;
    columnId?: string;
    parentColumnId?: string;
  },
  dropTarget: {
    type: string;
    id: string;
    sectionId?: string;
    rowId?: string;
    columnId?: string;
    parentColumnId?: string;
  },
  sections: Section[]
): boolean {
  // If dropping on itself, it's circular
  if (dragItem.id === dropTarget.id) return true;

  // If dropping a parent on its child, it's circular
  if (dragItem.type === "section" && dropTarget.sectionId === dragItem.id)
    return true;
  if (dragItem.type === "row" && dropTarget.rowId === dragItem.id) return true;
  if (dragItem.type === "column" && dropTarget.columnId === dragItem.id)
    return true;

  // For more complex nesting, use the registry to check
  const registry = new BuilderRegistry(sections);

  // If dropping a row, check if the target is inside this row
  if (dragItem.type === "row") {
    const rowInfo = registry.getRow(dragItem.id);
    if (!rowInfo) return false;

    // Check if dropping into a column that's inside this row
    if (dropTarget.type === "column") {
      const columnInfo = registry.getColumn(dropTarget.id);
      if (!columnInfo) return false;

      // If the column's row is the drag item, it's circular
      if (columnInfo.row.id === dragItem.id) return true;

      // Check if the column is in a nested row inside this row
      if (columnInfo.parentColumnId) {
        const parentColumnInfo = registry.getColumn(columnInfo.parentColumnId);
        if (parentColumnInfo && parentColumnInfo.row.id === dragItem.id)
          return true;
      }
    }
  }

  // If dropping a column, check if the target is inside this column
  if (dragItem.type === "column") {
    const columnInfo = registry.getColumn(dragItem.id);
    if (!columnInfo) return false;

    // Check if dropping into a row that's inside this column
    if (dropTarget.type === "row" && columnInfo.column.rows) {
      const isChildRow = columnInfo.column.rows.some(
        (row) => row.id === dropTarget.id
      );
      if (isChildRow) return true;
    }
  }

  return false;
}

// Get the maximum nesting level of a drag item
export function getMaxNestingLevel(
  item: {
    type: string;
    id: string;
    sectionId?: string;
    rowId?: string;
    columnId?: string;
    parentColumnId?: string;
    nestingLevel?: number;
  },
  sections: Section[]
): number {
  const registry = new BuilderRegistry(sections);

  if (item.type === "row") {
    const rowInfo = registry.getRow(item.id);
    if (!rowInfo) return 1;
    return rowInfo.row.nestingLevel || 1;
  }

  if (item.type === "column") {
    const columnInfo = registry.getColumn(item.id);
    if (!columnInfo) return 1;
    return columnInfo.column.nestingLevel || 1;
  }

  return 1;
}

// Calculate the new nesting level for an item being dropped
export function calculateNewNestingLevel(
  item: {
    type: string;
    nestingLevel?: number;
  },
  dropTarget: {
    type: string;
    nestingLevel?: number;
  }
): number {
  const baseLevel = item.nestingLevel || 1;

  // If dropping a row into a column, increase nesting level
  if (item.type === "row" && dropTarget.type === "column") {
    return baseLevel + 1;
  }

  // If dropping a column into a row, use the row's nesting level
  if (item.type === "column" && dropTarget.type === "row") {
    return dropTarget.nestingLevel || 1;
  }

  return baseLevel;
}

// Get a preview style for the dragged item
export function getDragPreviewStyle(type: string): React.CSSProperties {
  switch (type) {
    case "section":
      return {
        border: "2px dashed #f97316",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        borderRadius: "4px",
        padding: "8px",
      };
    case "row":
      return {
        border: "2px dashed #3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderRadius: "4px",
        padding: "8px",
      };
    case "column":
      return {
        border: "2px dashed #22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderRadius: "4px",
        padding: "8px",
      };
    case "element":
      return {
        border: "2px dashed #a855f7",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        borderRadius: "4px",
        padding: "8px",
      };
    default:
      return {};
  }
}

// Get a highlight style for the drop target
export function getDropTargetStyle(
  isOver: boolean,
  canDrop: boolean,
  type: string
): React.CSSProperties {
  if (!isOver) return {};

  if (!canDrop) {
    return {
      border: "2px dashed #ef4444",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderRadius: "4px",
    };
  }

  switch (type) {
    case "section":
      return {
        border: "2px dashed #f97316",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        borderRadius: "4px",
      };
    case "row":
      return {
        border: "2px dashed #3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderRadius: "4px",
      };
    case "column":
      return {
        border: "2px dashed #22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderRadius: "4px",
      };
    default:
      return {
        border: "2px dashed #a855f7",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        borderRadius: "4px",
      };
  }
}

// Helper functions for updating settings with linked sides
export function updatePaddingSettings(
  settings: Record<string, any>,
  side: "top" | "right" | "bottom" | "left",
  value: number,
  linkedVertical: boolean,
  linkedHorizontal: boolean
): Record<string, any> {
  const newSettings = { ...settings };

  // Update the primary side
  newSettings[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = value;

  // Update linked sides if applicable
  if (linkedVertical) {
    if (side === "top") {
      newSettings.paddingBottom = value;
    } else if (side === "bottom") {
      newSettings.paddingTop = value;
    }
  }

  if (linkedHorizontal) {
    if (side === "left") {
      newSettings.paddingRight = value;
    } else if (side === "right") {
      newSettings.paddingLeft = value;
    }
  }

  return newSettings;
}

export function updateMarginSettings(
  settings: Record<string, any>,
  side: "top" | "right" | "bottom" | "left",
  value: number,
  linkedVertical: boolean,
  linkedHorizontal: boolean,
  isStructure = false
): Record<string, any> {
  const newSettings = { ...settings };

  // Update the primary side
  newSettings[`margin${side.charAt(0).toUpperCase() + side.slice(1)}`] = value;

  // Update linked sides if applicable
  if (linkedVertical) {
    if (side === "top") {
      newSettings.marginBottom = value;
    } else if (side === "bottom") {
      newSettings.marginTop = value;
    }
  }

  if (linkedHorizontal) {
    if (side === "left") {
      newSettings.marginRight = value;
    } else if (side === "right") {
      newSettings.marginLeft = value;
    }
  }

  // For structures, ensure we also update the corresponding inset property
  if (isStructure) {
    if (side === "top") {
      newSettings.insetBlockStart = value;
    } else if (side === "right") {
      newSettings.insetInlineEnd = value;
    } else if (side === "bottom") {
      newSettings.insetBlockEnd = value;
    } else if (side === "left") {
      newSettings.insetInlineStart = value;
    }
  }

  return newSettings;
}

export function isStructureElement(id: string, type?: string): boolean {
  if (type) {
    return type === "section" || type === "row" || type === "column";
  }
  return id.includes("section") || id.includes("row") || id.includes("column");
}

export function getResizePositionClasses(direction: ResizeDirection): string {
  switch (direction) {
    case "top":
      return "top-0 left-0 right-0 h-1 cursor-ns-resize";
    case "right":
      return "top-0 right-0 bottom-0 w-1 cursor-ew-resize";
    case "bottom":
      return "bottom-0 left-0 right-0 h-1 cursor-ns-resize";
    case "left":
      return "top-0 left-0 bottom-0 w-1 cursor-ew-resize";
    default:
      return "";
  }
}

export function getStructureColorClasses(
  color: "purple" | "blue" | "green" | "orange"
) {
  switch (color) {
    case "purple":
      return {
        outline: "outline-purple-500",
        bg: "bg-purple-600",
        hover: "hover:bg-purple-700",
        ring: "group-hover:ring-purple-300",
      };
    case "blue":
      return {
        outline: "outline-blue-500",
        bg: "bg-blue-500",
        hover: "hover:bg-blue-600",
        ring: "group-hover:ring-blue-300",
      };
    case "green":
      return {
        outline: "outline-green-500",
        bg: "bg-green-500",
        hover: "hover:bg-green-600",
        ring: "group-hover:ring-green-300",
      };
    case "orange":
      return {
        outline: "outline-orange-500",
        bg: "bg-orange-500",
        hover: "hover:bg-orange-600",
        ring: "group-hover:ring-orange-300",
      };
    default:
      return {
        outline: "outline-purple-500",
        bg: "bg-purple-600",
        hover: "hover:bg-purple-700",
        ring: "group-hover:ring-purple-300",
      };
  }
}

// Check if element is a text element
function isTextElement(elementType: string): boolean {
  return ["heading", "text", "quote", "link"].includes(elementType);
}

export function getElementStyle(
  settings: Record<string, any> = {},
  elementType?: string
): React.CSSProperties {
  // Build transform string
  const transforms: string[] = [];
  if (settings.rotate) transforms.push(`rotate(${settings.rotate}deg)`);
  if (settings.scaleX) transforms.push(`scaleX(${settings.scaleX})`);
  if (settings.scaleY) transforms.push(`scaleY(${settings.scaleY})`);
  if (settings.translateX)
    transforms.push(`translateX(${settings.translateX}px)`);
  if (settings.translateY)
    transforms.push(`translateY(${settings.translateY}px)`);
  if (settings.skewX) transforms.push(`skewX(${settings.skewX}deg)`);
  if (settings.skewY) transforms.push(`skewY(${settings.skewY}deg)`);
  const transform = transforms.length ? transforms.join(" ") : "none";

  // Build filter string
  const filters: string[] = [];
  if (settings.blur) filters.push(`blur(${settings.blur}px)`);
  if (settings.opacity !== undefined)
    filters.push(`opacity(${settings.opacity})`);
  if (settings.brightness !== undefined)
    filters.push(`brightness(${settings.brightness})`);
  if (settings.contrast !== undefined)
    filters.push(`contrast(${settings.contrast})`);
  if (settings.grayscale) filters.push(`grayscale(${settings.grayscale}%)`);
  const filter = filters.length ? filters.join(" ") : "none";

  // Build box shadow
  let boxShadow = "none";
  if (
    settings.boxShadowColor &&
    (settings.boxShadowX ||
      settings.boxShadowY ||
      settings.boxShadowBlur ||
      settings.boxShadowSpread)
  ) {
    boxShadow = `${settings.boxShadowInset ? "inset " : ""}${settings.boxShadowX || 0}px ${settings.boxShadowY || 0}px ${settings.boxShadowBlur || 0}px ${settings.boxShadowSpread || 0}px ${settings.boxShadowColor}`;
  }

  // Build border style
  let border = "none";
  if (settings.borderWidth && settings.borderStyle && settings.borderColor) {
    // Handle individual borders
    if (
      settings.borderTop === false ||
      settings.borderRight === false ||
      settings.borderBottom === false ||
      settings.borderLeft === false
    ) {
      border = "none";
      const borderStyles: string[] = [];
      if (settings.borderTop !== false) {
        borderStyles.push(
          `border-top: ${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor};`
        );
      }
      if (settings.borderRight !== false) {
        borderStyles.push(
          `border-right: ${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor};`
        );
      }
      if (settings.borderBottom !== false) {
        borderStyles.push(
          `border-bottom: ${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor};`
        );
      }
      if (settings.borderLeft !== false) {
        borderStyles.push(
          `border-left: ${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor};`
        );
      }
    } else {
      border = `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}`;
    }
  }

  // Build animation
  let animation = "none";
  if (settings.animationType && settings.animationType !== "none") {
    animation = `${settings.animationType} ${settings.animationDuration || 0.3}s ${settings.animationEasing || "ease"} ${settings.animationDelay || 0}s ${settings.animationIterationCount || "1"}`;
  }

  // For text elements, ensure full width and proper display
  const elementWidth =
    elementType && isTextElement(elementType)
      ? settings.width || "100%"
      : settings.width || "100%";

  const elementDisplay =
    elementType && isTextElement(elementType)
      ? settings.display || "block"
      : settings.display;

  // For text elements, only apply spacing when explicitly set
  const isTextEl = elementType && isTextElement(elementType);

  return {
    width: elementWidth,
    height: settings.height || "auto",
    minWidth: settings.minWidth || undefined,
    maxWidth: settings.maxWidth || undefined,
    minHeight: settings.minHeight || (isTextEl ? "1.2em" : undefined),
    maxHeight: settings.maxHeight || undefined,
    paddingTop: settings.paddingTop !== undefined ? `${settings.paddingTop}px` : undefined,
    paddingRight: settings.paddingRight !== undefined ? `${settings.paddingRight}px` : undefined,
    paddingBottom: settings.paddingBottom !== undefined ? `${settings.paddingBottom}px` : undefined,
    paddingLeft: settings.paddingLeft !== undefined ? `${settings.paddingLeft}px` : undefined,
    marginTop: settings.marginTop !== undefined ? `${settings.marginTop}px` : undefined,
    marginRight: settings.marginRight !== undefined ? `${settings.marginRight}px` : undefined,
    marginBottom: settings.marginBottom !== undefined ? `${settings.marginBottom}px` : undefined,
    marginLeft: settings.marginLeft !== undefined ? `${settings.marginLeft}px` : undefined,
    backgroundColor: settings.backgroundColor || "transparent",
    border,
    borderRadius: settings.borderRadius
      ? `${settings.borderRadius}px`
      : undefined,
    boxShadow,
    transform,
    filter,
    textAlign: settings.textAlign || "left",
    verticalAlign: settings.verticalAlign || undefined,
    animation: animation !== "none" ? animation : undefined,
    transition:
      settings.animationType !== "none"
        ? `all ${settings.animationDuration || 0.3}s ${settings.animationEasing || "ease"}`
        : undefined,
    display: elementDisplay,
  };
}

export function getStructureStyle(
  settings: Record<string, any> = {},
  type?: "section" | "row" | "column"
): React.CSSProperties {
  const styles: React.CSSProperties = {};

  // Common styles
  if (settings.backgroundColor) {
    styles.backgroundColor = settings.backgroundColor;
  }

  // Type-specific styles
  if (type === "row") {
    styles.display = "flex";
    styles.flexWrap = "wrap";
    styles.width = "100%";

    if (settings.maxWidth) {
      styles.maxWidth = settings.maxWidth;
    }

    if (settings.verticalAlign) {
      switch (settings.verticalAlign) {
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
  } else if (type === "column") {
    styles.height = "100%";
    styles.width = "100%";
    styles.position = "relative";

    if (settings.border) {
      styles.border = settings.border;
    }

    if (settings.borderRadius) {
      styles.borderRadius = `${settings.borderRadius}px`;
    }
  } else if (type === "section") {
    if (settings.backgroundImage) {
      styles.backgroundImage = `url(${settings.backgroundImage})`;
      styles.backgroundSize = "cover";
      styles.backgroundPosition = "center";
    }
  }

  return styles;
}

export function getSectionContainerClass(
  type: "regular" | "specialty" | "fullwidth"
): string {
  switch (type) {
    case "fullwidth":
      return "w-full";
    case "specialty":
      return "max-w-7xl mx-auto px-4";
    case "regular":
    default:
      return "max-w-6xl mx-auto px-4";
  }
}

export function getDefaultAddButtonLabel(
  type: "section" | "row" | "column"
): string {
  switch (type) {
    case "section":
      return "Add Section";
    case "row":
      return "Add Row";
    case "column":
      return "Add Element";
    default:
      return "Add";
  }
}

export function isPaddingActive(
  direction: "top" | "right" | "bottom" | "left",
  resizeDirection: ResizeDirection,
  hoveredPadding: "top" | "right" | "bottom" | "left" | null,
  linkedPaddingVertical: boolean,
  linkedPaddingHorizontal: boolean
): boolean {
  // Direct activation from hover or resize
  if (
    resizeDirection === `padding-${direction}` ||
    hoveredPadding === direction
  )
    return true;

  // Activation through linked sides
  if (linkedPaddingVertical) {
    if (
      (direction === "top" || direction === "bottom") &&
      (resizeDirection === "padding-top" ||
        resizeDirection === "padding-bottom" ||
        hoveredPadding === "top" ||
        hoveredPadding === "bottom")
    ) {
      return true;
    }
  }

  if (linkedPaddingHorizontal) {
    if (
      (direction === "left" || direction === "right") &&
      (resizeDirection === "padding-left" ||
        resizeDirection === "padding-right" ||
        hoveredPadding === "left" ||
        hoveredPadding === "right")
    ) {
      return true;
    }
  }

  return false;
}

export function isMarginActive(
  direction: "top" | "right" | "bottom" | "left",
  resizeDirection: ResizeDirection,
  hoveredMargin: "top" | "right" | "bottom" | "left" | null,
  linkedMarginVertical: boolean,
  linkedMarginHorizontal: boolean
): boolean {
  // Direct activation from hover or resize
  if (resizeDirection === `margin-${direction}` || hoveredMargin === direction)
    return true;

  // Activation through linked sides
  if (linkedMarginVertical) {
    if (
      (direction === "top" || direction === "bottom") &&
      (resizeDirection === "margin-top" ||
        resizeDirection === "margin-bottom" ||
        hoveredMargin === "top" ||
        hoveredMargin === "bottom")
    ) {
      return true;
    }
  }

  if (linkedMarginHorizontal) {
    if (
      (direction === "left" || direction === "right") &&
      (resizeDirection === "margin-left" ||
        resizeDirection === "margin-right" ||
        hoveredMargin === "left" ||
        hoveredMargin === "right")
    ) {
      return true;
    }
  }

  return false;
}
