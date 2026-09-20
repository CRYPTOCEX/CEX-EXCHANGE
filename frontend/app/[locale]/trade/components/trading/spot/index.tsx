"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Leaf, Sparkles, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabTrigger, TabContent } from "../../ui/custom-tabs";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { useCoalescedCallback } from "@/hooks/use-coalesced-callback";
import { marketDataWs } from "@/services/market-data-ws";
import { marketService } from "@/services/market-service";
import { useConfigStore } from "@/store/config";
import BalanceDisplay from "./balance-display";
import LimitOrderForm from "./limit-order-form";
import MarketOrderForm from "./market-order-form";
import StopOrderForm from "./stop-order-form";
import OcoOrderForm from "./oco-order-form";
import AiInvestmentForm from "../ai-investment";
import { AlgoTradingPanel } from "../../algo/AlgoTradingPanel";
import type { WalletData, TickerData } from "./types";
import { useTranslations } from "next-intl";
import { m, AnimatePresence, type Variants } from "framer-motion";

interface TradingFormPanelProps {
  symbol?: string;
  isEco?: boolean;
  onOrderSubmit?: (orderData: any) => Promise<any>;
}

// Animation variants
/**
 * Ceiling on how often order/wallet events may re-read the wallet. See
 * `refreshWalletCoalesced`.
 */
const WALLET_REFRESH_INTERVAL_MS = 2000;

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
    <m.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center justify-center flex-1 py-2.5 text-xs font-medium relative overflow-hidden transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground/80"
      )}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {active && (
        <m.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
    </m.button>
  );
}

