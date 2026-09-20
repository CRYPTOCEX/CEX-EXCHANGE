"use client";

import { m } from "framer-motion";
import type React from "react";
import { getIconPath } from "./utils";
import { FIELD_TONE } from "../field-tokens";

interface FieldCardProps {
  fieldType: {
    type: string;
    label: string;
    icon: React.ElementType;
    description: string;
    category: string;
    examples: string[];
  };
  handleAddField: (type: KycFieldType) => void;
  isHovered: boolean;
  setHovered: (type: string | null) => void;
  viewMode: "list" | "grid";
}

export function FieldCard({
  fieldType,
  handleAddField,
  isHovered,
  setHovered,
  viewMode,
}: FieldCardProps) {
  // Common event handlers
  const handleMouseEnter = () => setHovered(fieldType.type);
  const handleMouseLeave = () => setHovered(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const data = JSON.stringify({ fieldType: fieldType.type });
    e.dataTransfer.setData("text/plain", data);
    e.dataTransfer.effectAllowed = "copy";

    const dragImage = document.createElement("div");
    dragImage.className =
      "bg-card border border-primary rounded-lg p-2 flex items-center gap-2";
    dragImage.style.position = "fixed";
    dragImage.style.top = "-1000px";
    dragImage.style.left = "-1000px";
    dragImage.style.zIndex = "-1";
    dragImage.style.pointerEvents = "none";

    const iconDiv = document.createElement("div");
    iconDiv.className =
      "bg-primary/10 dark:bg-primary/20 p-2 rounded-md flex items-center justify-center";
    iconDiv.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-primary"><path d="${getIconPath(
      fieldType.type
    )}"></path></svg>`;

    const labelSpan = document.createElement("span");
    labelSpan.className = "text-sm font-medium";
    labelSpan.textContent = fieldType.label;

    dragImage.appendChild(iconDiv);
    dragImage.appendChild(labelSpan);

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 10, 10);

    requestAnimationFrame(() => {
      document.body.removeChild(dragImage);
    });
  };

  // Grouping common props for the container element
  const commonProps = {
    draggable: true,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onDragStartCapture: handleDragStart,
    onClick: () => handleAddField(fieldType.type as KycFieldType),
  };

  // Compute the container's CSS classes based on viewMode and hover state
  const containerClass =
    viewMode === "grid"
      ? `bg-muted  border ${
          isHovered ? "border-primary" : "border-transparent"
        } rounded-lg p-3 cursor-grab hover:border-primary transition-all relative overflow-hidden flex flex-col items-center justify-center aspect-square`
      : `bg-card border ${
          isHovered
            ? "border-primary shadow-md"
            : "border-border-strong"
        } rounded-lg p-3 cursor-grab hover:border-primary hover:shadow-md transition-all relative overflow-hidden group`;

  // A small subcomponent for the category indicator
  const CategoryIndicator = () => (
    <div
      className={`absolute top-0 left-0 w-1.5 h-full ${FIELD_TONE.rail}`}
    />
  );

  return (
    <m.div
      {...commonProps}
      whileHover={viewMode === "grid" ? { scale: 1.02 } : { scale: 1.01 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={containerClass}
    >
      {viewMode === "grid" ? (
        <>
          <CategoryIndicator />
          <div
            className={`w-12 h-12 mb-2 rounded-md flex items-center justify-center ${FIELD_TONE.chipOnStrip}`}
          >
            <fieldType.icon className="h-6 w-6" />
          </div>
          <span className="font-medium text-foreground text-center">
            {fieldType.label}
          </span>
          <span className="text-xs px-2 py-0.5 bg-card text-muted-foreground rounded-full mt-1">
            {fieldType.type}
          </span>
        </>
      ) : (
        <>
          <CategoryIndicator />
          <div className="flex items-start gap-3 pl-2">
            <div
              className={`${FIELD_TONE.chip} p-2 rounded-md flex-shrink-0 mt-0.5 transition-all duration-200`}
            >
              <fieldType.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {fieldType.label}
                </span>
                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                  {fieldType.type}
                </span>
              </div>
              <p className="text-xs text-subtle-foreground mt-1">
                {fieldType.description}
              </p>
              {fieldType.examples.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {fieldType.examples.map((example, index) => (
                    <span
                      key={index}
                      className="text-xs px-1.5 py-0.5 bg-muted text-subtle-foreground rounded border border-border-strong"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div
            className={`absolute inset-0 bg-primary/5 dark:bg-primary/15 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
              isHovered ? "opacity-100" : ""
            }`}
          />
        </>
      )}
    </m.div>
  );
}
