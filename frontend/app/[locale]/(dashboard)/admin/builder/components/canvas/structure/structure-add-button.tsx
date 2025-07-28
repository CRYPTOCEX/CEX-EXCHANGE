"use client";
import { useState } from "react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface StructureAddButtonProps {
  position: "top" | "right" | "bottom" | "left" | "center";
  color: "purple" | "blue" | "green" | "orange" | "gray" | "zinc";
  onClick: (e: React.MouseEvent) => void;
  isVisible: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

export default function StructureAddButton({
  position,
  color,
  onClick,
  isVisible,
  size = "md",
  label,
  rounded = "full",
}: StructureAddButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get color classes based on the color prop
  const getColorClasses = () => {
    switch (color) {
      case "purple":
        return {
          bg: "bg-purple-600",
          hover: "hover:bg-purple-700",
          ring: "group-hover:ring-purple-300",
        };
      case "blue":
        return {
          bg: "bg-blue-500",
          hover: "hover:bg-blue-600",
          ring: "group-hover:ring-blue-300",
        };
      case "green":
        return {
          bg: "bg-green-500",
          hover: "hover:bg-green-600",
          ring: "group-hover:ring-green-300",
        };
      case "orange":
        return {
          bg: "bg-orange-500",
          hover: "hover:bg-orange-600",
          ring: "group-hover:ring-orange-300",
        };
      case "gray":
      case "zinc":
        return {
          bg: "bg-zinc-700",
          hover: "hover:bg-zinc-800",
          ring: "group-hover:ring-zinc-300",
        };
      default:
        return {
          bg: "bg-purple-600",
          hover: "hover:bg-purple-700",
          ring: "group-hover:ring-purple-300",
        };
    }
  };

  const colorClasses = getColorClasses();

  // Get position classes
  const positionClasses = {
    top: "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
    right: "absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2",
    bottom: "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
    left: "absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2",
    center: "relative", // For proper tooltip positioning when centered
  };

  // Get size classes for consistent button styling
  const sizeClasses = {
    xs: {
      button: "p-1",
      icon: "h-2.5 w-2.5",
      ring: "group-hover:ring-1",
    },
    sm: {
      button: "p-1.5",
      icon: "h-3 w-3",
      ring: "group-hover:ring-1",
    },
    md: {
      button: "p-2.5",
      icon: "h-4 w-4",
      ring: "group-hover:ring-2",
    },
    lg: {
      button: "p-3.5",
      icon: "h-5 w-5",
      ring: "group-hover:ring-2",
    },
  };

  // Defensive fallback to ensure sizeClasses exists for the provided size
  const currentSizeClasses = sizeClasses[size] || sizeClasses["md"];

  // Mapping for rounded classes
  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <div
      className={cn(
        position !== "center"
          ? positionClasses[position]
          : positionClasses.center,
        "z-30 transition-all duration-300 group",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip - positioned directly above the button */}
      {label && isHovered && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-50 transition-opacity duration-200">
          {label}
        </div>
      )}

      <button
        className={cn(
          colorClasses.bg,
          colorClasses.hover,
          currentSizeClasses.button,
          roundedClasses[rounded],
          "text-white shadow-md transition-all duration-300",
          "ring-0 ring-offset-1",
          colorClasses.ring,
          currentSizeClasses.ring,
          "transform hover:scale-110"
        )}
        onClick={onClick}
        aria-label={label || "Add"}
      >
        <Plus className={currentSizeClasses.icon} />
      </button>
    </div>
  );
}
