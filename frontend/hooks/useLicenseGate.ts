"use client";

import { useState, useEffect, useCallback } from "react";
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
  const router = useRouter();
  const pathname = usePathname();

  const [isLicenseValid, setIsLicenseValid] = useState(true); // BYPASS: Always start as valid
  const [isLoading, setIsLoading] = useState(false); // BYPASS: Never show loading
  const [productId, setProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkLicense = useCallback(async () => {
    // BYPASS: Always set as valid and return early
    setIsLicenseValid(true);
    setIsLoading(false);
    return;
    
    if (skip) {
      setIsLicenseValid(true);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = licenseCache.get(extensionName);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setIsLicenseValid(cached.valid);
      setProductId(cached.productId);
      setIsLoading(false);

      if (!cached.valid) {
        // Redirect to license activation page
        router.replace(`/admin/system/license?productId=${cached.productId}&return=${encodeURIComponent(returnPath || pathname)}`);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch extensions to get product ID and license status
      const response = await $fetch({
        url: "/api/admin/system/extension",
        method: "GET",
        silent: true,
      });

      if (response.data) {
        // The API returns { extensions, blockchains, exchangeProviders }
        // Combine all product types into a single searchable array
        const allProducts = [
          ...(response.data.extensions || []),
          ...(response.data.blockchains || []),
          ...(response.data.exchangeProviders || []),
        ];

        // Also support legacy format where data is directly an array
        const products = Array.isArray(response.data) ? response.data : allProducts;

        const extension = products.find(
          (ext: any) => ext.name === extensionName || ext.chain?.toLowerCase() === extensionName.toLowerCase()
        );

        if (extension) {
          setProductId(extension.productId);

          // Check if license is verified
          if (extension.licenseVerified) {
            setIsLicenseValid(true);
            licenseCache.set(extensionName, {
              valid: true,
              productId: extension.productId,
              timestamp: Date.now(),
            });
          } else {
            setIsLicenseValid(false);
            licenseCache.set(extensionName, {
              valid: false,
              productId: extension.productId,
              timestamp: Date.now(),
            });

            // Redirect to license activation page
            router.replace(
              `/admin/system/license?productId=${extension.productId}&return=${encodeURIComponent(returnPath || pathname)}`
            );
          }
        } else {
          // Extension not found - might be a blockchain, check separately
          await checkBlockchainLicense();
        }
      }
    } catch (err: any) {
      console.error("License check failed:", err);
      setError(err.message || "Failed to check license");
      // Don't block access on error, just log it
      setIsLicenseValid(true);
    } finally {
      setIsLoading(false);
    }
  }, [extensionName, skip, router, pathname, returnPath]);

  const checkBlockchainLicense = async () => {
    try {
      const response = await $fetch({
        url: "/api/admin/ecosystem",
        method: "GET",
        silent: true,
      });

      if (response.data?.extendedChains) {
        const blockchain = response.data.extendedChains.find(
          (chain: any) => chain.chain.toLowerCase() === extensionName.toLowerCase()
        );

        if (blockchain?.info?.productId) {
          setProductId(blockchain.info.productId);

          // Verify license via API
          const verifyResponse = await $fetch({
            url: "/api/admin/system/license/verify",
            method: "POST",
            body: { productId: blockchain.info.productId },
            silent: true,
          });

          if (verifyResponse.data?.status) {
            setIsLicenseValid(true);
            licenseCache.set(extensionName, {
              valid: true,
              productId: blockchain.info.productId,
              timestamp: Date.now(),
            });
          } else {
            setIsLicenseValid(false);
            licenseCache.set(extensionName, {
              valid: false,
              productId: blockchain.info.productId,
              timestamp: Date.now(),
            });

            // Redirect to license activation page
            router.replace(
              `/admin/system/license?productId=${blockchain.info.productId}&return=${encodeURIComponent(returnPath || pathname)}`
            );
          }
        } else {
          // Extension not found, allow access (might be a core feature)
          setIsLicenseValid(true);
        }
      }
    } catch (err) {
      console.error("Blockchain license check failed:", err);
      // Allow access on error
      setIsLicenseValid(true);
    }
  };

  const recheck = useCallback(async () => {
    // Clear cache and recheck
    licenseCache.delete(extensionName);
    await checkLicense();
  }, [extensionName, checkLicense]);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  return {
    isLicenseValid,
    isLoading,
    productId,
    error,
    recheck,
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
