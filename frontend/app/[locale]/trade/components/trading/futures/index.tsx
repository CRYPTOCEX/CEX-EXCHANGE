"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabTrigger, TabContent } from "../../ui/custom-tabs";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { marketDataWs } from "@/services/market-data-ws";
import BalanceDisplay from "./balance-display";
import MarketOrderForm from "./market-order-form";
import LimitOrderForm from "./limit-order-form";
import type { FuturesMarket, TickerData, WalletData } from "./types";
import { useTranslations } from "next-intl";

interface FuturesTradingFormProps {
  symbol: string;
  onOrderSubmit?: (order: any) => Promise<any>;
}

export default function FuturesTradingForm({
  symbol,
  onOrderSubmit,
}: FuturesTradingFormProps) {
  const t = useTranslations("trade/components/trading/futures/index");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [marketInfo, setMarketInfo] = useState<FuturesMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fundingRate, setFundingRate] = useState<number | null>(null);
  const [fundingTime, setFundingTime] = useState<string>("");
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [currency, setCurrency] = useState("MASH");
  const [pair, setPair] = useState("USDT");
  const [pricePrecision, setPricePrecision] = useState(2);
  const [amountPrecision, setAmountPrecision] = useState(4);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [marketPrice, setMarketPrice] = useState("0.00");
  
  const tickerUnsubscribeRef = useRef<(() => void) | null>(null);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  // Reset market price immediately when symbol changes
  useEffect(() => {
    // Reset price to loading state when symbol changes
    setCurrentPrice(null);
    setMarketPrice("--");
    setLastPrice(null);
    setPriceDirection("neutral");
    setTickerData(null);
    
    // Clear session cache for the new symbol to force fresh data
    if (typeof window !== 'undefined') {
      const cacheKey = `futures_wallet_${symbol}`;
      sessionStorage.removeItem(cacheKey);
    }
  }, [symbol]);

  // Extract currency and pair from symbol
  useEffect(() => {
    if (symbol.includes("/")) {
      const [curr, pr] = symbol.split("/");
      setCurrency(curr);
      setPair(pr);
    } else if (symbol.includes("USDT")) {
      setCurrency(symbol.replace("USDT", ""));
      setPair("USDT");
    } else {
      setCurrency("MASH");
      setPair("USDT");
    }
  }, [symbol]);

  // Fetch market info and wallet data
  useEffect(() => {
    fetchMarketInfo();
    fetchWalletData();
  }, [symbol, currency, pair]);

  // Fetch market info
  const fetchMarketInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/futures/market");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        // Find the matching market
        const market = result.data.find(
          (m: FuturesMarket) => `${m.currency}/${m.pair}` === symbol || m.currency + m.pair === symbol
        );

        if (market) {
          setMarketInfo(market);

          // Set precision based on metadata
          const metadata = typeof market.metadata === "string" 
            ? JSON.parse(market.metadata) 
            : market.metadata;

          if (metadata?.precision) {
            setPricePrecision(metadata.precision.price || 2);
            setAmountPrecision(metadata.precision.amount || 4);
          }

          // Set funding rate
          if (metadata?.fundingRate) {
            setFundingRate(metadata.fundingRate);
          }

          // Calculate next funding time (every 8 hours: 00:00, 08:00, 16:00 UTC)
          const now = new Date();
          const hours = now.getUTCHours();
          const nextFundingHour = (Math.ceil(hours / 8) * 8) % 24;
          const minutesUntilFunding = (nextFundingHour - hours) * 60 - now.getUTCMinutes();

          const hoursLeft = Math.floor(minutesUntilFunding / 60);
          const minutesLeft = Math.floor(minutesUntilFunding % 60);
          setFundingTime(
            `${hoursLeft.toString().padStart(2, "0")}:${minutesLeft.toString().padStart(2, "0")}:00`
          );
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching futures market info:", error);
      setIsLoading(false);
    }
  };

  // Fetch wallet data for futures margin
  const fetchWalletData = async () => {
    const now = Date.now();
    if (isFetchingRef.current || now - lastFetchTimeRef.current < 1000) {
      return;
    }

    const cacheKey = `futures_wallet_${currency}_${pair}`;
    
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (now - timestamp < 30000) {
          setWalletData(cachedData);
          return;
        }
      }
    }

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setIsLoadingWallet(true);

      // For futures, we need margin balance (usually USDT)
      const endpoint = `/api/finance/wallet/FUTURES/${pair}`;
      const { data, error } = await $fetch({
        url: endpoint,
        silent: true,
      });

      if (!error && data) {
        const walletInfo = {
          balance: data.balance || 0,
          availableBalance: data.availableBalance || data.balance || 0,
          currency: pair, // For futures, show margin currency (USDT)
          margin: data.margin || 0,
          unrealizedPnl: data.unrealizedPnl || 0,
        };

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: walletInfo,
            timestamp: now
          }));
        }

        setWalletData(walletInfo);
      }
    } catch (error) {
      console.error("Error fetching futures wallet data:", error);
    } finally {
      setIsLoadingWallet(false);
      isFetchingRef.current = false;
    }
  };

  // Subscribe to price updates
  useEffect(() => {
    if (!symbol) return;

    // Clean up any existing subscription first
    if (tickerUnsubscribeRef.current) {
      tickerUnsubscribeRef.current();
      tickerUnsubscribeRef.current = null;
    }

    const handleTickerUpdate = (data: TickerData) => {
      setTickerData(data);
      setCurrentPrice(data.last);

      // Format price according to precision
      const formattedPrice = data.last.toLocaleString(undefined, {
        minimumFractionDigits: pricePrecision,
        maximumFractionDigits: pricePrecision,
      });

      // Determine price direction
      if (lastPrice !== null) {
        if (data.last > lastPrice) {
          setPriceDirection("up");
        } else if (data.last < lastPrice) {
          setPriceDirection("down");
        }

        const timeout = setTimeout(() => {
          setPriceDirection("neutral");
        }, 1000);

        return () => clearTimeout(timeout);
      }

      setLastPrice(data.last);
      setMarketPrice(formattedPrice);
    };

    // Subscribe to futures ticker updates with a small delay to ensure proper cleanup
    const subscriptionTimeout = setTimeout(() => {
      tickerUnsubscribeRef.current = marketDataWs.subscribe(
        {
          type: "ticker",
          symbol,
          marketType: "futures",
        },
        handleTickerUpdate
      );
    }, 50);

    return () => {
      clearTimeout(subscriptionTimeout);
      if (tickerUnsubscribeRef.current) {
        tickerUnsubscribeRef.current();
        tickerUnsubscribeRef.current = null;
      }
    };
  }, [symbol, pricePrecision, lastPrice]);

  // Format price with appropriate precision
  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: pricePrecision,
      maximumFractionDigits: pricePrecision,
    });
  };

  // Shared props for order forms
  const sharedProps = {
    symbol,
    currency,
    pair,
    currentPrice,
    marketPrice,
    pricePrecision,
    amountPrecision,
    walletData,
    priceDirection,
    onOrderSubmit,
    fetchWalletData,
    marketInfo,
    fundingRate,
    fundingTime,
    formatPrice,
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black overflow-y-auto scrollbar-hide">
      {/* Futures market indicator */}
      <div className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center">
        <Zap className="h-3.5 w-3.5 text-yellow-500 mr-1.5" />
        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
          {t("futures_trading")}
        </span>
        <Badge className="ml-auto bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-[10px]">
          {symbol}
        </Badge>
      </div>

      {/* Available balance section */}
      <BalanceDisplay
        walletData={walletData}
        isLoadingWallet={isLoadingWallet}
        currency={currency}
        pair={pair}
        marketPrice={marketPrice}
        fundingRate={fundingRate}
        fundingTime={fundingTime}
      />

      <Tabs
        defaultValue="market"
        className="flex-1"
        value={orderType}
        onValueChange={(value) => setOrderType(value as "market" | "limit")}
      >
        <TabsList className="w-full grid grid-cols-2 rounded-none">
          <TabTrigger value="market">{t("Market")}</TabTrigger>
          <TabTrigger value="limit">{t("Limit")}</TabTrigger>
        </TabsList>

        <TabContent value="market" className="p-3 space-y-3">
          <MarketOrderForm {...sharedProps} />
        </TabContent>

        <TabContent value="limit" className="p-3 space-y-3">
          <LimitOrderForm {...sharedProps} />
        </TabContent>
      </Tabs>


    </div>
  );
}
