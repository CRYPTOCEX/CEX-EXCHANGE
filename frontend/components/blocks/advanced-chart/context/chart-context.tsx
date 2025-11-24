"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import type {
  CandleData,
  ChartType,
  MousePosition,
  PriceAlert,
} from "../types";
import type { Indicator } from "../canvas/render/toolbar/indicators/registry";
import { useChartState } from "./chart-state";
import { useChartData } from "./chart-data";
import { useChartInteractions } from "./chart-interactions";
import { useChartIndicators } from "./chart-indicators";
import type { ExpiryMarker } from "../canvas/render/expiry-marker";
import { Order, Symbol, TimeFrame } from "@/store/trade/use-binary-store";
import MemoryManager from "../canvas/performance/memory-manager";

if (process.env.NODE_ENV === "production") {
  const noop = () => {};
  const methods = ["log", "debug", "info", "warn"];
  methods.forEach((method) => {
    console[method] = noop;
  });
}

export interface ChartContextProps {
  candleData: CandleData[];
  loading: boolean;
  error: string | null;
  dataReady: boolean;
  isMarketSwitching: boolean;
  isChangingTimeframe: boolean;

  chartType: ChartType;
  visibleRange: { start: number; end: number };
  mousePosition: MousePosition | null;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  tooltip: { x: number; y: number; candle: CandleData } | null;
  showVolume: boolean;
  showGrid: boolean;
  dimensions: { width: number; height: number };
  chartReady: boolean;

  indicators: Indicator[];
  drawingTools: DrawingTool[];
  activeDrawingTool:
    | "trendline"
    | "horizontalline"
    | "fibonacciretracement"
    | null;
  isDrawing: boolean;
  currentDrawing: DrawingTool | null;
  showIndicatorPanel: boolean;
  showDrawingToolbar: boolean;
  showVolumeProfile: boolean;
  showPatternRecognition: boolean;
  priceAlerts: PriceAlert[];
  theme: string;
  showSettingsPanel: boolean;

  wsStatus: "connected" | "connecting" | "disconnected" | "error";
  apiStatus: "connected" | "connecting" | "disconnected" | "error";
  lastError: string | null;
  reconnectAttempt: boolean;
  reconnectCount: number;

  priceScaleWidth: number;
  timeScaleHeight: number;

