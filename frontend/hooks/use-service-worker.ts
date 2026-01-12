"use client";

// Binary Trading Service Worker Hook
// PERFORMANCE: Register and interact with the service worker for caching

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isReady: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export interface CacheStats {
  staticCount: number;
  dynamicCount: number;
}

export interface UseServiceWorkerReturn {
  state: ServiceWorkerState;
  clearCache: () => Promise<boolean>;
  clearDynamicCache: () => Promise<boolean>;
  getCacheStats: () => Promise<CacheStats>;
  prefetchUrls: (urls: string[]) => Promise<void>;
  update: () => Promise<void>;
}

// ============================================================================
// SERVICE WORKER UTILITIES
// ============================================================================

/**
 * Send a message to the service worker and wait for a response
 */
async function sendMessage(
  registration: ServiceWorkerRegistration,
  message: { type: string; payload?: unknown }
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    const sw = registration.active || registration.waiting || registration.installing;
    if (!sw) {
      reject(new Error("No active service worker"));
      return;
    }

    sw.postMessage(message, [messageChannel.port2]);

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error("Service worker message timeout"));
    }, 5000);
  });
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to register and interact with the binary trading service worker
 */
export function useServiceWorker(
  swPath: string = "/binary-sw.js",
  autoRegister: boolean = true
): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isReady: false,
    registration: null,
    error: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Check if service workers are supported
  useEffect(() => {
    const isSupported = "serviceWorker" in navigator;
    setState((prev) => ({ ...prev, isSupported }));

    if (!isSupported) {
      console.warn("[SW Hook] Service workers not supported");
    }
  }, []);

  // Register the service worker
  useEffect(() => {
    if (!state.isSupported || !autoRegister) return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(swPath, {
          scope: "/",
        });

        if (cancelled) return;

        console.log("[SW Hook] Service worker registered:", registration.scope);
        registrationRef.current = registration;

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
          error: null,
        }));

        // Wait for the service worker to be ready
        if (registration.active) {
          setState((prev) => ({ ...prev, isReady: true }));
        } else {
          // Wait for activation
          const waitForActive = () => {
            if (registration.active) {
              setState((prev) => ({ ...prev, isReady: true }));
            }
          };

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "activated") {
                  setState((prev) => ({ ...prev, isReady: true }));
                }
              });
            }
          });

          // Check if already active after a short delay
          setTimeout(waitForActive, 100);
        }
      } catch (error) {
        console.error("[SW Hook] Registration failed:", error);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: error as Error,
          }));
        }
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [state.isSupported, autoRegister, swPath]);

  // Clear all caches
  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!registrationRef.current) return false;

    try {
      const result = await sendMessage(registrationRef.current, {
        type: "CLEAR_CACHE",
      });
      return (result as { success: boolean })?.success ?? false;
    } catch (error) {
      console.error("[SW Hook] Failed to clear cache:", error);
      return false;
    }
  }, []);

  // Clear dynamic cache only
  const clearDynamicCache = useCallback(async (): Promise<boolean> => {
    if (!registrationRef.current) return false;

    try {
      const result = await sendMessage(registrationRef.current, {
        type: "CLEAR_DYNAMIC_CACHE",
      });
      return (result as { success: boolean })?.success ?? false;
    } catch (error) {
      console.error("[SW Hook] Failed to clear dynamic cache:", error);
      return false;
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(async (): Promise<CacheStats> => {
    if (!registrationRef.current) {
      return { staticCount: 0, dynamicCount: 0 };
    }

    try {
      const result = await sendMessage(registrationRef.current, {
        type: "GET_CACHE_STATS",
      });
      return result as CacheStats;
    } catch (error) {
      console.error("[SW Hook] Failed to get cache stats:", error);
      return { staticCount: 0, dynamicCount: 0 };
    }
  }, []);

  // Prefetch URLs
  const prefetchUrls = useCallback(async (urls: string[]): Promise<void> => {
    if (!registrationRef.current) return;

    try {
      await sendMessage(registrationRef.current, {
        type: "PREFETCH",
        payload: { urls },
      });
    } catch (error) {
      console.error("[SW Hook] Failed to prefetch URLs:", error);
    }
  }, []);

  // Update the service worker
  const update = useCallback(async (): Promise<void> => {
    if (!registrationRef.current) return;

    try {
      await registrationRef.current.update();
      console.log("[SW Hook] Service worker update check completed");
    } catch (error) {
      console.error("[SW Hook] Failed to update service worker:", error);
    }
  }, []);

  return {
    state,
    clearCache,
    clearDynamicCache,
    getCacheStats,
    prefetchUrls,
    update,
  };
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * Prefetch chart data for a symbol/timeframe combination
 */
export function prefetchChartData(
  symbol: string,
  timeframe: string,
  limit: number = 500
): void {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready.then((registration) => {
    const sw = registration.active;
    if (!sw) return;

    const url = `/api/v1/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`;
    sw.postMessage({
      type: "PREFETCH",
      payload: { urls: [url] },
    });
  });
}

/**
 * Prefetch market data
 */
export function prefetchMarketData(): void {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready.then((registration) => {
    const sw = registration.active;
    if (!sw) return;

    sw.postMessage({
      type: "PREFETCH",
      payload: {
        urls: [
          "/api/v1/markets",
          "/api/v1/symbols",
          "/api/v1/tickers",
        ],
      },
    });
  });
}
