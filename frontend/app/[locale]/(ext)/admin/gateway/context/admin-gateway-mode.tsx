"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type GatewayMode = "LIVE" | "TEST";

interface AdminGatewayModeContextType {
  mode: GatewayMode;
  setMode: (mode: GatewayMode) => void;
  isTestMode: boolean;
}

const AdminGatewayModeContext = createContext<AdminGatewayModeContextType | undefined>(undefined);

const STORAGE_KEY = "admin-gateway-mode";

export function AdminGatewayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<GatewayMode>("LIVE");
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
  const setMode = (newMode: GatewayMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  // Don't render children until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <AdminGatewayModeContext.Provider
      value={{
        mode,
        setMode,
        isTestMode: mode === "TEST",
      }}
    >
      {children}
    </AdminGatewayModeContext.Provider>
  );
}

export function useAdminGatewayMode() {
  const context = useContext(AdminGatewayModeContext);
  if (context === undefined) {
    throw new Error("useAdminGatewayMode must be used within an AdminGatewayModeProvider");
  }
  return context;
}
