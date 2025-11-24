"use client";

import type React from "react";

import { useCallback, useRef, useState } from "react";

// Add this function to handle indicator panel interactions
export function useIndicatorPanelInteractions({
  indicators,
  dimensions,
  visibleRange,
  candleData,
  showVolume,
  priceChartHeight,
  chartTop,
  priceScaleWidth,
  panelHeights,
  setPanelHeights,
  collapsedPanels,
  setCollapsedPanels,
  isDraggingPanel,
  setIsDraggingPanel,
  setShowIndicatorPanel,
  setActiveIndicatorId,
  toggleIndicator,
  theme,
}: any) {
  const [resizingIndicator, setResizingIndicator] = useState<string | null>(
    null
  );
  const [resizeStartY, setResizeStartY] = useState<number>(0);
  const lastPanelInteractionRef = useRef(0);

  // Update the handleIndicatorPanelClick function to correctly detect clicks on the control buttons
  const handleIndicatorPanelClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      if (!canvas) return false;

      // Throttle panel interactions
      const now = Date.now();
      if (now - lastPanelInteractionRef.current < 100) {
        // Prevent rapid clicks
        return false;
      }
      lastPanelInteractionRef.current = now;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate volume height (if shown)
      const volumeHeight = showVolume ? dimensions.height * 0.15 : 0;
      const volumeTop = chartTop + priceChartHeight;

      // Add null check for indicators
      if (!indicators || !Array.isArray(indicators)) return false;

      // Filter for visible indicators that should be in separate panes
      const separatePaneIndicators = indicators.filter(
        (i: any) => i && i.visible && i.separatePanel
      );

      if (separatePaneIndicators.length === 0) return false;

      let currentTop = chartTop + priceChartHeight + volumeHeight;

      // Check if click is within any indicator pane
      for (const indicator of separatePaneIndicators) {
        // Skip if indicator doesn't have an id
        if (!indicator || !indicator.id) continue;

        const paneHeight =
          panelHeights && indicator.id in panelHeights
            ? panelHeights[indicator.id]
            : 100;
        const isCollapsed =
          collapsedPanels && indicator.id in collapsedPanels
            ? collapsedPanels[indicator.id]
            : false;
        const actualPaneHeight = isCollapsed ? 30 : paneHeight;
        const titleHeight = 24;

        if (y >= currentTop && y <= currentTop + actualPaneHeight) {
          // Click is within this pane
          if (y <= currentTop + titleHeight) {
            // Click is in the title bar
            // Calculate positions of control buttons
            const buttonRadius = 9;
            const buttonSpacing = 5;
            const buttonY = currentTop + titleHeight / 2;

            // Settings button (gear icon)
            const settingsX = dimensions.width - 65;
            if (
              Math.sqrt(
                Math.pow(x - settingsX, 2) + Math.pow(y - buttonY, 2)
              ) <= buttonRadius
            ) {
              if (setActiveIndicatorId && setShowIndicatorPanel) {
                setActiveIndicatorId(indicator.id);
                setShowIndicatorPanel(true);
                return true;
              }
            }

            // Collapse/expand button
            const collapseX = settingsX + buttonRadius * 2 + buttonSpacing;
            if (
              Math.sqrt(
                Math.pow(x - collapseX, 2) + Math.pow(y - buttonY, 2)
              ) <= buttonRadius
            ) {
              if (setCollapsedPanels) {
                setCollapsedPanels({
                  ...collapsedPanels,
                  [indicator.id]: !isCollapsed,
                });
                return true;
              }
            }

            // Close button
            const closeX = collapseX + buttonRadius * 2 + buttonSpacing;
            if (
              Math.sqrt(Math.pow(x - closeX, 2) + Math.pow(y - buttonY, 2)) <=
              buttonRadius
            ) {
              if (toggleIndicator) {
                toggleIndicator(indicator.id);
                return true;
              }
            }
          }

          // Check if click is on resize handle
          if (
            !isCollapsed &&
            y >= currentTop + actualPaneHeight - 5 &&
            y <= currentTop + actualPaneHeight &&
            x >= dimensions.width / 2 - 25 &&
            x <= dimensions.width / 2 + 25
          ) {
            // Resize handle clicked
            setResizingIndicator(indicator.id);
            setResizeStartY(y);
            if (setIsDraggingPanel) {
              setIsDraggingPanel({
                ...isDraggingPanel,
                [indicator.id]: true,
              });
            }
            return true;
          }
        }

        currentTop += actualPaneHeight;
      }

      return false;
    },
    [
      indicators,
      dimensions,
      showVolume,
      priceChartHeight,
      chartTop,
      panelHeights,
      collapsedPanels,
      setCollapsedPanels,
      isDraggingPanel,
      setIsDraggingPanel,
      setShowIndicatorPanel,
      setActiveIndicatorId,
      toggleIndicator,
      setResizingIndicator,
      setResizeStartY,
    ]
  );

  const handleIndicatorPanelMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!resizingIndicator) return;

      const canvas = e.currentTarget;
      if (!canvas) return;

      // Throttle resize operations
      const now = Date.now();
      if (now - lastPanelInteractionRef.current < 16) {
        // Limit to ~60fps
        return;
      }
      lastPanelInteractionRef.current = now;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Calculate new height based on drag position
      const currentHeight =
        panelHeights && resizingIndicator in panelHeights
          ? panelHeights[resizingIndicator]
          : 100;
      const deltaY = y - resizeStartY;
      const newHeight = Math.max(50, Math.min(300, currentHeight + deltaY));

      // Update pane height
      if (setPanelHeights) {
        setPanelHeights({
          ...panelHeights,
          [resizingIndicator]: newHeight,
        });
        setResizeStartY(y);
      }
    },
    [resizingIndicator, resizeStartY, panelHeights, setPanelHeights]
  );

  const handleIndicatorPanelMouseUp = useCallback(() => {
    if (resizingIndicator && setIsDraggingPanel) {
      setIsDraggingPanel({
        ...isDraggingPanel,
        [resizingIndicator]: false,
      });
      setResizingIndicator(null);
    }
  }, [resizingIndicator, isDraggingPanel, setIsDraggingPanel]);

  return {
    handleIndicatorPanelClick,
    handleIndicatorPanelMouseMove,
    handleIndicatorPanelMouseUp,
  };
}
