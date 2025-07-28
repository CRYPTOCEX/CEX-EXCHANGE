"use client";

import { useState, useEffect } from "react";

export function useTradingMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    // Initial check
    checkDevice();

    // Add event listener for window resize
    window.addEventListener("resize", checkDevice);

    // Cleanup
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return { isMobile, isTablet };
}

// Export an alias for backward compatibility
export const useIsMobile = () => {
  const { isMobile } = useTradingMobile();
  return isMobile;
};
