"use client";
import type React from "react";
import { useRef, useEffect } from "react";
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd";
import { HTML5Backend, getEmptyImage } from "react-dnd-html5-backend";
import { useBuilderStore } from "@/store/builder-store";
import {
  wouldCreateCircularReference,
  getDropTargetStyle,
  getDragPreviewStyle,
  calculateNewNestingLevel,
} from "../utils";

// ===== ITEM TYPES =====
export const ItemTypes = {
  SECTION: "section",
  ROW: "row",
  COLUMN: "column",
  ELEMENT: "element",
};

export interface DragItem {
  type: string;
  id: string;
  sectionId?: string;
  rowId?: string;
  columnId?: string;
  parentColumnId?: string;
  nestingLevel?: number;
  index?: number;
}

/* ──────────────────────────────────────────────────────────────── */
/*                   Reusable Custom Hooks                         */
/* ──────────────────────────────────────────────────────────────── */

/**
 * useCustomDrag
 *
 * A custom hook to create a drag source that:
 * - Sets up the drag properties using useDrag.
 * - Automatically uses an empty image as the drag preview.
 * - Returns a ref along with the isDragging flag.
 */
function useCustomDrag<T extends DragItem>(
  type: string,
  createItem: () => T,
  canDrag = true
) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag, preview] = useDrag({
    type,
    item: createItem,
    canDrag: () => canDrag,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  drag(ref);
  return { ref, isDragging };
}

/**
 * useCustomDrop
 *
 * A custom hook to create a drop target that accepts a list of types,
 * receives the computed values (isOver and canDrop), and applies a custom drop callback.
 */
function useCustomDrop(
  accept: string | string[],
  canDropFn: (item: DragItem) => boolean,
  onDrop: (item: DragItem) => any
) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, drop] = useDrop({
    accept,
    canDrop: canDropFn,
    drop: onDrop,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Connect the drop to our ref
  useEffect(() => {
    if (dropRef.current) {
      drop(dropRef);
    }
  }, [drop]);

  return { isOver, canDrop, dropRef };
}

/* ──────────────────────────────────────────────────────────────── */
/*                       DND PROVIDER & DRAG LAYER                   */
/* ──────────────────────────────────────────────────────────────── */
export function DragAndDropProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
}

export function CustomDragLayer() {
  const { item, itemType, initialOffset, currentOffset, isDragging } =
    useDragLayer((monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
    }));

  if (!isDragging || !currentOffset || !initialOffset) {
    return null;
  }

  const { x, y } = currentOffset;

  const getItemLabel = () => {
    switch (itemType) {
      case ItemTypes.SECTION:
        return "Section";
      case ItemTypes.ROW:
        return `Row${item.nestingLevel > 1 ? ` (Nested Level ${item.nestingLevel})` : ""}`;
      case ItemTypes.COLUMN:
        return `Column${item.nestingLevel > 1 ? ` (Nested Level ${item.nestingLevel})` : ""}`;
      case ItemTypes.ELEMENT:
        return "Element";
      default:
        return "Unknown";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 100,
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <div
        style={{
          ...getDragPreviewStyle(itemType as string),
          padding: "8px 12px",
          minWidth: "120px",
          maxWidth: "200px",
          textAlign: "center",
          color: "#333",
          fontWeight: 500,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {getItemLabel()}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*                          DRAG SOURCES                             */
/* ──────────────────────────────────────────────────────────────── */

// BaseDragSource type is used by all drag source components.
interface BaseDragSourceProps {
  id: string;
  index: number;
  children: React.ReactNode;
  className?: string;
}

export function SectionDragSource({
  id,
  index,
  children,
  className,
}: BaseDragSourceProps) {
  // Sections are not actually draggable; we set canDrag to false.
  const { ref, isDragging } = useCustomDrag(
    ItemTypes.SECTION,
    () => ({ type: ItemTypes.SECTION, id, index }),
    false
  );
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {children}
    </div>
  );
}

interface RowDragSourceProps extends BaseDragSourceProps {
  sectionId: string;
  parentColumnId?: string;
  nestingLevel: number;
}
export function RowDragSource({
  id,
  sectionId,
  parentColumnId,
  nestingLevel,
  index,
  children,
  className,
}: RowDragSourceProps) {
  const { ref, isDragging } = useCustomDrag(ItemTypes.ROW, () => ({
    type: ItemTypes.ROW,
    id,
    sectionId,
    parentColumnId,
    nestingLevel,
    index,
  }));
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: "move" }}
    >
      {children}
    </div>
  );
}

