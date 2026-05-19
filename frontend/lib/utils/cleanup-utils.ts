/**
 * Cleanup Utilities
 *
 * Standardized cleanup patterns for React components to prevent memory leaks.
 * Use these utilities to manage intervals, timeouts, subscriptions, and event listeners.
 */

/**
 * Cleanup registry for managing multiple cleanup functions
 */
export class CleanupRegistry {
  private cleanupFns = new Set<() => void>();
  private isCleaningUp = false;

  /**
   * Register a cleanup function to be called on cleanup
   */
  register(cleanupFn: () => void): () => void {
    this.cleanupFns.add(cleanupFn);
    // Return unregister function
    return () => {
      this.cleanupFns.delete(cleanupFn);
    };
  }

  /**
   * Add an interval and return its cleanup function
   */
  addInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.cleanupFns.add(() => clearInterval(interval));
    return interval;
  }

  /**
   * Add a timeout and return its cleanup function
   */
  addTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeout = setTimeout(callback, delay);
    this.cleanupFns.add(() => clearTimeout(timeout));
    return timeout;
  }

  /**
   * Add an animation frame request and return its cleanup function
   */
  addAnimationFrame(callback: FrameRequestCallback): number {
    const frameId = requestAnimationFrame(callback);
    this.cleanupFns.add(() => cancelAnimationFrame(frameId));
    return frameId;
  }

  /**
   * Add an event listener and return its cleanup function
   */
  addEventListener<K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    type: K,
    listener: (e: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    target.addEventListener(type, listener as EventListener, options);
    const cleanup = () => target.removeEventListener(type, listener as EventListener, options);
    this.cleanupFns.add(cleanup);
    return cleanup;
  }

  /**
   * Add an abort controller for fetch requests
   */
  addAbortController(): AbortController {
    const controller = new AbortController();
    this.cleanupFns.add(() => controller.abort());
    return controller;
  }

  /**
   * Execute all registered cleanup functions
   */
  cleanup(): void {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    this.cleanupFns.forEach((cleanupFn) => {
      try {
        cleanupFn();
      } catch (error) {
        console.warn("Error during cleanup:", error);
      }
    });

    this.cleanupFns.clear();
    this.isCleaningUp = false;
  }

  /**
   * Get the number of registered cleanup functions
   */
  get size(): number {
    return this.cleanupFns.size;
  }

  /**
   * Check if cleanup is in progress
   */
  get isCleanupInProgress(): boolean {
    return this.isCleaningUp;
  }
}

/**
 * Creates a managed interval that auto-cleans on component unmount
 * @returns Object with start, stop, and restart methods
 */
export function createManagedInterval(
  callback: () => void,
  delay: number
): {
  start: () => void;
  stop: () => void;
  restart: () => void;
  isRunning: () => boolean;
} {
  let intervalId: NodeJS.Timeout | null = null;

  return {
    start: () => {
      if (intervalId === null) {
        intervalId = setInterval(callback, delay);
      }
    },
    stop: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    restart: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      intervalId = setInterval(callback, delay);
    },
    isRunning: () => intervalId !== null,
  };
}

/**
 * Creates a managed timeout that auto-cleans on component unmount
 * @returns Object with start, cancel, and restart methods
 */
export function createManagedTimeout(
  callback: () => void,
  delay: number
): {
  start: () => void;
  cancel: () => void;
  restart: () => void;
  isPending: () => boolean;
} {
  let timeoutId: NodeJS.Timeout | null = null;

  return {
    start: () => {
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          callback();
          timeoutId = null;
        }, delay);
      }
    },
    cancel: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
    restart: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callback();
        timeoutId = null;
      }, delay);
    },
    isPending: () => timeoutId !== null,
  };
}

/**
 * Creates a debounced function with cleanup support
 */
export function createDebouncedFn<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debouncedFn = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
      lastArgs = null;
    }, delay);
  }) as T & { cancel: () => void; flush: () => void };

  debouncedFn.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debouncedFn.flush = () => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debouncedFn;
}

/**
 * Creates a throttled function with cleanup support
 */
export function createThrottledFn<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  const throttledFn = ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else {
      // Schedule a call for when the delay has passed
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  }) as T & { cancel: () => void };

  throttledFn.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFn;
}

/**
 * Subscription manager for WebSocket or event-based subscriptions
 */
export class SubscriptionManager<T = unknown> {
  private subscriptions = new Map<string, () => void>();
  private isCleaningUp = false;

  /**
   * Add a subscription with a unique key
   */
  subscribe(key: string, unsubscribe: () => void): void {
    // Clean up existing subscription with same key
    if (this.subscriptions.has(key)) {
      try {
        this.subscriptions.get(key)?.();
      } catch (error) {
        console.warn(`Error cleaning up existing subscription "${key}":`, error);
      }
    }
    this.subscriptions.set(key, unsubscribe);
  }

  /**
   * Remove a specific subscription
   */
  unsubscribe(key: string): void {
    const unsubscribeFn = this.subscriptions.get(key);
    if (unsubscribeFn) {
      try {
        unsubscribeFn();
      } catch (error) {
        console.warn(`Error unsubscribing from "${key}":`, error);
      }
      this.subscriptions.delete(key);
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    this.subscriptions.forEach((unsubscribe, key) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn(`Error cleaning up subscription "${key}":`, error);
      }
    });

    this.subscriptions.clear();
    this.isCleaningUp = false;
  }

  /**
   * Check if a subscription exists
   */
  has(key: string): boolean {
    return this.subscriptions.has(key);
  }

  /**
   * Get the number of active subscriptions
   */
  get size(): number {
    return this.subscriptions.size;
  }
}

/**
 * Creates a safe state setter that checks if component is mounted
 * @param isMountedRef - A ref that tracks if the component is mounted
 * @param setState - The actual setState function
 */
export function createSafeStateSetter<T>(
  isMountedRef: { current: boolean },
  setState: React.Dispatch<React.SetStateAction<T>>
): React.Dispatch<React.SetStateAction<T>> {
  return (value: React.SetStateAction<T>) => {
    if (isMountedRef.current) {
      setState(value);
    }
  };
}

/**
 * Type for tracking mounted state
 */
export interface MountedState {
  isMounted: boolean;
  setIsMounted: (mounted: boolean) => void;
}

/**
 * Create a simple mounted tracker
 */
export function createMountedTracker(): {
  isMounted: () => boolean;
  setMounted: (mounted: boolean) => void;
  cleanup: () => void;
} {
  let mounted = false;

  return {
    isMounted: () => mounted,
    setMounted: (value: boolean) => { mounted = value; },
    cleanup: () => { mounted = false; },
  };
}
