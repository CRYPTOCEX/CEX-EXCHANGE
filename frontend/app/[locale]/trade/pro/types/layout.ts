export interface TPPanelConfig {
  id: string;
  visible: boolean;
  size: number;
  position: number;
  gridArea: string;
  minSize?: number;
  maxSize?: number;
  collapsed?: boolean;
}

export interface TPLayoutConfig {
  gridColumns: string;
  gridRows: string;
  panels: {
    markets: TPPanelConfig;
    chart: TPPanelConfig;
    orderbook: TPPanelConfig;
    trading: TPPanelConfig;
    orders: TPPanelConfig;
    positions: TPPanelConfig;
    [key: string]: TPPanelConfig;
  };
}

export interface TPLayoutPreset {
  id: string;
  name: string;
  description?: string;
  isPreset: boolean;
  isDefault?: boolean;
  config: TPLayoutConfig;
  createdAt?: string;
  updatedAt?: string;
}
