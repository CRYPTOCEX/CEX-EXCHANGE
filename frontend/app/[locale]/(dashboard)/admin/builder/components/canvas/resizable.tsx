"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import React from "react";
import { useBuilderStore, BuilderRegistry } from "@/store/builder-store";
import ElementRenderer from "../renderers/elements";
import type { Element as ElementType } from "@/types/builder";
import {
  useBuilderHover,
  type HoverableElementType,
} from "./context/builder-hover-context";
import { cn } from "@/lib/utils";
import { Trash2, Copy, Link2, Unlink2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import StructureAddButton from "./structure/structure-add-button";
import ReorderControls from "./structure/reorder-controls";
import {
  getElementStyle,
  getStructureColorClasses,
  getStructureStyle,
  getDefaultAddButtonLabel,
  getResizePositionClasses,
} from "../utils";

// Types
export type ResizeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "padding-top"
  | "padding-right"
  | "padding-bottom"
  | "padding-left"
  | "margin-top"
  | "margin-right"
  | "margin-bottom"
  | "margin-left"
  | null;
export interface ResizeProps {
  direction: ResizeDirection;
  onMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
  className?: string;
  style?: React.CSSProperties;
}
export interface PaddingProps {
  settings: Record<string, any>;
  isSelected: boolean;
  isHovered: boolean | ((type: HoverableElementType, id: string) => boolean);
  type?: string;
  id?: string;
  resizeDirection: ResizeDirection;
  getPaddingHandleStyle: (
    direction: "top" | "right" | "bottom" | "left"
  ) => React.CSSProperties;
  handleMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
  linkedPaddingVertical: boolean;
  linkedPaddingHorizontal: boolean;
  togglePaddingLink: (
    axis: "vertical" | "horizontal",
    direction?: "top" | "right" | "bottom" | "left",
    e?: React.MouseEvent
  ) => void;
}
export interface MarginProps {
  settings: Record<string, any>;
  isSelected: boolean;
  isHovered: boolean | ((type: HoverableElementType, id: string) => boolean);
  type?: string;
  id?: string;
  resizeDirection: ResizeDirection;
  getMarginHandleStyle: (
    direction: "top" | "right" | "bottom" | "left"
  ) => React.CSSProperties;
  handleMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
  linkedMarginVertical: boolean;
  linkedMarginHorizontal: boolean;
  toggleMarginLink: (
    axis: "vertical" | "horizontal",
    direction?: "top" | "right" | "bottom" | "left",
    e?: React.MouseEvent
  ) => void;
}
export interface ResizableBaseProps {
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  settings: Record<string, any>;
  updateSettings: (key: string, value: any) => void;
  isStructure?: boolean;
  structureType?: "section" | "row" | "column";
  isEditMode?: boolean;
  children: (props: {
    elementRef: React.RefObject<HTMLDivElement | null>;
    isResizing: boolean;
    resizeDirection: ResizeDirection;
    showTooltip: boolean;
    tooltipContent: string;
    tooltipPosition: {
      x: number;
      y: number;
    };
    getCursorStyle: () => string;
    getPaddingHandleStyle: (
      direction: "top" | "right" | "bottom" | "left"
    ) => React.CSSProperties;
    getMarginHandleStyle: (
      direction: "top" | "right" | "bottom" | "left"
    ) => React.CSSProperties;
    handleMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
    linkedPaddingVertical: boolean;
    linkedPaddingHorizontal: boolean;
    togglePaddingLink: (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => void;
    linkedMarginVertical: boolean;
    linkedMarginHorizontal: boolean;
    toggleMarginLink: (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => void;
  }) => React.ReactNode;
}

/* ──────────────────────────────────────────────────────────────── */
/*                   Reusable Hooks & Components                   */
/* ──────────────────────────────────────────────────────────────── */

// A simple hook to force re-rendering
function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((tick) => tick + 1), []);
}

// A reusable component for rendering measurement labels (for both padding and margin)
interface MeasurementLabelProps {
  direction: "top" | "right" | "bottom" | "left";
  value: number;
  isActive: boolean;
  isLinked: boolean;
  variant: "padding" | "margin";
  toggleLink: (
    axis: "vertical" | "horizontal",
    direction: "top" | "right" | "bottom" | "left",
    e: React.MouseEvent
  ) => void;
}
const MeasurementLabel: React.FC<MeasurementLabelProps> = React.memo(
  ({ direction, value, isActive, isLinked, variant, toggleLink }) => {
    if (!isActive) return null;
    
    // Ensure value is a valid number
    const safeValue = Number(value) || 0;
    let labelPosition: React.CSSProperties = {};
    switch (direction) {
      case "top":
        labelPosition = {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
        break;
      case "right":
        labelPosition = {
          top: "50%",
          right: "50%",
          transform: "translate(50%, -50%)",
        };
        break;
      case "bottom":
        labelPosition = {
          bottom: "50%",
          left: "50%",
          transform: "translate(-50%, 50%)",
        };
        break;
      case "left":
        labelPosition = {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
        break;
    }
    // Use blue for padding and green for margin
    const valueColorClass =
      variant === "padding" ? "text-blue-500" : "text-green-500";
    const iconColorClass =
      variant === "padding" ? "text-blue-400" : "text-green-400";
    const axis =
      direction === "top" || direction === "bottom" ? "vertical" : "horizontal";
    return (
      <div
        className="absolute pointer-events-auto flex items-center gap-1 px-1 py-0.5 bg-white/90 dark:bg-zinc-900/90 rounded-sm shadow-sm border border-gray-200/50 dark:border-zinc-700/50 backdrop-blur-sm z-50"
        style={labelPosition}
      >
        <span className={`text-xs font-medium ${valueColorClass}`}>
          {Math.round(safeValue)}
        </span>
        <button
          onClick={(e) => toggleLink(axis, direction, e)}
          className={`w-3 h-3 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-sm transition-colors ${iconColorClass}`}
          title={`${isLinked ? "Unlink" : "Link"} ${axis} ${variant}`}
        >
          {isLinked ? (
            <Link2 className="w-2 h-2" />
          ) : (
            <Unlink2 className="w-2 h-2" />
          )}
        </button>
      </div>
    );
  }
);
MeasurementLabel.displayName = "MeasurementLabel";

/* ──────────────────────────────────────────────────────────────── */
/*                        ResizableBase Component                    */
/* ──────────────────────────────────────────────────────────────── */

export function ResizableBase({
  id,
  isSelected,
  onSelect,
  settings,
  updateSettings: propsUpdateSettings,
  isStructure = false,
  structureType,
  isEditMode = true,
  children,
}: ResizableBaseProps) {
  // Core resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0,
  });

  // Linking states
  const [linkedPaddingVertical, setLinkedPaddingVertical] = useState(false);
  const [linkedPaddingHorizontal, setLinkedPaddingHorizontal] = useState(false);
  const [linkedMarginVertical, setLinkedMarginVertical] = useState(false);
  const [linkedMarginHorizontal, setLinkedMarginHorizontal] = useState(false);

  // Refs for performance optimization
  const elementRef = useRef<HTMLDivElement>(null);
  const currentSettingsRef = useRef(settings);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const resizeDataRef = useRef<
    | {
        startPos: {
          x: number;
          y: number;
        };
        initialDimensions: {
          width: number;
          height: number;
          settings: Record<string, any>;
        };
        parentWidth: number;
      }
    | undefined
  >(undefined);

  // Keep the current settings ref updated
  useEffect(() => {
    currentSettingsRef.current = settings;
  }, [settings]);

  // Optimized batch update with requestAnimationFrame
  const updateSettingsBatch = useCallback(
    (newSettings: Record<string, any>) => {
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const currentSettings = {
          ...currentSettingsRef.current,
        };

        // Only update changed values
        const changedSettings: Record<string, any> = {};
        let hasChanges = false;
        Object.entries(newSettings).forEach(([key, value]) => {
          if (currentSettings[key] !== value) {
            changedSettings[key] = value;
            hasChanges = true;
          }
        });
        if (hasChanges) {
          // Update all changed settings at once
          Object.entries(changedSettings).forEach(([key, value]) => {
            propsUpdateSettings(key, value);
          });
        }
      });
    },
    [propsUpdateSettings]
  );

  // Initialize linked states based on settings
  useEffect(() => {
    // Check padding linking
    if (
      settings.paddingTop !== undefined &&
      settings.paddingBottom !== undefined
    ) {
      setLinkedPaddingVertical(
        Number(settings.paddingTop) === Number(settings.paddingBottom)
      );
    }
    if (
      settings.paddingLeft !== undefined &&
      settings.paddingRight !== undefined
    ) {
      setLinkedPaddingHorizontal(
        Number(settings.paddingLeft) === Number(settings.paddingRight)
      );
    }

    // Check margin linking
    if (
      settings.marginTop !== undefined &&
      settings.marginBottom !== undefined
    ) {
      setLinkedMarginVertical(
        Number(settings.marginTop) === Number(settings.marginBottom)
      );
    }
    if (
      settings.marginLeft !== undefined &&
      settings.marginRight !== undefined
    ) {
      setLinkedMarginHorizontal(
        Number(settings.marginLeft) === Number(settings.marginRight)
      );
    }
  }, [
    settings.paddingTop,
    settings.paddingBottom,
    settings.paddingLeft,
    settings.paddingRight,
    settings.marginTop,
    settings.marginBottom,
    settings.marginLeft,
    settings.marginRight,
  ]);

  // Toggle linking for padding
  const togglePaddingLink = useCallback(
    (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => {
      e?.stopPropagation();
      e?.preventDefault();
      const currentSettings = currentSettingsRef.current;
      if (axis === "vertical") {
        const newLinkedState = !linkedPaddingVertical;
        setLinkedPaddingVertical(newLinkedState);
        if (newLinkedState && direction) {
          const value =
            direction === "top"
              ? currentSettings.paddingTop || 0
              : currentSettings.paddingBottom || 0;
          updateSettingsBatch({
            paddingTop: value,
            paddingBottom: value,
          });
        }
      } else {
        const newLinkedState = !linkedPaddingHorizontal;
        setLinkedPaddingHorizontal(newLinkedState);
        if (newLinkedState && direction) {
          const value =
            direction === "left"
              ? currentSettings.paddingLeft || 0
              : currentSettings.paddingRight || 0;
          updateSettingsBatch({
            paddingLeft: value,
            paddingRight: value,
          });
        }
      }
    },
    [linkedPaddingVertical, linkedPaddingHorizontal, updateSettingsBatch]
  );

  // Toggle linking for margin
  const toggleMarginLink = useCallback(
    (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => {
      e?.stopPropagation();
      e?.preventDefault();
      const currentSettings = currentSettingsRef.current;
      if (axis === "vertical") {
        const newLinkedState = !linkedMarginVertical;
        setLinkedMarginVertical(newLinkedState);
        if (newLinkedState && direction) {
          const value =
            direction === "top"
              ? currentSettings.marginTop || 0
              : currentSettings.marginBottom || 0;
          updateSettingsBatch({
            marginTop: value,
            marginBottom: value,
          });
        }
      } else {
        const newLinkedState = !linkedMarginHorizontal;
        setLinkedMarginHorizontal(newLinkedState);
        if (newLinkedState && direction) {
          const value =
            direction === "left"
              ? currentSettings.marginLeft || 0
              : currentSettings.marginRight || 0;
          updateSettingsBatch({
            marginLeft: value,
            marginRight: value,
          });
        }
      }
    },
    [linkedMarginVertical, linkedMarginHorizontal, updateSettingsBatch]
  );

  // Optimized mouse move handler using RAF
  useEffect(() => {
    if (!isResizing || !resizeDirection || !resizeDataRef.current) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const { startPos, initialDimensions, parentWidth } =
          resizeDataRef.current!;
        const deltaX = e.clientX - startPos.x;
        const deltaY = e.clientY - startPos.y;
        const newSettings = {
          ...initialDimensions.settings,
        };

        // Handle different resize directions
        if (resizeDirection === "right") {
          const newWidth = Math.max(50, initialDimensions.width + deltaX);
          const currentUnit = settings.widthUnit || "%";
          if (currentUnit === "%") {
            const widthPercent =
              Math.round((newWidth / parentWidth) * 100 * 10) / 10;
            newSettings.width = `${widthPercent}%`;
            setTooltipContent(`Width: ${widthPercent}%`);
          } else if (currentUnit === "px") {
            newSettings.width = `${Math.round(newWidth)}px`;
            setTooltipContent(`Width: ${Math.round(newWidth)}px`);
          } else {
            const numericValue = Number.parseFloat(settings.width) || 100;
            const newValue = Math.max(10, numericValue + deltaX / 10);
            newSettings.width = `${Math.round(newValue)}${currentUnit}`;
            setTooltipContent(`Width: ${Math.round(newValue)}${currentUnit}`);
          }
        } else if (resizeDirection === "left") {
          const newWidth = Math.max(50, initialDimensions.width - deltaX);
          const currentUnit = settings.widthUnit || "%";
          if (currentUnit === "%") {
            const widthPercent =
              Math.round((newWidth / parentWidth) * 100 * 10) / 10;
            newSettings.width = `${widthPercent}%`;
            setTooltipContent(`Width: ${widthPercent}%`);
          } else if (currentUnit === "px") {
            newSettings.width = `${Math.round(newWidth)}px`;
            setTooltipContent(`Width: ${Math.round(newWidth)}px`);
          } else {
            const numericValue = Number.parseFloat(settings.width) || 100;
            const newValue = Math.max(10, numericValue - deltaX / 10);
            newSettings.width = `${Math.round(newValue)}${currentUnit}`;
            setTooltipContent(`Width: ${Math.round(newValue)}${currentUnit}`);
          }
        } else if (resizeDirection === "top") {
          const newHeight = Math.max(20, initialDimensions.height - deltaY);
          newSettings.height = `${newHeight}px`;
          setTooltipContent(`Height: ${newHeight}px`);
        } else if (resizeDirection === "bottom") {
          const newHeight = Math.max(20, initialDimensions.height + deltaY);
          newSettings.height = `${newHeight}px`;
          setTooltipContent(`Height: ${newHeight}px`);
        }

        // Handle padding resizing
        else if (resizeDirection === "padding-top") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.paddingTop || 0) + deltaY
          );
          newSettings.paddingTop = newValue;
          if (linkedPaddingVertical) newSettings.paddingBottom = newValue;
        } else if (resizeDirection === "padding-bottom") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.paddingBottom || 0) - deltaY
          );
          newSettings.paddingBottom = newValue;
          if (linkedPaddingVertical) newSettings.paddingTop = newValue;
        } else if (resizeDirection === "padding-right") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.paddingRight || 0) - deltaX
          );
          newSettings.paddingRight = newValue;
          if (linkedPaddingHorizontal) newSettings.paddingLeft = newValue;
        } else if (resizeDirection === "padding-left") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.paddingLeft || 0) + deltaX
          );
          newSettings.paddingLeft = newValue;
          if (linkedPaddingHorizontal) newSettings.paddingRight = newValue;
        }

        // Handle margin resizing
        else if (resizeDirection === "margin-top") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.marginTop || 0) - deltaY
          );
          newSettings.marginTop = newValue;
          if (linkedMarginVertical) newSettings.marginBottom = newValue;
        } else if (resizeDirection === "margin-bottom") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.marginBottom || 0) + deltaY
          );
          newSettings.marginBottom = newValue;
          if (linkedMarginVertical) newSettings.marginTop = newValue;
        } else if (resizeDirection === "margin-right") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.marginRight || 0) + deltaX
          );
          newSettings.marginRight = newValue;
          if (linkedMarginHorizontal) newSettings.marginLeft = newValue;
        } else if (resizeDirection === "margin-left") {
          const newValue = Math.max(
            0,
            (initialDimensions.settings.marginLeft || 0) - deltaX
          );
          newSettings.marginLeft = newValue;
          if (linkedMarginHorizontal) newSettings.marginRight = newValue;
        }

        // Update tooltip position
        setTooltipPosition({
          x: e.clientX,
          y: e.clientY,
        });

        // Apply settings
        updateSettingsBatch(newSettings);
      });
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      setShowTooltip(false);
      resizeDataRef.current = undefined;

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
    document.addEventListener("mousemove", handleMouseMove, {
      passive: false,
    });
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [
    isResizing,
    resizeDirection,
    settings.widthUnit,
    settings.width,
    linkedPaddingVertical,
    linkedPaddingHorizontal,
    linkedMarginVertical,
    linkedMarginHorizontal,
    updateSettingsBatch,
  ]);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection) => {
      e.stopPropagation();
      e.preventDefault();
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const parentWidth =
          elementRef.current.parentElement?.clientWidth || 1000;
        resizeDataRef.current = {
          startPos: {
            x: e.clientX,
            y: e.clientY,
          },
          initialDimensions: {
            width: rect.width,
            height: rect.height,
            settings: {
              ...settings,
            },
          },
          parentWidth,
        };
      }
      setIsResizing(true);
      setResizeDirection(direction);
      setShowTooltip(true);
      if (!isSelected) {
        onSelect();
      }
    },
    [elementRef, settings, isSelected, onSelect]
  );
  const getCursorStyle = useCallback(() => {
    switch (resizeDirection) {
      case "top":
      case "bottom":
        return "ns-resize";
      case "left":
      case "right":
        return "ew-resize";
      case "padding-top":
      case "padding-bottom":
      case "margin-top":
      case "margin-bottom":
        return "ns-resize";
      case "padding-left":
      case "padding-right":
      case "margin-left":
      case "margin-right":
        return "ew-resize";
      default:
        return "default";
    }
  }, [resizeDirection]);
  const getPaddingHandleStyle = useCallback(
    (direction: "top" | "right" | "bottom" | "left"): React.CSSProperties => {
      const paddingKey = `padding${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
      const paddingValue = settings[paddingKey] || 0;
      // Show padding area if element is selected AND the padding is explicitly set (including 0)
      const isActive = isSelected && (settings[paddingKey] !== undefined && settings[paddingKey] !== null);
      const baseStyle: React.CSSProperties = {
        position: "absolute",
        backgroundColor: isActive ? "rgba(59, 130, 246, 0.3)" : "transparent",
        border: isActive ? "1px solid rgb(59, 130, 246)" : "none",
        cursor: resizeDirection?.startsWith("padding")
          ? getCursorStyle()
          : "pointer",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
        zIndex: 10,
      };
      switch (direction) {
        case "top":
          return {
            ...baseStyle,
            top: 0,
            left: 0,
            right: 0,
            height: `${paddingValue}px`,
          };
        case "right":
          return {
            ...baseStyle,
            top: 0,
            right: 0,
            bottom: 0,
            width: `${paddingValue}px`,
          };
        case "bottom":
          return {
            ...baseStyle,
            bottom: 0,
            left: 0,
            right: 0,
            height: `${paddingValue}px`,
          };
        case "left":
          return {
            ...baseStyle,
            top: 0,
            left: 0,
            bottom: 0,
            width: `${paddingValue}px`,
          };
        default:
          return baseStyle;
      }
    },
    [settings, isSelected, resizeDirection, getCursorStyle]
  );
  const getMarginHandleStyle = useCallback(
    (direction: "top" | "right" | "bottom" | "left"): React.CSSProperties => {
      const marginKey = `margin${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
      const marginValue = settings[marginKey] || 0;
      // Show margin area if element is selected AND the margin is explicitly set (including 0)
      const isActive = isSelected && (settings[marginKey] !== undefined && settings[marginKey] !== null);
      const baseStyle: React.CSSProperties = {
        position: "absolute",
        backgroundColor: isActive ? "rgba(34, 197, 94, 0.2)" : "transparent",
        border: isActive ? "1px dashed rgb(34, 197, 94)" : "none",
        cursor: resizeDirection?.startsWith("margin")
          ? getCursorStyle()
          : "pointer",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
        zIndex: 5,
      };
      switch (direction) {
        case "top":
          return {
            ...baseStyle,
            top: `-${marginValue}px`,
            left: `-${settings.marginLeft || 0}px`,
            right: `-${settings.marginRight || 0}px`,
            height: `${marginValue}px`,
          };
        case "right":
          return {
            ...baseStyle,
            top: `-${settings.marginTop || 0}px`,
            right: `-${marginValue}px`,
            bottom: `-${settings.marginBottom || 0}px`,
            width: `${marginValue}px`,
          };
        case "bottom":
          return {
            ...baseStyle,
            bottom: `-${marginValue}px`,
            left: `-${settings.marginLeft || 0}px`,
            right: `-${settings.marginRight || 0}px`,
            height: `${marginValue}px`,
          };
        case "left":
          return {
            ...baseStyle,
            top: `-${settings.marginTop || 0}px`,
            left: `-${marginValue}px`,
            bottom: `-${settings.marginBottom || 0}px`,
            width: `${marginValue}px`,
          };
        default:
          return baseStyle;
      }
    },
    [settings, isSelected, resizeDirection, getCursorStyle]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // In preview mode, disable all editing features and return simple props
  if (!isEditMode) {
    return children({
      elementRef,
      isResizing: false,
      resizeDirection: null,
      showTooltip: false,
      tooltipContent: "",
      tooltipPosition: {
        x: 0,
        y: 0,
      },
      getCursorStyle: () => "default",
      getPaddingHandleStyle: () => ({}),
      getMarginHandleStyle: () => ({}),
      handleMouseDown: () => {},
      linkedPaddingVertical: false,
      linkedPaddingHorizontal: false,
      togglePaddingLink: () => {},
      linkedMarginVertical: false,
      linkedMarginHorizontal: false,
      toggleMarginLink: () => {},
    });
  }

  // In edit mode, return full editing capabilities
  return children({
    elementRef,
    isResizing,
    resizeDirection,
    showTooltip,
    tooltipContent,
    tooltipPosition,
    getCursorStyle,
    getPaddingHandleStyle,
    getMarginHandleStyle,
    handleMouseDown,
    linkedPaddingVertical,
    linkedPaddingHorizontal,
    togglePaddingLink,
    linkedMarginVertical,
    linkedMarginHorizontal,
    toggleMarginLink,
  });
}

/* ──────────────────────────────────────────────────────────────── */
/*                         Resize Component                          */
/* ──────────────────────────────────────────────────────────────── */
export function Resize({
  direction,
  onMouseDown,
  className,
  style,
}: ResizeProps) {
  return (
    <div
      className={`absolute bg-transparent hover:bg-purple-500 z-20 ${getResizePositionClasses(direction)} ${className || ""}`}
      style={style}
      onMouseDown={(e) => onMouseDown(e, direction)}
    />
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*                         Padding Component                         */
/* ──────────────────────────────────────────────────────────────── */
export const Padding = React.memo(function Padding({
  settings,
  isSelected,
  isHovered,
  type,
  id,
  resizeDirection,
  getPaddingHandleStyle,
  handleMouseDown,
  linkedPaddingVertical,
  linkedPaddingHorizontal,
  togglePaddingLink,
}: PaddingProps) {
  const [hoveredSide, setHoveredSide] = useState<
    "top" | "right" | "bottom" | "left" | null
  >(null);
  const paddingRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Function to get actual padding values from CSS
  const getActualPaddingValue = useCallback((side: "top" | "right" | "bottom" | "left"): number => {
    const paddingKey = `padding${side.charAt(0).toUpperCase() + side.slice(1)}`;
    const paddingValue = settings[paddingKey];
    
    // Return the actual padding value from settings, ensuring it's a number
    return Number(paddingValue) || 0;
  }, [settings]);

  // Memoized function to determine active state for a given side
  const isSideActive = useCallback(
    (side: "top" | "right" | "bottom" | "left"): boolean => {
      if (resizeDirection === `padding-${side}` || hoveredSide === side)
        return true;
      if (side === "top" || side === "bottom") {
        if (
          linkedPaddingVertical &&
          (resizeDirection === "padding-top" ||
            resizeDirection === "padding-bottom" ||
            hoveredSide === "top" ||
            hoveredSide === "bottom")
        )
          return true;
      }
      if (side === "left" || side === "right") {
        if (
          linkedPaddingHorizontal &&
          (resizeDirection === "padding-left" ||
            resizeDirection === "padding-right" ||
            hoveredSide === "left" ||
            hoveredSide === "right")
        )
          return true;
      }
      return false;
    },
    [
      resizeDirection,
      hoveredSide,
      linkedPaddingVertical,
      linkedPaddingHorizontal,
    ]
  );

  // Generate handle areas for each side
  const sides: Array<"top" | "right" | "bottom" | "left"> = [
    "top",
    "right",
    "bottom",
    "left",
  ];
  return isSelected ? (
    <>
      {sides.map((side) => {
        const rawValue = settings[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`];
        const settingsValue = Number(rawValue) || 0;
        const actualValue = getActualPaddingValue(side);
        return (
          <div
            key={side}
            ref={(el) => { paddingRefs.current[side] = el; }}
            className={`absolute cursor-${side === "top" || side === "bottom" ? "ns-resize" : "ew-resize"} z-10 pointer-events-auto transition-colors duration-150 ${isSideActive(side) ? "bg-blue-100/30" : "bg-transparent hover:bg-blue-100/20"}`}
            style={getPaddingHandleStyle(side)}
            onMouseDown={(e) =>
              handleMouseDown(e, `padding-${side}` as ResizeDirection)
            }
            onMouseEnter={() => setHoveredSide(side)}
            onMouseLeave={() => setHoveredSide(null)}
          >
            <MeasurementLabel
              direction={side}
              value={actualValue}
              isActive={isSideActive(side)}
              isLinked={
                side === "top" || side === "bottom"
                  ? linkedPaddingVertical
                  : linkedPaddingHorizontal
              }
              variant="padding"
              toggleLink={togglePaddingLink}
            />
          </div>
        );
      })}
      {/* Hover areas for adding new padding if none exists */}
      {sides.map((side) => {
        const key = `hover-${side}`;
        const paddingValue = settings[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`];
        // Only show hover area if padding is undefined or null (not if it's 0)
        if (paddingValue !== undefined && paddingValue !== null)
          return null;
        const commonClasses =
          "absolute hover:bg-blue-100/20 hover:border border-blue-500 cursor-" +
          (side === "top" || side === "bottom" ? "ns-resize" : "ew-resize") +
          " z-10 pointer-events-auto";
        let style: React.CSSProperties = {};
        if (side === "top")
          style = {
            top: 0,
            left: "4px",
            right: "4px",
            height: "4px",
          };
        if (side === "right")
          style = {
            top: "4px",
            right: 0,
            bottom: "4px",
            width: "4px",
          };
        if (side === "bottom")
          style = {
            bottom: 0,
            left: "4px",
            right: "4px",
            height: "4px",
          };
        if (side === "left")
          style = {
            top: "4px",
            left: 0,
            bottom: "4px",
            width: "4px",
          };
        return (
          <div
            key={key}
            className={commonClasses}
            onMouseDown={(e) =>
              handleMouseDown(e, `padding-${side}` as ResizeDirection)
            }
            onMouseEnter={() => setHoveredSide(side)}
            onMouseLeave={() => setHoveredSide(null)}
            style={style}
          />
        );
      })}
    </>
  ) : null;
});

/* ──────────────────────────────────────────────────────────────── */
/*                         Margin Component                          */
/* ──────────────────────────────────────────────────────────────── */
export const Margin = React.memo(function Margin({
  settings,
  isSelected,
  isHovered,
  type,
  id,
  resizeDirection,
  getMarginHandleStyle,
  handleMouseDown,
  linkedMarginVertical,
  linkedMarginHorizontal,
  toggleMarginLink,
}: MarginProps) {
  const [hoveredSide, setHoveredSide] = useState<
    "top" | "right" | "bottom" | "left" | null
  >(null);
  const forceUpdate = useForceUpdate();
  const marginRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    forceUpdate();
  }, [settings, forceUpdate]);
  
  const isSideActive = (side: "top" | "right" | "bottom" | "left"): boolean => {
    if (resizeDirection === `margin-${side}` || hoveredSide === side)
      return true;
    if (side === "top" || side === "bottom") {
      if (
        linkedMarginVertical &&
        (resizeDirection === "margin-top" ||
          resizeDirection === "margin-bottom" ||
          hoveredSide === "top" ||
          hoveredSide === "bottom")
      )
        return true;
    }
    if (side === "left" || side === "right") {
      if (
        linkedMarginHorizontal &&
        (resizeDirection === "margin-left" ||
          resizeDirection === "margin-right" ||
          hoveredSide === "left" ||
          hoveredSide === "right")
      )
        return true;
    }
    return false;
  };

  // Function to get actual margin values from CSS
  const getActualMarginValue = (side: "top" | "right" | "bottom" | "left"): number => {
    const marginKey = `margin${side.charAt(0).toUpperCase() + side.slice(1)}`;
    const marginValue = settings[marginKey];
    
    // Return the actual margin value from settings, ensuring it's a number
    // If marginValue is undefined, check if this is a text element and provide appropriate default
    if (marginValue === undefined || marginValue === null) {
      // For text elements, provide default marginBottom of 16px (matching template)
      if (side === "bottom" && (type === "text" || type === "heading" || type === "list" || type === "quote")) {
        return 16;
      }
      return 0;
    }
    
    return Number(marginValue) || 0;
  };

  // Only show horizontal margin handles if type is not "section"
  const shouldShowHorizontal = type !== "section";
  const sides: Array<"top" | "right" | "bottom" | "left"> = [
    "top",
    "right",
    "bottom",
    "left",
  ];
  return isSelected ? (
    <>
      {sides.map((side) => {
        // For non-section types, skip left/right margin handles if needed
        if ((side === "left" || side === "right") && !shouldShowHorizontal)
          return null;
        const rawValue = settings[`margin${side.charAt(0).toUpperCase() + side.slice(1)}`];
        const settingsValue = Number(rawValue) || 0;
        
        // Use actual margin value from settings
        const actualValue = getActualMarginValue(side);
        return (
          <div
            key={side}
            ref={(el) => { marginRefs.current[side] = el; }}
            className={`absolute cursor-${side === "top" || side === "bottom" ? "ns-resize" : "ew-resize"} z-10 pointer-events-auto transition-all duration-200 ${isSideActive(side) ? "bg-green-100/30" : "bg-transparent hover:bg-green-100/20"}`}
            style={getMarginHandleStyle(side)}
            onMouseDown={(e) =>
              handleMouseDown(e, `margin-${side}` as ResizeDirection)
            }
            onMouseEnter={() => setHoveredSide(side)}
            onMouseLeave={() => setHoveredSide(null)}
          >
            <MeasurementLabel
              direction={side}
              value={actualValue}
              isActive={isSideActive(side)}
              isLinked={
                side === "top" || side === "bottom"
                  ? linkedMarginVertical
                  : linkedMarginHorizontal
              }
              variant="margin"
              toggleLink={toggleMarginLink}
            />
          </div>
        );
      })}
      {sides.map((side) => {
        const marginValue = settings[`margin${side.charAt(0).toUpperCase() + side.slice(1)}`];
        // Only show hover area if margin is undefined or null (not if it's 0)
        if (marginValue !== undefined && marginValue !== null)
          return null;
        // For non-section types, skip left/right hover areas if needed
        if ((side === "left" || side === "right") && !shouldShowHorizontal)
          return null;
        const commonClasses =
          "absolute hover:bg-green-100/20 hover:border border-green-500/30 cursor-" +
          (side === "top" || side === "bottom" ? "ns-resize" : "ew-resize") +
          " z-10 pointer-events-auto";
        let style: React.CSSProperties = {};
        if (side === "top")
          style = {
            top: "-4px",
            left: 0,
            right: 0,
            height: "4px",
          };
        if (side === "right")
          style = {
            top: 0,
            right: "-4px",
            bottom: 0,
            width: "4px",
          };
        if (side === "bottom")
          style = {
            bottom: "-4px",
            left: 0,
            right: 0,
            height: "4px",
          };
        if (side === "left")
          style = {
            top: 0,
            left: "-4px",
            bottom: 0,
            width: "4px",
          };
        return (
          <div
            key={`hover-${side}`}
            className={commonClasses}
            onMouseDown={(e) =>
              handleMouseDown(e, `margin-${side}` as ResizeDirection)
            }
            onMouseEnter={() => setHoveredSide(side)}
            onMouseLeave={() => setHoveredSide(null)}
            style={style}
          />
        );
      })}
    </>
  ) : null;
});

/* ──────────────────────────────────────────────────────────────── */
/*                         Element Component                         */
/* ──────────────────────────────────────────────────────────────── */
export function Element({
  element,
  isSelected,
  onSelect,
  containerInfo,
}: {
  element: ElementType;
  isSelected: boolean;
  onSelect?: () => void;
  containerInfo?: {
    type: "column";
    sectionId: string;
    rowId: string;
    columnId: string;
  };
}) {
  const { updateElement, selectElement } = useBuilderStore();
  const { isHovered, setHoveredElement, clearHover } = useBuilderHover();
  const innerRef = useRef<HTMLDivElement>(null);
  const [isDirectlyHovered, setIsDirectlyHovered] = useState(false);
  const [isFirstElement, setIsFirstElement] = useState(false);
  const [isLastElement, setIsLastElement] = useState(false);

  useEffect(() => {
    if (!element.settings || Object.keys(element.settings).length === 0) {
      // Set appropriate defaults based on element type
      const isTextElement = ["text", "heading", "list", "quote", "link"].includes(element.type);
      const defaultSettings = {
        width: "100%",
        height: "auto",
        // Add proper margins for text elements
        ...(isTextElement && {
          marginBottom: 16,
          lineHeight: 1.5,
          minHeight: "1.2em",
        })
      };
      updateElement(element.id, {
        ...element,
        settings: defaultSettings,
      });
    }
  }, [element, updateElement]);

  const handleElementClick = (e?: React.MouseEvent) => {
    e && e.stopPropagation();
    if (containerInfo) {
      selectElement(element.id, {
        sectionId: containerInfo.sectionId,
        rowId: containerInfo.rowId,
        columnId: containerInfo.columnId,
      });
    } else {
      selectElement(element.id);
    }
    onSelect && onSelect();
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsDirectlyHovered(true);
    setHoveredElement("element" as HoverableElementType, element.id);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    setIsDirectlyHovered(false);
    if (
      e.relatedTarget &&
      innerRef.current &&
      e.relatedTarget instanceof Node &&
      !innerRef.current.contains(e.relatedTarget)
    ) {
      clearHover();
    }
  };

  const checkIsHovered = () => {
    if (typeof isHovered === "function") {
      return isHovered(
        "element" as unknown as HoverableElementType,
        element.id
      );
    }
    return false;
  };

  const hovered = checkIsHovered() || isDirectlyHovered;

  const handleDelete = () => {
    if (containerInfo) {
      useBuilderStore.getState().selectElement(element.id, {
        sectionId: containerInfo.sectionId,
        rowId: containerInfo.rowId,
        columnId: containerInfo.columnId,
      });
    }
    useBuilderStore.getState().deleteElement(element.id);
  };

  const handleDuplicate = () => {
    if (containerInfo) {
      useBuilderStore.getState().selectElement(element.id, {
        sectionId: containerInfo.sectionId,
        rowId: containerInfo.rowId,
        columnId: containerInfo.columnId,
      });
    }
    useBuilderStore.getState().duplicateElement(element.id);
  };

  useEffect(() => {
    if (containerInfo) {
      const registry = new BuilderRegistry(
        useBuilderStore.getState().page.sections
      );
      const columnInfo = registry.getColumn(containerInfo.columnId);
      if (columnInfo && columnInfo.column.elements) {
        const elements = columnInfo.column.elements;
        const elementIndex = elements.findIndex((el) => el.id === element.id);
        if (elementIndex !== -1) {
          setIsFirstElement(elementIndex === 0);
          setIsLastElement(elementIndex === elements.length - 1);
        }
      }
    }
  }, [element.id, containerInfo]);

  // Get isPreviewMode from store and negate it for isEditMode
  const isPreviewMode = useBuilderStore((state) => state.isPreviewMode);
  const isEditMode = !isPreviewMode;

  // Special handling for button elements - don't show the purple container
  if (element.type === "button") {
    return (
      <div
        onClick={handleElementClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative",
          isSelected && "outline outline-2 outline-purple-500",
          hovered &&
            !isSelected &&
            "outline outline-1 outline-dashed outline-gray-400"
        )}
      >
        <ElementRenderer element={element} isEditMode={isEditMode} />

        {(hovered || isSelected) && (
          <div
            className="absolute -top-2.5 right-1 z-30 flex items-center bg-purple-600 text-white text-xs rounded-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {containerInfo && (
              <ReorderControls
                onMoveUp={() => {
                  if (containerInfo) {
                    useBuilderStore
                      .getState()
                      .reorderElement(
                        element.id,
                        containerInfo.sectionId,
                        containerInfo.rowId,
                        containerInfo.columnId,
                        "up"
                      );
                  }
                }}
                onMoveDown={() => {
                  if (containerInfo) {
                    useBuilderStore
                      .getState()
                      .reorderElement(
                        element.id,
                        containerInfo.sectionId,
                        containerInfo.rowId,
                        containerInfo.columnId,
                        "down"
                      );
                  }
                }}
                isFirst={isFirstElement}
                isLast={isLastElement}
                color="purple"
              />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-1 hover:bg-purple-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-1 hover:bg-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )}

        {(hovered || isSelected) && (
          <div
            className="absolute -top-2.5 left-1 z-30 bg-purple-600 text-white text-xs py-[2px] px-2 rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              handleElementClick(e);
            }}
          >
            {element.type}
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ResizableBase
        id={element.id}
        isSelected={isSelected}
        onSelect={onSelect || (() => {})}
        settings={element.settings || {}}
        updateSettings={(key, value) => {
          updateElement(element.id, {
            ...element,
            settings: {
              ...element.settings,
              [key]: value,
            },
          });
        }}
      >
        {({
          elementRef,
          isResizing,
          resizeDirection,
          showTooltip,
          tooltipContent: resizeTooltipContent,
          tooltipPosition: resizeTooltipPos,
          getCursorStyle,
          getPaddingHandleStyle,
          getMarginHandleStyle,
          handleMouseDown,
          linkedPaddingVertical,
          linkedPaddingHorizontal,
          togglePaddingLink,
          linkedMarginVertical,
          linkedMarginHorizontal,
          toggleMarginLink,
        }) => {
          return (
            <div className="relative w-full">
              <div
                ref={(node) => {
                  if (node) {
                    elementRef.current = node;
                    innerRef.current = node;
                  }
                }}
                className={cn(
                  "relative transition-all duration-200 box-border w-full",
                  isSelected &&
                    "outline outline-2 outline-purple-500 pointer-events-auto",
                  hovered &&
                    !isSelected &&
                    "outline outline-1 outline-dashed outline-gray-400 pointer-events-auto",
                  !isSelected && !hovered && "pointer-events-auto"
                )}
                style={{
                  cursor: getCursorStyle(),
                  // Let the ElementRenderer handle all styling
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleElementClick}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("elementId", element.id);
                }}
              >
                {/* Control buttons */}
                {(hovered || isSelected) && (
                  <div
                    className="absolute -top-2.5 left-1 z-30 bg-purple-600 text-white text-xs py-[2px] px-2 rounded-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleElementClick(e);
                    }}
                  >
                    {element.type}
                  </div>
                )}
                {(hovered || isSelected) && (
                  <div
                    className="absolute -top-2.5 right-1 z-30 flex items-center bg-purple-600 text-white text-xs rounded-md overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {containerInfo && (
                      <ReorderControls
                        onMoveUp={() => {
                          if (containerInfo) {
                            useBuilderStore
                              .getState()
                              .reorderElement(
                                element.id,
                                containerInfo.sectionId,
                                containerInfo.rowId,
                                containerInfo.columnId,
                                "up"
                              );
                          }
                        }}
                        onMoveDown={() => {
                          if (containerInfo) {
                            useBuilderStore
                              .getState()
                              .reorderElement(
                                element.id,
                                containerInfo.sectionId,
                                containerInfo.rowId,
                                containerInfo.columnId,
                                "down"
                              );
                          }
                        }}
                        isFirst={isFirstElement}
                        isLast={isLastElement}
                        color="purple"
                      />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1 hover:bg-purple-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate();
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Duplicate</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1 hover:bg-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <div className="relative w-full h-full">
                  <ElementRenderer element={element} isEditMode={isEditMode} />
                </div>

                {/* Resize handles and other controls */}
                {isSelected && (
                  <>
                    <Resize direction="top" onMouseDown={handleMouseDown} />
                    <Resize direction="right" onMouseDown={handleMouseDown} />
                    <Resize direction="bottom" onMouseDown={handleMouseDown} />
                    <Resize direction="left" onMouseDown={handleMouseDown} />
                    <Padding
                      settings={element.settings || {}}
                      isSelected={isSelected}
                      isHovered={isHovered}
                      type="element"
                      id={element.id}
                      resizeDirection={resizeDirection}
                      getPaddingHandleStyle={getPaddingHandleStyle}
                      handleMouseDown={handleMouseDown}
                      linkedPaddingVertical={linkedPaddingVertical}
                      linkedPaddingHorizontal={linkedPaddingHorizontal}
                      togglePaddingLink={togglePaddingLink}
                    />
                    <Margin
                      settings={element.settings || {}}
                      isSelected={isSelected}
                      isHovered={isHovered}
                      type="element"
                      id={element.id}
                      resizeDirection={resizeDirection}
                      getMarginHandleStyle={getMarginHandleStyle}
                      handleMouseDown={handleMouseDown}
                      linkedMarginVertical={linkedMarginVertical}
                      linkedMarginHorizontal={linkedMarginHorizontal}
                      toggleMarginLink={toggleMarginLink}
                    />
                  </>
                )}
                {showTooltip && resizeDirection && (
                  <Tooltip open={true}>
                    <TooltipContent
                      side="top"
                      className="bg-gray-900 text-white px-3 py-2 rounded text-sm z-50 pointer-events-none shadow-md"
                      style={{
                        position: "fixed",
                        left: resizeTooltipPos.x + 10,
                        top: resizeTooltipPos.y + 10,
                      }}
                    >
                      {resizeTooltipContent}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        }}
      </ResizableBase>
    </TooltipProvider>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*                     ResizableStructure Component                  */
/* ──────────────────────────────────────────────────────────────── */
export function ResizableStructure({
  type,
  id,
  sectionId,
  rowId,
  isSelected,
  onSelect,
  onDelete,
  onAdd,
  addButtonPosition = "bottom",
  color,
  label,
  children,
  style,
  className,
  settings = {},
  updateSettings,
  addButtonLabel,
  extraControls,
}: {
  type: "section" | "row" | "column";
  id: string;
  sectionId?: string;
  rowId?: string;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onDelete?: () => void;
  onAdd?: (e?: React.MouseEvent) => void;
  addButtonPosition?: "top" | "right" | "bottom" | "left" | "center";
  color: "purple" | "blue" | "green" | "orange";
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  settings?: Record<string, any>;
  updateSettings: (key: string, value: any) => void;
  addButtonLabel?: string;
  extraControls?: React.ReactNode;
}) {
  const { isHovered, setHoveredElement, clearHover } = useBuilderHover();
  const innerRef = useRef<HTMLDivElement>(null);
  const [isDirectlyHovered, setIsDirectlyHovered] = useState(false);
  const structureColor = type === "column" ? "green" : color;
  const checkIsHovered = () => {
    if (typeof isHovered === "function") {
      return isHovered(type as unknown as HoverableElementType, id);
    }
    return false;
  };
  const hovered = checkIsHovered() || isDirectlyHovered;
  const colorClasses = getStructureColorClasses(structureColor);
  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsDirectlyHovered(true);
    setHoveredElement(type as HoverableElementType, id);
  };
  const handleMouseLeave = (e: React.MouseEvent) => {
    setIsDirectlyHovered(false);
    if (
      e.relatedTarget &&
      innerRef.current &&
      e.relatedTarget instanceof Node &&
      !innerRef.current.contains(e.relatedTarget)
    ) {
      clearHover();
    }
  };
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e);
  };
  const buttonLabel = addButtonLabel || getDefaultAddButtonLabel(type);
  const renderAddButton = () => {
    if (!onAdd) return null;
    return (
      <StructureAddButton
        position={addButtonPosition}
        color={structureColor}
        onClick={(e) => {
          e.stopPropagation();
          onAdd(e);
        }}
        isVisible={isSelected}
        size="sm"
        label={buttonLabel}
      />
    );
  };
  return (
    <TooltipProvider>
      <ResizableBase
        id={id}
        isSelected={isSelected}
        onSelect={onSelect}
        settings={settings}
        updateSettings={updateSettings}
        isStructure={true}
        structureType={type}
      >
        {({
          elementRef,
          isResizing,
          resizeDirection,
          showTooltip,
          tooltipContent,
          tooltipPosition,
          getCursorStyle,
          getPaddingHandleStyle,
          getMarginHandleStyle,
          handleMouseDown,
          linkedPaddingVertical,
          linkedPaddingHorizontal,
          togglePaddingLink,
          linkedMarginVertical,
          linkedMarginHorizontal,
          toggleMarginLink,
        }) => {
          return (
            <div
              ref={elementRef}
              className="relative"
              style={{
                cursor: getCursorStyle(),
                marginTop: settings.marginTop
                  ? `${settings.marginTop}px`
                  : undefined,
                marginRight: settings.marginRight
                  ? `${settings.marginRight}px`
                  : undefined,
                marginBottom: settings.marginBottom
                  ? `${settings.marginBottom}px`
                  : undefined,
                marginLeft: settings.marginLeft
                  ? `${settings.marginLeft}px`
                  : undefined,
              }}
            >
              <div
                ref={innerRef}
                className={cn(
                  "relative transition-all duration-200 box-border",
                  // Add default dark mode background for sections when no custom background is set
                  type === "section" && !settings.backgroundColor && "bg-white",
                  type === "section" &&
                    !settings.backgroundColor &&
                    "dark:bg-zinc-900",
                  isSelected && `outline outline-2 ${colorClasses.outline}`,
                  hovered &&
                    !isSelected &&
                    "outline outline-1 outline-dashed outline-zinc-400",
                  className
                )}
                style={{
                  ...style,
                  ...getStructureStyle(settings, type),
                  paddingTop: settings.paddingTop
                    ? `${settings.paddingTop}px`
                    : undefined,
                  paddingRight: settings.paddingRight
                    ? `${settings.paddingRight}px`
                    : undefined,
                  paddingBottom: settings.paddingBottom
                    ? `${settings.paddingBottom}px`
                    : undefined,
                  paddingLeft: settings.paddingLeft
                    ? `${settings.paddingLeft}px`
                    : undefined,
                  marginTop: undefined,
                  marginRight: undefined,
                  marginBottom: undefined,
                  marginLeft: undefined,
                  // Remove any background color from inline styles to let CSS classes control default backgrounds
                  backgroundColor: settings.backgroundColor
                    ? settings.backgroundColor
                    : undefined,
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              >
                {(hovered || isSelected) && (
                  <div
                    className={cn(
                      "absolute -top-2.5 left-1 z-20",
                      colorClasses.bg,
                      "text-white text-xs py-[2px] px-2 rounded-md"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(e);
                    }}
                  >
                    {label}
                  </div>
                )}
                {(hovered || isSelected) && (
                  <div
                    className={cn(
                      "absolute -top-2.5 right-1 z-20 flex items-center",
                      colorClasses.bg,
                      "text-white text-xs rounded-md overflow-hidden"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {extraControls}
                    {onDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="p-1 hover:bg-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete();
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
                {children}
              </div>
              {renderAddButton()}
              <Padding
                settings={settings}
                isSelected={isSelected}
                isHovered={isHovered}
                type={type}
                id={id}
                resizeDirection={resizeDirection}
                getPaddingHandleStyle={getPaddingHandleStyle}
                handleMouseDown={handleMouseDown}
                linkedPaddingVertical={linkedPaddingVertical}
                linkedPaddingHorizontal={linkedPaddingHorizontal}
                togglePaddingLink={togglePaddingLink}
              />
              <Margin
                settings={settings}
                isSelected={isSelected}
                isHovered={isHovered}
                type={type}
                id={id}
                resizeDirection={resizeDirection}
                getMarginHandleStyle={getMarginHandleStyle}
                handleMouseDown={handleMouseDown}
                linkedMarginVertical={linkedMarginVertical}
                linkedMarginHorizontal={linkedMarginHorizontal}
                toggleMarginLink={toggleMarginLink}
              />
              {showTooltip && resizeDirection && (
                <Tooltip open={true}>
                  <TooltipContent
                    side="top"
                    className="bg-zinc-900 text-white px-3 py-2 rounded text-sm z-50 pointer-events-none shadow-md"
                    style={{
                      position: "fixed",
                      left: tooltipPosition.x + 10,
                      top: tooltipPosition.y + 10,
                    }}
                  >
                    {tooltipContent}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        }}
      </ResizableBase>
    </TooltipProvider>
  );
}