export default function TradingFormPanel({
  symbol = "BTCUSDT",
  isEco = false,
  onOrderSubmit,
}: TradingFormPanelProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const extensions = useConfigStore((state) => state.extensions);
  const searchParams = useSearchParams();
  const isAiInvestmentEnabled = extensions?.includes("ai_investment");
  const isAlgoInstalled = extensions?.includes("trading_bot");
  const [buyMode, setBuyMode] = useState(true);
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop" | "oco">("limit");
  // `?panel=algo` opens straight into the bot builder. /trading-bot/create
  // redirects here, so this is how every "Create a bot" link in the extension
  // lands on the form.
  const [tradingType, setTradingType] = useState<"standard" | "ai" | "algo">(
    () => (searchParams.get("panel") === "algo" ? "algo" : "standard")
  );
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

  /*
   * Stop orders exist only on ecosystem markets — conditional orders rest in
   * Scylla via utils/stopOrders.ts, and the provider path has no STOP in
   * `exchangeOrder.type`. Read both flags for the same reason the order
   * routing does: `isEco` is URL-derived and available on first render, while
   * `isMarketEco` resolves a commit later from the fetched market.
   */
  const stopSupported = isMarketEco || isEco;

  /*
   * Navigating from an ecosystem market to a provider one while the Stop tab is
   * selected would leave `orderType === "stop"` with no matching trigger and no
   * content, so the panel renders empty. Fall back to limit.
   *
   * Declared HERE and not beside the `orderType` state: the dependency array is
   * evaluated during render, so referencing `stopSupported` above its own
   * declaration is a TDZ throw, not a lint nit.
   */
  useEffect(() => {
    // OCO rides the same gate, so it needs the same fallback: a market that
    // cannot hold a resting stop cannot hold an OCO either, and a tab left
    // selected after a market switch would submit into a 422.
    if ((orderType === "stop" || orderType === "oco") && !stopSupported) {
      setOrderType("limit");
    }
  }, [orderType, stopSupported]);

  /**
   * The bot engine is ECOSYSTEM-ONLY.
   *
   * `PriceService` prices through `getEcosystemMarketPrice`, `OrderExecutor`
   * places live orders with `placeEcosystemOrder`, and allocations are backed by
   * the ECO wallet — there is no path from this addon to an exchange spot book.
   * Offering the tab on a CEX market let a user build and fund a bot on, say,
   * spot BTC/USDT that could then never price a single tick: no error, no trade,
   * just a bot that sat there. (`createBot` now refuses those symbols outright;
   * this keeps the user from getting that far.)
   */
  const isAlgoEnabled = isAlgoInstalled && isMarketEco;

  // A tab that stops being available must not leave `tradingType` pointing at
  // it: the render chain falls through "algo" to the AI branch, so the user
  // would land on AI Investment after switching to a CEX market — or after
  // following a `?panel=algo` link to one. Waiting for `currency`/`pair` means
  // the reset runs on resolved market data, not on the initial prop guess.
  useEffect(() => {
    if (tradingType === "algo" && currency && pair && !isAlgoEnabled) {
      setTradingType("standard");
    }
  }, [tradingType, isAlgoEnabled, currency, pair]);
  // null until the market publishes its rates. Seeding these with 0.001 made
  // every ticket assert a confident "0.10%" before (and, if the market carried
  // no rates, instead of) the real number — which on a market running the 1%
  // default was wrong by a factor of ten.
  const [takerFee, setTakerFee] = useState<number | null>(null);
  const [makerFee, setMakerFee] = useState<number | null>(null);

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
            // Symbol is always "currency/pair" from the API (URL may use "-" which we normalize)
            const [curr, pr] = symbol.replace("-", "/").split("/");
            if (curr && pr) {
              setCurrency(curr);
              setPair(pr);
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
      /*
       * A REFRESH MUST NOT BLANK THE BALANCE IT IS REFRESHING.
       *
       * `isLoadingWallet` reaches `BalanceDisplay` as `Loadable loading=`, which
       * replaces the figure with a placeholder. Correct on a first load and on a
       * pair switch — there is nothing to show, or what is shown belongs to the
       * market you just left. Wrong on a refresh, and this refreshes on every
       * `tp-order-updated`: one per order the exchange touches, which under a
       * running bot is dozens a second. That is the same strobe reported on the
       * Pro terminal, on this page's balance figures.
       */
      const isDifferentPair = lastFetchKeyRef.current !== fetchKey;
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      lastFetchKeyRef.current = fetchKey;
      if (isDifferentPair || !walletData) setIsLoadingWallet(true);

      const walletType = isMarketEco ? "ECO" : "SPOT";
      const endpoint = `/api/finance/wallet/symbol?type=${walletType}&currency=${currency}&pair=${pair}`;

      const { data, error } = await $fetch({
        url: endpoint,
        silent: true,
        silentSuccess: true,
      });

      if (!error && data) {
        // HOLD model: wallet.balance is the available/free amount.
        // inOrder is held (in a trade or a P2P offer) and must not be subtracted.
        const currencyAvailable =
          typeof data.CURRENCY === "object"
            ? data.CURRENCY.balance
            : data.CURRENCY;

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

  /*
   * ONE WALLET READ PER BURST, AND ONE AFTER IT.
   *
   * The handler below deliberately zeroes `lastFetchTimeRef` to punch through
   * `fetchWalletData`'s own 2-second guard — which is right for a single event
   * (the customer just traded; the number has moved) and catastrophic for a
   * stream, because it turns every frame a bot produces into its own request.
   * The coalescer keeps the punch-through — the first event still refreshes
   * immediately — while capping the rate and guaranteeing a final read after
   * the burst, which is the one carrying the balance that ends up on screen.
   */
  const refreshWalletCoalesced = useCoalescedCallback(() => {
    if (currency && pair) {
      lastFetchTimeRef.current = 0;
      fetchWalletData();
    }
  }, WALLET_REFRESH_INTERVAL_MS);

  // Listen for wallet updates
  useEffect(() => {
    const handleWalletUpdate = () => {
      refreshWalletCoalesced();
    };

    window.addEventListener("walletUpdated", handleWalletUpdate);
    window.addEventListener("order-placed", handleWalletUpdate);
    window.addEventListener("tp-order-updated", handleWalletUpdate);
    return () => {
      window.removeEventListener("walletUpdated", handleWalletUpdate);
      window.removeEventListener("order-placed", handleWalletUpdate);
      window.removeEventListener("tp-order-updated", handleWalletUpdate);
    };
    // `refreshWalletCoalesced` is identity-stable, so this list still only
    // re-binds on a pair change — the coalescing window is not reset by a render.
  }, [currency, pair, isMarketEco, refreshWalletCoalesced]);

  // Refresh balances when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currency && pair) {
        lastFetchTimeRef.current = 0;
        fetchWalletData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
    <m.div
      className="flex flex-col h-full bg-background overflow-y-auto scrollbar-hide"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Eco market indicator — the hue rides the icon and the chip border, the
          label stays on --foreground: `--success` as ink is 3.39:1 in light. */}
      {isMarketEco && (
        <div className="px-3 py-1.5 bg-success/10 border-b border-success/20 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center">
            <Leaf className="h-3.5 w-3.5 text-success mr-1.5" />
            <span className="text-xs font-medium text-foreground">
              {tCommon("eco_market")}
            </span>
          </div>
          <Badge className="bg-success/15 text-foreground border-success/30 text-[10px]">
            {tCommon("low_fee")}
          </Badge>
        </div>
      )}

      {/* Trading type tabs */}
      <m.div
        variants={itemVariants}
        className="flex border-b border-border"
      >
        <AnimatedTabButton
          active={tradingType === "standard"}
          onClick={() => setTradingType("standard")}
        >
          {t("standard_trading")}
        </AnimatedTabButton>
        {isAlgoEnabled && (
          <AnimatedTabButton
            active={tradingType === "algo"}
            onClick={() => setTradingType("algo")}
            icon={<Bot className="h-3 w-3" />}
          >
            {t("algo_trading")}
          </AnimatedTabButton>
        )}
        {isAiInvestmentEnabled && (
          <AnimatedTabButton
            active={tradingType === "ai"}
            onClick={() => setTradingType("ai")}
            icon={<Sparkles className="h-3 w-3" />}
          >
            {tCommon("ai_investment")}
          </AnimatedTabButton>
        )}
      </m.div>

      {/* Balance display — the algo panel carries its own allocation balance */}
      {tradingType !== "algo" && (
        <m.div variants={itemVariants}>
          <BalanceDisplay
            walletData={walletData}
            isLoadingWallet={isLoadingWallet}
            currency={currency}
            pair={pair}
            marketPrice={marketPrice}
            pricePrecision={pricePrecision}
            amountPrecision={amountPrecision}
          />
        </m.div>
      )}

      {/* Trading forms */}
      <AnimatePresence mode="wait">
        {isAlgoEnabled && tradingType === "algo" ? (
          <m.div
            key="algo"
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-1 min-h-0"
          >
            <AlgoTradingPanel
              symbol={currency && pair ? `${currency}/${pair}` : symbol}
              currentPrice={lastPrice}
              className="flex-1 min-h-[520px]"
            />
          </m.div>
        ) : tradingType === "standard" || !isAiInvestmentEnabled ? (
          <m.div
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
              onValueChange={(value) => setOrderType(value as "limit" | "market" | "stop" | "oco")}
            >
              {/*
                THE STOP TAB IS ECOSYSTEM-ONLY, AND THAT IS A BACKEND FACT.
                Conditional orders rest outside the matching engine in Scylla
                (utils/stopOrders.ts + stopOrderMonitor.ts), which only exists
                for ecosystem markets. On the provider path there is nowhere to
                put one: `exchangeOrder.type` is ENUM("MARKET","LIMIT"), so the
                row cannot be written whatever the route does.

                Offering the tab there produced a 422 on every submit. Hiding it
                is the honest answer until the provider path can hold a stop.
              */}
              {/* Four tabs where the engine can hold a conditional order, two
                  where it cannot. OCO rides the SAME gate as Stop and for the
                  same reason: its protective leg is a resting stop, and the
                  provider path has nowhere to put one. */}
              <TabsList
                className={`w-full grid rounded-none ${
                  stopSupported ? "grid-cols-4" : "grid-cols-2"
                }`}
              >
                <TabTrigger value="limit">{tCommon("limit")}</TabTrigger>
                <TabTrigger value="market">{tCommon("market")}</TabTrigger>
                {stopSupported && (
                  <TabTrigger value="stop">{tCommon("stop")}</TabTrigger>
                )}
                {stopSupported && (
                  <TabTrigger value="oco">{t("oco")}</TabTrigger>
                )}
              </TabsList>

              <TabContent value="limit" className="p-2 space-y-2 min-h-[400px]">
                <LimitOrderForm {...sharedProps} />
              </TabContent>

              <TabContent value="market" className="p-2 min-h-[400px]">
                <MarketOrderForm {...sharedProps} />
              </TabContent>

              {stopSupported && (
                <TabContent value="stop" className="p-2 min-h-[400px]">
                  <StopOrderForm {...sharedProps} />
                </TabContent>
              )}

              {stopSupported && (
                <TabContent value="oco" className="p-2 min-h-[400px]">
                  <OcoOrderForm {...sharedProps} />
                </TabContent>
              )}
            </Tabs>
          </m.div>
        ) : (
          <m.div
            key="ai"
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex-1"
          >
            <AiInvestmentForm isEco={isMarketEco} symbol={symbol} />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
