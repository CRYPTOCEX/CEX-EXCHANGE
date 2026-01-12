"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Leaf, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
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
import { motion, AnimatePresence, type Variants } from "framer-motion";

interface TradingFormPanelProps {
  symbol?: string;
  isEco?: boolean;
  onOrderSubmit?: (orderData: any) => Promise<any>;
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const tabContentVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: { duration: 0.15 },
  },
};

// Animated tab button
function AnimatedTabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center justify-center flex-1 py-2.5 text-xs font-medium relative overflow-hidden transition-colors",
        active
          ? "text-foreground dark:text-white"
          : "text-muted-foreground dark:text-zinc-400 hover:text-foreground/80"
      )}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-blue-500"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
    </motion.button>
  );
}

// Price indicator with flash animation
function PriceIndicator({
  price,
  direction,
}: {
  price: string;
  direction: "up" | "down" | "neutral";
}) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md transition-colors",
        direction === "up" && "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
        direction === "down" && "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10",
        direction === "neutral" && "text-zinc-700 dark:text-zinc-300"
      )}
      animate={{
        scale: direction !== "neutral" ? [1, 1.05, 1] : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      {direction === "up" && <TrendingUp className="h-3.5 w-3.5" />}
      {direction === "down" && <TrendingDown className="h-3.5 w-3.5" />}
      <span>{price}</span>
    </motion.div>
  );
}

