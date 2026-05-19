"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type MerchantMode = "LIVE" | "TEST";

interface MerchantModeContextType {
  mode: MerchantMode;
  setMode: (mode: MerchantMode) => void;
  isTestMode: boolean;
}

const MerchantModeContext = createContext<MerchantModeContextType | undefined>(undefined);

const STORAGE_KEY = "merchant-mode";

export function MerchantModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MerchantMode>("LIVE");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "TEST" || stored === "LIVE") {
      setModeState(stored);
    }
    setMounted(true);
  }, []);

  // Save to localStorage when mode changes
  const setMode = (newMode: MerchantMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  // Don't render children until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <MerchantModeContext.Provider
      value={{
        mode,
        setMode,
        isTestMode: mode === "TEST",
      }}
    >
      {children}
    </MerchantModeContext.Provider>
  );
}

export function useMerchantMode() {
  const context = useContext(MerchantModeContext);
  if (context === undefined) {
    throw new Error("useMerchantMode must be used within a MerchantModeProvider");
  }
  return context;
}
