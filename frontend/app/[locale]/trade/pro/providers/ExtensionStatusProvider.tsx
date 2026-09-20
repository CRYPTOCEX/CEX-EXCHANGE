"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { useConfigStore } from "@/store/config";

/**
 * The admin trading settings this terminal ACTUALLY consumes.
 *
 * Thirteen more used to be mapped in here — defaultLayout, allowCustomLayouts,
 * maxSavedLayouts, analyticsEnabled, recentTradesEnabled, advancedOrdersEnabled,
 * showOrderPreview, compactMode, showSpread, showVolume, priceDecimals,
 * amountDecimals and mobileEnabled. Every one of them had a switch on
 * `/admin/trading/settings`, and NOTHING read the
 * context member: `isPanelEnabled` below handles three panel ids and returns
 * true for anything else, and the order-type list, decimals, spread and volume
 * are all rendered unconditionally elsewhere. They were removed rather than
 * wired: gating them here would be a second false claim, because
 * `useOrderSubmit.ts` still posts STOP_MARKET / STOP_LIMIT whatever an
 * "Advanced Orders" switch says.
 *
 * NOTE for anyone adding one back: settings arrive as TEXT with no coercion
 * (`frontend/store/config.ts`), so the string "false" is TRUTHY here.
 */
export interface TradingSettings {
  // General
  chartProvider: "tradingview" | "chart_engine";
  hotkeysEnabled: boolean;

  // Features
  depthChartEnabled: boolean;
  marketsPanelEnabled: boolean;
  ordersPanelEnabled: boolean;
  positionsPanelEnabled: boolean;
  oneClickTradingEnabled: boolean;
  /**
   * Market news. A CORE feature, so it is gated by an admin SETTING and not by
   * `extensions?.includes(...)` — nothing about it is an add-on.
   */
  newsEnabled: boolean;

  // Trading
  confirmOrders: boolean;
  showEstimatedFees: boolean;
  defaultOrderType: "limit" | "market";
}

const DEFAULT_TRADING_SETTINGS: TradingSettings = {
  // General
  chartProvider: "tradingview",
  hotkeysEnabled: true,

  // Features
  depthChartEnabled: true,
  marketsPanelEnabled: true,
  ordersPanelEnabled: true,
  positionsPanelEnabled: true,
  oneClickTradingEnabled: false,
  newsEnabled: true,

  // Trading
  confirmOrders: true,
  showEstimatedFees: true,
  defaultOrderType: "limit",
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
      /*
       * `spotChartEngine` is the key the admin screen writes, in upper case
       * ("TRADINGVIEW" | "CHART_ENGINE"). This read used
       * `tradingProChartProvider`, a name spelled nowhere else in the
       * repository — no screen, seeder or route has ever written it — so the
       * value was always undefined and the pro terminal rendered TradingView
       * however the operator had configured Admin -> Trading -> Settings.
       */
      chartProvider:
        String(configSettings.spotChartEngine ?? "").toUpperCase() === "CHART_ENGINE"
          ? "chart_engine"
          : DEFAULT_TRADING_SETTINGS.chartProvider,
      hotkeysEnabled:
        configSettings.tradingProHotkeysEnabled ?? DEFAULT_TRADING_SETTINGS.hotkeysEnabled,

      // Features
      depthChartEnabled:
        configSettings.tradingProDepthChartEnabled ?? DEFAULT_TRADING_SETTINGS.depthChartEnabled,
      marketsPanelEnabled:
        configSettings.tradingProMarketsPanelEnabled ?? DEFAULT_TRADING_SETTINGS.marketsPanelEnabled,
      ordersPanelEnabled:
        configSettings.tradingProOrdersPanelEnabled ?? DEFAULT_TRADING_SETTINGS.ordersPanelEnabled,
      positionsPanelEnabled:
        configSettings.tradingProPositionsPanelEnabled ?? DEFAULT_TRADING_SETTINGS.positionsPanelEnabled,
      oneClickTradingEnabled:
        configSettings.tradingProOneClickTradingEnabled ?? DEFAULT_TRADING_SETTINGS.oneClickTradingEnabled,
      newsEnabled:
        configSettings.tradingProNewsEnabled ?? DEFAULT_TRADING_SETTINGS.newsEnabled,

      // Trading
      confirmOrders:
        configSettings.tradingProConfirmOrders ?? DEFAULT_TRADING_SETTINGS.confirmOrders,
      showEstimatedFees:
        configSettings.tradingProShowEstimatedFees ?? DEFAULT_TRADING_SETTINGS.showEstimatedFees,
      defaultOrderType:
        (configSettings.tradingProDefaultOrderType as "limit" | "market") ??
        DEFAULT_TRADING_SETTINGS.defaultOrderType,
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
