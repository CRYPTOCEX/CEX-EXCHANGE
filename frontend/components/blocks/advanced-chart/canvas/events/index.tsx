"use client";

import { isInMainChartArea } from "./helpers";
import { useMouseEvents } from "./mouse-events";
import { useTouchEvents } from "./touch-events";
import { useIndicatorPanelInteractions } from "./indicator-panel-events";
import { useChartEvents } from "./chart-events";
import { setupEventListeners } from "./setup-events";

export {
  isInMainChartArea,
  useMouseEvents,
  useTouchEvents,
  useIndicatorPanelInteractions,
  useChartEvents,
  setupEventListeners,
};

// Add a default export to fix the import error
export default {
  setupEventListeners,
  useMouseEvents,
  useTouchEvents,
  useIndicatorPanelInteractions,
  useChartEvents,
};
