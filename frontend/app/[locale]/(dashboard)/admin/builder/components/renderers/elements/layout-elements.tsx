"use client";

import React, { memo, useMemo } from "react";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";

// Optimized Columns Element
export const ColumnsElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const columns = settings.columns || 2;
  const gap = settings.gap ?? 16;
  const distribution = settings.distribution || "equal";
  const columnWidths = useMemo(() => {
    if (distribution === "equal") {
      return Array(columns).fill(`${100 / columns}%`);
    }
    return Array(columns).fill("auto");
  }, [columns, distribution]);
  const containerStyle = useMemo(
    (): React.CSSProperties => ({
      gap: `${gap}px`,
    }),
    [gap]
  );
  const getColumnStyle = useMemo(
    () =>
      (width: string, index: number): React.CSSProperties => ({
        width:
          distribution === "equal"
            ? `calc(${width} - ${(gap * (columns - 1)) / columns}px)`
            : width,
      }),
    [distribution, gap, columns]
  );
  return (
    <div
      className={cn("w-full flex flex-wrap", gap === 0 ? "" : "gap-4")}
      style={containerStyle}
      data-element-id={element.id}
      data-element-type="columns"
    >
      {columnWidths.map((width, index) => {
        return (
          <div
            key={index}
            className="bg-gray-50 rounded p-4 flex items-center justify-center min-h-[100px]"
            style={getColumnStyle(width, index)}
          >
            <div className="text-gray-400 text-sm">Column {index + 1}</div>
          </div>
        );
      })}
    </div>
  );
});
ColumnsElement.displayName = "ColumnsElement";

// Optimized Container Element
export const ContainerElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const { borderRadius = 8, padding = 24 } = settings;
  const containerStyle = useMemo(
    (): React.CSSProperties => ({
      backgroundColor: "transparent",
      borderRadius: `${borderRadius}px`,
      padding: `${padding}px`,
    }),
    [borderRadius, padding]
  );
  return (
    <div
      className="w-full"
      style={containerStyle}
      data-element-id={element.id}
      data-element-type="container"
    >
      <div className="text-gray-500 text-center py-4">
        Container content goes here
      </div>
    </div>
  );
});
ContainerElement.displayName = "ContainerElement";

// Optimized Spacer Element
export const SpacerElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const height = settings.height || 50;
  const spacerStyle = useMemo(
    (): React.CSSProperties => ({
      height: `${height}px`,
    }),
    [height]
  );
  return (
    <div
      style={spacerStyle}
      className="w-full"
      data-element-id={element.id}
      data-element-type="spacer"
    />
  );
});
SpacerElement.displayName = "SpacerElement";

// Optimized Divider Element
export const DividerElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const { color = "gray", thickness = 1, style = "solid" } = settings;
  const dividerStyle = useMemo(
    (): React.CSSProperties => ({
      borderBottom: `${thickness}px ${style} ${color}`,
    }),
    [thickness, style, color]
  );
  return (
    <div
      className="w-full"
      style={dividerStyle}
      data-element-id={element.id}
      data-element-type="divider"
    />
  );
});
DividerElement.displayName = "DividerElement";
