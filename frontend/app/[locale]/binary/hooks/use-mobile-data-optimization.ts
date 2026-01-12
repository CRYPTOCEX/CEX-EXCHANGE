"use client";

/**
 * Mobile Data Optimization Hook
 *
 * Provides optimizations for mobile data usage:
 * - Reduced update frequency for WebSocket data
 * - Throttled price updates
 * - Network-aware quality settings
 * - Memory-efficient data handling
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type NetworkQuality = "fast" | "medium" | "slow" | "offline";
export type DataSaverMode = "off" | "moderate" | "aggressive";

export interface MobileDataConfig {
  /** Enable data saver mode */
  dataSaverMode: DataSaverMode;
  /** Price update throttle interval (ms) */
  priceUpdateThrottle: number;
  /** Chart data update throttle (ms) */
  chartUpdateThrottle: number;
  /** Maximum candles to keep in memory */
  maxCandlesInMemory: number;
  /** Reduce animation quality on slow networks */
  reduceAnimations: boolean;
  /** Disable heatmap on slow networks */
  disableHeatmap: boolean;
  /** Reduce indicator calculations on slow networks */
  reduceIndicators: boolean;
}

export interface MobileDataState extends MobileDataConfig {
  /** Current network quality */
  networkQuality: NetworkQuality;
  /** Whether the device is on a metered connection */
  isMeteredConnection: boolean;
  /** Estimated effective bandwidth (Mbps) */
  effectiveBandwidth: number;
  /** Whether data saver is active (user or network triggered) */
  isDataSaverActive: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MobileDataConfig = {
  dataSaverMode: "off",
  priceUpdateThrottle: 100,
  chartUpdateThrottle: 250,
  maxCandlesInMemory: 500,
  reduceAnimations: false,
  disableHeatmap: false,
  reduceIndicators: false,
};

const DATA_SAVER_CONFIGS: Record<DataSaverMode, Partial<MobileDataConfig>> = {
  off: {},
  moderate: {
    priceUpdateThrottle: 250,
    chartUpdateThrottle: 500,
    maxCandlesInMemory: 300,
    reduceAnimations: true,
    disableHeatmap: false,
    reduceIndicators: false,
  },
  aggressive: {
    priceUpdateThrottle: 500,
    chartUpdateThrottle: 1000,
    maxCandlesInMemory: 150,
    reduceAnimations: true,
    disableHeatmap: true,
    reduceIndicators: true,
  },
};

const NETWORK_QUALITY_CONFIGS: Record<NetworkQuality, Partial<MobileDataConfig>> = {
  fast: {},
  medium: {
    priceUpdateThrottle: 200,
    chartUpdateThrottle: 400,
    reduceAnimations: false,
  },
  slow: {
    priceUpdateThrottle: 400,
    chartUpdateThrottle: 800,
    maxCandlesInMemory: 200,
    reduceAnimations: true,
    disableHeatmap: true,
  },
  offline: {
    priceUpdateThrottle: 1000,
    chartUpdateThrottle: 2000,
    maxCandlesInMemory: 100,
    reduceAnimations: true,
    disableHeatmap: true,
    reduceIndicators: true,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function getNetworkQuality(): NetworkQuality {
  if (typeof navigator === "undefined") return "fast";

  // Check if offline
  if (!navigator.onLine) return "offline";

  // Use Network Information API if available
  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
      downlink?: number;
    };
  }).connection;

  if (connection?.effectiveType) {
    switch (connection.effectiveType) {
      case "4g":
        return "fast";
      case "3g":
        return "medium";
      case "2g":
      case "slow-2g":
        return "slow";
      default:
        return "fast";
    }
  }

  return "fast";
}

function getEffectiveBandwidth(): number {
  if (typeof navigator === "undefined") return 10;

  const connection = (navigator as Navigator & {
    connection?: { downlink?: number };
  }).connection;

  return connection?.downlink ?? 10;
}

function isMeteredConnection(): boolean {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean };
  }).connection;

  return connection?.saveData ?? false;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = "binary_mobile_data_settings";

function loadSettings(): Partial<MobileDataConfig> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: Partial<MobileDataConfig>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseMobileDataOptimizationOptions {
  /** Enable automatic network-based adjustments */
  autoAdjust?: boolean;
  /** Callback when network quality changes */
  onNetworkChange?: (quality: NetworkQuality) => void;
}

