"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useBuilderStore } from "@/store/builder-store";
import type { ResizeDirection } from "../types";

// A simple hook to force re-rendering
export function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((tick) => tick + 1), []);
}

export function useResize(
  id: string,
  settings: Record<string, any>,
  updateSettings: (key: string, value: any) => void,
  isStructure: boolean = false,
  structureType?: "section" | "row" | "column"
) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const startMousePos = useRef({ x: 0, y: 0 });
  const startValue = useRef(0);
  const forceUpdate = useForceUpdate();

  // Local state for linked properties (these are managed per element, not globally)
  const [linkedPaddingVertical, setLinkedPaddingVertical] = useState(false);
  const [linkedPaddingHorizontal, setLinkedPaddingHorizontal] = useState(false);
  const [linkedMarginVertical, setLinkedMarginVertical] = useState(false);
  const [linkedMarginHorizontal, setLinkedMarginHorizontal] = useState(false);

  // Sync linked states with current settings
  useEffect(() => {
    setLinkedPaddingVertical(
      Number(settings.paddingTop) === Number(settings.paddingBottom)
    );
    setLinkedPaddingHorizontal(
      Number(settings.paddingLeft) === Number(settings.paddingRight)
    );
    setLinkedMarginVertical(
      Number(settings.marginTop) === Number(settings.marginBottom)
    );
    setLinkedMarginHorizontal(
      Number(settings.marginLeft) === Number(settings.marginRight)
    );
  }, [settings]);

  // Toggle functions
  const togglePaddingLink = useCallback(
    (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (axis === "vertical") {
        const newLinkedState = !linkedPaddingVertical;
        setLinkedPaddingVertical(newLinkedState);

        if (newLinkedState) {
          const avgValue = Math.round(
            (Number(settings.paddingTop || 0) +
              Number(settings.paddingBottom || 0)) /
              2
          );
          updateSettings("paddingTop", avgValue);
          updateSettings("paddingBottom", avgValue);
        }
      } else {
        const newLinkedState = !linkedPaddingHorizontal;
        setLinkedPaddingHorizontal(newLinkedState);

        if (newLinkedState) {
          const avgValue = Math.round(
            (Number(settings.paddingLeft || 0) +
              Number(settings.paddingRight || 0)) /
              2
          );
          updateSettings("paddingLeft", avgValue);
          updateSettings("paddingRight", avgValue);
        }
      }
    },
    [linkedPaddingVertical, linkedPaddingHorizontal, settings, updateSettings]
  );

  const toggleMarginLink = useCallback(
    (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (axis === "vertical") {
        const newLinkedState = !linkedMarginVertical;
        setLinkedMarginVertical(newLinkedState);

        if (newLinkedState) {
          const avgValue = Math.round(
            (Number(settings.marginTop || 0) +
              Number(settings.marginBottom || 0)) /
              2
          );
          updateSettings("marginTop", avgValue);
          updateSettings("marginBottom", avgValue);
        }
      } else {
        const newLinkedState = !linkedMarginHorizontal;
        setLinkedMarginHorizontal(newLinkedState);

        if (newLinkedState) {
          const avgValue = Math.round(
            (Number(settings.marginLeft || 0) +
              Number(settings.marginRight || 0)) /
              2
          );
          updateSettings("marginLeft", avgValue);
          updateSettings("marginRight", avgValue);
        }
      }
    },
    [linkedMarginVertical, linkedMarginHorizontal, settings, updateSettings]
  );

  // Enhanced mouse move handler with performance optimizations
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeDirection) return;

      const deltaX = e.clientX - startMousePos.current.x;
      const deltaY = e.clientY - startMousePos.current.y;

      let newValue = startValue.current;

      switch (resizeDirection) {
        case "top":
        case "padding-top":
        case "margin-top":
          newValue = Math.max(0, startValue.current - deltaY);
          break;
        case "bottom":
        case "padding-bottom":
        case "margin-bottom":
          newValue = Math.max(0, startValue.current + deltaY);
          break;
        case "left":
        case "padding-left":
        case "margin-left":
          newValue = Math.max(0, startValue.current - deltaX);
          break;
        case "right":
        case "padding-right":
        case "margin-right":
          newValue = Math.max(0, startValue.current + deltaX);
          break;
      }

      const roundedValue = Math.round(newValue);

      // Update tooltip
      setTooltipContent(`${roundedValue}px`);
      setTooltipPosition({ x: e.clientX, y: e.clientY });

      // Apply linked updates
      if (resizeDirection.includes("padding")) {
        const direction = resizeDirection.replace("padding-", "") as
          | "top"
          | "right"
          | "bottom"
          | "left";

        if (
          (direction === "top" || direction === "bottom") &&
          linkedPaddingVertical
        ) {
          updateSettings("paddingTop", roundedValue);
          updateSettings("paddingBottom", roundedValue);
        } else if (
          (direction === "left" || direction === "right") &&
          linkedPaddingHorizontal
        ) {
          updateSettings("paddingLeft", roundedValue);
          updateSettings("paddingRight", roundedValue);
        } else {
          updateSettings(
            `padding${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
            roundedValue
          );
        }
      } else if (resizeDirection.includes("margin")) {
        const direction = resizeDirection.replace("margin-", "") as
          | "top"
          | "right"
          | "bottom"
          | "left";

        if (
          (direction === "top" || direction === "bottom") &&
          linkedMarginVertical
        ) {
          updateSettings("marginTop", roundedValue);
          updateSettings("marginBottom", roundedValue);
        } else if (
          (direction === "left" || direction === "right") &&
          linkedMarginHorizontal
        ) {
          updateSettings("marginLeft", roundedValue);
          updateSettings("marginRight", roundedValue);
        } else {
          updateSettings(
            `margin${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
            roundedValue
          );
        }
      } else {
        // Direct dimension resize
        updateSettings(resizeDirection, roundedValue);
      }
    },
    [
      isResizing,
      resizeDirection,
      linkedPaddingVertical,
      linkedPaddingHorizontal,
      linkedMarginVertical,
      linkedMarginHorizontal,
      updateSettings,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
    setShowTooltip(false);
    setTooltipContent("");
    forceUpdate();
  }, [forceUpdate]);

  // Event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection) => {
      if (!direction) return;

      e.preventDefault();
      e.stopPropagation();

      startMousePos.current = { x: e.clientX, y: e.clientY };

      // Get starting value
      if (direction.includes("padding")) {
        const paddingDirection = direction.replace("padding-", "");
        startValue.current =
          settings[
            `padding${paddingDirection.charAt(0).toUpperCase() + paddingDirection.slice(1)}`
          ] || 0;
      } else if (direction.includes("margin")) {
        const marginDirection = direction.replace("margin-", "");
        startValue.current =
          settings[
            `margin${marginDirection.charAt(0).toUpperCase() + marginDirection.slice(1)}`
          ] || 0;
      } else {
        startValue.current = settings[direction] || 0;
      }

      setIsResizing(true);
      setResizeDirection(direction);
      setShowTooltip(true);
      setTooltipContent(`${startValue.current}px`);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    },
    [settings]
  );

  const getCursorStyle = useCallback(() => {
    if (!resizeDirection) return "default";

    switch (resizeDirection) {
      case "top":
      case "bottom":
      case "padding-top":
      case "padding-bottom":
      case "margin-top":
      case "margin-bottom":
        return "ns-resize";
      case "left":
      case "right":
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
    (direction: "top" | "right" | "bottom" | "left") => {
      const value =
        settings[
          `padding${direction.charAt(0).toUpperCase() + direction.slice(1)}`
        ] || 0;
      const isActive = value > 0;

      const baseStyle: React.CSSProperties = {
        position: "absolute",
        zIndex: 10,
        pointerEvents: isActive ? "auto" : "none",
        opacity: isActive ? 1 : 0,
        backgroundColor: "#3b82f6",
        transition: "all 0.2s ease-in-out",
      };

      switch (direction) {
        case "top":
          return {
            ...baseStyle,
            top: 0,
            left: 0,
            right: 0,
            height: `${value}px`,
            cursor: "ns-resize",
          };
        case "right":
          return {
            ...baseStyle,
            top: 0,
            right: 0,
            bottom: 0,
            width: `${value}px`,
            cursor: "ew-resize",
          };
        case "bottom":
          return {
            ...baseStyle,
            bottom: 0,
            left: 0,
            right: 0,
            height: `${value}px`,
            cursor: "ns-resize",
          };
        case "left":
          return {
            ...baseStyle,
            top: 0,
            left: 0,
            bottom: 0,
            width: `${value}px`,
            cursor: "ew-resize",
          };
        default:
          return baseStyle;
      }
    },
    [settings]
  );

  const getMarginHandleStyle = useCallback(
    (direction: "top" | "right" | "bottom" | "left") => {
      const value =
        settings[
          `margin${direction.charAt(0).toUpperCase() + direction.slice(1)}`
        ] || 0;
      const isActive = value > 0;

      const baseStyle: React.CSSProperties = {
        position: "absolute",
        zIndex: 5,
        pointerEvents: isActive ? "auto" : "none",
        opacity: isActive ? 0.3 : 0,
        backgroundColor: "#10b981",
        transition: "all 0.2s ease-in-out",
      };

      switch (direction) {
        case "top":
          return {
            ...baseStyle,
            top: `-${value}px`,
            left: `-${settings.marginLeft || 0}px`,
            right: `-${settings.marginRight || 0}px`,
            height: `${value}px`,
            cursor: "ns-resize",
          };
        case "right":
          return {
            ...baseStyle,
            top: `-${settings.marginTop || 0}px`,
            right: `-${value}px`,
            bottom: `-${settings.marginBottom || 0}px`,
            width: `${value}px`,
            cursor: "ew-resize",
          };
        case "bottom":
          return {
            ...baseStyle,
            bottom: `-${value}px`,
            left: `-${settings.marginLeft || 0}px`,
            right: `-${settings.marginRight || 0}px`,
            height: `${value}px`,
            cursor: "ns-resize",
          };
        case "left":
          return {
            ...baseStyle,
            top: `-${settings.marginTop || 0}px`,
            left: `-${value}px`,
            bottom: `-${settings.marginBottom || 0}px`,
            width: `${value}px`,
            cursor: "ew-resize",
          };
        default:
          return baseStyle;
      }
    },
    [settings]
  );

  return {
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
  };
}
