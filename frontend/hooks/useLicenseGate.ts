"use client";

interface UseLicenseGateOptions {
  extensionName: string;
  skip?: boolean;
  returnPath?: string;
}

export type LicenseGateStatus = "pending" | "granted" | "denied" | "unknown";

interface UseLicenseGateResult {
  status: LicenseGateStatus;
  isLicenseValid: boolean;
  isLoading: boolean;
  productId: string | null;
  error: string | null;
  recheck: () => Promise<void>;
}

const licenseCache = new Map<string, { valid: boolean; productId: string; timestamp: number }>();

/** Always grant — no activation redirect. */
export function useLicenseGate(_options: UseLicenseGateOptions): UseLicenseGateResult {
  return {
    status: "granted",
    isLicenseValid: true,
    isLoading: false,
    productId: "BYPASSED",
    error: null,
    recheck: async () => {},
  };
}

export function clearLicenseCache(extensionName?: string) {
  if (extensionName) licenseCache.delete(extensionName);
  else licenseCache.clear();
}
