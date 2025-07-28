"use client";

import type React from "react";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  createIndicator,
  indicatorRegistry,
} from "../canvas/render/toolbar/indicators/registry";
import type { Indicator } from "../canvas/render/toolbar/indicators/registry";

type ChartIndicatorsContextType = {
  indicators: Indicator[];
  setIndicators: React.Dispatch<React.SetStateAction<Indicator[]>>;
  addIndicator: (params: { type: string; params?: any }) => void;
  removeIndicator: (id: string) => void;
  updateIndicator: (id: string, updates: Partial<Indicator>) => void;
  calculateIndicators: (data: any[]) => void;
  toggleIndicator: (id: string) => void;
  getIndicatorById: (id: string) => Indicator | undefined;
  forceCalculateAll: () => void;
};

const ChartIndicatorsContext = createContext<ChartIndicatorsContextType>({
  indicators: [],
  setIndicators: () => {},
  addIndicator: () => {},
  removeIndicator: () => {},
  updateIndicator: () => {},
  calculateIndicators: () => {},
  toggleIndicator: () => {},
  getIndicatorById: () => undefined,
  forceCalculateAll: () => {},
});

export const useChartIndicators = () => useContext(ChartIndicatorsContext);

export const ChartIndicatorsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  // Refs for tracking calculation state
  const lastCalculationRef = useRef<number>(0);
  const isUpdatingRef = useRef<boolean>(false);
  const lastDataLengthRef = useRef<number>(0);
  const indicatorsRef = useRef<Indicator[]>([]);
  const latestCandleDataRef = useRef<any[]>([]);

  // Keep the refs updated with the latest values
  useEffect(() => {
    indicatorsRef.current = indicators;
  }, [indicators]);

  // Initialize indicators
  useEffect(() => {
    // Add default SMA indicator
    const sma = createIndicator("sma");
    if (sma) {
      sma.params.period = 20;
      sma.color = "#3b82f6"; // Blue
    }

    // Add default RSI indicator
    const rsi = createIndicator("rsi");
    if (rsi) {
      rsi.params.period = 14;
      rsi.color = "#8b5cf6"; // Purple
      rsi.separatePanel = true;
    }

    setIndicators([sma, rsi].filter(Boolean) as Indicator[]);
  }, []);

  // Add a new indicator
  const addIndicator = useCallback((params: { type: string; params?: any }) => {
    const newIndicator = createIndicator(params.type as any);

    if (newIndicator) {
      // Apply custom params if provided
      if (params.params) {
        newIndicator.params = { ...newIndicator.params, ...params.params };
      }

      // Set visible to true by default when adding
      newIndicator.visible = true;

      setIndicators((prev) => {
        // Make sure we don't add duplicates
        const exists = prev.some((ind) => ind.type === params.type);
        if (exists) {
          return prev.map((ind) =>
            ind.type === params.type
              ? { ...ind, visible: true } // Make existing indicator visible
              : ind
          );
        } else {
          return [...prev, newIndicator];
        }
      });

      // Force recalculation
      setTimeout(() => {
        if (latestCandleDataRef.current.length > 0) {
          calculateIndicators(latestCandleDataRef.current);
        }
      }, 100);
    }
  }, []);

  // Remove an indicator
  const removeIndicator = useCallback((id: string) => {
    setIndicators((prev) => prev.filter((indicator) => indicator.id !== id));
  }, []);

  // Update an indicator
  const updateIndicator = useCallback(
    (id: string, updates: Partial<Indicator>) => {
      if (!id) {
        return;
      }

      setIndicators((prev) => {
        // Find the indicator first to check if it exists
        const indicator = prev.find((ind) => ind.id === id);

        if (!indicator) {
          return prev;
        }

        // Return the updated array
        return prev.map((ind) =>
          ind.id === id ? { ...ind, ...updates } : ind
        );
      });

      // Force recalculation after updates
      setTimeout(() => {
        if (latestCandleDataRef.current.length > 0) {
          calculateIndicators(latestCandleDataRef.current);
        }
      }, 100);
    },
    []
  );

  // Toggle indicator visibility
  const toggleIndicator = useCallback((id: string) => {
    if (!id) {
      return;
    }

    setIndicators((prev) => {
      // Find the indicator first to check if it exists
      const indicator = prev.find((ind) => ind.id === id);

      if (!indicator) {
        return prev;
      }

      // Create a new array with the toggled indicator
      const newIndicators = prev.map((ind) =>
        ind.id === id ? { ...ind, visible: !ind.visible } : ind
      );

      // Update the ref immediately for other functions that might use it
      indicatorsRef.current = newIndicators;

      // Return the new array
      return newIndicators;
    });

    // Force recalculation after toggling
    setTimeout(() => {
      if (latestCandleDataRef.current.length > 0) {
        calculateIndicators(latestCandleDataRef.current);
      }
    }, 100);
  }, []);

  // Get indicator by ID
  const getIndicatorById = useCallback(
    (id: string) => {
      return indicators.find((indicator) => indicator.id === id);
    },
    [indicators]
  );

  // Force recalculation of all indicators
  const forceCalculateAll = useCallback(() => {
    if (latestCandleDataRef.current.length > 0) {
      calculateIndicators(latestCandleDataRef.current);
    }
  }, []);

  // Calculate indicator values
  const calculateIndicators = useCallback(
    (data: any[]) => {
      if (!data || data.length === 0) {
        return;
      }

      // Store the latest data for future recalculations
      latestCandleDataRef.current = data;

      // Check if we're already calculating or if the data hasn't changed
      if (isUpdatingRef.current) {
        return;
      }

      // Check if the data is the same as last time
      if (
        data.length === lastDataLengthRef.current &&
        Date.now() - lastCalculationRef.current < 1000
      ) {
        return;
      }

      // Update tracking variables
      isUpdatingRef.current = true;
      lastDataLengthRef.current = data.length;
      lastCalculationRef.current = Date.now();

      try {
        // Create a new array of indicators with calculated values
        const updatedIndicators = indicators.map((indicator) => {
          try {
            // Get the calculation function from the registry
            const indicatorDef = indicatorRegistry[indicator.type];
            if (!indicatorDef) return indicator;

            // Calculate the indicator values
            const values = indicatorDef.calculate(data, indicator.params);

            // Return updated indicator with calculated values
            return {
              ...indicator,
              data: values,
            };
          } catch (error) {
            return indicator;
          }
        });

        // Only update state if there are actual changes
        const hasChanges =
          JSON.stringify(updatedIndicators) !== JSON.stringify(indicators);

        if (hasChanges) {
          setIndicators(updatedIndicators);
        }
      } catch (error) {
        // Error handling without console.log
      } finally {
        // Reset the updating flag
        isUpdatingRef.current = false;
      }
    },
    [indicators]
  );

  return (
    <ChartIndicatorsContext.Provider
      value={{
        indicators,
        setIndicators,
        addIndicator,
        removeIndicator,
        updateIndicator,
        calculateIndicators,
        toggleIndicator,
        getIndicatorById,
        forceCalculateAll,
      }}
    >
      {children}
    </ChartIndicatorsContext.Provider>
  );
};
