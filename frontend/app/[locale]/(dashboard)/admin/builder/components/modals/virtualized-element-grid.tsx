"use client";

import React, {
  memo,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { Box } from "lucide-react";
import { cn } from "@/lib/utils";
import ElementPreview from "../shared/element-preview";
import type { Element } from "@/types/builder";
import { useIntersectionObserver } from "../hooks/performance-hooks";
import { useTranslations } from "next-intl";

interface VirtualizedElementGridProps {
  elements: any[];
  onSelectElement: (element: Element) => void;
  columns?: number;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  element: any;
  top: number;
  height: number;
}

const ITEM_HEIGHT = 120; // Height of each grid item
const GAP = 12; // Gap between items
const ROW_HEIGHT = ITEM_HEIGHT + GAP;

// Memoized element item component
const ElementItem = memo(
  ({
    element,
    style,
    onSelect,
  }: {
    element: any;
    style: React.CSSProperties;
    onSelect: () => void;
  }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(
      elementRef as React.RefObject<HTMLElement>,
      { threshold: 0.1 }
    );

    return (
      <div
        ref={elementRef}
        style={style}
        className="group relative rounded-lg overflow-hidden border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all duration-300 cursor-pointer bg-white flex flex-col"
        onClick={onSelect}
      >
        {isVisible && (
          <>
            <div className="p-2 bg-white flex-1 flex items-center justify-center h-16 overflow-hidden">
              <ElementPreview type={element.id} settings={element.settings} />
            </div>
            <div className="p-1.5 border-t border-gray-100 bg-gray-50 flex items-center">
              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mr-2 shrink-0">
                {React.isValidElement(element.icon)
                  ? React.cloneElement(element.icon, {
                      className: "h-3 w-3",
                    })
                  : null}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-medium text-xs truncate">{element.name}</h3>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
);

ElementItem.displayName = "ElementItem";

export const VirtualizedElementGrid = memo<VirtualizedElementGridProps>(
  ({
    elements,
    onSelectElement,
    columns = 4,
    itemHeight = ITEM_HEIGHT,
    containerHeight = 600,
    overscan = 3,
  }) => {
    const t = useTranslations("dashboard");
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate virtual grid dimensions
    const { virtualItems, totalHeight } = useMemo(() => {
      if (elements.length === 0) {
        return { virtualItems: [], totalHeight: 0 };
      }

      const rowCount = Math.ceil(elements.length / columns);
      const totalHeight = rowCount * ROW_HEIGHT - GAP; // Remove last gap

      // Calculate visible range
      const visibleStart = Math.floor(scrollTop / ROW_HEIGHT);
      const visibleEnd = Math.min(
        rowCount,
        Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT)
      );

      // Add overscan for smooth scrolling
      const startIndex = Math.max(0, visibleStart - overscan);
      const endIndex = Math.min(rowCount, visibleEnd + overscan);

      // Generate virtual items
      const virtualItems: VirtualItem[] = [];

      for (let rowIndex = startIndex; rowIndex < endIndex; rowIndex++) {
        for (let colIndex = 0; colIndex < columns; colIndex++) {
          const elementIndex = rowIndex * columns + colIndex;

          if (elementIndex >= elements.length) break;

          virtualItems.push({
            index: elementIndex,
            element: elements[elementIndex],
            top: rowIndex * ROW_HEIGHT,
            height: itemHeight,
          });
        }
      }

      return { virtualItems, totalHeight };
    }, [elements, columns, scrollTop, containerHeight, itemHeight, overscan]);

    // Handle scroll events with throttling
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Handle element selection
    const handleSelectElement = useCallback(
      (template: any) => {
        // Find the template category
        const templateCategory = "text"; // Default fallback

        // Create element from template (you may need to import createElementFromTemplate)
        const element = {
          id: `element-${Date.now()}`,
          type: template.id,
          content: template.content || template.name,
          settings: template.settings || {},
        } as Element;

        onSelectElement(element);
      },
      [onSelectElement]
    );

    // Calculate item positions and styles
    const getItemStyle = useCallback(
      (virtualItem: VirtualItem): React.CSSProperties => {
        const rowIndex = Math.floor(virtualItem.index / columns);
        const colIndex = virtualItem.index % columns;

        return {
          position: "absolute",
          top: virtualItem.top,
          left: `${(colIndex / columns) * 100}%`,
          width: `${100 / columns}%`,
          height: itemHeight,
          padding: `0 ${GAP / 2}px`,
          boxSizing: "border-box",
        };
      },
      [columns, itemHeight]
    );

    if (elements.length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Box className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-base font-medium mb-1">
            {t("no_elements_match_your_search")}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            {t("try_adjusting_your_by_category")}.
          </p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="relative overflow-auto border rounded-lg"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Virtual container */}
        <div style={{ height: totalHeight, position: "relative" }}>
          {virtualItems.map((virtualItem) => (
            <ElementItem
              key={virtualItem.index}
              element={virtualItem.element}
              style={getItemStyle(virtualItem)}
              onSelect={() => handleSelectElement(virtualItem.element)}
            />
          ))}
        </div>
      </div>
    );
  }
);

VirtualizedElementGrid.displayName = "VirtualizedElementGrid";

// Hook for measuring element dimensions
export function useElementDimensions(elementRef: React.RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef]);

  return dimensions;
}

// Hook for virtual scrolling calculations
export function useVirtualScrolling(
  items: any[],
  containerHeight: number,
  itemHeight: number,
  columns: number = 1,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualData = useMemo(() => {
    const rowCount = Math.ceil(items.length / columns);
    const totalHeight = rowCount * itemHeight;

    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      rowCount,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(rowCount, visibleEnd + overscan);

    const visibleItems: Array<{
      index: number;
      item: any;
      top: number;
    }> = [];
    for (let i = startIndex; i < endIndex; i++) {
      for (let j = 0; j < columns; j++) {
        const itemIndex = i * columns + j;
        if (itemIndex < items.length) {
          visibleItems.push({
            index: itemIndex,
            item: items[itemIndex],
            top: i * itemHeight,
          });
        }
      }
    }

    return {
      visibleItems,
      totalHeight,
      scrollTop,
    };
  }, [items, scrollTop, containerHeight, itemHeight, columns, overscan]);

  return {
    ...virtualData,
    setScrollTop,
  };
}
