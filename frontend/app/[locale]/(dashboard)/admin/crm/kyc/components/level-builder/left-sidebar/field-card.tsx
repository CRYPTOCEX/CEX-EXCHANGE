"use client";

import { motion } from "framer-motion";
import type React from "react";
import {
  getIconPath,
  getFieldTypeColor,
  getFieldTypeBgColor,
  getCategoryColor,
} from "./utils";

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
      "bg-white border border-primary shadow-sm rounded-md p-2 flex items-center gap-2";
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
      ? `bg-gray-100 dark:bg-zinc-900 border ${
          isHovered ? "border-primary" : "border-transparent"
        } rounded-lg p-3 cursor-grab hover:border-primary transition-all relative overflow-hidden flex flex-col items-center justify-center aspect-square`
      : `bg-white dark:bg-zinc-800/90 border ${
          isHovered
            ? "border-primary shadow-md dark:border-primary"
            : "border-gray-200 dark:border-zinc-700"
        } rounded-lg p-3 cursor-grab hover:border-primary dark:hover:border-primary hover:shadow-md transition-all relative overflow-hidden group`;

  // A small subcomponent for the category indicator
  const CategoryIndicator = () => (
    <div
      className={`absolute top-0 left-0 w-1.5 h-full ${getFieldTypeColor(fieldType.category)}`}
    />
  );

  return (
    <motion.div
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
            className={`w-12 h-12 mb-2 rounded-md flex items-center justify-center ${getFieldTypeBgColor(
              fieldType.category
            )}`}
          >
            <fieldType.icon
              className={`h-6 w-6 ${getCategoryColor(fieldType.category)}`}
            />
          </div>
          <span className="font-medium text-gray-800 dark:text-zinc-100 text-center">
            {fieldType.label}
          </span>
          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-full mt-1">
            {fieldType.type}
          </span>
        </>
      ) : (
        <>
          <CategoryIndicator />
          <div className="flex items-start gap-3 pl-2">
            <div
              className={`${getFieldTypeBgColor(
                fieldType.category
              )} p-2 rounded-md flex-shrink-0 mt-0.5 transition-all duration-200`}
            >
              <fieldType.icon
                className={`h-4 w-4 ${getCategoryColor(fieldType.category)}`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 dark:text-white">
                  {fieldType.label}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 rounded-full">
                  {fieldType.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-300 mt-1">
                {fieldType.description}
              </p>
              {fieldType.examples.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {fieldType.examples.map((example, index) => (
                    <span
                      key={index}
                      className="text-xs px-1.5 py-0.5 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-300 rounded border border-gray-200 dark:border-zinc-700"
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
    </motion.div>
  );
}
