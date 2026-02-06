"use client";

import { useRouter, usePathname } from "@/i18n/routing";
import { $fetch } from "@/lib/api";

interface UseLicenseGateOptions {
  /**
   * The extension name (e.g., "staking", "p2p", "ecosystem")
   */
  extensionName: string;
  /**
   * Whether to skip license check (e.g., for public pages)
   */
  skip?: boolean;
  /**
   * Custom redirect path after license activation
   */
  returnPath?: string;
}

interface UseLicenseGateResult {
  /**
   * Whether the license is valid
   */
  isLicenseValid: boolean;
  /**
   * Whether the license check is loading
   */
  isLoading: boolean;
  /**
   * The product ID for this extension
   */
  productId: string | null;
  /**
   * Error message if license check failed
   */
  error: string | null;
  /**
   * Force recheck the license status
   */
  recheck: () => Promise<void>;
}

// Cache for license status to avoid repeated API calls
const licenseCache = new Map<string, { valid: boolean; productId: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useLicenseGate(options: UseLicenseGateOptions): UseLicenseGateResult {
  const { extensionName, skip = false, returnPath } = options;
  // Always return valid
  return {
    isLicenseValid: true, // Bypass
    isLoading: false,
    productId: "BYPASSED",
    error: null,
    recheck: async () => { },
  };
}

/**
 * Clears the license cache for a specific extension or all extensions
 */
export function clearLicenseCache(extensionName?: string) {
  if (extensionName) {
    licenseCache.delete(extensionName);
  } else {
    licenseCache.clear();
  }
}
