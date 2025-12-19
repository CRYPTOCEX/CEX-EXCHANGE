"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageResizerProps {
  imageElement: HTMLImageElement;
  onResize: (width: number, height: number) => void;
  onResizeEnd: () => void;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
}

type ResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

const handlePositions: Record<
  ResizeHandle,
  { top?: string; bottom?: string; left?: string; right?: string; cursor: string }
> = {
  "top-left": { top: "-5px", left: "-5px", cursor: "nwse-resize" },
  top: { top: "-5px", left: "50%", cursor: "ns-resize" },
  "top-right": { top: "-5px", right: "-5px", cursor: "nesw-resize" },
  right: { top: "50%", right: "-5px", cursor: "ew-resize" },
  "bottom-right": { bottom: "-5px", right: "-5px", cursor: "nwse-resize" },
  bottom: { bottom: "-5px", left: "50%", cursor: "ns-resize" },
  "bottom-left": { bottom: "-5px", left: "-5px", cursor: "nesw-resize" },
  left: { top: "50%", left: "-5px", cursor: "ew-resize" },
};

// Corner handles maintain aspect ratio, edge handles control single dimension
const isCornerHandle = (handle: ResizeHandle) =>
  handle === "top-left" ||
  handle === "top-right" ||
  handle === "bottom-left" ||
  handle === "bottom-right";

export function ImageResizer({
  imageElement,
  onResize,
  onResizeEnd,
  minWidth = 50,
  minHeight = 50,
  maxWidth,
}: ImageResizerProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const aspectRatio = useRef(1);

  // Get the initial dimensions from the image
  useEffect(() => {
    if (imageElement) {
      const rect = imageElement.getBoundingClientRect();
      startSize.current = { width: rect.width, height: rect.height };
      setCurrentSize({ width: rect.width, height: rect.height });
      aspectRatio.current = rect.width / rect.height;
    }
  }, [imageElement]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = imageElement.getBoundingClientRect();
      startPos.current = { x: e.clientX, y: e.clientY };
      startSize.current = { width: rect.width, height: rect.height };
      aspectRatio.current = rect.width / rect.height;

      setIsResizing(true);
      setActiveHandle(handle);
    },
    [imageElement]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !activeHandle) return;

      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      let newWidth = startSize.current.width;
      let newHeight = startSize.current.height;

      // Calculate new dimensions based on which handle is being dragged
      // Edge handles: only change ONE dimension (width OR height independently)
      // Corner handles: maintain aspect ratio
      switch (activeHandle) {
        case "right":
          // Only change width
          newWidth = startSize.current.width + deltaX;
          break;
        case "left":
          // Only change width
          newWidth = startSize.current.width - deltaX;
          break;
        case "bottom":
          // Only change height
          newHeight = startSize.current.height + deltaY;
          break;
        case "top":
          // Only change height
          newHeight = startSize.current.height - deltaY;
          break;
        case "bottom-right":
          // Corner: use diagonal movement, maintain aspect ratio
          // Use the larger delta to determine scale
          const brDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aspectRatio.current;
          newWidth = startSize.current.width + brDelta;
          newHeight = newWidth / aspectRatio.current;
          break;
        case "bottom-left":
          const blDelta = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : deltaY * aspectRatio.current;
          newWidth = startSize.current.width + blDelta;
          newHeight = newWidth / aspectRatio.current;
          break;
        case "top-right":
          const trDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY * aspectRatio.current;
          newWidth = startSize.current.width + trDelta;
          newHeight = newWidth / aspectRatio.current;
          break;
        case "top-left":
          const tlDelta = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : -deltaY * aspectRatio.current;
          newWidth = startSize.current.width + tlDelta;
          newHeight = newWidth / aspectRatio.current;
          break;
      }

      // Apply constraints
      newWidth = Math.max(minWidth, newWidth);
      newHeight = Math.max(minHeight, newHeight);

      if (maxWidth) {
        if (newWidth > maxWidth) {
          const scale = maxWidth / newWidth;
          newWidth = maxWidth;
          // Only scale height for corner handles
          if (isCornerHandle(activeHandle)) {
            newHeight = newHeight * scale;
          }
        }
      }

      setCurrentSize({
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
      onResize(Math.round(newWidth), Math.round(newHeight));
    },
    [isResizing, activeHandle, minWidth, minHeight, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setActiveHandle(null);
      onResizeEnd();
    }
  }, [isResizing, onResizeEnd]);

  // Add global mouse event listeners when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      // Prevent text selection while resizing
      document.body.style.userSelect = "none";
      document.body.style.cursor = activeHandle
        ? handlePositions[activeHandle].cursor
        : "default";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp, activeHandle]);

  return (
    <>
      {/* Selection border */}
      <div className="absolute inset-0 border-2 border-primary rounded pointer-events-none" />

      {/* Resize handles */}
      {(Object.keys(handlePositions) as ResizeHandle[]).map((handle) => {
        const pos = handlePositions[handle];
        const isCorner = isCornerHandle(handle);

        return (
          <div
            key={handle}
            className={cn(
              "absolute z-10 bg-primary border-2 border-background shadow-sm transition-all",
              isCorner ? "w-3.5 h-3.5 rounded-sm" : "w-3 h-3 rounded-full",
              activeHandle === handle && "scale-110 bg-primary/90",
              // Always show all handles for better UX
              "hover:scale-110"
            )}
            style={{
              ...pos,
              transform:
                pos.left === "50%" || pos.top === "50%"
                  ? `translate(${pos.left === "50%" ? "-50%" : "0"}, ${pos.top === "50%" ? "-50%" : "0"})`
                  : undefined,
              cursor: pos.cursor,
            }}
            onMouseDown={(e) => handleMouseDown(e, handle)}
          />
        );
      })}

      {/* Size indicator while resizing */}
      {isResizing && (
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-popover border border-border rounded-md text-xs font-medium shadow-lg whitespace-nowrap z-20">
          {currentSize.width} × {currentSize.height}
        </div>
      )}
    </>
  );
}
