"use client";

import { useMemo, useRef } from "react";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  Children,
  isValidElement,
} from "react";
import { cn } from "@/lib/utils";

type Direction = "horizontal" | "vertical";

interface PanelGroupContextProps {
  direction: Direction;
  panels: {
    id: string;
    size: number;
    minSize?: number;
    maxSize?: number;
    isCollapsed?: boolean;
    collapseSide?: "start" | "end" | "top" | "bottom";
  }[];
  updatePanelSize: (id: string, size: number) => void;
  updatePanelCollapsed: (
    id: string,
    isCollapsed: boolean,
    collapseSide?: "start" | "end" | "top" | "bottom"
  ) => void;
  startResize: (id1: string, id2: string, initialPosition: number) => void;
  expandSibling: (collapsedId: string) => void;
  resizing: boolean;
  resetPanelSizes: (
    id1: string,
    id2: string,
    size1: number,
    size2: number
  ) => void;
  isGroupHovered: boolean;
  groupId: string | undefined;
}

export const PanelGroupContext = createContext<
  PanelGroupContextProps | undefined
>(undefined);

export function usePanelGroup() {
  const context = useContext(PanelGroupContext);
  if (!context) {
    throw new Error("usePanelGroup must be used within a PanelGroup");
  }
  return context;
}

interface PanelGroupProps {
  direction: Direction;
  children: React.ReactNode;
  className?: string;
}

// Define an interface for panel props to use with type assertions
interface PanelElementProps {
  "data-panel-id"?: string;
  "data-collapsed"?: string;
  "data-collapse-side"?: "start" | "end" | "top" | "bottom";
  "data-visual-collapse-side"?: "start" | "end" | "top" | "bottom";
  "data-panel-name"?: string;
  "data-adjacent-panels"?: string;
  [key: string]: any; // Allow other props
}

