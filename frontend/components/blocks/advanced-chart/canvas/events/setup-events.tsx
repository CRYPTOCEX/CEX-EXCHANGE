"use client";

import { isInMainChartArea } from "./helpers";

// Setup event listeners for the chart canvas
export function setupEventListeners(canvas: HTMLCanvasElement, chart: any) {
  const {
    setMousePosition,
    setIsDragging,
    setDragStart,
    visibleRange,
    setVisibleRange,
    candleData,
    dimensions,
    priceScaleWidth,
    chartTop,
    priceChartHeight,
    shouldFetchOlderData,
    fetchOlderData,
  } = chart;

  // Throttling for touch events
  let lastTouchUpdate = 0;
  const TOUCH_THROTTLE_MS = 16; // ~60fps
  let touchStartTime = 0;
  let initialTouchDistance = 0;

  // Mouse event handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (!canvas) return;

    // Add this line to force a render when dragging starts
    if (typeof chart.needsRenderRef?.current !== "undefined") {
      chart.needsRenderRef.current = true;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only allow dragging in the main chart area
    if (
      !isInMainChartArea(
        x,
        y,
        chartTop,
        priceChartHeight,
        dimensions.width,
        priceScaleWidth
      )
    ) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x, y });

    // Set cursor style directly for immediate feedback
    canvas.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });

    // Only handle dragging in the main chart area
    if (
      chart.isDragging &&
      isInMainChartArea(
        x,
        y,
        chartTop,
        priceChartHeight,
        dimensions.width,
        priceScaleWidth
      )
    ) {
      const deltaX = x - chart.dragStart.x;
      const chartWidth = dimensions.width - priceScaleWidth;
      const visibleCount = visibleRange.end - visibleRange.start;

      // Calculate move amount based on drag distance with PC-appropriate sensitivity
      const pcSensitivity = 0.3; // Much lower sensitivity for smoother PC dragging
      const moveAmount = (deltaX / chartWidth) * visibleCount * pcSensitivity * -1;

      // Store the current visible range width to maintain zoom level
      const rangeWidth = visibleRange.end - visibleRange.start;

      setVisibleRange((prev: any) => {
        let newStart = prev.start + moveAmount;
        let newEnd = prev.end + moveAmount;

        // Calculate minimum visible candles based on zoom level (at least 5 or 30% of visible range)
        const minVisibleCandles = Math.max(5, visibleCount * 0.3);

        // Limit future viewing to 50% of chart width beyond the last candle
        const maxEnd = candleData.length + rangeWidth * 0.5;

        // Handle boundary conditions while preserving zoom level
        if (newStart < -visibleCount * 0.1) {
          newStart = -visibleCount * 0.1;
          newEnd = newStart + rangeWidth;
        } else if (newEnd > maxEnd) {
          newEnd = maxEnd;
          newStart = newEnd - rangeWidth;
        }

        // Additional check to ensure we don't lose all candles when dragging into future
        if (newStart >= candleData.length - minVisibleCandles) {
          newStart = candleData.length - minVisibleCandles;
          newEnd = newStart + rangeWidth;
        }

        // Check if we need to fetch older data
        if (newStart <= 5) {
          if (
            typeof shouldFetchOlderData === "function" &&
            shouldFetchOlderData()
          ) {
            fetchOlderData();
          }
        }

        return {
          start: newStart,
          end: newEnd,
        };
      });

      setDragStart({ x, y });
    }

    // Update cursor style based on position
    if (
      isInMainChartArea(
        x,
        y,
        chartTop,
        priceChartHeight,
        dimensions.width,
        priceScaleWidth
      )
    ) {
      canvas.style.cursor = chart.isDragging ? "grabbing" : "grab";
    } else {
      canvas.style.cursor = "default";
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    setIsDragging(false);

    // Add this line to force a render when dragging ends
    if (typeof chart.needsRenderRef?.current !== "undefined") {
      chart.needsRenderRef.current = true;
    }

    // Reset cursor style
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only set grab cursor in the main chart area
      if (
        isInMainChartArea(
          x,
          y,
          chartTop,
          priceChartHeight,
          dimensions.width,
          priceScaleWidth
        )
      ) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "default";
      }
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setMousePosition(null);

    // Reset cursor style
    if (canvas) {
      canvas.style.cursor = "default";
    }
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Only handle zoom in the main chart area
    if (
      !isInMainChartArea(
        mouseX,
        mouseY,
        chartTop,
        priceChartHeight,
        dimensions.width,
        priceScaleWidth
      )
    ) {
      return;
    }

    const chartWidth = dimensions.width - priceScaleWidth;
    const visibleCount = visibleRange.end - visibleRange.start;

    // Calculate zoom center in data space
    const zoomCenterIndex =
      (mouseX / chartWidth) * visibleCount + visibleRange.start;

    // Determine zoom direction and factor
    const zoomDirection = e.deltaY > 0 ? 1 : -1;
    const zoomFactor = 1 + zoomDirection * 0.2;

    // Calculate new visible range
    const newVisibleCount = visibleCount * zoomFactor;

    // Ensure we don't zoom in too far or out too far
    const minVisibleCount = 10;
    const maxVisibleCount = candleData.length * 1.2;
    const clampedVisibleCount = Math.max(
      minVisibleCount,
      Math.min(maxVisibleCount, newVisibleCount)
    );

    // Calculate new start and end while keeping the mouse position fixed
    const zoomCenterRatio =
      (zoomCenterIndex - visibleRange.start) / visibleCount;
    const newStart = zoomCenterIndex - zoomCenterRatio * clampedVisibleCount;
    const newEnd = newStart + clampedVisibleCount;

    // Limit future viewing to 50% of visible range beyond the last candle
    const maxEnd = candleData.length + clampedVisibleCount * 0.5;

    // Apply boundaries while preserving zoom level
    let adjustedStart = newStart;
    let adjustedEnd = newEnd;

    if (adjustedEnd > maxEnd) {
      adjustedEnd = maxEnd;
      adjustedStart = adjustedEnd - clampedVisibleCount;
    }

    // Ensure we always keep at least some candles visible
    if (
      adjustedStart >=
      candleData.length - Math.max(10, clampedVisibleCount * 0.3)
    ) {
      adjustedStart =
        candleData.length - Math.max(10, clampedVisibleCount * 0.3);
      adjustedEnd = adjustedStart + clampedVisibleCount;
    }

    // Check if we need to fetch older data
    if (adjustedStart <= 5) {
      if (
        typeof shouldFetchOlderData === "function" &&
        shouldFetchOlderData()
      ) {
        fetchOlderData();
      }
    }

    // Update visible range
    setVisibleRange({ start: Math.max(0, adjustedStart), end: adjustedEnd });
  };

  // Improved touch event handlers
  const handleTouchStart = (e: TouchEvent) => {
    touchStartTime = Date.now();
    
    // Prevent default to avoid scrolling/zooming browser behavior
    if (e.cancelable) {
      e.preventDefault();
    }

    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      // Only allow touch interactions in the main chart area
      if (
        !isInMainChartArea(
          x,
          y,
          chartTop,
          priceChartHeight,
          dimensions.width,
          priceScaleWidth
        )
      ) {
        return;
      }

      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });

      // Add hardware acceleration class
      canvas.classList.add("touch-dragging");
    } else if (e.touches.length === 2) {
      // Stop any dragging when starting pinch
      setIsDragging(false);
      
      // Handle pinch zoom initialization
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistance = distance;
      
      // Add pinch class for visual feedback
      canvas.classList.add("touch-pinching");
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    // Prevent default to avoid passive listener warning
    if (e.cancelable) {
      e.preventDefault();
    }

    const now = Date.now();

    // Throttle touch move events for better performance
    if (now - lastTouchUpdate < TOUCH_THROTTLE_MS) {
      return;
    }
    lastTouchUpdate = now;

    if (e.touches.length === 1 && chart.isDragging) {
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      // Only process touch move in the main chart area
      if (
        !isInMainChartArea(
          x,
          y,
          chartTop,
          priceChartHeight,
          dimensions.width,
          priceScaleWidth
        )
      ) {
        return;
      }

      const deltaX = e.touches[0].clientX - chart.dragStart.x;
      const chartWidth = dimensions.width - priceScaleWidth;
      const visibleCount = visibleRange.end - visibleRange.start;

      // Improved touch sensitivity for mobile devices
      const touchSensitivity = 0.2; // Balanced sensitivity for mobile touch
      const moveAmount =
        (deltaX / chartWidth) * visibleCount * touchSensitivity * -1;

      setVisibleRange((prev: any) => {
        let newStart = prev.start + moveAmount;
        let newEnd = prev.end + moveAmount;

        const rangeWidth = visibleRange.end - visibleRange.start;
        const minVisibleCandles = Math.max(5, visibleCount * 0.3);
        const maxEnd = candleData.length + rangeWidth * 0.5;

        // Handle boundary conditions
        if (newStart < -visibleCount * 0.1) {
          newStart = -visibleCount * 0.1;
          newEnd = newStart + rangeWidth;
        } else if (newEnd > maxEnd) {
          newEnd = maxEnd;
          newStart = newEnd - rangeWidth;
        }

        if (newStart >= candleData.length - minVisibleCandles) {
          newStart = candleData.length - minVisibleCandles;
          newEnd = newStart + rangeWidth;
        }

        // Check for older data fetch
        if (newStart <= 5) {
          if (
            typeof shouldFetchOlderData === "function" &&
            shouldFetchOlderData()
          ) {
            fetchOlderData();
          }
        }

        return {
          start: newStart,
          end: newEnd,
        };
      });

      // Update drag position for next calculation
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    } else if (e.touches.length === 2 && initialTouchDistance > 0) {
      // Handle pinch zoom
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const scale = currentDistance / initialTouchDistance;
      const visibleCount = visibleRange.end - visibleRange.start;

      // Calculate zoom with improved sensitivity
      // Use scale directly (not inverted) - pinch out to zoom in, pinch in to zoom out
      const zoomSensitivity = 0.5; // Adjust sensitivity for smoother zooming
      const zoomFactor = 1 + (1 - scale) * zoomSensitivity;
      const newVisibleCount = Math.max(
        10,
        Math.min(candleData.length * 1.5, visibleCount * zoomFactor)
      );

      // Calculate center point for zoom
      const rect = canvas.getBoundingClientRect();
      const centerX =
        (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const chartWidth = dimensions.width - priceScaleWidth;
      const centerRatio = centerX / chartWidth;

      const currentCenter = visibleRange.start + visibleCount * centerRatio;
      const newStart = currentCenter - newVisibleCount * centerRatio;
      const newEnd = newStart + newVisibleCount;

      // Ensure we stay within reasonable bounds
      let adjustedStart = Math.max(-visibleCount * 0.1, newStart);
      let adjustedEnd = Math.min(candleData.length * 1.5, newEnd);

      // If we hit a boundary, adjust the other end to maintain the zoom level
      if (adjustedStart <= 0) {
        adjustedEnd = Math.min(candleData.length * 1.5, newVisibleCount);
        adjustedStart = 0;
      }

      setVisibleRange({
        start: adjustedStart,
        end: adjustedEnd,
      });

      initialTouchDistance = currentDistance;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialTouchDistance = 0;

    // Remove hardware acceleration classes
    canvas.classList.remove("touch-dragging");
    canvas.classList.remove("touch-pinching");

    // Force a final render to ensure clean state
    if (typeof chart.needsRenderRef?.current !== "undefined") {
      chart.needsRenderRef.current = true;
    }
  };

  // Add event listeners with proper passive flags
  canvas.addEventListener("mousedown", handleMouseDown, { passive: true });
  window.addEventListener("mousemove", handleMouseMove, { passive: true });
  window.addEventListener("mouseup", handleMouseUp, { passive: true });
  canvas.addEventListener("mouseleave", handleMouseLeave, { passive: true });
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  // Touch events - use passive: false to allow preventDefault
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

  // Return cleanup function
  return () => {
    canvas.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    canvas.removeEventListener("mouseleave", handleMouseLeave);
    canvas.removeEventListener("wheel", handleWheel);
    canvas.removeEventListener("touchstart", handleTouchStart);
    canvas.removeEventListener("touchmove", handleTouchMove);
    canvas.removeEventListener("touchend", handleTouchEnd);
    canvas.removeEventListener("touchcancel", handleTouchEnd);
  };
}
