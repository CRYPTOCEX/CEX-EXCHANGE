"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { useConfigStore } from "@/store/config";

export interface TradingSettings {
  // General
  chartProvider: "tradingview" | "chart_engine";
  defaultLayout: "pro" | "lite";
  hotkeysEnabled: boolean;
  allowCustomLayouts: boolean;
  maxSavedLayouts: number;

  // Features
  analyticsEnabled: boolean;
  depthChartEnabled: boolean;
  recentTradesEnabled: boolean;
  marketsPanelEnabled: boolean;
  ordersPanelEnabled: boolean;
  positionsPanelEnabled: boolean;
  advancedOrdersEnabled: boolean;
  oneClickTradingEnabled: boolean;

  // Trading
  confirmOrders: boolean;
  showEstimatedFees: boolean;
  showOrderPreview: boolean;
  defaultOrderType: "limit" | "market";

  // Display
  compactMode: boolean;
  showSpread: boolean;
  showVolume: boolean;
  priceDecimals: number;
  amountDecimals: number;
  mobileEnabled: boolean;
}

const DEFAULT_TRADING_SETTINGS: TradingSettings = {
  // General
  chartProvider: "tradingview",
  defaultLayout: "pro",
  hotkeysEnabled: true,
  allowCustomLayouts: true,
  maxSavedLayouts: 5,

  // Features
  analyticsEnabled: true,
  depthChartEnabled: true,
  recentTradesEnabled: true,
  marketsPanelEnabled: true,
  ordersPanelEnabled: true,
  positionsPanelEnabled: true,
  advancedOrdersEnabled: true,
  oneClickTradingEnabled: false,

  // Trading
  confirmOrders: true,
  showEstimatedFees: true,
  showOrderPreview: true,
  defaultOrderType: "limit",

  // Display
  compactMode: false,
  showSpread: true,
  showVolume: true,
  priceDecimals: 2,
  amountDecimals: 6,
  mobileEnabled: true,
};

interface ExtensionStatusContextValue {
  isEnabled: boolean;
  settings: TradingSettings;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const ExtensionStatusContext =
  createContext<ExtensionStatusContextValue | null>(null);

export function ExtensionStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { settings: configSettings, settingsFetched } = useConfigStore();
  const [error, setError] = useState<string | null>(null);

  // Parse Trading settings from the config store
  const tradingSettings = useMemo<TradingSettings>(() => {
    return {
      // General
      chartProvider:
        (configSettings.tradingProChartProvider as "tradingview" | "chart_engine") ??
        DEFAULT_TRADING_SETTINGS.chartProvider,
      defaultLayout:
        (configSettings.tradingProDefaultLayout as "pro" | "lite") ??
        DEFAULT_TRADING_SETTINGS.defaultLayout,
      hotkeysEnabled:
        configSettings.tradingProHotkeysEnabled ?? DEFAULT_TRADING_SETTINGS.hotkeysEnabled,
      allowCustomLayouts:
        configSettings.tradingProAllowCustomLayouts ?? DEFAULT_TRADING_SETTINGS.allowCustomLayouts,
      maxSavedLayouts:
        configSettings.tradingProMaxSavedLayouts ?? DEFAULT_TRADING_SETTINGS.maxSavedLayouts,

      // Features
      analyticsEnabled:
        configSettings.tradingProAnalyticsEnabled ?? DEFAULT_TRADING_SETTINGS.analyticsEnabled,
      depthChartEnabled:
        configSettings.tradingProDepthChartEnabled ?? DEFAULT_TRADING_SETTINGS.depthChartEnabled,
      recentTradesEnabled:
        configSettings.tradingProRecentTradesEnabled ?? DEFAULT_TRADING_SETTINGS.recentTradesEnabled,
      marketsPanelEnabled:
        configSettings.tradingProMarketsPanelEnabled ?? DEFAULT_TRADING_SETTINGS.marketsPanelEnabled,
      ordersPanelEnabled:
        configSettings.tradingProOrdersPanelEnabled ?? DEFAULT_TRADING_SETTINGS.ordersPanelEnabled,
      positionsPanelEnabled:
        configSettings.tradingProPositionsPanelEnabled ?? DEFAULT_TRADING_SETTINGS.positionsPanelEnabled,
      advancedOrdersEnabled:
        configSettings.tradingProAdvancedOrdersEnabled ?? DEFAULT_TRADING_SETTINGS.advancedOrdersEnabled,
      oneClickTradingEnabled:
        configSettings.tradingProOneClickTradingEnabled ?? DEFAULT_TRADING_SETTINGS.oneClickTradingEnabled,

      // Trading
      confirmOrders:
        configSettings.tradingProConfirmOrders ?? DEFAULT_TRADING_SETTINGS.confirmOrders,
      showEstimatedFees:
        configSettings.tradingProShowEstimatedFees ?? DEFAULT_TRADING_SETTINGS.showEstimatedFees,
      showOrderPreview:
        configSettings.tradingProShowOrderPreview ?? DEFAULT_TRADING_SETTINGS.showOrderPreview,
      defaultOrderType:
        (configSettings.tradingProDefaultOrderType as "limit" | "market") ??
        DEFAULT_TRADING_SETTINGS.defaultOrderType,

      // Display
      compactMode:
        configSettings.tradingProCompactMode ?? DEFAULT_TRADING_SETTINGS.compactMode,
      showSpread:
        configSettings.tradingProShowSpread ?? DEFAULT_TRADING_SETTINGS.showSpread,
      showVolume:
        configSettings.tradingProShowVolume ?? DEFAULT_TRADING_SETTINGS.showVolume,
      priceDecimals:
        configSettings.tradingProPriceDecimals ?? DEFAULT_TRADING_SETTINGS.priceDecimals,
      amountDecimals:
        configSettings.tradingProAmountDecimals ?? DEFAULT_TRADING_SETTINGS.amountDecimals,
      mobileEnabled:
        configSettings.tradingProMobileEnabled ?? DEFAULT_TRADING_SETTINGS.mobileEnabled,
    };
  }, [configSettings]);

  // Check if new trading interface is enabled (default to false - classic interface)
  const isEnabled = configSettings.tradingProEnabled ?? false;

  // Refresh function - just clears any error since data comes from store
  const refresh = () => {
    setError(null);
  };

  return (
    <ExtensionStatusContext.Provider
      value={{
        isEnabled,
        settings: tradingSettings,
        isLoading: !settingsFetched,
        error,
        refresh,
      }}
    >
      {children}
    </ExtensionStatusContext.Provider>
  );
}

export function useExtensionStatus() {
  const context = useContext(ExtensionStatusContext);
  if (!context) {
    throw new Error(
      "useExtensionStatus must be used within ExtensionStatusProvider"
    );
  }
  return context;
}
