"use client";

import React, { ReactNode, useEffect, useCallback, useRef, memo } from "react";
import { cn } from "../../utils/cn";
import { PanelHeader } from "./PanelHeader";
import { useLayout } from "../../providers/LayoutProvider";
import { PanelResizer } from "./PanelResizer";
import { useLayoutStore } from "../../stores/layout-store";
import { useUIStore } from "../../stores/ui-store";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * Tell the workspace its boxes moved.
 *
 * The chart, the order book and the tables all measure once and re-measure only
 * on a resize signal, and a collapse/maximize changes layout without resizing
 * the window. The delay lets the DOM settle first — reading a box in the same
 * tick returns the pre-change size.
 */
function notifyLayoutChanged() {
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new CustomEvent("chart-resize-requested"));
  }, 50);
}

interface PanelProps {
  id: string;
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  hideHeader?: boolean;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  position?: "left" | "center" | "right" | "bottom";
  className?: string;
  /**
   * Render a drag handle on this edge to resize the panel.
   * "right" for a left-hand panel, "left" for a right-hand panel — i.e. the edge
   * that faces the chart.
   */
  resizeEdge?: "left" | "right";
  /**
   * Offer the expand-to-workspace control. OFF by default, because most panels
   * here should not have it.
   *
   * Markets, Order Book and Trade are fixed-width COLUMNS, and their contents
   * are laid out for that column: two-value market rows, price/amount/total
   * ladders with depth bars sized as a share of the row, a stacked order form.
   * Stretched to 1600px each of those becomes a band of whitespace with a
   * number at either end — the panel gets bigger and shows exactly the same
   * information, worse. Only the full-width bottom-row tables (Orders,
   * Positions) gain anything from the extra room, so only they opt in.
   */
  maximizable?: boolean;
  headerExtra?: ReactNode;
  "data-tutorial"?: string;
}

