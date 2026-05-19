/**
 * useCleanup Hook
 *
 * A React hook for managing cleanup of intervals, timeouts, subscriptions,
 * and event listeners. Automatically cleans up on component unmount.
 */

import { useEffect, useRef, useCallback } from "react";
import {
  CleanupRegistry,
  SubscriptionManager,
  createManagedInterval,
  createManagedTimeout,
} from "@/lib/utils/cleanup-utils";

/**
 * Hook for managing component cleanup
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     addInterval,
 *     addTimeout,
 *     addEventlistener,
 *     subscribe,
 *     isMounted,
 *   } = useCleanup();
 *
 *   useEffect(() => {
 *     // These will auto-cleanup on unmount
 *     addInterval(() => console.log("tick"), 1000);
 *     addEventListener(window, "resize", handleResize);
 *     subscribe("ws-ticker", tickerWs.subscribe(...));
 *   }, []);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useCleanup() {
  const registryRef = useRef<CleanupRegistry | null>(null);
  const subscriptionsRef = useRef<SubscriptionManager | null>(null);
  const isMountedRef = useRef(true);

  // Initialize on first render
  if (registryRef.current === null) {
    registryRef.current = new CleanupRegistry();
  }
  if (subscriptionsRef.current === null) {
    subscriptionsRef.current = new SubscriptionManager();
  }

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      registryRef.current?.cleanup();
      subscriptionsRef.current?.cleanup();
    };
  }, []);

  /**
   * Add an interval that auto-cleans on unmount
   */
  const addInterval = useCallback((callback: () => void, delay: number) => {
    return registryRef.current?.addInterval(callback, delay);
  }, []);

  /**
   * Add a timeout that auto-cleans on unmount
   */
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    return registryRef.current?.addTimeout(callback, delay);
  }, []);

  /**
   * Add an animation frame that auto-cleans on unmount
   */
  const addAnimationFrame = useCallback((callback: FrameRequestCallback) => {
    return registryRef.current?.addAnimationFrame(callback);
  }, []);

  /**
   * Add an event listener that auto-cleans on unmount
   */
  const addEventListener = useCallback(<K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    type: K,
    listener: (e: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ) => {
    return registryRef.current?.addEventListener(target, type, listener, options);
  }, []);

  /**
   * Create an abort controller for fetch requests
   */
  const createAbortController = useCallback(() => {
    return registryRef.current?.addAbortController();
  }, []);

  /**
   * Subscribe to something with a unique key (auto-cleans on unmount)
   */
  const subscribe = useCallback((key: string, unsubscribe: () => void) => {
    subscriptionsRef.current?.subscribe(key, unsubscribe);
  }, []);

  /**
   * Unsubscribe from a specific subscription
   */
  const unsubscribe = useCallback((key: string) => {
    subscriptionsRef.current?.unsubscribe(key);
  }, []);

  /**
   * Register a custom cleanup function
   */
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    return registryRef.current?.register(cleanupFn);
  }, []);

  /**
   * Check if component is still mounted
   */
  const isMounted = useCallback(() => {
    return isMountedRef.current;
  }, []);

  /**
   * Safe state setter that checks mount status
   */
  const safeSetState = useCallback(<T>(setter: (value: T) => void) => {
    return (value: T) => {
      if (isMountedRef.current) {
        setter(value);
      }
    };
  }, []);

  return {
    addInterval,
    addTimeout,
    addAnimationFrame,
    addEventListener,
    createAbortController,
    subscribe,
    unsubscribe,
    registerCleanup,
    isMounted,
    safeSetState,
    // Expose refs for advanced usage
    registryRef,
    subscriptionsRef,
    isMountedRef,
  };
}

/**
 * Hook for a simple mounted state check
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMounted = useIsMounted();
 *
 *   useEffect(() => {
 *     fetchData().then(data => {
 *       if (isMounted()) {
 *         setData(data);
 *       }
 *     });
 *   }, []);
 * }
 * ```
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Hook for managing a single interval with start/stop control
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { start, stop, isRunning } = useManagedInterval(
 *     () => console.log("tick"),
 *     1000
 *   );
 *
 *   return (
 *     <button onClick={isRunning ? stop : start}>
 *       {isRunning ? "Stop" : "Start"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useManagedInterval(callback: () => void, delay: number) {
  const intervalRef = useRef<ReturnType<typeof createManagedInterval> | null>(null);

  // Create on first render
  if (intervalRef.current === null) {
    intervalRef.current = createManagedInterval(callback, delay);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalRef.current?.stop();
    };
  }, []);

  return {
    start: useCallback(() => intervalRef.current?.start(), []),
    stop: useCallback(() => intervalRef.current?.stop(), []),
    restart: useCallback(() => intervalRef.current?.restart(), []),
    isRunning: useCallback(() => intervalRef.current?.isRunning() ?? false, []),
  };
}

/**
 * Hook for managing a single timeout with start/cancel control
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { start, cancel, isPending } = useManagedTimeout(
 *     () => console.log("done"),
 *     5000
 *   );
 *
 *   return (
 *     <>
 *       <button onClick={start}>Start Timer</button>
 *       <button onClick={cancel} disabled={!isPending}>Cancel</button>
 *     </>
 *   );
 * }
 * ```
 */
export function useManagedTimeout(callback: () => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof createManagedTimeout> | null>(null);

  // Create on first render
  if (timeoutRef.current === null) {
    timeoutRef.current = createManagedTimeout(callback, delay);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRef.current?.cancel();
    };
  }, []);

  return {
    start: useCallback(() => timeoutRef.current?.start(), []),
    cancel: useCallback(() => timeoutRef.current?.cancel(), []),
    restart: useCallback(() => timeoutRef.current?.restart(), []),
    isPending: useCallback(() => timeoutRef.current?.isPending() ?? false, []),
  };
}

export default useCleanup;
