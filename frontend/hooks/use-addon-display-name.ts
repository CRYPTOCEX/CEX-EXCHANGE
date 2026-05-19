"use client";

import { useConfigStore } from "@/store/config";

const ADDON_BY_WALLET_TYPE: Record<string, string> = {
  ECO: "ecosystem",
};

export function useAddonDisplayName() {
  const extensions = useConfigStore((s) => s.extensions);

  const getWalletTypeLabel = (type: string, fallback: string) => {
    const addon = ADDON_BY_WALLET_TYPE[type];
    if (!addon) return fallback;
    return extensions?.includes(addon) ? fallback : fallback;
  };

  return { getWalletTypeLabel };
}