interface ColumnDragSourceProps extends BaseDragSourceProps {
  sectionId: string;
  rowId: string;
  parentRowId?: string;
  nestingLevel: number;
}
export function ColumnDragSource({
  id,
  sectionId,
  rowId,
  parentRowId,
  nestingLevel,
  index,
  children,
  className,
}: ColumnDragSourceProps) {
  const { ref, isDragging } = useCustomDrag(ItemTypes.COLUMN, () => ({
    type: ItemTypes.COLUMN,
    id,
    sectionId,
    rowId,
    parentColumnId: parentRowId ? rowId : undefined,
    nestingLevel,
    index,
  }));
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: "move" }}
    >
      {children}
    </div>
  );
}

interface ElementDragSourceProps extends BaseDragSourceProps {
  sectionId: string;
  rowId: string;
  columnId: string;
}
export function ElementDragSource({
  id,
  sectionId,
  rowId,
  columnId,
  index,
  children,
  className,
}: ElementDragSourceProps) {
  const { ref, isDragging } = useCustomDrag(ItemTypes.ELEMENT, () => ({
    type: ItemTypes.ELEMENT,
    id,
    sectionId,
    rowId,
    columnId,
    index,
  }));
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: "move" }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*                          DROP TARGETS                             */
/* ──────────────────────────────────────────────────────────────── */

interface BaseDropTargetProps {
  id: string;
  index: number;
  children: React.ReactNode;
  className?: string;
}

