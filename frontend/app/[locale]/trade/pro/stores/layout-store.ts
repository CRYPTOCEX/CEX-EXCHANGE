import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { TPLayoutConfig, TPPanelConfig, TPLayoutPreset } from "../types/layout";

// Panel collapse widths
const COLLAPSED_WIDTH = "32px";
const PANEL_WIDTHS = {
  markets: "220px",
  chart: "1fr",
  orderbook: "260px",
  trading: "300px",
};

// Default layout configuration
const DEFAULT_LAYOUT: TPLayoutConfig = {
  gridColumns: "220px 1fr 260px 300px",
  gridRows: "1fr 200px",
  panels: {
    markets: {
      id: "markets",
      visible: true,
      size: 15,
      position: 0,
      gridArea: "markets",
      collapsed: false,
    },
    chart: {
      id: "chart",
      visible: true,
      size: 45,
      position: 1,
      gridArea: "chart",
      collapsed: false,
    },
    orderbook: {
      id: "orderbook",
      visible: true,
      size: 20,
      position: 2,
      gridArea: "orderbook",
      collapsed: false,
    },
    trading: {
      id: "trading",
      visible: true,
      size: 20,
      position: 3,
      gridArea: "trading",
      collapsed: false,
    },
    orders: {
      id: "orders",
      visible: true,
      size: 25,
      position: 4,
      gridArea: "orders",
      collapsed: false,
    },
    positions: {
      id: "positions",
      visible: true,
      size: 25,
      position: 5,
      gridArea: "positions",
      collapsed: false,
    },
  },
};

// System presets
const SYSTEM_PRESETS: TPLayoutPreset[] = [
  {
    id: "trading-pro",
    name: "Trading Pro",
    description: "Full-featured trading layout",
    isPreset: true,
    config: DEFAULT_LAYOUT,
  },
  {
    id: "chart-focus",
    name: "Chart Focus",
    description: "Maximized chart view",
    isPreset: true,
    config: {
      ...DEFAULT_LAYOUT,
      gridColumns: "0 1fr 280px 320px",
      panels: {
        ...DEFAULT_LAYOUT.panels,
        markets: { ...DEFAULT_LAYOUT.panels.markets, visible: false },
      },
    },
  },
  {
    id: "scalping",
    name: "Scalping",
    description: "Orderbook and quick trading focus",
    isPreset: true,
    config: {
      ...DEFAULT_LAYOUT,
      gridColumns: "0 1fr 350px 320px",
      panels: {
        ...DEFAULT_LAYOUT.panels,
        markets: { ...DEFAULT_LAYOUT.panels.markets, visible: false },
        orderbook: { ...DEFAULT_LAYOUT.panels.orderbook, size: 25 },
      },
    },
  },
  {
    id: "lite",
    name: "Lite Mode",
    description: "Simplified trading interface",
    isPreset: true,
    config: {
      gridColumns: "1fr 350px",
      gridRows: "1fr",
      panels: {
        markets: {
          id: "markets",
          visible: false,
          size: 0,
          position: 0,
          gridArea: "markets",
        },
        chart: {
          id: "chart",
          visible: true,
          size: 70,
          position: 1,
          gridArea: "chart",
        },
        orderbook: {
          id: "orderbook",
          visible: false,
          size: 0,
          position: 2,
          gridArea: "orderbook",
        },
        trading: {
          id: "trading",
          visible: true,
          size: 30,
          position: 3,
          gridArea: "trading",
        },
        orders: {
          id: "orders",
          visible: false,
          size: 0,
          position: 4,
          gridArea: "orders",
        },
        positions: {
          id: "positions",
          visible: false,
          size: 0,
          position: 5,
          gridArea: "positions",
        },
      },
    },
  },
];

// Helper to compute grid columns based on collapse state
function computeGridColumns(panels: Record<string, TPPanelConfig>): string {
  const marketsWidth = panels.markets?.collapsed ? COLLAPSED_WIDTH : PANEL_WIDTHS.markets;
  const chartWidth = PANEL_WIDTHS.chart;
  const orderbookWidth = panels.orderbook?.collapsed ? COLLAPSED_WIDTH : PANEL_WIDTHS.orderbook;
  const tradingWidth = panels.trading?.collapsed ? COLLAPSED_WIDTH : PANEL_WIDTHS.trading;
  return `${marketsWidth} ${chartWidth} ${orderbookWidth} ${tradingWidth}`;
}

// Helper to compute grid rows based on collapse state
function computeGridRows(panels: Record<string, TPPanelConfig>): string {
  const ordersCollapsed = panels.orders?.collapsed;
  return ordersCollapsed ? "1fr 32px" : "1fr 200px";
}

interface LayoutStore {
  layout: TPLayoutConfig;
  activePreset: string | null;
  presets: TPLayoutPreset[];
  customLayouts: TPLayoutPreset[];
  layoutMode: "pro" | "lite";

