"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, Globe, Wifi, WifiOff } from "lucide-react";
import { tickersWs } from "../../../../../services/tickers-ws";
import { ConnectionStatus } from "@/services/ws-manager";
import { marketService } from "@/services/market-service";
import type { TickerData } from "../markets/types";
import { useTranslations } from "next-intl";
import { useExtensionChecker } from "@/lib/extensions";

// Define market data types
interface MarketData {
  symbol: string;
  price: string;
  change: string;
  isPositive: boolean;
}

export default function StatusBar() {
  const t = useTranslations("trade/components/status/status-bar");
  const { isExtensionAvailable, extensions } = useExtensionChecker();
  const [serverTime, setServerTime] = useState(new Date());
  const [spotData, setSpotData] = useState<Record<string, TickerData>>({});
  const [ecoData, setEcoData] = useState<Record<string, TickerData>>({});
  const [futuresData, setFuturesData] = useState<Record<string, TickerData>>(
    {}
  );
  const [markets, setMarkets] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );

  // Update server time
  useEffect(() => {
    const interval = setInterval(() => {
      setServerTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch markets and subscribe to ticker data
  useEffect(() => {
    // Initialize WebSocket manager
    tickersWs.initialize();

    // Subscribe to market data from centralized service
    const marketsUnsubscribe = marketService.subscribeToSpotMarkets(setMarkets);

    // Try to get cached data immediately
    const cachedMarkets = marketService.getCachedSpotMarkets();
    if (cachedMarkets.length > 0) {
      setMarkets(cachedMarkets);
    }

    // Subscribe to WebSocket data
    const spotUnsubscribe = tickersWs.subscribeToSpotData(setSpotData);
    
    // Only subscribe to eco data if ecosystem extension is available
    const ecoUnsubscribe = isExtensionAvailable("ecosystem")
      ? tickersWs.subscribeToEcoData(setEcoData)
      : () => {}; // No-op unsubscribe function
    
    // Only subscribe to futures data if futures extension is available
    const futuresUnsubscribe = isExtensionAvailable("futures")
      ? tickersWs.subscribeToFuturesData(setFuturesData)
      : () => {}; // No-op unsubscribe function

    // Subscribe to connection status
    const statusUnsubscribe =
      tickersWs.subscribeToConnectionStatus(setConnectionStatus);

    return () => {
      marketsUnsubscribe();
      spotUnsubscribe();
      ecoUnsubscribe();
      futuresUnsubscribe();
      statusUnsubscribe();
    };
  }, [isExtensionAvailable, extensions]);

  // Calculate top gainers and losers from real data
  const { topGainers, topLosers } = useMemo(() => {
    const allMarkets: MarketData[] = [];

    // Process spot markets
    markets.forEach((market) => {
      const tickerKey = `${market.currency}/${market.pair}`;
      const tickerData = spotData[tickerKey] || ecoData[tickerKey];

      if (tickerData && tickerData.last && tickerData.change !== undefined) {
        allMarkets.push({
          symbol: market.displaySymbol,
          price: tickerData.last.toFixed(2),
          change: `${tickerData.change >= 0 ? "+" : ""}${tickerData.change.toFixed(2)}%`,
          isPositive: tickerData.change >= 0,
        });
      }
    });

    // Process futures markets (if you want to include them)
    Object.entries(futuresData).forEach(([key, tickerData]) => {
      if (tickerData && tickerData.last && tickerData.change !== undefined) {
        allMarkets.push({
          symbol: key,
          price: tickerData.last.toFixed(2),
          change: `${tickerData.change >= 0 ? "+" : ""}${tickerData.change.toFixed(2)}%`,
          isPositive: tickerData.change >= 0,
        });
      }
    });

    // Sort by change percentage
    const sortedMarkets = allMarkets.sort((a, b) => {
      const aChange = parseFloat(a.change.replace("%", ""));
      const bChange = parseFloat(b.change.replace("%", ""));
      return bChange - aChange;
    });

    // Get top 5 gainers and losers
    const gainers = sortedMarkets
      .filter((market) => market.isPositive)
      .slice(0, 5);

    const losers = sortedMarkets
      .filter((market) => !market.isPositive)
      .slice(-5)
      .reverse();

    return { topGainers: gainers, topLosers: losers };
  }, [markets, spotData, ecoData, futuresData]);

  // Get connection status indicator
  const getConnectionStatusConfig = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: "Connected",
          className: "text-green-500",
        };
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return {
          icon: <WifiOff className="h-3 w-3 animate-pulse" />,
          text:
            connectionStatus === ConnectionStatus.CONNECTING
              ? "Connecting"
              : "Reconnecting",
          className: "text-yellow-500",
        };
      case ConnectionStatus.DISCONNECTED:
      case ConnectionStatus.ERROR:
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Disconnected",
          className: "text-red-500",
        };
    }
  };

  const statusConfig = getConnectionStatusConfig();

  return (
    <div className="flex items-center justify-between text-[10px] px-2 py-0.5 bg-background dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-muted-foreground dark:text-zinc-400">
      {/* Left section - WebSocket connection status */}
      <div className="flex items-center space-x-3">
        <div className={`flex items-center ${statusConfig.className}`}>
          {statusConfig.icon}
          <span className="ml-1 text-xs hidden sm:inline">
            {statusConfig.text}
          </span>
        </div>
      </div>

      {/* Center section - Marquee for top gainers and losers */}
      <div className="flex-1 overflow-hidden mx-4">
        <div className="whitespace-nowrap animate-marquee">
          {topGainers.length > 0 && (
            <>
              <span className="font-medium mr-2">{t("top_gainers")}</span>
              {topGainers.map((market, index) => (
                <span key={`gainer-${index}`} className="mr-4">
                  <span className="font-medium">{market.symbol}</span>{" "}
                  <span className="text-emerald-600 dark:text-green-500">
                    {market.change}
                  </span>
                </span>
              ))}
              <span className="mx-4">|</span>
            </>
          )}
          {topLosers.length > 0 && (
            <>
              <span className="font-medium mr-2">{t("top_losers")}</span>
              {topLosers.map((market, index) => (
                <span key={`loser-${index}`} className="mr-4">
                  <span className="font-medium">{market.symbol}</span>{" "}
                  <span className="text-red-600 dark:text-red-500">
                    {market.change}
                  </span>
                </span>
              ))}
            </>
          )}
          {topGainers.length === 0 && topLosers.length === 0 && (
            <span className="text-muted-foreground">
              {t("loading_market_data")}.
            </span>
          )}
        </div>
      </div>

      {/* Right section - UTC time and server time */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center">
          <Globe className="h-3 w-3 mr-1" />
          <span>UTC</span>
        </div>

        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          <span>{serverTime.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
