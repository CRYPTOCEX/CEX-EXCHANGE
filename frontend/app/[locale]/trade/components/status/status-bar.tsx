"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, Globe, Wifi, WifiOff, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { tickersWs } from "../../../../../services/tickers-ws";
import { ConnectionStatus } from "@/services/ws-manager";
import { marketService } from "@/services/market-service";
import type { TickerData } from "../markets/types";
import { useTranslations } from "next-intl";
import { useExtensionChecker } from "@/lib/extensions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Define market data types
interface MarketData {
  symbol: string;
  price: string;
  change: string;
  isPositive: boolean;
}

// Connection status indicator with pulse animation
function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const config = useMemo(() => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return {
          icon: Wifi,
          text: "Connected",
          className: "text-emerald-500",
          pulse: false,
          dotColor: "bg-emerald-500",
        };
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return {
          icon: Activity,
          text: status === ConnectionStatus.CONNECTING ? "Connecting" : "Reconnecting",
          className: "text-amber-500",
          pulse: true,
          dotColor: "bg-amber-500",
        };
      default:
        return {
          icon: WifiOff,
          text: "Disconnected",
          className: "text-red-500",
          pulse: false,
          dotColor: "bg-red-500",
        };
    }
  }, [status]);

  const Icon = config.icon;

  return (
    <motion.div
      className={cn("flex items-center gap-1.5", config.className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Pulse dot */}
      <div className="relative">
        <motion.div
          className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)}
          animate={
            config.pulse
              ? {
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.5, 1],
                }
              : {}
          }
          transition={{ duration: 1, repeat: Infinity }}
        />
        {config.pulse && (
          <motion.div
            className={cn("absolute inset-0 w-1.5 h-1.5 rounded-full", config.dotColor)}
            animate={{
              scale: [1, 2.5],
              opacity: [0.5, 0],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <Icon className="h-3 w-3" />
      <span className="text-xs hidden sm:inline">{config.text}</span>
    </motion.div>
  );
}

// Market ticker item with animation
function MarketTicker({
  market,
  index,
}: {
  market: MarketData;
  index: number;
}) {
  return (
    <motion.span
      className="inline-flex items-center mr-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{market.symbol}</span>
      <motion.span
        className={cn(
          "ml-1.5 flex items-center font-medium",
          market.isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        )}
        animate={{
          y: market.isPositive ? [-1, 0] : [1, 0],
        }}
        transition={{ duration: 0.3 }}
      >
        {market.isPositive ? (
          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
        )}
        {market.change}
      </motion.span>
    </motion.span>
  );
}

// Animated time display
function TimeDisplay() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  return (
    <motion.div
      className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Clock className="h-3 w-3" />
      <span className="font-mono text-xs tabular-nums">
        {hours}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          :
        </motion.span>
        {minutes}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          :
        </motion.span>
        {seconds}
      </span>
    </motion.div>
  );
}

export default function StatusBar() {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const { isExtensionAvailable } = useExtensionChecker();
  const [spotData, setSpotData] = useState<Record<string, TickerData>>({});
  const [ecoData, setEcoData] = useState<Record<string, TickerData>>({});
  const [futuresData, setFuturesData] = useState<Record<string, TickerData>>({});
  const [markets, setMarkets] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );

  // Fetch markets and subscribe to ticker data
  useEffect(() => {
    tickersWs.initialize();
    const marketsUnsubscribe = marketService.subscribeToSpotMarkets(setMarkets);
    const cachedMarkets = marketService.getCachedSpotMarkets();
    if (cachedMarkets.length > 0) setMarkets(cachedMarkets);

    const spotUnsubscribe = tickersWs.subscribeToSpotData(setSpotData);
    const ecoUnsubscribe = isExtensionAvailable("ecosystem")
      ? tickersWs.subscribeToEcoData(setEcoData)
      : () => {};
    const futuresUnsubscribe = isExtensionAvailable("futures")
      ? tickersWs.subscribeToFuturesData(setFuturesData)
      : () => {};
    const statusUnsubscribe = tickersWs.subscribeToConnectionStatus(setConnectionStatus);

    return () => {
      marketsUnsubscribe();
      spotUnsubscribe();
      ecoUnsubscribe();
      futuresUnsubscribe();
      statusUnsubscribe();
    };
  }, [isExtensionAvailable]);

  // Calculate top gainers and losers
  const { topGainers, topLosers } = useMemo(() => {
    const allMarkets: MarketData[] = [];

    markets.forEach((market) => {
      const tickerKey = `${market.currency}/${market.pair}`;
      const tickerData = spotData[tickerKey] || ecoData[tickerKey];

      if (tickerData?.last && tickerData.change !== undefined) {
        allMarkets.push({
          symbol: market.displaySymbol,
          price: tickerData.last.toFixed(2),
          change: `${tickerData.change >= 0 ? "+" : ""}${tickerData.change.toFixed(2)}%`,
          isPositive: tickerData.change >= 0,
        });
      }
    });

    Object.entries(futuresData).forEach(([key, tickerData]) => {
      if (tickerData?.last && tickerData.change !== undefined) {
        allMarkets.push({
          symbol: key,
          price: tickerData.last.toFixed(2),
          change: `${tickerData.change >= 0 ? "+" : ""}${tickerData.change.toFixed(2)}%`,
          isPositive: tickerData.change >= 0,
        });
      }
    });

    const sortedMarkets = allMarkets.sort((a, b) => {
      const aChange = parseFloat(a.change.replace("%", ""));
      const bChange = parseFloat(b.change.replace("%", ""));
      return bChange - aChange;
    });

    return {
      topGainers: sortedMarkets.filter((m) => m.isPositive).slice(0, 5),
      topLosers: sortedMarkets.filter((m) => !m.isPositive).slice(-5).reverse(),
    };
  }, [markets, spotData, ecoData, futuresData]);

  const hasData = topGainers.length > 0 || topLosers.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="flex items-center justify-between text-[10px] px-3 py-1 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800"
    >
      {/* Left section - Connection status */}
      <div className="flex items-center space-x-3 min-w-[100px]">
        <ConnectionIndicator status={connectionStatus} />
      </div>

      {/* Center section - Marquee ticker */}
      <div className="flex-1 overflow-hidden mx-4 relative">
        <AnimatePresence mode="wait">
          {hasData ? (
            <motion.div
              key="ticker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="whitespace-nowrap"
            >
              {/* Custom smooth marquee */}
              <motion.div
                className="inline-flex items-center"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  x: {
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                  },
                }}
              >
                {/* Gainers */}
                {topGainers.length > 0 && (
                  <>
                    <span className="font-semibold mr-2 text-emerald-600 dark:text-emerald-400 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {t("top_gainers")}
                    </span>
                    {topGainers.map((market, index) => (
                      <MarketTicker key={`gainer-${market.symbol}`} market={market} index={index} />
                    ))}
                    <span className="mx-4 text-zinc-300 dark:text-zinc-700">|</span>
                  </>
                )}

                {/* Losers */}
                {topLosers.length > 0 && (
                  <>
                    <span className="font-semibold mr-2 text-red-600 dark:text-red-400 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {t("top_losers")}
                    </span>
                    {topLosers.map((market, index) => (
                      <MarketTicker key={`loser-${market.symbol}`} market={market} index={index} />
                    ))}
                  </>
                )}

                {/* Duplicate for seamless loop */}
                <span className="mx-6" />
                {topGainers.length > 0 && (
                  <>
                    <span className="font-semibold mr-2 text-emerald-600 dark:text-emerald-400 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {t("top_gainers")}
                    </span>
                    {topGainers.map((market, index) => (
                      <MarketTicker key={`gainer2-${market.symbol}`} market={market} index={index} />
                    ))}
                    <span className="mx-4 text-zinc-300 dark:text-zinc-700">|</span>
                  </>
                )}
                {topLosers.length > 0 && (
                  <>
                    <span className="font-semibold mr-2 text-red-600 dark:text-red-400 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {t("top_losers")}
                    </span>
                    {topLosers.map((market, index) => (
                      <MarketTicker key={`loser2-${market.symbol}`} market={market} index={index} />
                    ))}
                  </>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-muted-foreground text-center"
            >
              {tCommon("loading_market_data")}...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right section - UTC and time */}
      <div className="flex items-center space-x-4 min-w-[120px] justify-end">
        <motion.div
          className="flex items-center gap-1 text-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Globe className="h-3 w-3" />
          <span className="text-xs">UTC</span>
        </motion.div>
        <TimeDisplay />
      </div>
    </motion.div>
  );
}
