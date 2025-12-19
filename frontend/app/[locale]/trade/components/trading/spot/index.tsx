"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
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
  const [currency, setCurrency] = useState<string>("");
  const [pair, setPair] = useState<string>("");
  const [isMarketEco, setIsMarketEco] = useState(isEco);
  const [takerFee, setTakerFee] = useState(0.001); // Default 0.1%
  const [makerFee, setMakerFee] = useState(0.001); // Default 0.1%

  // Add refs to prevent duplicate fetching
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const lastFetchKeyRef = useRef<string>("");
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
          // Don't fetch if symbol is empty - wait for it to be set
          if (!symbol) {
            return;
          }

          const markets = await marketService.getSpotMarkets();
          // Normalize symbol format (convert BTC-USDT to BTC/USDT)
          const normalizedSymbol = symbol.replace('-', '/');
          const market = markets.find((m: any) => m.symbol === normalizedSymbol);

          if (market) {
            const metadata = market.metadata;

            // Extract currency and pair from market data
            setCurrency(market.currency || "");
            setPair(market.pair || "");

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

            // Set fee rates from market metadata
            if (metadata?.taker !== undefined) {
              setTakerFee(Number(metadata.taker) / 100); // Convert from percentage to decimal
            }
            if (metadata?.maker !== undefined) {
              setMakerFee(Number(metadata.maker) / 100); // Convert from percentage to decimal
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
            }
            // If no pattern matches, leave currency/pair empty
            // They will be set when a valid symbol is provided
          }
        } catch (error) {
          console.error("Error in findMarketMetadata:", error);
          // Don't set default values - let the component wait for valid symbol
        }
      };

      findMarketMetadata();
    } catch (error) {
      console.error("Error fetching market metadata:", error);
      // Don't set default values - let the UI show loading/error state
    }

    // Wallet data will be fetched by the useEffect below once currency/pair are set
  }, [symbol]);

  // Fetch wallet data for both currencies
  const fetchWalletData = async () => {
    // Create a unique key for this market
    const fetchKey = `${isMarketEco ? 'ECO' : 'SPOT'}-${currency}-${pair}`;

    // Prevent duplicate calls for the same market
    const now = Date.now();

    // Skip if already fetching, or if we just fetched this exact market within 2 seconds
    if (isFetchingRef.current ||
        (lastFetchKeyRef.current === fetchKey && now - lastFetchTimeRef.current < 2000)) {
      return;
    }

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      lastFetchKeyRef.current = fetchKey;
      setIsLoadingWallet(true);

      // Use the symbol endpoint to fetch both currency and pair balances
      const walletType = isMarketEco ? 'ECO' : 'SPOT';
      const endpoint = `/api/finance/wallet/symbol?type=${walletType}&currency=${currency}&pair=${pair}`;

      const { data, error} = await $fetch({
        url: endpoint,
        silent: true, // Don't show loading/success toasts
        silentSuccess: true,
      });

      if (!error && data) {
        // Handle new response format with balance details
        // data.CURRENCY and data.PAIR are now objects with balance (available), inOrder, total
        const currencyAvailable = typeof data.CURRENCY === 'object'
          ? data.CURRENCY.balance
          : data.CURRENCY;

        setWalletData({
          balance: currencyAvailable, // Available balance for backward compatibility
          availableBalance: currencyAvailable,
          currency: currency,
          currencyBalance: data.CURRENCY, // Store full balance object for reference
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

  // Refetch wallet data when currency, pair or market type changes
  useEffect(() => {
    const fetchKey = `${isMarketEco ? 'ECO' : 'SPOT'}-${currency}-${pair}`;

    if (currency && pair) {
      // Only fetch if this is a different market than the last one we fetched
      if (lastFetchKeyRef.current !== fetchKey) {
        // Clear wallet data when switching markets
        setWalletData(null);
        fetchWalletData();
      }
    }
  }, [currency, pair, isMarketEco]);

  // Note: We don't auto-refresh wallet data on a timer
  // Wallet balance is updated when:
  // 1. Market changes (handled by useEffect above)
  // 2. After successful order (forms call fetchWalletData after order submission)
  // 3. After order cancellation (walletUpdated event from orders panel)
  // This prevents unnecessary API calls and reduces server load

  // Listen for wallet updates from other components (e.g., when orders are cancelled)
  useEffect(() => {
    const handleWalletUpdate = () => {
      // Force refresh wallet data when orders are cancelled
      if (currency && pair) {
        lastFetchTimeRef.current = 0; // Reset the fetch timer to allow immediate fetch
        fetchWalletData();
      }
    };

    window.addEventListener('walletUpdated', handleWalletUpdate);
    return () => {
      window.removeEventListener('walletUpdated', handleWalletUpdate);
    };
  }, [currency, pair, isMarketEco]);

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
      // Determine market type: check isMarketEco state, then isEco prop, then URL
      let marketType: "spot" | "eco" = "spot";
      if (isMarketEco) {
        marketType = "eco";
      } else if (isEco) {
        marketType = "eco";
      } else if (typeof window !== "undefined") {
        // Fallback: check URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlType = urlParams.get("type");
        if (urlType === "spot-eco") {
          marketType = "eco";
        }
      }

      unsubscribeRef.current = marketDataWs.subscribe(
        {
          type: "ticker",
          symbol,
          marketType,
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
    takerFee,
    makerFee,
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black overflow-y-auto scrollbar-hide">
      {/* Market type indicator - only show for Eco markets */}
      {isMarketEco && (
        <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center">
          <Leaf className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {tCommon("eco_market")}
          </span>
          <Badge className="ml-auto bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
            {tCommon("low_fee")}
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
          {tCommon("ai_investment")}
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
            <TabTrigger value="limit">{tCommon("limit")}</TabTrigger>
            <TabTrigger value="market">{tCommon("market")}</TabTrigger>
            <TabTrigger value="stop">{tCommon("stop")}</TabTrigger>
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
