import { useEffect, useState } from "react";

/**
 * Hook to ensure hydration-safe rendering
 * Returns true only after the component has mounted on the client
 * This prevents server/client mismatch errors
 */
export function useHydrationSafe() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Hook to safely get theme value after hydration
 * Prevents hydration mismatch with theme-dependent rendering
 */
export function useHydrationSafeTheme(theme: string | undefined, defaultTheme: string = "light") {
  const isHydrated = useHydrationSafe();
  return isHydrated ? theme : defaultTheme;
} 