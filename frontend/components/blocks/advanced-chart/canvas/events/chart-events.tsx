"use client";

import type React from "react";

import { useCallback, useRef } from "react";
import { useChart } from "../../context/chart-context";
import { useMouseEvents } from "./mouse-events";
import { useTouchEvents } from "./touch-events";

// Add type declaration for wheelTimeout on Window
declare global {
  interface Window {
    wheelTimeout?: ReturnType<typeof setTimeout>;
  }
}

// In the useChartEvents hook, make sure we're properly accessing shouldFetchOlderData from the chart context
export function useChartEvents() {
  const chart = useChart();
  const {
    candleData,
    visibleRange,
    setVisibleRange,
    shouldFetchOlderData,
    fetchOlderData,
  } = chart;

  // Create local refs for state management
  const isInteractingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const isNearBeginningRef = useRef(false);
  const lastChartEventRef = useRef(0);

  // Make sure we check if shouldFetchOlderData is a function before calling it
  const checkAndFetchOlderData = useCallback(() => {
    if (typeof shouldFetchOlderData === "function" && shouldFetchOlderData()) {
      fetchOlderData();
    }
  }, [shouldFetchOlderData, fetchOlderData]);

  // For example, in handleMouseMove:
  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;

      // Throttle chart events
      const now = Date.now();
      if (now - lastChartEventRef.current < 16) {
        // Limit to ~60fps
        return;
      }
      lastChartEventRef.current = now;

      if (isDraggingRef.current) {
        const dx = e.clientX - lastMousePositionRef.current.x;
        lastMousePositionRef.current = { x: e.clientX, y: e.clientY };

        // Calculate the movement amount based on the visible range
        const visibleCount = visibleRange.end - visibleRange.start;
        const moveAmount = (dx / -100) * visibleCount; // Adjust sensitivity here

        // Update the visible range
        const newStart = Math.max(0, visibleRange.start - moveAmount);
        const newEnd = Math.min(
          candleData.length,
          visibleRange.end - moveAmount
        );

        // Check if we're near the beginning of the chart
        if (newStart <= 5) {
          isNearBeginningRef.current = true;
          // Use the safe check function
          checkAndFetchOlderData();
        } else {
          isNearBeginningRef.current = false;
        }

        setVisibleRange({ start: newStart, end: newEnd });
      }
    },
    [visibleRange, setVisibleRange, candleData.length, checkAndFetchOlderData]
  );

  // Similarly update handleWheel and handleTouchMove to use checkAndFetchOlderData
  const handleChartWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isInteractingRef.current = true;

      // Throttle wheel events
      const now = Date.now();
      if (now - lastChartEventRef.current < 16) {
        // Limit to ~60fps
        return;
      }
      lastChartEventRef.current = now;

      // Clear any existing timeout
      if (window.wheelTimeout) {
        clearTimeout(window.wheelTimeout);
      }

      // Set a timeout to reset the interaction flag
      window.wheelTimeout = setTimeout(() => {
        isInteractingRef.current = false;
      }, 1000);

      // Calculate the zoom factor
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

      // Calculate the center point of the zoom
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartWidth = rect.width;

      // Calculate the position in the data space
      const visibleCount = visibleRange.end - visibleRange.start;
      const zoomCenterRatio = mouseX / chartWidth;
      const zoomCenterIndex =
        visibleRange.start + zoomCenterRatio * visibleCount;

      // Calculate new visible range
      const newVisibleCount = visibleCount * zoomFactor;
      const newStart = zoomCenterIndex - zoomCenterRatio * newVisibleCount;
      const newEnd = newStart + newVisibleCount;

      // Check if we're near the beginning of the chart
      if (newStart <= 5) {
        isNearBeginningRef.current = true;
        // Use the safe check function
        checkAndFetchOlderData();
      } else {
        isNearBeginningRef.current = false;
      }

      // Update the visible range
      setVisibleRange({
        start: Math.max(0, newStart),
        end: Math.min(candleData.length * 1.5, newEnd),
      });
    },
    [visibleRange, candleData.length, setVisibleRange, checkAndFetchOlderData]
  );

  const handleChartTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;

      // Throttle touch events
      const now = Date.now();
      if (now - lastChartEventRef.current < 16) {
        // Limit to ~60fps
        return;
      }
      lastChartEventRef.current = now;

      const dx = e.touches[0].clientX - lastMousePositionRef.current.x;
      lastMousePositionRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      // Calculate the movement amount based on the visible range with greatly reduced sensitivity
      const visibleCount = visibleRange.end - visibleRange.start;
      // Use a much lower sensitivity factor for touch events
      const touchSensitivityFactor = 0.15; // Changed from 0.05 to 0.15 as requested
      const moveAmount = (dx / -100) * visibleCount * touchSensitivityFactor;

      // Update the visible range
      const newStart = Math.max(0, visibleRange.start - moveAmount);
      const newEnd = Math.min(candleData.length, visibleRange.end - moveAmount);

      // Ensure we always keep at least some candles visible
      const minVisibleCandles = Math.max(10, visibleCount * 0.3);
      let adjustedStart = newStart;
      let adjustedEnd = newEnd;

      // Additional check to ensure we don't lose all candles when dragging into future
      if (adjustedStart >= candleData.length - minVisibleCandles) {
        adjustedStart = candleData.length - minVisibleCandles;
        adjustedEnd = adjustedStart + (visibleRange.end - visibleRange.start);
      }

      setVisibleRange({ start: adjustedStart, end: adjustedEnd });
    },
    [visibleRange, setVisibleRange, candleData.length, checkAndFetchOlderData]
  );

  // Get the base mouse and touch event handlers
  const {
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
  } = useMouseEvents({
    ...chart,
    isInteractingRef, // Pass our local ref
  });

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchEvents({
    ...chart,
    isInteractingRef, // Pass our local ref
  });

  // Create custom handlers that use our local refs
  const customHandleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true;
      lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      handleMouseDown(e);
    },
    [handleMouseDown]
  );

  const customHandleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = false;
      handleMouseUp(e);
    },
    [handleMouseUp]
  );

  const customHandleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = false;
      handleMouseLeave(e);
    },
    [handleMouseLeave]
  );

  // Create custom touch handlers
  const customHandleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMousePositionRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
      handleTouchStart(e);
    },
    [handleTouchStart]
  );

  const customHandleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    handleTouchEnd();
  }, [handleTouchEnd]);

  // Return the updated handlers
  return {
    handleMouseDown: customHandleMouseDown,
    handleMouseMove: handleChartMouseMove,
    handleMouseUp: customHandleMouseUp,
    handleMouseLeave: customHandleMouseLeave,
    handleWheel: handleChartWheel,
    handleTouchStart: customHandleTouchStart,
    handleTouchMove: handleChartTouchMove,
    handleTouchEnd: customHandleTouchEnd,
  };
}