export const Panel = memo(function Panel({
  id,
  title,
  children,
  collapsible = true,
  hideHeader = false,
  defaultSize,
  minSize = 150,
  maxSize,
  position = "center",
  className,
  resizeEdge,
  maximizable = false,
  headerExtra,
  "data-tutorial": dataTutorial,
}: PanelProps) {
  const { togglePanelCollapse, isPanelCollapsed } = useLayout();
  const isCollapsed = isPanelCollapsed(id);

  // Maximize lives in the shared UI store, not in per-panel state. With a local
  // boolean every panel could be maximized at once: each one filled the
  // workspace and only the last in DOM order was reachable, so the ones
  // underneath stayed "maximized" and popped back on the next toggle. One slot
  // means maximizing a second panel restores the first, which is what the
  // store's `maximizedPanel` was always there to express.
  // `maximizable` gates the READ as well as the button: a panel that does not
  // offer the control must never render maximized, whatever the store names.
  const isMaximizedInStore = useUIStore((s) => s.maximizedPanel === id);
  const isMaximized = maximizable && isMaximizedInStore;
  const toggleMaximizedPanel = useUIStore((s) => s.toggleMaximizedPanel);
  const setMaximizedPanel = useUIStore((s) => s.setMaximizedPanel);

  const rootRef = useRef<HTMLDivElement>(null);
  const setPanelWidthPx = useLayoutStore((s) => s.setPanelWidthPx);

  // PanelResizer emits an incremental delta per frame, so the new width is
  // measured-now + delta. Measuring from the DOM means the first drag works even
  // before any sizePx has been stored.
  const handleResize = useCallback(
    (delta: number) => {
      const el = rootRef.current;
      if (!el) return;
      const width = el.getBoundingClientRect().width;
      // A handle on the LEFT edge grows the panel when dragged leftwards.
      setPanelWidthPx(id, resizeEdge === "left" ? width - delta : width + delta);
    },
    [id, resizeEdge, setPanelWidthPx]
  );

  const handleCollapse = useCallback(() => {
    const willBeCollapsed = !isCollapsed;
    // Collapsing a maximized panel would leave `maximizedPanel` pointing at a
    // panel that is now a 28px strip — it would spring back to full size the
    // next time it was expanded. Collapse ends the maximize.
    if (willBeCollapsed && isMaximized) setMaximizedPanel(null);
    togglePanelCollapse(id);
    // Dispatch event for other components to react to layout changes
    const eventName = willBeCollapsed ? "panel-collapsed" : "panel-expanded";
    window.dispatchEvent(new CustomEvent(eventName, { detail: { panelId: id } }));
    // Also trigger resize after a short delay to allow layout to update
    notifyLayoutChanged();
  }, [togglePanelCollapse, id, isCollapsed, isMaximized, setMaximizedPanel]);

  const handleMaximize = useCallback(() => {
    toggleMaximizedPanel(id);
    // Same reason the collapse path fires these: the chart canvas, the order
    // book's virtual list and the orders table all size themselves from a
    // measured box and only re-measure on a resize signal. Maximize changes
    // every panel's box, so without this the content keeps its old dimensions
    // inside a full-screen frame — the panel grows, the content does not.
    notifyLayoutChanged();
  }, [toggleMaximizedPanel, id]);

  // Escape restores a maximized panel — but a maximized panel is the BOTTOM of
  // the Escape stack, so it must only act on a keypress nothing above it wanted.
  //
  // Two independent tests, because the surfaces above announce themselves in two
  // different ways:
  //
  //   `defaultPrevented` — anything that already consumed the key. Radix's
  //   dismissable layer (every <Dialog>, including Positions' own Close-Position
  //   dialog) listens on `document` in the CAPTURE phase and calls
  //   preventDefault() without stopping propagation, so the same native event
  //   still reaches this window listener; and the command palette's React
  //   onKeyDown runs at the React root — also before any window listener — and
  //   synchronously clears its own store flag on the way. Reading the flags is
  //   therefore too late for both: by the time this runs they say "nothing is
  //   open", and one Escape would close the dialog AND un-maximize underneath it.
  //
  //   The ui-store flags — the settings modal is hand-rolled and does not
  //   preventDefault, so it is only visible through its flag.
  //
  // Claiming the event in turn keeps the contract transitive for anything that
  // ends up below this.
  useEffect(() => {
    if (!isMaximized) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      const ui = useUIStore.getState();
      if (ui.isSettingsOpen || ui.isCommandPaletteOpen || ui.isLayoutSaveOpen) {
        return;
      }
      event.preventDefault();
      setMaximizedPanel(null);
      notifyLayoutChanged();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMaximized, setMaximizedPanel]);

  // A panel can be unmounted while maximized — switching to a non-futures market
  // drops Positions, resizing to mobile drops the whole grid. The store would
  // otherwise keep naming it and re-maximize it the moment it came back.
  useEffect(() => {
    return () => {
      if (useUIStore.getState().maximizedPanel === id) {
        useUIStore.getState().setMaximizedPanel(null);
      }
    };
  }, [id]);

  // Determine collapse direction based on position and panel ID
  // Both Order Book and Trade are on the RIGHT side of the chart, so:
  // - When EXPANDED: icon points RIGHT (toward where they will collapse to - the right edge)
  // - When COLLAPSED: icon points LEFT (toward where they will expand to - back into view)
  const getCollapseIcon = () => {
    if (isCollapsed) {
      // When collapsed, icon points toward where panel will expand (LEFT - back into the layout)
      if (id === "orderbook" || id === "trading") {
        return <ChevronLeft size={14} />;
      }
      // Default behavior based on position
      switch (position) {
        case "left":
          return <ChevronRight size={14} />;
        case "right":
          return <ChevronLeft size={14} />;
        case "bottom":
          return <ChevronUp size={14} />;
        default:
          return <ChevronDown size={14} />;
      }
    } else {
      // When expanded, icon points toward where panel will collapse (RIGHT - to the edge)
      if (id === "orderbook" || id === "trading") {
        return <ChevronRight size={14} />;
      }
      switch (position) {
        case "left":
          return <ChevronLeft size={14} />;
        case "right":
          return <ChevronRight size={14} />;
        case "bottom":
          return <ChevronDown size={14} />;
        default:
          return <ChevronUp size={14} />;
      }
    }
  };

  if (isCollapsed) {
    // Bottom position panels are always horizontal
    // Other panels are vertical by default (CSS may override for tablet both-collapsed state)
    const isBottomPanel = position === "bottom";

    return (
      <div
        className={cn(
          "tp-panel-collapsed",
          "bg-[var(--tp-bg-secondary)]",
          "flex items-center justify-center",
          "cursor-pointer",
          "hover:bg-[var(--tp-bg-tertiary)]",
          "transition-colors",
          !isBottomPanel && "border-r border-[var(--tp-border)]"
        )}
        data-panel-id={id}
        data-panel-position={position}
        data-tutorial={dataTutorial}
        onClick={handleCollapse}
      >
        <div className={cn(
          "tp-collapsed-content",
          "flex items-center gap-1.5",
          // Bottom panels: horizontal layout
          // Side panels: vertical layout (CSS .tp-all-collapsed overrides for tablet)
          !isBottomPanel && "flex-col"
        )}>
          {getCollapseIcon()}
          <span
            className={cn(
              "tp-collapsed-title",
              "text-[var(--tp-text-secondary)] text-xs font-medium",
              // Bottom panels: horizontal text
              // Side panels: vertical text (CSS .tp-all-collapsed overrides for tablet)
              !isBottomPanel && "writing-mode-vertical"
            )}
          >
            {title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "tp-panel",
        "flex flex-col",
        "bg-[var(--tp-bg-secondary)]",
        "overflow-hidden",
        "min-h-0", // Allow flex children to shrink properly
        // positioning context for the absolutely-placed resize handle
        resizeEdge && !isMaximized && "relative",
        // Geometry belongs to `.tp-panel-maximized` in trading-pro.css, NOT to
        // utilities here: the per-panel `width`/`max-height` rules in that file
        // out-specify a utility class and survived `fixed inset-0`, which is how
        // maximize produced a 220px strip instead of a full workspace.
        isMaximized && "tp-panel-maximized",
        className
      )}
      style={{ gridArea: isMaximized ? undefined : id }}
      data-panel-id={id}
      data-panel-position={position}
      data-tutorial={dataTutorial}
    >
      {/* Drag handle on the chart-facing edge. Hidden while maximized, since the
          panel then covers the viewport and has no neighbour to resize against. */}
      {resizeEdge && !isMaximized && (
        <div
          className={cn(
            "absolute top-0 bottom-0 z-20 flex",
            resizeEdge === "left" ? "left-0 -ml-0.5" : "right-0 -mr-0.5"
          )}
        >
          <PanelResizer direction="horizontal" onResize={handleResize} />
        </div>
      )}
      {!hideHeader && (
        <PanelHeader
          title={title}
          collapsible={collapsible}
          onCollapse={handleCollapse}
          onMaximize={maximizable ? handleMaximize : undefined}
          isMaximized={isMaximized}
          collapseIcon={getCollapseIcon()}
          extra={headerExtra}
        />
      )}

      <div className="tp-panel-content flex-1 overflow-hidden min-h-0">{children}</div>
    </div>
  );
});
