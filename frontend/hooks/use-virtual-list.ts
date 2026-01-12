"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

export interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  overscan?: number; // Number of items to render outside visible area
  containerHeight?: number;
}

export interface VirtualListResult<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  isScrolling: boolean;
}

export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  containerHeight: initialContainerHeight,
}: VirtualListOptions<T>): VirtualListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight || 400);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total height of all items
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    // Initial measurement
    updateHeight();

    // Create resize observer
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    // Apply overscan
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(items.length - 1, startIndex + visibleCount + overscan);

    return {
      start: overscanStart,
      end: overscanEnd,
    };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  // Generate virtual items with positioning
  const virtualItems = useMemo(() => {
    const result: Array<{
      index: number;
      item: T;
      style: React.CSSProperties;
    }> = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i]) {
        result.push({
          index: i,
          item: items[i],
          style: {
            position: "absolute",
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          },
        });
      }
    }

    return result;
  }, [items, visibleRange, itemHeight]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }

    // Set scrolling to false after 150ms of no scroll
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;

    const targetScrollTop = index * itemHeight;
    container.scrollTo({
      top: targetScrollTop,
      behavior,
    });
  }, [itemHeight]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToIndex,
    isScrolling,
  };
}

// Optimized hook for variable height items (more complex use case)
export interface VariableVirtualListOptions<T> {
  items: T[];
  estimatedItemHeight: number;
  getItemHeight?: (item: T, index: number) => number;
  overscan?: number;
}

export function useVariableVirtualList<T>({
  items,
  estimatedItemHeight,
  getItemHeight,
  overscan = 5,
}: VariableVirtualListOptions<T>): VirtualListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cache measured heights
  const measuredHeightsRef = useRef<Map<number, number>>(new Map());

  // Calculate item offsets and total height
  const { offsets, totalHeight } = useMemo(() => {
    const itemOffsets: number[] = [];
    let runningOffset = 0;

    for (let i = 0; i < items.length; i++) {
      itemOffsets.push(runningOffset);
      const height = measuredHeightsRef.current.get(i)
        || (getItemHeight ? getItemHeight(items[i], i) : estimatedItemHeight);
      runningOffset += height;
    }

    return {
      offsets: itemOffsets,
      totalHeight: runningOffset,
    };
  }, [items, estimatedItemHeight, getItemHeight]);

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Binary search to find start index
  const findStartIndex = useCallback((scrollPosition: number) => {
    let low = 0;
    let high = offsets.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const offset = offsets[mid];

      if (offset < scrollPosition) {
        low = mid + 1;
      } else if (offset > scrollPosition) {
        high = mid - 1;
      } else {
        return mid;
      }
    }

    return Math.max(0, low - 1);
  }, [offsets]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = findStartIndex(scrollTop);

    // Find end index
    let endIndex = startIndex;
    let accumulatedHeight = 0;

    while (endIndex < items.length && accumulatedHeight < containerHeight) {
      const height = measuredHeightsRef.current.get(endIndex)
        || (getItemHeight ? getItemHeight(items[endIndex], endIndex) : estimatedItemHeight);
      accumulatedHeight += height;
      endIndex++;
    }

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan),
    };
  }, [scrollTop, containerHeight, items, estimatedItemHeight, getItemHeight, findStartIndex, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const result: Array<{
      index: number;
      item: T;
      style: React.CSSProperties;
    }> = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i]) {
        const height = measuredHeightsRef.current.get(i)
          || (getItemHeight ? getItemHeight(items[i], i) : estimatedItemHeight);

        result.push({
          index: i,
          item: items[i],
          style: {
            position: "absolute",
            top: offsets[i] || 0,
            left: 0,
            right: 0,
            height,
          },
        });
      }
    }

    return result;
  }, [items, visibleRange, offsets, estimatedItemHeight, getItemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setIsScrolling(true);

    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }

    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container || !offsets[index]) return;

    container.scrollTo({
      top: offsets[index],
      behavior,
    });
  }, [offsets]);

  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    handleScroll,
    scrollToIndex,
    isScrolling,
  };
}
