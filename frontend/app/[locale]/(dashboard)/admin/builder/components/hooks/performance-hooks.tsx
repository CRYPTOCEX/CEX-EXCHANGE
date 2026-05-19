import React, {
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useState,
  startTransition,
} from "react";

// Debounce hook for performance optimization
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(() => {
    const debouncedFunction = ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T;

    return debouncedFunction;
  }, [delay]);
}

// Throttle hook for performance optimization
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const lastCalledRef = useRef(0);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(() => {
    const throttledFunction = ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCalledRef.current >= delay) {
        lastCalledRef.current = now;
        callbackRef.current(...args);
      }
    }) as T;

    return throttledFunction;
  }, [delay]);
}

// Render tracker for development debugging
export function useRenderTracker(componentName: string) {
  const renderCount = useRef(0);
  renderCount.current++;

  if (process.env.NODE_ENV === "development") {
    console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);
  }

  return renderCount.current;
}

// Memoized callback that only changes when dependencies change
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    []
  );
}

// Efficient deep comparison hook
export function useDeepMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | undefined>(
    undefined
  );

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

// Simple deep equality check for primitive values and simple objects
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

// Batched updates hook using React's startTransition
export function useBatchedUpdates() {
  return useCallback((updates: (() => void)[]) => {
    startTransition(() => {
      updates.forEach((update) => update());
    });
  }, []);
}

// Memory usage tracker (development only)
export function useMemoryTracker(interval = 10000) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && "memory" in performance) {
      const trackMemory = () => {
        const memory = (performance as any).memory;
        console.log("📊 Memory Usage:", {
          used: Math.round(memory.usedJSHeapSize / 1048576) + " MB",
          total: Math.round(memory.totalJSHeapSize / 1048576) + " MB",
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + " MB",
        });
      };

      trackMemory(); // Initial check
      const intervalId = setInterval(trackMemory, interval);

      return () => clearInterval(intervalId);
    }
  }, [interval]);
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [elementRef, options]);

  return isIntersecting;
}

// Optimized event handler that prevents default and stops propagation
export function useEventHandler<T extends Event = Event>(
  handler: (event: T) => void,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {}
) {
  return useCallback(
    (event: T) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      if (options.stopPropagation) {
        event.stopPropagation();
      }
      handler(event);
    },
    [handler, options.preventDefault, options.stopPropagation]
  );
}

// CSS-in-JS optimization hook
export function useOptimizedStyles<T extends Record<string, any>>(
  styleFactory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(styleFactory, deps);
}

// Cleanup effect for preventing memory leaks
export function useCleanup(cleanup: () => void) {
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
}