/** SectionDropTarget – sections are not droppable (only reordered via buttons) */
export function SectionDropTarget({
  id,
  index,
  children,
  className,
}: BaseDropTargetProps) {
  const { isOver, canDrop, dropRef } = useCustomDrop(
    ItemTypes.SECTION,
    () => false, // cannot drop on sections
    () => {}
  );

  const showDropIndicator = isOver && canDrop;

  return (
    <div
      ref={dropRef}
      className={className}
      style={{
        ...(showDropIndicator
          ? getDropTargetStyle(isOver, canDrop, "section")
          : {}),
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

interface RowDropTargetProps extends BaseDropTargetProps {
  sectionId: string;
  parentColumnId?: string;
  nestingLevel: number;
}
export function RowDropTarget({
  id,
  sectionId,
  parentColumnId,
  nestingLevel,
  index,
  children,
  className,
}: RowDropTargetProps) {
  const { page, moveRow, moveColumn } = useBuilderStore();
  const { isOver, canDrop, dropRef } = useCustomDrop(
    [ItemTypes.ROW, ItemTypes.COLUMN, ItemTypes.ELEMENT],
    (item: DragItem) => {
      if (item.type === ItemTypes.ROW && item.id === id) return false;
      if (
        item.type === ItemTypes.ROW &&
        item.sectionId === sectionId &&
        item.parentColumnId === parentColumnId
      )
        return false;
      if (
        wouldCreateCircularReference(
          item,
          { type: "row", id, sectionId, parentColumnId },
          page.sections
        )
      )
        return false;
      if (item.type === ItemTypes.ROW && nestingLevel >= 2) return false;
      return true;
    },
    (item: DragItem) => {
      if (item.type === ItemTypes.ROW) {
        moveRow(
          item.id,
          item.sectionId!,
          item.parentColumnId,
          sectionId,
          parentColumnId,
          index
        );
      } else if (item.type === ItemTypes.COLUMN) {
        moveColumn(
          item.id,
          item.sectionId!,
          item.rowId!,
          item.parentColumnId,
          sectionId,
          id,
          parentColumnId,
          0
        );
      }
      // ELEMENT drop is handled by ColumnDropTarget
      return { id, type: "row" };
    }
  );

  const showDropIndicator = isOver && canDrop;

  return (
    <div
      ref={dropRef}
      className={className}
      style={{
        ...(showDropIndicator
          ? getDropTargetStyle(isOver, canDrop, "row")
          : {}),
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

interface ColumnDropTargetProps extends BaseDropTargetProps {
  sectionId: string;
  rowId: string;
  parentRowId?: string;
  nestingLevel: number;
}
export function ColumnDropTarget({
  id,
  sectionId,
  rowId,
  parentRowId,
  nestingLevel,
  index,
  children,
  className,
}: ColumnDropTargetProps) {
  const { page, moveColumn, moveRow, moveElement } = useBuilderStore();
  const { isOver, canDrop, dropRef } = useCustomDrop(
    [ItemTypes.COLUMN, ItemTypes.ROW, ItemTypes.ELEMENT],
    (item: DragItem) => {
      if (item.type === ItemTypes.COLUMN && item.id === id) return false;
      if (item.type === ItemTypes.COLUMN && item.rowId === rowId) return false;
      if (
        item.type === ItemTypes.ROW &&
        item.sectionId === sectionId &&
        item.parentColumnId === parentRowId
      )
        return false;
      if (
        wouldCreateCircularReference(
          item,
          { type: "column", id, sectionId, rowId, parentColumnId: parentRowId },
          page.sections
        )
      )
        return false;
      if (item.type === ItemTypes.COLUMN && nestingLevel >= 2) return false;
      if (item.type === ItemTypes.ROW) {
        const newNestingLevel = calculateNewNestingLevel(
          { type: "row", nestingLevel: item.nestingLevel },
          { type: "column", nestingLevel }
        );
        if (newNestingLevel > 2) return false;
      }
      return true;
    },
    (item: DragItem) => {
      if (item.type === ItemTypes.COLUMN) {
        moveColumn(
          item.id,
          item.sectionId!,
          item.rowId!,
          item.parentColumnId,
          sectionId,
          rowId,
          parentRowId,
          index
        );
      } else if (item.type === ItemTypes.ROW) {
        moveRow(
          item.id,
          item.sectionId!,
          item.parentColumnId,
          sectionId,
          id,
          0
        );
      } else if (item.type === ItemTypes.ELEMENT) {
        moveElement(
          item.id,
          item.sectionId!,
          item.rowId!,
          item.columnId!,
          sectionId,
          rowId,
          id,
          0
        );
      }
      return { id, type: "column" };
    }
  );

  const showDropIndicator = isOver && canDrop;

  return (
    <div
      ref={dropRef}
      className={className}
      style={{
        ...(showDropIndicator
          ? getDropTargetStyle(isOver, canDrop, "column")
          : {}),
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

interface ElementDropTargetProps extends BaseDropTargetProps {
  sectionId: string;
  rowId: string;
  columnId: string;
}
export function ElementDropTarget({
  id,
  sectionId,
  rowId,
  columnId,
  index,
  children,
  className,
}: ElementDropTargetProps) {
  const { moveElement } = useBuilderStore();
  const { isOver, canDrop, dropRef } = useCustomDrop(
    ItemTypes.ELEMENT,
    (item: DragItem) => {
      if (item.id === id) return false;
      if (item.columnId === columnId) return false;
      return true;
    },
    (item: DragItem) => {
      if (item.type === ItemTypes.ELEMENT) {
        moveElement(
          item.id,
          item.sectionId!,
          item.rowId!,
          item.columnId!,
          sectionId,
          rowId,
          columnId,
          index
        );
      }
      return { id, type: "element" };
    }
  );

  const showDropIndicator = isOver && canDrop;

  return (
    <div
      ref={dropRef}
      className={className}
      style={{
        ...(showDropIndicator
          ? getDropTargetStyle(isOver, canDrop, "element")
          : {}),
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
