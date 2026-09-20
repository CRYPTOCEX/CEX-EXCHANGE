"use client";

import { useState, useEffect } from "react";

/**
 * SSR-safe function to get initial mobile state.
 * Uses a default that matches the majority of users or the "safer" option.
 * For trading UI, defaulting to undefined (no layout) until client detection is safer.
 */
function getInitialMobileState(): boolean | undefined {
  // On server, we can't detect - return undefined to indicate "not yet determined"
  if (typeof window === "undefined") {
    return undefined;
  }
  // On client during initial render (before hydration), also return undefined
  // to prevent hydration mismatch
  return undefined;
}

export function useTradingMobile() {
  // Start with undefined to avoid hydration mismatch
  const [isMobile, setIsMobile] = useState<boolean | undefined>(getInitialMobileState);
  const [isTablet, setIsTablet] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    // Initial check - runs after hydration so it's safe
    checkDevice();

    // Add event listener for window resize
    window.addEventListener("resize", checkDevice);

    // Cleanup
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return { isMobile, isTablet };
}

// Export an alias for backward compatibility
// Returns boolean (defaults to false if undefined for backward compat)
export const useIsMobile = () => {
  const { isMobile } = useTradingMobile();
  return isMobile ?? false;
};
