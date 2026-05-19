import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UIStore {
  // Modals
  isSettingsOpen: boolean;
  isLayoutSaveOpen: boolean;
  isCommandPaletteOpen: boolean;

  // Panels
  focusedPanel: string | null;
  maximizedPanel: string | null;

  // Trading form
  tradingSide: "buy" | "sell";
  orderType: "market" | "limit" | "stop_market" | "stop_limit";

  // Actions
  openSettings: () => void;
  closeSettings: () => void;
  openLayoutSave: () => void;
  closeLayoutSave: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setFocusedPanel: (panelId: string | null) => void;
  setMaximizedPanel: (panelId: string | null) => void;
  toggleMaximizedPanel: (panelId: string) => void;
  setTradingSide: (side: "buy" | "sell") => void;
  setOrderType: (
    type: "market" | "limit" | "stop_market" | "stop_limit"
  ) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      isSettingsOpen: false,
      isLayoutSaveOpen: false,
      isCommandPaletteOpen: false,
      focusedPanel: null,
      maximizedPanel: null,
      tradingSide: "buy",
      orderType: "limit",

      // Modal actions
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      openLayoutSave: () => set({ isLayoutSaveOpen: true }),
      closeLayoutSave: () => set({ isLayoutSaveOpen: false }),
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

      // Panel actions
      setFocusedPanel: (panelId) => set({ focusedPanel: panelId }),
      setMaximizedPanel: (panelId) => set({ maximizedPanel: panelId }),
      toggleMaximizedPanel: (panelId) => {
        const current = get().maximizedPanel;
        set({ maximizedPanel: current === panelId ? null : panelId });
      },

      // Trading form actions
      setTradingSide: (side) => set({ tradingSide: side }),
      setOrderType: (type) => set({ orderType: type }),

      // Close all modals
      closeAllModals: () =>
        set({
          isSettingsOpen: false,
          isLayoutSaveOpen: false,
          isCommandPaletteOpen: false,
        }),
    }),
    { name: "TradingProUI" }
  )
);