  setChartType: (type: ChartType) => void;
  setVisibleRange: (
    range:
      | { start: number; end: number }
      | ((prev: { start: number; end: number }) => {
          start: number;
          end: number;
        })
  ) => void;
  setMousePosition: (position: MousePosition | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setDragStart: (position: { x: number; y: number }) => void;
  setTooltip: (
    tooltip: { x: number; y: number; candle: CandleData } | null
  ) => void;
  toggleVolume: () => void;
  toggleGrid: () => void;
  toggleIndicator: (id: string) => void;
  setDrawingTool: (
    tool: "trendline" | "horizontalline" | "fibonacciretracement" | null
  ) => void;
  clearDrawings: () => void;
  setShowIndicatorPanel: (show: boolean) => void;
  setShowDrawingToolbar: (show: boolean) => void;
  toggleVolumeProfile: () => void;
  togglePatternRecognition: () => void;
  addPriceAlert: (alert: Omit<PriceAlert, "id">) => void;
  removePriceAlert: (id: string) => void;
  toggleTheme: () => void;
  setGlobalCandleData: (data: CandleData[]) => void;
  setShowSettingsPanel: (show: boolean) => void;
  forceCalculateAll: () => void;
  shouldFetchOlderData: () => boolean;

  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  calculateSeparatePanelsHeight: () => number;

  refreshData: () => void;
  fetchOlderData: () => void;
  requestOlderData: () => void;
  isLoadingOlderData: boolean;
  hasReachedOldestData: boolean;
  clearCurrentData: () => void;
  clearSymbolCache: (symbol: string) => void;

  symbol: Symbol;
  timeFrame: TimeFrame;
  orders: Order[];
  onPriceUpdate: (price: number) => void;
  onTimeFrameChange?: (timeFrame: TimeFrame) => void;
  darkMode: boolean;

  panelHeights: Record<string, number>;
  setPanelHeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  collapsedPanels: Record<string, boolean>;
  setCollapsedPanels: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  isDraggingPanel: Record<string, boolean>;
  setIsDraggingPanel: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  activeIndicatorId: string | null;
  setActiveIndicatorId: React.Dispatch<React.SetStateAction<string | null>>;
  showTimeframeSelector: boolean;
  setShowTimeframeSelector: React.Dispatch<React.SetStateAction<boolean>>;

  expiryMarkers: ExpiryMarker[];
  expiryIntervalMinutes: number;
  setExpiryIntervalMinutes: React.Dispatch<React.SetStateAction<number>>;

  subscribeToPrice: (callback: (price: number) => void) => () => void;
  subscribeToTimeFrame: (
    callback: (timeFrame: TimeFrame) => void
  ) => () => void;

  updateIndicator: (id: string, updates: Partial<Indicator>) => void;
  addIndicator: (params: { type: string; params?: any }) => void;
  removeIndicator: (id: string) => void;
}

export type DrawingTool = {
  id: string;
  type: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const ChartContext = createContext<ChartContextProps | undefined>(undefined);

interface ChartProviderProps {
  children: React.ReactNode;
  symbol: Symbol;
  timeFrame: TimeFrame;
  onPriceUpdate?: (price: number) => void;
  onTimeFrameChange?: (timeFrame: TimeFrame) => void;
  darkMode?: boolean;
  orders?: Order[];
  expiryMinutes?: number;
  isMarketSwitching?: boolean;
  onChartContextReady?: (context: any) => void;
  marketType?: "spot" | "eco" | "futures";
}

export const ChartProvider: React.FC<ChartProviderProps> = ({
  children,
  symbol,
  timeFrame,
  onPriceUpdate = () => {},
  onTimeFrameChange,
  darkMode = true,
  orders = [],
  expiryMinutes = 5,
  isMarketSwitching = false,
  onChartContextReady,
  marketType = "spot",
}) => {
  const isUnmountingRef = useRef(false);
  const prevDarkModeRef = useRef(darkMode);
  const prevSymbolRef = useRef<Symbol>(symbol);
  const prevTimeFrameRef = useRef<TimeFrame>(timeFrame);
  const internalTimeFrameRef = useRef<TimeFrame>(timeFrame);

  const state = useChartState(darkMode);

  const {
    candleData,
    loading,
    error,
    refreshData,
    setGlobalCandleData,
    fetchOlderData,
    requestOlderData,
    isLoadingOlderData,
    hasReachedOldestData,
    viewportCandleCapacity,
    calculateViewportCapacity,
    dataReady,
    shouldFetchOlderData,
    clearSymbolCache,
    clearCurrentData,
    price,
    changeTimeFrameDirectly,
  } = useChartData(symbol, internalTimeFrameRef.current, onPriceUpdate, {
    ...state,
    marketType,
  });

  const dataHooks = {
    candleData,
    loading,
    error,
    refreshData,
    setGlobalCandleData,
    fetchOlderData,
    isLoadingOlderData,
    hasReachedOldestData,
    viewportCandleCapacity,
    calculateViewportCapacity,
    dataReady,
    shouldFetchOlderData,
    clearSymbolCache,
    clearCurrentData,
    changeTimeFrameDirectly,
  };

  const interactionHooks = useChartInteractions(state, dataHooks);
  const indicatorHooks = useChartIndicators();

  const lastCalculatedDataLengthRef = useRef<number>(0);
  const lastCalculatedDataTimestampRef = useRef<number>(0);
  const isCalculatingIndicatorsRef = useRef(false);

  const [panelHeights, setPanelHeights] = useState<Record<string, number>>({});
  const [collapsedPanels, setCollapsedPanels] = useState<
    Record<string, boolean>
  >({});
  const [isDraggingPanel, setIsDraggingPanel] = useState<
    Record<string, boolean>
  >({});
  const [activeIndicatorId, setActiveIndicatorId] = useState<string | null>(
    null
  );
  const [showTimeframeSelector, setShowTimeframeSelector] = useState(false);
  const [expiryIntervalMinutes, setExpiryIntervalMinutes] = useState<number>(
    expiryMinutes || 5
  );

  const [priceSubscribers, setPriceSubscribers] = useState<
    Array<(price: number) => void>
  >([]);
  const [timeFrameSubscribers, setTimeFrameSubscribers] = useState<
    Array<(timeFrame: TimeFrame) => void>
  >([]);

  const [isChangingTimeframe, setIsChangingTimeframe] = useState(false);
  const isChangingTimeframeRef = useRef<boolean>(false);
  const hasSetThemeRef = useRef(false);

  const toggleIndicator = useCallback(
    (id: string) => {
      if (!id) {
        return;
      }

      if (
        indicatorHooks &&
        typeof indicatorHooks.toggleIndicator === "function"
      ) {
        indicatorHooks.toggleIndicator(id);

        if (typeof indicatorHooks.forceCalculateAll === "function") {
          setTimeout(() => {
            indicatorHooks.forceCalculateAll();
          }, 50);
        }
      }
    },
    [indicatorHooks]
  );

  const subscribeToPrice = useCallback((callback: (price: number) => void) => {
    const stableCallback = (arg: number) => callback(arg);

    setPriceSubscribers((prev) => {
      if (!prev.some((cb) => cb === stableCallback)) {
        return [...prev, stableCallback];
      }
      return prev;
    });

    return () => {
      setPriceSubscribers((prev) => prev.filter((cb) => cb !== stableCallback));
    };
  }, []);

  const subscribeToTimeFrame = useCallback(
    (callback: (timeFrame: TimeFrame) => void) => {
      const stableCallback = (arg: TimeFrame) => callback(arg);

      setTimeFrameSubscribers((prev) => [...prev, stableCallback]);

      return () => {
        setTimeFrameSubscribers((prev) =>
          prev.filter((cb) => cb !== stableCallback)
        );
      };
    },
    []
  );

  useEffect(() => {
    if (price > 0) {
      const currentSubscribers = [...priceSubscribers];
      currentSubscribers.forEach((callback) => callback(price));
    }
  }, [price, priceSubscribers]);

  useEffect(() => {
    timeFrameSubscribers.forEach((callback) =>
      callback(internalTimeFrameRef.current)
    );
  }, [internalTimeFrameRef.current, timeFrameSubscribers]);

  const calculateSeparatePanelsHeight = () => {
    const visibleIndicators = indicatorHooks.indicators
      ? indicatorHooks.indicators.filter((i: any) => i && i.visible)
      : [];
    const separatePanelIndicators = visibleIndicators.filter(
      (i: any) => i && i.separatePanel
    );

    let totalHeight = 0;
    separatePanelIndicators.forEach((indicator: any) => {
      if (!indicator || !indicator.id) return;

      const panelHeight =
        indicator.id && panelHeights ? panelHeights[indicator.id] || 100 : 100;
      const isCollapsed =
        indicator.id && collapsedPanels
          ? collapsedPanels[indicator.id] || false
          : false;

      totalHeight += isCollapsed ? 30 : panelHeight + 24;
    });

    return totalHeight;
  };

  useEffect(() => {
    prevSymbolRef.current = symbol;
    prevTimeFrameRef.current = timeFrame;
    internalTimeFrameRef.current = timeFrame;
  }, [symbol, timeFrame]);

  useEffect(() => {
    const updateDimensions = () => {
      if (state.containerRef.current) {
        const rect = state.containerRef.current.getBoundingClientRect();

        const width = Math.max(rect.width, 300);
        const height = Math.max(rect.height, 200);

        if (
          width !== state.dimensions.width ||
          height !== state.dimensions.height
        ) {
          state.setDimensions({
            width,
            height,
          });

          // Force a high-priority render when dimensions change
          setTimeout(() => {
            // Dispatch a custom event to notify renderer of dimension changes
            window.dispatchEvent(
              new CustomEvent("chart-dimensions-changed", {
                detail: { width, height },
              })
            );
          }, 0);
        }
      }
    };

    // Initial dimension update with delay to allow layout to settle
    const initTimer = setTimeout(() => {
      updateDimensions();
    }, 100);

    // Handle both standard resize and custom resize events
    const handleResize = () => {
      // Use RAF to ensure we don't block the resize event
      requestAnimationFrame(updateDimensions);
    };

    // Set up ResizeObserver for more responsive updates
    let resizeObserver: ResizeObserver | null = null;

    if (state.containerRef.current && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            const adjustedWidth = Math.max(width, 300);
            const adjustedHeight = Math.max(height, 200);

            if (
              adjustedWidth !== state.dimensions.width ||
              adjustedHeight !== state.dimensions.height
            ) {
              state.setDimensions({
                width: adjustedWidth,
                height: adjustedHeight,
              });

              // Notify renderer with throttling
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent("chart-dimensions-changed", {
                    detail: { width: adjustedWidth, height: adjustedHeight },
                  })
                );
              }, 0);
            }
          }
        }
      });

      resizeObserver.observe(state.containerRef.current);
    }

    window.addEventListener("resize", handleResize);

    // Listen for custom resize events from resize handles
    window.addEventListener("chart-resize-requested", handleResize);

    // Listen for panel state changes
    window.addEventListener("panel-collapsed", handleResize);
    window.addEventListener("panel-expanded", handleResize);
    window.addEventListener("panel-group-collapsed", handleResize);
    window.addEventListener("panel-group-expanded", handleResize);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("chart-resize-requested", handleResize);
      window.removeEventListener("panel-collapsed", handleResize);
      window.removeEventListener("panel-expanded", handleResize);
      window.removeEventListener("panel-group-collapsed", handleResize);
      window.removeEventListener("panel-group-expanded", handleResize);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [
    state.containerRef,
    state.dimensions.width,
    state.dimensions.height,
    state.setDimensions,
  ]);

  useEffect(() => {
    if (indicatorHooks.indicators.length > 0) {
      try {
        const visibleIndicators = indicatorHooks.indicators
          .filter((ind) => ind.visible)
          .map((ind) => ({
            id: ind.id,
            type: ind.type,
            params: ind.params,
            color: ind.color,
            visible: ind.visible,
            separatePanel: ind.separatePanel,
          }));

        if (visibleIndicators.length > 0) {
          localStorage.setItem(
            "chartIndicators",
            JSON.stringify(visibleIndicators)
          );
        }
      } catch (error) {
        // Silent error
      }
    }
  }, [indicatorHooks.indicators]);

  useEffect(() => {
    try {
      const savedIndicators = localStorage.getItem("chartIndicators");
      if (savedIndicators) {
        const parsed = JSON.parse(savedIndicators);
        if (Array.isArray(parsed) && parsed.length > 0) {
          indicatorHooks.setIndicators((prev: Indicator[]) => {
            const existingMap = new Map(prev.map((ind) => [ind.type, ind]));

            parsed.forEach((savedInd: any) => {
              if (existingMap.has(savedInd.type)) {
                const existing = existingMap.get(savedInd.type);
                if (existing) {
                  existingMap.set(savedInd.type, {
                    ...existing,
                    params: savedInd.params,
                    color: savedInd.color,
                    visible: savedInd.visible,
                    separatePanel: savedInd.separatePanel,
                  });
                }
              }
            });

            return Array.from(existingMap.values());
          });
        }
      }
    } catch (error) {
      // Silent error
    }
  }, [indicatorHooks]);

  useEffect(() => {
    if (expiryMinutes !== expiryIntervalMinutes) {
      setExpiryIntervalMinutes(expiryMinutes);
    }
  }, [expiryMinutes, expiryIntervalMinutes]);

  useEffect(() => {
    if (
      !candleData ||
      candleData.length === 0 ||
      !indicatorHooks.calculateIndicators ||
      isCalculatingIndicatorsRef.current ||
      isUnmountingRef.current
    ) {
      return;
    }

    const currentLength = candleData.length;
    const currentTime = Date.now();

    if (
      currentLength === lastCalculatedDataLengthRef.current &&
      currentTime - lastCalculatedDataTimestampRef.current < 1000
    ) {
      return;
    }

    lastCalculatedDataLengthRef.current = currentLength;
    lastCalculatedDataTimestampRef.current = currentTime;

    isCalculatingIndicatorsRef.current = true;

    const timeoutId = setTimeout(() => {
      if (!isUnmountingRef.current) {
        indicatorHooks.calculateIndicators(candleData);
      }
      isCalculatingIndicatorsRef.current = false;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      isCalculatingIndicatorsRef.current = false;
    };
  }, [candleData, indicatorHooks, isUnmountingRef]);

  useEffect(() => {
    if (prevDarkModeRef.current !== darkMode) {
      prevDarkModeRef.current = darkMode;
      state.setTheme(darkMode ? "dark" : "light");
      hasSetThemeRef.current = true;
    }
  }, [darkMode, state]);

  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  // Direct timeframe change handler - no useEffect dependency
  const handleTimeFrameChange = useCallback(
    async (newTimeFrame: TimeFrame) => {
      console.log(
        "🕒 Chart context handling direct timeframe change:",
        newTimeFrame
      );

      if (newTimeFrame !== internalTimeFrameRef.current) {
        // Update internal ref first
        internalTimeFrameRef.current = newTimeFrame;

        // Set timeframe changing state
        setIsChangingTimeframe(true);
        isChangingTimeframeRef.current = true;

        // Notify subscribers
        timeFrameSubscribers.forEach((callback) => callback(newTimeFrame));

        // Call the external handler if provided
        if (onTimeFrameChange) {
          onTimeFrameChange(newTimeFrame);
        }

        // Call the direct timeframe change function immediately
        if (changeTimeFrameDirectly) {
          console.log("🚀 Calling direct timeframe change function");
          await changeTimeFrameDirectly(newTimeFrame);
          console.log("✅ Direct timeframe change completed");

          // Reset timeframe changing state after completion
          setTimeout(() => {
            setIsChangingTimeframe(false);
            isChangingTimeframeRef.current = false;

            // Recalculate indicators after timeframe change
            if (
              indicatorHooks &&
              typeof indicatorHooks.forceCalculateAll === "function"
            ) {
              setTimeout(() => {
                indicatorHooks.forceCalculateAll();
              }, 100);
            }
          }, 300);
        } else {
          // Reset timeframe changing state after a short delay
          setTimeout(() => {
            setIsChangingTimeframe(false);
            isChangingTimeframeRef.current = false;
          }, 300);
        }
      }
    },
    [
      onTimeFrameChange,
      timeFrameSubscribers,
      changeTimeFrameDirectly,
      indicatorHooks,
    ]
  );

  useEffect(() => {
    if (prevTimeFrameRef.current && prevTimeFrameRef.current !== timeFrame) {
      setIsChangingTimeframe(true);
      isChangingTimeframeRef.current = true;
      internalTimeFrameRef.current = timeFrame;

      setTimeout(() => {
        setIsChangingTimeframe(false);
        isChangingTimeframeRef.current = false;
      }, 500);
    }

    prevTimeFrameRef.current = timeFrame;
  }, [timeFrame, symbol]);

  const drawingTools: DrawingTool[] = [];
  const priceAlerts: PriceAlert[] = [];

  const value: ChartContextProps = useMemo(
    () => ({
      ...state,
      candleData,
      loading: loading || isChangingTimeframeRef.current,
      error,
      refreshData,
      setGlobalCandleData,
      fetchOlderData,
      requestOlderData,
      isLoadingOlderData,
      hasReachedOldestData,
      viewportCandleCapacity,
      calculateViewportCapacity,
      symbol,
      timeFrame: internalTimeFrameRef.current,
      orders,
      onPriceUpdate,
      onTimeFrameChange: handleTimeFrameChange,
      darkMode,
      showSettingsPanel: state.showSettingsPanel,
      setShowSettingsPanel: state.setShowSettingsPanel,
      reconnectCount: state.reconnectCount,
      dataReady,
      isMarketSwitching: isMarketSwitching,
      isChangingTimeframe,
      panelHeights,
      setPanelHeights,
      collapsedPanels,
      setCollapsedPanels,
      isDraggingPanel,
      setIsDraggingPanel,
      activeIndicatorId,
      setActiveIndicatorId,
      setShowIndicatorPanel: state.setShowIndicatorPanel,
      toggleIndicator,
      showTimeframeSelector,
      setShowTimeframeSelector,
      shouldFetchOlderData,
      expiryIntervalMinutes,
      setExpiryIntervalMinutes,
      clearSymbolCache,
      clearCurrentData,
      calculateSeparatePanelsHeight,
      indicators: indicatorHooks.indicators || [],
      forceCalculateAll: indicatorHooks.forceCalculateAll || (() => {}),
      subscribeToPrice,
      subscribeToTimeFrame,
      updateIndicator: indicatorHooks.updateIndicator || (() => {}),
      addIndicator: indicatorHooks.addIndicator || (() => {}),
      removeIndicator: indicatorHooks.removeIndicator || (() => {}),
      drawingTools,
      activeDrawingTool: null,
      isDrawing: false,
      currentDrawing: null,
      showDrawingToolbar: false,
      showVolumeProfile: false,
      showPatternRecognition: false,
      priceAlerts,
      setDrawingTool: () => {},
      clearDrawings: () => {},
      setShowDrawingToolbar: () => {},
      toggleVolumeProfile: () => {},
      togglePatternRecognition: () => {},
      addPriceAlert: () => {},
      removePriceAlert: () => {},
      expiryMarkers: [], // Remove empty array - will be managed by renderer
      priceScaleWidth: 60,
      timeScaleHeight: 30,
      zoomIn: interactionHooks.zoomIn,
      zoomOut: interactionHooks.zoomOut,
      resetZoom: interactionHooks.resetZoom,
      priceToY: interactionHooks.priceToY,
      yToPrice: interactionHooks.yToPrice,
    }),
    [
      state,
      candleData,
      loading,
      error,
      refreshData,
      setGlobalCandleData,
      fetchOlderData,
      requestOlderData,
      isLoadingOlderData,
      hasReachedOldestData,
      viewportCandleCapacity,
      calculateViewportCapacity,
      symbol,
      orders,
      onPriceUpdate,
      handleTimeFrameChange,
      darkMode,
      panelHeights,
      collapsedPanels,
      isDraggingPanel,
      activeIndicatorId,
      showTimeframeSelector,
      expiryIntervalMinutes,
      isMarketSwitching,
      isChangingTimeframe,
      clearSymbolCache,
      clearCurrentData,
      indicatorHooks,
      subscribeToPrice,
      subscribeToTimeFrame,
      toggleIndicator,
      interactionHooks,
    ]
  );

  useEffect(() => {
    if (onChartContextReady) {
      onChartContextReady(value);
    }
  }, [value, onChartContextReady]);

  return (
    <ChartContext.Provider value={value}>
      <div
        ref={state.containerRef}
        className="relative w-full h-full chart-container"
        style={{ width: "100%", height: "100%", minHeight: "400px" }}
      >
        {children}
      </div>
    </ChartContext.Provider>
  );
};

export const useChart = () => {
  const context = useContext(ChartContext);
  if (context === undefined) {
    throw new Error("useChart must be used within a ChartProvider");
  }
  return context;
};

export const useChartContext = useChart;
