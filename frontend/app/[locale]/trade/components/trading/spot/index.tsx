"use client";

import { useState, useEffect, useRef } from "react";
import { Leaf, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabTrigger, TabContent } from "../../ui/custom-tabs";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { marketDataWs } from "@/services/market-data-ws";
import { marketService } from "@/services/market-service";
import BalanceDisplay from "./balance-display";
import LimitOrderForm from "./limit-order-form";
import MarketOrderForm from "./market-order-form";
import StopOrderForm from "./stop-order-form";
import AiInvestmentForm from "../ai-investment";
import type { WalletData, TickerData } from "./types";
import { useTranslations } from "next-intl";

interface TradingFormPanelProps {
  symbol?: string;
  isEco?: boolean;
  onOrderSubmit?: (orderData: any) => Promise<any>;
}

export default function TradingFormPanel({
  symbol = "BTCUSDT",
  isEco = false,
  onOrderSubmit,
}: TradingFormPanelProps) {
  const t = useTranslations("trade/components/trading/spot/index");
  const [buyMode, setBuyMode] = useState(true);
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop">(
    "limit"
  );
  const [tradingType, setTradingType] = useState<"standard" | "ai">("standard");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [marketPrice, setMarketPrice] = useState("48,235.75");
  const [pricePrecision, setPricePrecision] = useState(2);
  const [amountPrecision, setAmountPrecision] = useState(4);
  const [minAmount, setMinAmount] = useState(0.0001);
  const [maxAmount, setMaxAmount] = useState(1000000);
  const [priceDirection, setPriceDirection] = useState<
    "up" | "down" | "neutral"
  >("neutral");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("BTC");
  const [pair, setPair] = useState("USDT");
  const [isMarketEco, setIsMarketEco] = useState(isEco);

  // Add refs to prevent duplicate fetching
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Reset market price and wallet data immediately when symbol changes
  useEffect(() => {
    // Reset price to loading state when symbol changes
    setMarketPrice("--");
    setLastPrice(null);
    setPriceDirection("neutral");
    setTickerData(null);
    // Reset wallet data to prevent showing old market's balance
    setWalletData(null);
  }, [symbol]);

  // Fetch market data on component mount
  useEffect(() => {
    try {
      // Use centralized market service to get market metadata
      const findMarketMetadata = async () => {
        try {
          const markets = await marketService.getSpotMarkets();
          // Normalize symbol format (convert BTC-USDT to BTC/USDT)
          const normalizedSymbol = symbol.replace('-', '/');
          const market = markets.find((m: any) => m.symbol === normalizedSymbol);

          if (market) {
            const metadata = market.metadata;

            // Extract currency and pair from market data
            setCurrency(market.currency || "BTC");
            setPair(market.pair || "USDT");

            // Set the correct market type (eco or spot)
            setIsMarketEco(market.isEco || false);

            // Set precision based on market metadata
            if (metadata?.precision) {
              setPricePrecision(metadata.precision.price || 2);
              setAmountPrecision(metadata.precision.amount || 4);
            }

            // Set min/max amount based on market limits
            if (metadata?.limits?.amount) {
              setMinAmount(metadata.limits.amount.min || 0.0001);
              setMaxAmount(metadata.limits.amount.max || 1000000);
            }
          } else {
            // Fallback: extract from symbol if market not found
            // Reset to prop value when market not found
            setIsMarketEco(isEco);

            // Normalize symbol first
            const normalizedSymbol = symbol.replace('-', '/');
            // This is a basic fallback for common patterns
            if (normalizedSymbol.includes('/')) {
              const [curr, pr] = normalizedSymbol.split('/');
              setCurrency(curr);
              setPair(pr);
            } else if (symbol.endsWith("USDT")) {
              setCurrency(symbol.replace("USDT", ""));
              setPair("USDT");
            } else if (symbol.endsWith("BUSD")) {
              setCurrency(symbol.replace("BUSD", ""));
              setPair("BUSD");
            } else if (symbol.endsWith("USD")) {
              setCurrency(symbol.replace("USD", ""));
              setPair("USD");
            } else {
              // Default fallback
              setCurrency("BTC");
              setPair("USDT");
            }
          }
        } catch (error) {
          // Use default values if there's an error
          setCurrency("BTC");
          setPair("USDT");
          setIsMarketEco(isEco);
          setPricePrecision(2);
          setAmountPrecision(4);
          setMinAmount(0.0001);
          setMaxAmount(1000000);
        }
      };

      findMarketMetadata();
    } catch (error) {
      // Use default values if there's an error
      setCurrency("BTC");
      setPair("USDT");
      setPricePrecision(2);
      setAmountPrecision(4);
      setMinAmount(0.0001);
      setMaxAmount(1000000);
    }

    // Fetch wallet data
    fetchWalletData();
  }, [symbol]);

  // Refetch wallet data when currency, pair or market type changes
  useEffect(() => {
    if (currency && pair) {
      fetchWalletData();
    }
  }, [currency, pair, isMarketEco]);

  // Set up periodic wallet balance refresh (every 30 seconds)
  useEffect(() => {
    if (!currency || !pair) return;

    const interval = setInterval(() => {
      fetchWalletData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [currency, pair, isMarketEco]);

  // Fetch wallet data for both currencies
  const fetchWalletData = async () => {
    // Clear wallet data immediately when switching markets to prevent showing old data
    setWalletData(null);

    // Prevent duplicate calls within 1 second for the same market
    const now = Date.now();
    const cacheKey = `${isMarketEco ? 'ECO' : 'SPOT'}-${currency}-${pair}`;

    // Track the last fetch per market to avoid duplicate calls
    if (isFetchingRef.current || now - lastFetchTimeRef.current < 1000) {
      return;
    }

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setIsLoadingWallet(true);

      // Use the symbol endpoint to fetch both currency and pair balances
      const walletType = isMarketEco ? 'ECO' : 'SPOT';
      const endpoint = `/api/finance/wallet/symbol?type=${walletType}&currency=${currency}&pair=${pair}`;

      const { data, error } = await $fetch({
        url: endpoint,
        silentSuccess: true,
      });

      if (!error && data) {
        // Store both balances - the display logic will handle which one to show
        setWalletData({
          balance: data.CURRENCY, // Default to currency balance
          availableBalance: data.CURRENCY,
          currency: currency,
          currencyBalance: data.CURRENCY, // Store both balances for reference
          pairBalance: data.PAIR,
        });
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setIsLoadingWallet(false);
      isFetchingRef.current = false;
    }
  };

  // Subscribe to price updates
  useEffect(() => {
    if (!symbol) return;

    // Clean up any existing subscription first
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const handleTickerUpdate = (data: TickerData) => {
      setTickerData(data);

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

        // Reset animation after 1 second
        const timeout = setTimeout(() => {
          setPriceDirection("neutral");
        }, 1000);

        return () => clearTimeout(timeout);
      }

      setLastPrice(data.last);
      setMarketPrice(formattedPrice);
    };

    // Subscribe to ticker updates with a small delay to ensure proper cleanup
    const subscriptionTimeout = setTimeout(() => {
      unsubscribeRef.current = marketDataWs.subscribe(
        {
          type: "ticker",
          symbol,
          marketType: isEco ? "eco" : "spot",
        },
        handleTickerUpdate
      );
    }, 50);

    return () => {
      clearTimeout(subscriptionTimeout);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [symbol, pricePrecision, lastPrice, isEco]);

  // Shared props for order forms
  const sharedProps = {
    symbol,
    currency,
    pair,
    buyMode,
    setBuyMode,
    marketPrice,
    pricePrecision,
    amountPrecision,
    minAmount,
    maxAmount,
    walletData,
    priceDirection,
    onOrderSubmit,
    fetchWalletData,
    isEco: isMarketEco,
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black overflow-y-auto scrollbar-hide">
      {/* Market type indicator - only show for Eco markets */}
      {isMarketEco && (
        <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center">
          <Leaf className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {t("eco_market")}
          </span>
          <Badge className="ml-auto bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
            {t("low_fee")}
          </Badge>
        </div>
      )}

      <div className="flex border-b border-border dark:border-zinc-800">
        <button
          onClick={() => setTradingType("standard")}
          className={cn(
            "flex items-center justify-center flex-1 py-2 text-xs font-medium",
            tradingType === "standard"
              ? "text-foreground dark:text-white border-b-2 border-primary dark:border-blue-500"
              : "text-muted-foreground dark:text-zinc-400"
          )}
        >
          {t("standard_trading")}
        </button>
        <button
          onClick={() => setTradingType("ai")}
          className={cn(
            "flex items-center justify-center flex-1 py-2 text-xs font-medium",
            tradingType === "ai"
              ? "text-foreground dark:text-white border-b-2 border-primary dark:border-blue-500"
              : "text-muted-foreground dark:text-zinc-400"
          )}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {t("ai_investment")}
        </button>
      </div>

      {/* Available balance section */}
      <BalanceDisplay
        walletData={walletData}
        isLoadingWallet={isLoadingWallet}
        currency={currency}
        pair={pair}
        marketPrice={marketPrice}
        pricePrecision={pricePrecision}
        amountPrecision={amountPrecision}
      />

      {tradingType === "standard" ? (
        <Tabs
          defaultValue="limit"
          className="flex-1"
          value={orderType}
          onValueChange={(value) =>
            setOrderType(value as "limit" | "market" | "stop")
          }
        >
          <TabsList className="w-full grid grid-cols-3 rounded-none">
            <TabTrigger value="limit">{t("Limit")}</TabTrigger>
            <TabTrigger value="market">{t("Market")}</TabTrigger>
            <TabTrigger value="stop">{t("Stop")}</TabTrigger>
          </TabsList>

          <TabContent value="limit" className="p-2 space-y-2 min-h-[400px]">
            <LimitOrderForm {...sharedProps} />
          </TabContent>

          <TabContent value="market" className="p-2 min-h-[400px]">
            <MarketOrderForm {...sharedProps} />
          </TabContent>

          <TabContent value="stop" className="p-2 min-h-[400px]">
            <StopOrderForm {...sharedProps} />
          </TabContent>
        </Tabs>
      ) : (
        <AiInvestmentForm isEco={isMarketEco} symbol={symbol} />
      )}
    </div>
  );
}
