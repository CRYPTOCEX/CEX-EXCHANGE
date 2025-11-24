"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

// Define panel configuration type
export interface PanelConfig {
  id: string;
  size: number;
  position: number; // Position in the layout (order)
  visible: boolean; // Whether the panel is visible
  container?: string; // Optional container ID for nested panels
  defaultCollapsed?: boolean; // Whether the panel should be collapsed by default
  collapsible?: boolean; // Whether the panel can be collapsed
  collapseSide?: "start" | "end" | "top" | "bottom"; // Direction to collapse
}

// Add panel group configuration type
export interface PanelGroupConfig {
  id: string;
  position: "left" | "center" | "right" | "top" | "bottom";
  size: number;
  visible: boolean;
  collapsible: boolean;
  defaultCollapsed?: boolean;
  collapseSide: "start" | "end" | "top" | "bottom";
  maxSize?: number; // Add maxSize property to the interface
}

// Define layout configuration type
export interface LayoutConfig {
  leftPanel: number;
  centerPanel: number;
  rightPanel: number;
  chartPanel: number;
  dataPanel: number;
  topPanel: number; // Top panel size
  bottomPanel: number; // Bottom panel size
  // Panel arrangement configuration
  panels: {
    [key: string]: PanelConfig;
  };
  // Panel groups configuration
  panelGroups: {
    [key: string]: PanelGroupConfig;
  };
}

// Update the defaultPresets object to include more impressive layouts
// Find the defaultPresets declaration (around line 100-150) and replace it with this:

const defaultPresets: Record<string, LayoutConfig> = {
  "Trading Pro": {
    leftPanel: 20,
    centerPanel: 55,
    rightPanel: 25,
    chartPanel: 70,
    dataPanel: 30,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 20,
    panels: {
      markets: {
        id: "markets",
        size: 100,
        position: 0,
        visible: true,
        container: "left",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 100,
        position: 0,
        visible: true,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 100,
        position: 0,
        visible: true,
        container: "right",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orders: {
        id: "orders",
        size: 100,
        position: 0,
        visible: true,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 20,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 55,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 25,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 20,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
        maxSize: 50, // Maximum size for bottom panel
      },
    },
  },
  "Chart Maximized": {
    leftPanel: 15,
    centerPanel: 70,
    rightPanel: 15,
    chartPanel: 100,
    dataPanel: 0,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 15,
    panels: {
      markets: {
        id: "markets",
        size: 100,
        position: 0,
        visible: true,
        container: "left",
        defaultCollapsed: true,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 0,
        position: 0,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 100,
        position: 0,
        visible: true,
        container: "right",
        defaultCollapsed: true,
        collapsible: true,
        collapseSide: "end",
      },
      orders: {
        id: "orders",
        size: 100,
        position: 0,
        visible: true,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 15,
        visible: true,
        collapsible: true,
        defaultCollapsed: true,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 70,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 15,
        visible: true,
        collapsible: true,
        defaultCollapsed: true,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 15,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
        maxSize: 50, // Maximum size for bottom panel
      },
    },
  },
  "Order Book Focus": {
    leftPanel: 15,
    centerPanel: 50,
    rightPanel: 35,
    chartPanel: 50,
    dataPanel: 50,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 20,
    panels: {
      markets: {
        id: "markets",
        size: 100,
        position: 0,
        visible: true,
        container: "left",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 100,
        position: 0,
        visible: true,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 60,
        position: 0,
        visible: true,
        container: "right",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orders: {
        id: "orders",
        size: 100,
        position: 0,
        visible: true,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 15,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 50,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 35,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 20,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
        maxSize: 50, // Maximum size for bottom panel
      },
    },
  },
  "Market Analysis": {
    leftPanel: 25,
    centerPanel: 75,
    rightPanel: 0,
    chartPanel: 70,
    dataPanel: 30,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 0,
    panels: {
      markets: {
        id: "markets",
        size: 100,
        position: 0,
        visible: true,
        container: "left",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 100,
        position: 0,
        visible: true,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 0,
        position: 0,
        visible: false,
        container: "right",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orders: {
        id: "orders",
        size: 0,
        position: 0,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 25,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 75,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 0,
        visible: false,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 0,
        visible: false,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
      },
    },
  },
  "Trading Only": {
    leftPanel: 0,
    centerPanel: 60,
    rightPanel: 40,
    chartPanel: 70,
    dataPanel: 30,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 30,
    panels: {
      markets: {
        id: "markets",
        size: 0,
        position: 0,
        visible: false,
        container: "left",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 100,
        position: 0,
        visible: true,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 100,
        position: 0,
        visible: true,
        container: "right",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orders: {
        id: "orders",
        size: 100,
        position: 0,
        visible: true,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 0,
        visible: false,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 60,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 40,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 30,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
        maxSize: 50, // Maximum size for bottom panel
      },
    },
  },
  "Dual View": {
    leftPanel: 0,
    centerPanel: 50,
    rightPanel: 50,
    chartPanel: 100,
    dataPanel: 0,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 20,
    panels: {
      markets: {
        id: "markets",
        size: 0,
        position: 0,
        visible: false,
        container: "left",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 0,
        position: 0,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 100,
        position: 0,
        visible: true,
        container: "right",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orders: {
        id: "orders",
        size: 100,
        position: 0,
        visible: true,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 0,
        visible: false,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 50,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 50,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 20,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
        maxSize: 50, // Maximum size for bottom panel
      },
    },
  },
  "Markets Explorer": {
    leftPanel: 40,
    centerPanel: 60,
    rightPanel: 0,
    chartPanel: 100,
    dataPanel: 0,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 0,
    panels: {
      markets: {
        id: "markets",
        size: 100,
        position: 0,
        visible: true,
        container: "left",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 0,
        position: 0,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 0,
        position: 0,
        visible: false,
        container: "right",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orders: {
        id: "orders",
        size: 0,
        position: 0,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 40,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 60,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 0,
        visible: false,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 0,
        visible: false,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
        maxSize: 50, // Maximum size for bottom panel
      },
    },
  },
  "Data Focused": {
    leftPanel: 15,
    centerPanel: 45,
    rightPanel: 40,
    chartPanel: 40,
    dataPanel: 60,
    topPanel: 0, // Set to 0 to remove news panel
    bottomPanel: 20,
    panels: {
      markets: {
        id: "markets",
        size: 100,
        position: 0,
        visible: true,
        container: "left",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "start",
      },
      chart: {
        id: "chart",
        size: 100,
        position: 0,
        visible: true,
        container: "center",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orderbook: {
        id: "orderbook",
        size: 100,
        position: 0,
        visible: true,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trades: {
        id: "trades",
        size: 0,
        position: 1,
        visible: false,
        container: "data",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      trading: {
        id: "trading",
        size: 100,
        position: 0,
        visible: true,
        container: "right",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "top",
      },
      orders: {
        id: "orders",
        size: 100,
        position: 0,
        visible: true,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
      alerts: {
        id: "alerts",
        size: 0,
        position: 1,
        visible: false,
        container: "bottom",
        defaultCollapsed: false,
        collapsible: true,
        collapseSide: "bottom",
      },
    },
    panelGroups: {
      left: {
        id: "left",
        position: "left",
        size: 15,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "start",
      },
      center: {
        id: "center",
        position: "center",
        size: 45,
        visible: true,
        collapsible: false,
        collapseSide: "start",
      },
      right: {
        id: "right",
        position: "right",
        size: 40,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "end",
      },
      top: {
        id: "top",
        position: "top",
        size: 0,
        visible: false, // Set to false to hide the top panel
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "top",
      },
      bottom: {
        id: "bottom",
        position: "bottom",
        size: 20,
        visible: true,
        collapsible: true,
        defaultCollapsed: false,
        collapseSide: "bottom",
        maxSize: 50, // Maximum size for bottom panel
      },
    },
  },
};

// Create context
interface LayoutContextType {
  layoutConfig: LayoutConfig;
  updateLayoutConfig: (config: Partial<LayoutConfig>) => void;
  setLayoutConfig: (config: LayoutConfig) => void;
  layoutPresets: Record<string, LayoutConfig>;
  addLayoutPreset: (name: string, config: LayoutConfig) => void;
  deleteLayoutPreset: (name: string) => void;
  currentPreset: string;
  setCurrentPreset: (preset: string) => void;
  applyPreset: (presetName: string) => void;
  getPanelConfig: (panelId: string) => PanelConfig | undefined;
  getPanelGroupConfig: (groupId: string) => PanelGroupConfig | undefined;
  togglePanelGroupCollapse: (groupId: string) => void;
  isPanelGroupCollapsed: (groupId: string) => boolean;
  isPanelVisible: (panelId: string) => boolean;
  ensurePanelGroupCollapseButtonsVisible: (groupId: string) => void;
  resetLayout: () => void; // Add resetLayout function to the interface
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// Helper function to check if two layout configs are equal
function areLayoutConfigsEqual(a: LayoutConfig, b: LayoutConfig): boolean {
  return (
    a.leftPanel === b.leftPanel &&
    a.centerPanel === b.centerPanel &&
    a.rightPanel === b.rightPanel &&
    a.chartPanel === b.chartPanel &&
    a.dataPanel === b.dataPanel &&
    a.topPanel === b.topPanel &&
    a.bottomPanel === b.bottomPanel
  );
}

// Provider component
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layoutConfig, setLayoutConfigState] = useState<LayoutConfig>(
    defaultPresets["Trading Pro"]
  );
  const [layoutPresets, setLayoutPresets] =
    useState<Record<string, LayoutConfig>>(defaultPresets);
  const [currentPreset, setCurrentPreset] = useState("Trading Pro");

  // Use ref to track if we're currently applying a preset to prevent loops
  const isApplyingPresetRef = useRef(false);

  // Add these inside the LayoutProvider function
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({ bottom: true });

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem("layout-presets");
      if (savedPresets) {
        // Merge default presets with saved presets
        const parsedPresets = JSON.parse(savedPresets);
        setLayoutPresets({ ...defaultPresets, ...parsedPresets });
      }

      const savedCurrentPreset = localStorage.getItem("current-layout-preset");
      if (savedCurrentPreset) {
        setCurrentPreset(savedCurrentPreset);

        // Get the preset config from either saved presets or default presets
        let presetConfig;
        if (savedPresets) {
          const parsedPresets = JSON.parse(savedPresets);
          presetConfig =
            parsedPresets[savedCurrentPreset] ||
            defaultPresets[savedCurrentPreset as keyof typeof defaultPresets];
        } else {
          presetConfig =
            defaultPresets[savedCurrentPreset as keyof typeof defaultPresets];
        }

        if (presetConfig) {
          setLayoutConfigState(presetConfig);
        }
      }
    } catch (error) {
      console.error("Failed to load layout presets:", error);
    }
  }, []);

  // Load collapsed groups state from localStorage
  useEffect(() => {
    try {
      const savedCollapsedGroups = localStorage.getItem(
        "collapsed-panel-groups"
      );
      if (savedCollapsedGroups) {
        setCollapsedGroups(JSON.parse(savedCollapsedGroups));
      }
    } catch (error) {
      console.error("Failed to load collapsed panel groups:", error);
    }
  }, []);

  // Save presets to localStorage when they change
  useEffect(() => {
    try {
      // Only save custom presets, not the default ones
      const customPresets = Object.entries(layoutPresets).reduce(
        (acc, [key, value]) => {
          if (!defaultPresets[key]) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, LayoutConfig>
      );

      localStorage.setItem("layout-presets", JSON.stringify(customPresets));
      localStorage.setItem("current-layout-preset", currentPreset);
    } catch (error) {
      console.error("Failed to save layout presets:", error);
    }
  }, [layoutPresets, currentPreset]);

  // Save collapsed groups state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "collapsed-panel-groups",
        JSON.stringify(collapsedGroups)
      );
    } catch (error) {
      console.error("Failed to save collapsed panel groups:", error);
    }
  }, [collapsedGroups]);

  const updateLayoutConfig = useCallback((config: Partial<LayoutConfig>) => {
    setLayoutConfigState((prev) => {
      const updated = { ...prev, ...config };
      // Only update if something actually changed
      if (areLayoutConfigsEqual(prev, updated)) {
        return prev;
      }
      return updated;
    });
  }, []);

  const setLayoutConfig = useCallback((config: LayoutConfig) => {
    console.log("Setting layout config:", config);
    setLayoutConfigState((prev) => {
      // Only update if something actually changed
      if (areLayoutConfigsEqual(prev, config)) {
        return prev;
      }
      return config;
    });

    // Force a resize event to update panels
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }, []);

  const applyPreset = useCallback(
    (presetName: string) => {
      if (isApplyingPresetRef.current) return;

      if (layoutPresets[presetName]) {
        console.log(
          `Applying preset: ${presetName}`,
          layoutPresets[presetName]
        );

        // Set flag to prevent loops
        isApplyingPresetRef.current = true;

        // Reset collapsed groups state when changing layouts
        setCollapsedGroups({});

        setCurrentPreset(presetName);

        // Create a deep copy of the preset to ensure we're using the default state
        const presetConfig = JSON.parse(
          JSON.stringify(layoutPresets[presetName])
        );
        setLayoutConfigState(presetConfig);

        // Force a resize event to update panels
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
          isApplyingPresetRef.current = false;
        }, 50);
      } else {
        console.error(`Preset not found: ${presetName}`);
      }
    },
    [layoutPresets]
  );

  const addLayoutPreset = useCallback((name: string, config: LayoutConfig) => {
    setLayoutPresets((prev) => ({
      ...prev,
      [name]: config,
    }));
    setCurrentPreset(name);
    setLayoutConfigState(config);

    // Force a resize event to update panels
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }, []);

  const deleteLayoutPreset = useCallback(
    (name: string) => {
      if (Object.keys(defaultPresets).includes(name)) {
        alert("Cannot delete default presets");
        return;
      }

      setLayoutPresets((prev) => {
        const newPresets = { ...prev };
        delete newPresets[name];
        return newPresets;
      });

      if (currentPreset === name) {
        setCurrentPreset("Trading Pro");
        setLayoutConfigState(layoutPresets["Trading Pro"]);

        // Force a resize event to update panels
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 50);
      }
    },
    [currentPreset, layoutPresets]
  );

  // Get panel configuration by ID
  const getPanelConfig = useCallback(
    (panelId: string): PanelConfig | undefined => {
      return layoutConfig.panels?.[panelId];
    },
    [layoutConfig]
  );

  // Get panel group configuration by ID
  const getPanelGroupConfig = useCallback(
    (groupId: string): PanelGroupConfig | undefined => {
      return layoutConfig.panelGroups?.[groupId];
    },
    [layoutConfig]
  );

  // Toggle panel group collapse state
  const togglePanelGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const newState = { ...prev, [groupId]: !prev[groupId] };
      return newState;
    });
  }, []);

  // Add a method to ensure panel group collapse buttons are properly shown
  const ensurePanelGroupCollapseButtonsVisible = useCallback(
    (groupId: string) => {
      // Find the panel group element
      const panelGroup = document.querySelector(
        `[data-panel-group-id="${groupId}"]`
      );
      if (!panelGroup) return;

      // Find all collapse buttons for this group
      const collapseButtons = document.querySelectorAll(
        `.panel-group-collapse-button.group-${groupId}`
      );

      // Make them visible
      collapseButtons.forEach((button) => {
        (button as HTMLElement).style.opacity = "1";
      });
    },
    []
  );

  // Check if panel group is collapsed
  const isPanelGroupCollapsed = useCallback(
    (groupId: string) => {
      return !!collapsedGroups[groupId];
    },
    [collapsedGroups]
  );

  // Add the isPanelVisible function
  const isPanelVisible = useCallback(
    (panelId: string): boolean => {
      const panel = layoutConfig.panels[panelId];
      return panel?.visible ?? false;
    },
    [layoutConfig.panels]
  );

  // Add resetLayout function
  const resetLayout = useCallback(() => {
    // Reset to the default layout for the current preset
    const defaultPreset =
      defaultPresets[currentPreset as keyof typeof defaultPresets] ||
      defaultPresets["Trading Pro"];
    setLayoutConfigState(JSON.parse(JSON.stringify(defaultPreset)));
    setCollapsedGroups({});

    // Force a resize event to update panels
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }, [currentPreset]);

  // Add the new functions to the context value
  return (
    <LayoutContext.Provider
      value={{
        layoutConfig,
        updateLayoutConfig,
        setLayoutConfig,
        layoutPresets,
        addLayoutPreset,
        deleteLayoutPreset,
        currentPreset,
        setCurrentPreset,
        applyPreset,
        getPanelConfig,
        getPanelGroupConfig,
        togglePanelGroupCollapse,
        isPanelGroupCollapsed,
        isPanelVisible,
        ensurePanelGroupCollapseButtonsVisible,
        resetLayout, // Add resetLayout to the context
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

// Custom hook to use the layout context
export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