  // Actions (ALL localStorage based - no API calls)
  setPanelSize: (panelId: string, size: number) => void;
  setPanelVisible: (panelId: string, visible: boolean) => void;
  togglePanel: (panelId: string) => void;
  togglePanelCollapse: (panelId: string) => void;
  isPanelCollapsed: (panelId: string) => boolean;
  resetPanelSizes: () => void;
  applyPreset: (presetId: string) => void;
  saveCurrentLayout: (name: string, description?: string) => void;
  deleteLayout: (layoutId: string) => void;
  setDefaultLayout: (layoutId: string) => void;
  setLayoutMode: (mode: "pro" | "lite") => void;
  setGridColumns: (columns: string) => void;
  setGridRows: (rows: string) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  devtools(
    persist(
      (set, get) => ({
        layout: DEFAULT_LAYOUT,
        activePreset: "trading-pro",
        presets: SYSTEM_PRESETS,
        customLayouts: [],
        layoutMode: "pro",

        // All operations are synchronous - persisted to localStorage automatically
        setPanelSize: (panelId, size) => {
          set((state) => ({
            layout: {
              ...state.layout,
              panels: {
                ...state.layout.panels,
                [panelId]: {
                  ...state.layout.panels[panelId],
                  size,
                },
              },
            },
            activePreset: null, // Custom layout
          }));
        },

        setPanelVisible: (panelId, visible) => {
          set((state) => ({
            layout: {
              ...state.layout,
              panels: {
                ...state.layout.panels,
                [panelId]: {
                  ...state.layout.panels[panelId],
                  visible,
                },
              },
            },
            activePreset: null,
          }));
        },

        togglePanel: (panelId) => {
          const current = get().layout.panels[panelId];
          get().setPanelVisible(panelId, !current?.visible);
        },

        togglePanelCollapse: (panelId) => {
          set((state) => {
            const newPanels = {
              ...state.layout.panels,
              [panelId]: {
                ...state.layout.panels[panelId],
                collapsed: !state.layout.panels[panelId]?.collapsed,
              },
            };
            return {
              layout: {
                ...state.layout,
                panels: newPanels,
                gridColumns: computeGridColumns(newPanels),
                gridRows: computeGridRows(newPanels),
              },
              activePreset: null,
            };
          });
        },

        isPanelCollapsed: (panelId) => {
          return get().layout.panels[panelId]?.collapsed || false;
        },

        resetPanelSizes: () => {
          set({ layout: DEFAULT_LAYOUT, activePreset: "trading-pro" });
        },

        applyPreset: (presetId) => {
          const allPresets = [...get().presets, ...get().customLayouts];
          const preset = allPresets.find((p) => p.id === presetId);

          if (preset) {
            set({
              layout: preset.config,
              activePreset: presetId,
              layoutMode: presetId === "lite" ? "lite" : "pro",
            });
          }
        },

        // Save layout to localStorage (no API call)
        saveCurrentLayout: (name, description) => {
          const { layout } = get();
          const newLayout: TPLayoutPreset = {
            id: uuidv4(),
            name,
            description,
            isPreset: false,
            isDefault: false,
            config: layout,
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            customLayouts: [...state.customLayouts, newLayout],
            activePreset: newLayout.id,
          }));
        },

        // Delete layout from localStorage (no API call)
        deleteLayout: (layoutId) => {
          set((state) => ({
            customLayouts: state.customLayouts.filter((l) => l.id !== layoutId),
            activePreset:
              state.activePreset === layoutId
                ? "trading-pro"
                : state.activePreset,
          }));
        },

        // Set default layout in localStorage (no API call)
        setDefaultLayout: (layoutId) => {
          set((state) => ({
            customLayouts: state.customLayouts.map((l) => ({
              ...l,
              isDefault: l.id === layoutId,
            })),
          }));
        },

        setLayoutMode: (mode) => {
          set({ layoutMode: mode });
          if (mode === "lite") {
            get().applyPreset("lite");
          } else {
            get().applyPreset("trading-pro");
          }
        },

        setGridColumns: (columns) => {
          set((state) => ({
            layout: { ...state.layout, gridColumns: columns },
            activePreset: null,
          }));
        },

        setGridRows: (rows) => {
          set((state) => ({
            layout: { ...state.layout, gridRows: rows },
            activePreset: null,
          }));
        },
      }),
      {
        name: "trading-pro-layout",
        version: 4, // Bump this to reset cached layouts when structure changes
        // Persist all layout data to localStorage
        partialize: (state) => ({
          layout: state.layout,
          activePreset: state.activePreset,
          layoutMode: state.layoutMode,
          customLayouts: state.customLayouts, // User-saved layouts
        }),
        // Migration: reset to defaults when version changes
        migrate: () => ({
          layout: DEFAULT_LAYOUT,
          activePreset: "trading-pro",
          layoutMode: "pro" as const,
          customLayouts: [],
        }),
      }
    ),
    { name: "TradingProLayout" }
  )
);
