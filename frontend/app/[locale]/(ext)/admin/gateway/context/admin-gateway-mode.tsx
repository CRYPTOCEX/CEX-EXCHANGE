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
  /**
   * `"LIVE"` is the SERVER's answer and the client's first answer, and that
   * agreement is the whole point — see the note on rendering below.
   */
  const [mode, setModeState] = useState<GatewayMode>("LIVE");

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "TEST" || stored === "LIVE") {
      setModeState(stored);
    }
  }, []);

  // Save to localStorage when mode changes
  const setMode = (newMode: GatewayMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  /*
   * CHILDREN ALWAYS RENDER.
   *
   * This used to be `if (!mounted) return null`, commented "to prevent
   * hydration mismatch". It prevented no such thing — it prevented the PAGE.
   * This provider wraps the entire `/admin/gateway` back office, so the server
   * emitted an empty document and every route under it arrived at hydration.
   * Measured: `/en/admin/gateway` was the one route whose footer still moved
   * after the LicenseGate fix, for CLS 0.0169, because the layout it settles
   * into did not exist on the server.
   *
   * The hydration worry was misplaced. A mismatch happens when the server's
   * HTML disagrees with the client's FIRST render — not when a later effect
   * changes state. `mode` starts at `"LIVE"` in both places, so the two agree;
   * the `useEffect` above then reads `localStorage` and, on a machine that
   * chose TEST, re-renders. That is an ordinary post-hydration state update.
   *
   * Reading `localStorage` during the first render WOULD be a real mismatch,
   * and is why the value cannot simply be seeded synchronously.
   *
   * What that costs: a browser set to TEST paints the mode chip green/"Live"
   * for one frame before it turns amber/"Test". Both labels are four
   * characters in a fixed-size chip, and every consumer
   * (`layout.tsx`, `merchant/[id]/client.tsx`) uses the flag only for that
   * colour and label — so nothing moves. A one-frame colour flash is the
   * correct trade against blanking an entire back office.
   */
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