export function useMobileDataOptimization(options: UseMobileDataOptimizationOptions = {}) {
  const { autoAdjust = true, onNetworkChange } = options;

  // Load saved settings
  const [userSettings, setUserSettings] = useState<Partial<MobileDataConfig>>(() => loadSettings());
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("fast");
  const [isMetered, setIsMetered] = useState(false);
  const [bandwidth, setBandwidth] = useState(10);

  // Track previous network quality for change detection
  const prevNetworkQualityRef = useRef(networkQuality);

  // Compute effective config
  const config: MobileDataState = {
    ...DEFAULT_CONFIG,
    // Apply network-based adjustments if auto-adjust is enabled
    ...(autoAdjust ? NETWORK_QUALITY_CONFIGS[networkQuality] : {}),
    // Apply data saver mode settings
    ...DATA_SAVER_CONFIGS[userSettings.dataSaverMode || "off"],
    // Apply user overrides
    ...userSettings,
    // State properties
    networkQuality,
    isMeteredConnection: isMetered,
    effectiveBandwidth: bandwidth,
    isDataSaverActive:
      (userSettings.dataSaverMode && userSettings.dataSaverMode !== "off") ||
      isMetered ||
      networkQuality === "slow" ||
      networkQuality === "offline",
  };

  // Monitor network changes
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const updateNetworkInfo = () => {
      const quality = getNetworkQuality();
      setNetworkQuality(quality);
      setIsMetered(isMeteredConnection());
      setBandwidth(getEffectiveBandwidth());

      // Notify on quality change
      if (quality !== prevNetworkQualityRef.current) {
        prevNetworkQualityRef.current = quality;
        onNetworkChange?.(quality);
      }
    };

    // Initial check
    updateNetworkInfo();

    // Listen for connection changes
    const connection = (navigator as Navigator & {
      connection?: EventTarget;
    }).connection;

    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
    }

    // Listen for online/offline events
    window.addEventListener("online", updateNetworkInfo);
    window.addEventListener("offline", updateNetworkInfo);

    return () => {
      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
      window.removeEventListener("online", updateNetworkInfo);
      window.removeEventListener("offline", updateNetworkInfo);
    };
  }, [onNetworkChange]);

  // Set data saver mode
  const setDataSaverMode = useCallback((mode: DataSaverMode) => {
    setUserSettings((prev) => {
      const newSettings = { ...prev, dataSaverMode: mode };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Update individual settings
  const updateSettings = useCallback((updates: Partial<MobileDataConfig>) => {
    setUserSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setUserSettings({});
    saveSettings({});
  }, []);

  // Throttle helper - returns a throttled version of a callback
  const createThrottledCallback = useCallback(
    <T extends (...args: unknown[]) => unknown>(
      callback: T,
      throttleMs: number = config.priceUpdateThrottle
    ): T => {
      let lastCall = 0;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      return ((...args: unknown[]) => {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;

        if (timeSinceLastCall >= throttleMs) {
          lastCall = now;
          return callback(...args);
        }

        // Schedule trailing call
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            lastCall = Date.now();
            timeoutId = null;
            callback(...args);
          }, throttleMs - timeSinceLastCall);
        }
      }) as T;
    },
    [config.priceUpdateThrottle]
  );

  return {
    // Current configuration
    config,

    // Actions
    setDataSaverMode,
    updateSettings,
    resetSettings,
    createThrottledCallback,

    // Convenience getters
    shouldReduceAnimations: config.reduceAnimations,
    shouldDisableHeatmap: config.disableHeatmap,
    shouldReduceIndicators: config.reduceIndicators,
    isOffline: networkQuality === "offline",
    isSlowNetwork: networkQuality === "slow" || networkQuality === "offline",
  };
}

// ============================================================================
// THROTTLE HOOK
// ============================================================================

/**
 * Hook to throttle a value update
 * Useful for reducing re-renders from rapidly changing values (like prices)
 */
export function useThrottledValue<T>(value: T, throttleMs: number = 100): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateRef = useRef(Date.now());
  const pendingValueRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    pendingValueRef.current = value;

    if (timeSinceLastUpdate >= throttleMs) {
      lastUpdateRef.current = now;
      setThrottledValue(value);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setThrottledValue(pendingValueRef.current);
        timeoutRef.current = null;
      }, throttleMs - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, throttleMs]);

  return throttledValue;
}

export default useMobileDataOptimization;