export default function TradingFormPanel({
  symbol = "BTCUSDT",
  isEco = false,
  onOrderSubmit,
}: TradingFormPanelProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const [buyMode, setBuyMode] = useState(true);
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop">("limit");
  const [tradingType, setTradingType] = useState<"standard" | "ai">("standard");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [marketPrice, setMarketPrice] = useState("48,235.75");
  const [pricePrecision, setPricePrecision] = useState(2);
  const [amountPrecision, setAmountPrecision] = useState(4);
  const [minAmount, setMinAmount] = useState(0.0001);
  const [maxAmount, setMaxAmount] = useState(1000000);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("");
  const [pair, setPair] = useState<string>("");
  const [isMarketEco, setIsMarketEco] = useState(isEco);
  const [takerFee, setTakerFee] = useState(0.001);
  const [makerFee, setMakerFee] = useState(0.001);

  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const lastFetchKeyRef = useRef<string>("");
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Reset market price and wallet data when symbol changes
  useEffect(() => {
    setMarketPrice("--");
    setLastPrice(null);
    setPriceDirection("neutral");
    setTickerData(null);
    setWalletData(null);
  }, [symbol]);

  // Fetch market data on mount
  useEffect(() => {
    try {
      const findMarketMetadata = async () => {
        try {
          if (!symbol) return;

          const markets = await marketService.getSpotMarkets();
          const normalizedSymbol = symbol.replace("-", "/");
          const market = markets.find((m: any) => m.symbol === normalizedSymbol);

          if (market) {
            const metadata = market.metadata;
            setCurrency(market.currency || "");
            setPair(market.pair || "");
            setIsMarketEco(market.isEco || false);

            if (metadata?.precision) {
              setPricePrecision(metadata.precision.price || 2);
              setAmountPrecision(metadata.precision.amount || 4);
            }

            if (metadata?.limits?.amount) {
              setMinAmount(metadata.limits.amount.min || 0.0001);
              setMaxAmount(metadata.limits.amount.max || 1000000);
            }

            if (metadata?.taker !== undefined) {
              setTakerFee(Number(metadata.taker) / 100);
            }
            if (metadata?.maker !== undefined) {
              setMakerFee(Number(metadata.maker) / 100);
            }
          } else {
            setIsMarketEco(isEco);
            const normalizedSymbol = symbol.replace("-", "/");
            if (normalizedSymbol.includes("/")) {
              const [curr, pr] = normalizedSymbol.split("/");
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
          }
        } catch (error) {
          console.error("Error in findMarketMetadata:", error);
        }
      };

      findMarketMetadata();
    } catch (error) {
      console.error("Error fetching market metadata:", error);
    }
  }, [symbol]);

  // Fetch wallet data
  const fetchWalletData = async () => {
    const fetchKey = `${isMarketEco ? "ECO" : "SPOT"}-${currency}-${pair}`;
    const now = Date.now();

    if (
      isFetchingRef.current ||
      (lastFetchKeyRef.current === fetchKey && now - lastFetchTimeRef.current < 2000)
    ) {
      return;
    }

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      lastFetchKeyRef.current = fetchKey;
      setIsLoadingWallet(true);

      const walletType = isMarketEco ? "ECO" : "SPOT";
      const endpoint = `/api/finance/wallet/symbol?type=${walletType}&currency=${currency}&pair=${pair}`;

      const { data, error } = await $fetch({
        url: endpoint,
        silent: true,
        silentSuccess: true,
      });

      if (!error && data) {
        const currencyAvailable =
          typeof data.CURRENCY === "object" ? data.CURRENCY.balance : data.CURRENCY;

        setWalletData({
          balance: currencyAvailable,
          availableBalance: currencyAvailable,
          currency: currency,
          currencyBalance: data.CURRENCY,
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

  // Refetch wallet when currency/pair changes
  useEffect(() => {
    const fetchKey = `${isMarketEco ? "ECO" : "SPOT"}-${currency}-${pair}`;
    if (currency && pair && lastFetchKeyRef.current !== fetchKey) {
      setWalletData(null);
      fetchWalletData();
    }
  }, [currency, pair, isMarketEco]);

  // Listen for wallet updates
  useEffect(() => {
    const handleWalletUpdate = () => {
      if (currency && pair) {
        lastFetchTimeRef.current = 0;
        fetchWalletData();
      }
    };

    window.addEventListener("walletUpdated", handleWalletUpdate);
    return () => window.removeEventListener("walletUpdated", handleWalletUpdate);
  }, [currency, pair, isMarketEco]);

  // Subscribe to price updates
  useEffect(() => {
    if (!symbol) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const handleTickerUpdate = (data: TickerData) => {
      setTickerData(data);

      const formattedPrice = data.last.toLocaleString(undefined, {
        minimumFractionDigits: pricePrecision,
        maximumFractionDigits: pricePrecision,
      });

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

    const subscriptionTimeout = setTimeout(() => {
      let marketType: "spot" | "eco" = "spot";
      if (isMarketEco || isEco) {
        marketType = "eco";
      } else if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlType = urlParams.get("type");
        if (urlType === "spot-eco") {
          marketType = "eco";
        }
      }

      unsubscribeRef.current = marketDataWs.subscribe(
        { type: "ticker", symbol, marketType },
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
    <motion.div
      className="flex flex-col h-full bg-background dark:bg-black overflow-y-auto scrollbar-hide"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Eco market indicator */}
      {isMarketEco && (
        <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center">
            <Leaf className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {tCommon("eco_market")}
            </span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
            {tCommon("low_fee")}
          </Badge>
        </div>
      )}

      {/* Trading type tabs */}
      <motion.div
        variants={itemVariants}
        className="flex border-b border-border dark:border-zinc-800"
      >
        <AnimatedTabButton
          active={tradingType === "standard"}
          onClick={() => setTradingType("standard")}
        >
          {t("standard_trading")}
        </AnimatedTabButton>
        <AnimatedTabButton
          active={tradingType === "ai"}
          onClick={() => setTradingType("ai")}
          icon={<Sparkles className="h-3 w-3" />}
        >
          {tCommon("ai_investment")}
        </AnimatedTabButton>
      </motion.div>

      {/* Balance display */}
      <motion.div variants={itemVariants}>
        <BalanceDisplay
          walletData={walletData}
          isLoadingWallet={isLoadingWallet}
          currency={currency}
          pair={pair}
          marketPrice={marketPrice}
          pricePrecision={pricePrecision}
          amountPrecision={amountPrecision}
        />
      </motion.div>

      {/* Trading forms */}
      <AnimatePresence mode="wait">
        {tradingType === "standard" ? (
          <motion.div
            key="standard"
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex-1"
          >
            <Tabs
              defaultValue="limit"
              className="flex-1"
              value={orderType}
              onValueChange={(value) => setOrderType(value as "limit" | "market" | "stop")}
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
          </motion.div>
        ) : (
          <motion.div
            key="ai"
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex-1"
          >
            <AiInvestmentForm isEco={isMarketEco} symbol={symbol} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
