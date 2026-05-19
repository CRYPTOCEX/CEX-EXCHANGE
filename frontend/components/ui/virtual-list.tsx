"use client";

import React, { memo, useRef, forwardRef, useImperativeHandle } from "react";
import { useVirtualList, useVariableVirtualList } from "@/hooks/use-virtual-list";

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number, isScrolling: boolean) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  emptyState?: React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
}

export interface VirtualListHandle {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

function VirtualListInner<T>(
  {
    items,
    itemHeight,
    renderItem,
    className = "",
    style,
    overscan = 5,
    onEndReached,
    endReachedThreshold = 0.8,
    emptyState,
    keyExtractor,
  }: VirtualListProps<T>,
  ref: React.Ref<VirtualListHandle>
) {
  const {
    virtualItems,
    totalHeight,
    containerRef,
    handleScroll: baseHandleScroll,
    scrollToIndex,
    isScrolling,
  } = useVirtualList({
    items,
    itemHeight,
    overscan,
  });

  const lastEndReachedRef = useRef(false);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, behavior?: ScrollBehavior) => {
      scrollToIndex(index, behavior);
    },
    scrollToTop: (behavior?: ScrollBehavior) => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior });
      }
    },
    scrollToBottom: (behavior?: ScrollBehavior) => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: totalHeight, behavior });
      }
    },
  }));

  // Handle scroll with end-reached detection
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    baseHandleScroll(e);

    if (onEndReached) {
      const target = e.currentTarget;
      const scrollPosition = target.scrollTop + target.clientHeight;
      const threshold = totalHeight * endReachedThreshold;

      if (scrollPosition >= threshold && !lastEndReachedRef.current) {
        lastEndReachedRef.current = true;
        onEndReached();
      } else if (scrollPosition < threshold) {
        lastEndReachedRef.current = false;
      }
    }
  };

  if (items.length === 0 && emptyState) {
    return (
      <div className={className} style={style}>
        {emptyState}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={style}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: "relative",
        }}
      >
        {virtualItems.map(({ index, item, style: itemStyle }) => (
          <div
            key={keyExtractor ? keyExtractor(item, index) : index}
            style={itemStyle}
          >
            {renderItem(item, index, isScrolling)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Create a typed forwardRef component
export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> }
) => React.ReactElement;

// Optimized item wrapper with memo
export interface VirtualListItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const VirtualListItem = memo(function VirtualListItem({
  children,
  className = "",
  onClick,
  onMouseEnter,
  onMouseLeave,
}: VirtualListItemProps) {
  return (
    <div
      className={`h-full ${className}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
});

// Infinite scroll list component
export interface InfiniteVirtualListProps<T> extends VirtualListProps<T> {
  hasNextPage: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  loadingIndicator?: React.ReactNode;
}

function InfiniteVirtualListInner<T>(
  {
    items,
    itemHeight,
    renderItem,
    className = "",
    style,
    overscan = 5,
    hasNextPage,
    isLoadingMore,
    loadMore,
    loadingIndicator,
    emptyState,
    keyExtractor,
  }: InfiniteVirtualListProps<T>,
  ref: React.Ref<VirtualListHandle>
) {
  const handleEndReached = () => {
    if (hasNextPage && !isLoadingMore) {
      loadMore();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <VirtualList
        ref={ref}
        items={items}
        itemHeight={itemHeight}
        renderItem={renderItem}
        className={`flex-1 ${className}`}
        style={style}
        overscan={overscan}
        onEndReached={handleEndReached}
        endReachedThreshold={0.8}
        emptyState={emptyState}
        keyExtractor={keyExtractor}
      />
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          {loadingIndicator || (
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}

export const InfiniteVirtualList = forwardRef(InfiniteVirtualListInner) as <T>(
  props: InfiniteVirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> }
) => React.ReactElement;