export function PanelGroup({
  direction,
  children,
  className,
}: PanelGroupProps) {
  const [panels, setPanels] = useState<PanelGroupContextProps["panels"]>([]);
  const [resizing, setResizing] = useState(false);
  const [resizingPanels, setResizingPanels] = useState<{
    id1: string;
    id2: string;
    initialPosition: number;
  } | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const initialSizesRef = useRef<{ [key: string]: number }>({});
  const rafRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ currentPosition: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const throttleTimeRef = useRef<number>(16.67); // ~60fps
  const [isGroupHovered, setIsGroupHovered] = useState(false);

  // Determine the group ID based on direction and className
  const groupId = useMemo(() => {
    if (direction === "horizontal") {
      return className?.includes("left") ? "left" : "right";
    } else {
      return className?.includes("top") ? "top" : "bottom";
    }
  }, [direction, className]);

  // Apply subtle animation effects during resize
  const applyResizeEffects = useCallback((isResizing: boolean) => {
    if (!groupRef.current) return;

    // Get all panels
    const panelElements = groupRef.current.querySelectorAll("[data-panel-id]");

    panelElements.forEach((panel) => {
      if (isResizing) {
        // Add subtle scale effect during resize
        panel.classList.add("panel-resizing");
      } else {
        // Remove effects when done
        panel.classList.remove("panel-resizing");
      }
    });
  }, []);

  // Handle mouse enter/leave for the group
  const handleGroupMouseEnter = useCallback(() => {
    setIsGroupHovered(true);
  }, []);

  const handleGroupMouseLeave = useCallback((e: React.MouseEvent) => {
    // Check if relatedTarget is a valid Node and if we're not still hovering a child element
    if (
      e.relatedTarget instanceof Node &&
      groupRef.current &&
      !groupRef.current.contains(e.relatedTarget)
    ) {
      setIsGroupHovered(false);
    }
  }, []);

  // Add a method to propagate hover state from panels to their parent group
  const setPanelHoverListeners = useCallback(() => {
    if (!groupRef.current) return;

    // Find all panels and child elements in this group
    const panels = groupRef.current.querySelectorAll("*");

    // Add a data attribute to identify which group these panels belong to
    panels.forEach((panel) => {
      // Add a group identifier to each panel
      if (panel instanceof HTMLElement) {
        panel.dataset.panelGroup = groupId || "";
      }

      panel.addEventListener("mouseenter", () => {
        // Only affect this specific group's hover state
        setIsGroupHovered(true);
      });

      panel.addEventListener("mouseleave", (e: Event) => {
        // Cast the Event to MouseEvent to access relatedTarget
        const mouseEvent = e as MouseEvent;
        // Only set to false if we're not still hovering the group or any of its children
        // Check if relatedTarget is a valid Node
        if (
          mouseEvent.relatedTarget instanceof Node &&
          groupRef.current &&
          !groupRef.current.contains(mouseEvent.relatedTarget)
        ) {
          setIsGroupHovered(false);
        }
      });
    });

    return () => {
      // Clean up listeners when component unmounts
      if (groupRef.current) {
        const panels = groupRef.current.querySelectorAll("*");
        panels.forEach((panel) => {
          panel.removeEventListener("mouseenter", () =>
            setIsGroupHovered(true)
          );
          panel.removeEventListener("mouseleave", () =>
            setIsGroupHovered(false)
          );
        });
      }
    };
  }, [groupId]);

  // Add this useEffect to set up the panel hover listeners
  useEffect(() => {
    const cleanup = setPanelHoverListeners();
    return cleanup;
  }, [setPanelHoverListeners, children]);

  // Update panel size - memoized with useCallback
  const updatePanelSize = useCallback((id: string, size: number) => {
    setPanels((prev) => {
      const panel = prev.find((p) => p.id === id);
      // Only update if the panel doesn't exist or the size has changed
      if (!panel || Math.abs(panel.size - size) > 0.1) {
        if (panel) {
          return prev.map((p) => (p.id === id ? { ...p, size } : p));
        }
        return [...prev, { id, size }];
      }
      return prev;
    });
  }, []);

  // Update panel collapsed state
  const updatePanelCollapsed = useCallback(
    (
      id: string,
      isCollapsed: boolean,
      collapseSide?: "start" | "end" | "top" | "bottom"
    ) => {
      setPanels((prev) => {
        return prev.map((p) =>
          p.id === id
            ? { ...p, isCollapsed, ...(collapseSide && { collapseSide }) }
            : p
        );
      });
    },
    []
  );

  // Find the expandSibling function and update it to properly redistribute space when a panel is collapsed

  // Update the expandSibling function to better handle collapsed panels
  const expandSibling = useCallback((collapsedId: string) => {
    setPanels((prev) => {
      // Find the collapsed panel
      const collapsedPanel = prev.find((p) => p.id === collapsedId);
      if (!collapsedPanel) return prev;

      // Find non-collapsed siblings
      const nonCollapsedSiblings = prev.filter(
        (p) => p.id !== collapsedId && !p.isCollapsed
      );

      // If there are no non-collapsed siblings, don't redistribute
      if (nonCollapsedSiblings.length === 0) return prev;

      // Calculate the space to redistribute (collapsed panel's size minus its new collapsed size)
      const spaceToRedistribute = collapsedPanel.size - 2; // 2% is the collapsed size

      // Calculate total size of non-collapsed siblings
      const totalNonCollapsedSize = nonCollapsedSiblings.reduce(
        (sum, p) => sum + p.size,
        0
      );

      // Redistribute proportionally
      return prev.map((p) => {
        if (p.id === collapsedId) {
          // Set collapsed panel to 2%
          return { ...p, size: 2, isCollapsed: true };
        } else if (!p.isCollapsed) {
          // Calculate proportion of this panel relative to all non-collapsed siblings
          const proportion = p.size / totalNonCollapsedSize;
          // Add proportional share of freed space
          return { ...p, size: p.size + spaceToRedistribute * proportion };
        }
        return p;
      });
    });
  }, []);

  // Start resize operation
  const startResize = useCallback(
    (id1: string, id2: string, initialPosition: number) => {
      console.log("Starting resize between panels:", id1, id2);
      setResizing(true);
      setResizingPanels({ id1, id2, initialPosition });

      // Store initial sizes for smooth resizing
      initialSizesRef.current = {};
      setPanels((prev) => {
        prev.forEach((panel) => {
          initialSizesRef.current[panel.id] = panel.size;
        });
        return prev;
      });

      applyResizeEffects(true);
    },
    [applyResizeEffects]
  );

  // End resize operation
  const endResize = useCallback(() => {
    setResizing(false);
    setResizingPanels(null);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingUpdateRef.current = null;

    applyResizeEffects(false);
  }, [applyResizeEffects]);

  // Process resize with throttling using requestAnimationFrame
  const processResize = useCallback(() => {
    // Use transform for smoother animations during resize
    if (groupRef.current) {
      groupRef.current.style.willChange = "contents";
    }

    if (!pendingUpdateRef.current) return;

    const { currentPosition } = pendingUpdateRef.current;
    pendingUpdateRef.current = null;

    if (!resizingPanels || !groupRef.current) return;

    const { id1, id2, initialPosition } = resizingPanels;
    const rect = groupRef.current.getBoundingClientRect();
    const size = direction === "horizontal" ? rect.width : rect.height;

    // Calculate delta as a percentage of total size
    const delta = ((currentPosition - initialPosition) / size) * 100;

    setPanels((prev) => {
      const panel1 = prev.find((p) => p.id === id1);
      const panel2 = prev.find((p) => p.id === id2);

      if (!panel1 || !panel2) return prev;

      // Use initial sizes for calculation
      const initialSize1 = initialSizesRef.current[id1];
      const initialSize2 = initialSizesRef.current[id2];

      // Calculate new sizes
      let newSize1 = initialSize1 + delta;
      let newSize2 = initialSize2 - delta;

      // Check if we've hit min/max constraints
      let hitConstraint = false;

      // In the processResize function, update the constraint handling to allow bottom panels to expand more
      // Around line 200-250 where it handles panel constraints

      // Replace or modify the constraint handling code to add a special case for bottom panels
      if (panel1.id === "bottom" || panel2.id === "bottom") {
        // For bottom panels, allow expansion up to 50%
        const maxBottomSize = 50;

        if (panel1.id === "bottom" && newSize1 > maxBottomSize) {
          newSize1 = maxBottomSize;
          hitConstraint = true;
        }

        if (panel2.id === "bottom" && newSize2 > maxBottomSize) {
          newSize2 = maxBottomSize;
          hitConstraint = true;
        }
      } else {
        // Apply regular constraints for non-bottom panels
        // Apply min constraint for panel 1
        if (panel1.minSize !== undefined && newSize1 < panel1.minSize) {
          hitConstraint = true;
          newSize1 = panel1.minSize;
        }

        // Apply max constraint for panel 1
        if (panel1.maxSize !== undefined && newSize1 > panel1.maxSize) {
          hitConstraint = true;
          newSize1 = panel1.maxSize;
        }

        // Apply min constraint for panel 2
        if (panel2.minSize !== undefined && newSize2 < panel2.minSize) {
          hitConstraint = true;
          newSize2 = panel2.minSize;
        }

        // Apply max constraint for panel 2
        if (panel2.maxSize !== undefined && newSize2 > panel2.maxSize) {
          hitConstraint = true;
          newSize2 = panel2.maxSize;
        }
      }

      // If we didn't hit any constraints, both panels get updated
      // If we hit a constraint, only update the panel that hasn't hit its constraint
      return prev.map((p) => {
        if (p.id === id1) return { ...p, size: newSize1 };
        if (p.id === id2) return { ...p, size: newSize2 };
        return p;
      });
    });

    rafRef.current = null;

    // Reset will-change after resize is complete
    if (!resizing && groupRef.current) {
      groupRef.current.style.willChange = "auto";
    }
  }, [direction, resizingPanels, resizing]);

  // Handle resize with throttling
  const handleResize = useCallback(
    (currentPosition: number) => {
      // Store the latest position
      pendingUpdateRef.current = { currentPosition };

      // Throttle updates based on time
      const now = performance.now();
      if (now - lastUpdateTimeRef.current < throttleTimeRef.current) {
        // If we already have a frame queued, don't queue another one
        if (rafRef.current) return;

        // Queue a frame to process the resize
        rafRef.current = requestAnimationFrame(() => {
          lastUpdateTimeRef.current = performance.now();
          processResize();
        });
        return;
      }

      // Update immediately if enough time has passed
      lastUpdateTimeRef.current = now;
      processResize();
    },
    [processResize]
  );

  // Setup event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing || !resizingPanels || !groupRef.current) return;
      const currentPosition =
        direction === "horizontal" ? e.clientX : e.clientY;
      handleResize(currentPosition);
    };

    const handleMouseUp = () => {
      endResize();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!resizing || !resizingPanels || !groupRef.current || !e.touches[0])
        return;
      const touch = e.touches[0];
      const currentPosition =
        direction === "horizontal" ? touch.clientX : touch.clientY;
      handleResize(currentPosition);
      e.preventDefault(); // Prevent scrolling while resizing
    };

    const handleTouchEnd = () => {
      endResize();
    };

    if (resizing) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [resizing, resizingPanels, direction, handleResize, endResize]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Add this before the reorderedChildren useMemo
  const shouldHaveResizeHandle = useCallback(
    (panel1Id: string, panel2Id: string) => {
      // Get panel objects
      const panel1 = panels.find((p) => p.id === panel1Id);
      const panel2 = panels.find((p) => p.id === panel2Id);

      // If either panel doesn't exist, no resize handle needed
      if (!panel1 || !panel2) return false;

      // If either panel is collapsed, no resize handle needed
      if (panel1.isCollapsed || panel2.isCollapsed) return false;

      return true;
    },
    [panels]
  );

  // Reorder children based on collapse state
  const reorderedChildren = useMemo(() => {
    const childrenArray = Children.toArray(children);
    const processedArray: React.ReactNode[] = [];

    // First pass: identify collapsed panels and their sides
    const collapsedStartPanels: React.ReactNode[] = [];
    const collapsedEndPanels: React.ReactNode[] = [];
    const collapsedTopPanels: React.ReactNode[] = [];
    const collapsedBottomPanels: React.ReactNode[] = [];
    const normalPanels: React.ReactNode[] = [];

    // Track which panels are collapsed for handling resize handles
    const collapsedPanelIds = new Set<string>();

    // First pass: identify all panels and their collapse state
    for (const child of childrenArray) {
      if (isValidElement(child)) {
        // Use type assertion to access props safely
        const props = child.props as PanelElementProps;
        const isCollapsed = props["data-collapsed"] === "true";
        const panelId = props["data-panel-id"];

        if (isCollapsed && panelId) {
          collapsedPanelIds.add(panelId);
        }

        const collapseSide = props["data-collapse-side"];
        const visualCollapseSide = props["data-visual-collapse-side"];
        const panelName = props["data-panel-name"];

        // Special case for orderbook panel
        if (panelName === "orderbook" && isCollapsed) {
          collapsedBottomPanels.push(child);
          continue;
        }

        if (isCollapsed) {
          // Use the visual collapse side for determining where to place the panel
          if (visualCollapseSide === "start" || collapseSide === "start") {
            collapsedStartPanels.push(child);
          } else if (visualCollapseSide === "end" || collapseSide === "end") {
            collapsedEndPanels.push(child);
          } else if (visualCollapseSide === "top" || collapseSide === "top") {
            collapsedTopPanels.push(child);
          } else if (
            visualCollapseSide === "bottom" ||
            collapseSide === "bottom"
          ) {
            collapsedBottomPanels.push(child);
          } else {
            normalPanels.push(child);
          }
        } else {
          normalPanels.push(child);
        }
      } else {
        normalPanels.push(child);
      }
    }

    // Second pass: process resize handles
    // We'll iterate through the normal panels and add them to the processedArray
    // For resize handles (elements without data-panel-id), we'll check if they should be included
    for (let i = 0; i < normalPanels.length; i++) {
      const current = normalPanels[i];

      // Add the current panel
      processedArray.push(current);

      // Check if we need to add a resize handle after this panel
      if (i < normalPanels.length - 1) {
        const next = normalPanels[i + 1];

        // Check if both current and next are valid elements
        if (isValidElement(current) && isValidElement(next)) {
          // Use type assertion to access props safely
          const currentProps = current.props as PanelElementProps;
          const nextProps = next.props as PanelElementProps;

          const currentPanelId = currentProps["data-panel-id"];
          const nextPanelId = nextProps["data-panel-id"];

          // If both have panel IDs and neither is collapsed, we can add a resize handle
          if (
            currentPanelId &&
            nextPanelId &&
            !collapsedPanelIds.has(currentPanelId) &&
            !collapsedPanelIds.has(nextPanelId)
          ) {
            // Find the resize handle between these panels
            const resizeHandle = childrenArray.find((c) => {
              if (isValidElement(c)) {
                // Use type assertion to access props safely
                const cProps = c.props as PanelElementProps;
                return (
                  !cProps["data-panel-id"] &&
                  cProps["data-adjacent-panels"] ===
                    `${currentPanelId},${nextPanelId}`
                );
              }
              return false;
            });

            if (resizeHandle) {
              processedArray.push(resizeHandle);
            }
          }
        }
      }
    }

    // Return panels in the correct order based on direction
    if (direction === "horizontal") {
      return [
        ...collapsedStartPanels,
        ...processedArray,
        ...collapsedEndPanels,
      ];
    } else {
      return [
        ...collapsedTopPanels,
        ...processedArray,
        ...collapsedBottomPanels,
      ];
    }
  }, [children, direction]);

  // When a panel group is collapsed, we need to adjust the sizes of other panels
  useEffect(() => {
    // This effect will run when panels are added or removed (like when collapsing a group)
    if (children && Children.count(children) > 0) {
      // Recalculate panel sizes when children change
      const visiblePanels = Children.toArray(children).filter((child) => {
        if (isValidElement(child)) {
          // Use type assertion to access props safely
          const props = child.props as PanelElementProps;
          return props["data-collapsed"] !== "true";
        }
        return false;
      });

      if (visiblePanels.length > 0) {
        // Force a resize event to update panel sizes
        window.dispatchEvent(new Event("resize"));
      }
    }
  }, [children]);

  // Reset panel sizes to default or specified values
  const resetPanelSizes = useCallback(
    (id1: string, id2: string, size1: number, size2: number) => {
      console.log("Resetting panel sizes:", id1, id2, size1, size2);
      setPanels((prev) => {
        return prev.map((p) => {
          if (p.id === id1) return { ...p, size: size1 };
          if (p.id === id2) return { ...p, size: size2 };
          return p;
        });
      });
    },
    []
  );

  return (
    <PanelGroupContext.Provider
      value={{
        direction,
        panels,
        updatePanelSize,
        updatePanelCollapsed,
        startResize,
        expandSibling,
        resizing,
        resetPanelSizes,
        isGroupHovered,
        groupId,
      }}
    >
      <div
        ref={groupRef}
        className={cn(
          "flex transition-all duration-150 ease-out panel-group",
          direction === "horizontal" ? "flex-row" : "flex-col",
          resizing && "select-none cursor-col-resize",
          className,
          "bg-background dark:bg-zinc-950",
          "text-foreground dark:text-white",
          "border-zinc-200 dark:border-zinc-800"
        )}
        data-hovered={isGroupHovered ? "true" : "false"}
        data-group-id={groupId}
        onMouseEnter={handleGroupMouseEnter}
        onMouseLeave={handleGroupMouseLeave}
      >
        {reorderedChildren}
      </div>
    </PanelGroupContext.Provider>
  );
}
