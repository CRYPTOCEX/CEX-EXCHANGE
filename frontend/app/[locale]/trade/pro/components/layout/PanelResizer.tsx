"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "../../utils/cn";

interface PanelResizerProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export function PanelResizer({
  direction,
  onResize,
  onResizeEnd,
}: PanelResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);
  const rafRef = useRef<number>();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startPosRef.current = direction === "horizontal" ? e.clientX : e.clientY;

      // Disable selection and iframe pointer events during drag
      document.body.style.userSelect = "none";
      document.querySelectorAll("iframe").forEach((iframe) => {
        iframe.style.pointerEvents = "none";
      });
    },
    [direction]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const currentPos =
          direction === "horizontal" ? e.clientX : e.clientY;
        const delta = currentPos - startPosRef.current;
        startPosRef.current = currentPos;
        onResize(delta);
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
      document.querySelectorAll("iframe").forEach((iframe) => {
        iframe.style.pointerEvents = "";
      });
      onResizeEnd?.();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isDragging, direction, onResize, onResizeEnd]);

  return (
    <div
      className={cn(
        "tp-resizer",
        direction === "horizontal"
          ? "w-1 cursor-col-resize"
          : "h-1 cursor-row-resize",
        "bg-transparent hover:bg-[var(--tp-blue)]/50",
        isDragging && "bg-[var(--tp-blue)]",
        "transition-colors",
        "z-10"
      )}
      onMouseDown={handleMouseDown}
    />
  );
}
