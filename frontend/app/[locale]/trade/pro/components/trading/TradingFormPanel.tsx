"use client";

import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Bot, AlertTriangle } from "lucide-react";
import { cn } from "../../utils/cn";
import { formatNumber } from "../../utils/format";
import { SideToggle, type OrderSide } from "./SideToggle";
import { OrderTypeSelector, type OrderType } from "./OrderTypeSelector";
import { BalanceDisplay } from "./BalanceDisplay";
import { PriceInput } from "./PriceInput";
import { AmountInput } from "./AmountInput";
import { AmountSlider } from "./AmountSlider";
import { NumberField } from "./NumberField";
import { OrderSummary } from "./OrderSummary";
import { SubmitButton } from "./SubmitButton";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  AdvancedOptions,
  effectiveTimeInForce,
  timeInForceChoices,
  type AdvancedOptionsState,
} from "./advanced/AdvancedOptions";
import { LeverageSlider } from "./futures/LeverageSlider";
import { MarginDisplay } from "./futures/MarginDisplay";
import { useOrderForm } from "./hooks/useOrderForm";
import { useOrderSubmit } from "./hooks/useOrderSubmit";
import { useBalances } from "./hooks/useBalances";
import { useVenueTimeInForce } from "./hooks/useVenueTimeInForce";
import { useExtensionStatus } from "../../providers/ExtensionStatusProvider";
import type { MarketType, TPMarket, MarketMetadata } from "../../types/common";
import { marketDataWs, type TickerData, type MarketType as WSMarketType } from "@/services/market-data-ws";
import { AiInvestmentForm } from "./AiInvestmentForm";
import { AlgoTradingPanel } from "../../../components/algo/AlgoTradingPanel";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

interface TradingFormPanelProps {
  symbol: string;
  marketType: MarketType;
  market?: TPMarket;
  currentPrice?: number | null;
  className?: string;
  onOrderSuccess?: (order: any) => void;
  compact?: boolean;
  metadata?: MarketMetadata;
}

/** Blocking problems disable the submit; advisory ones only annotate it. */
type Validation = { level: "error" | "warn"; message: string } | null;

export const TradingFormPanel = memo(function TradingFormPanel({
  symbol,
  marketType,
  market,
  currentPrice: externalPrice,
  className,
  onOrderSuccess,
  compact = false,
  metadata,
}: TradingFormPanelProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  // Admin settings
  const { settings: adminSettings } = useExtensionStatus();

  // Check if AI Investment extension is installed
  const extensions = useConfigStore((state) => state.extensions);
  const searchParams = useSearchParams();
  const isAiInvestmentEnabled = extensions?.includes("ai_investment");

  /**
   * The bot engine is ECOSYSTEM-ONLY — it prices through
   * `getEcosystemMarketPrice`, places live orders with `placeEcosystemOrder`,
   * and backs allocations from the ECO wallet. It cannot reach an exchange spot
   * or futures book, so the tab is offered on eco markets and nowhere else.
   * Previously it rendered on all three, and a bot created on a futures or CEX
   * spot pair simply never priced a tick.
   */
  const isAlgoEnabled =
    extensions?.includes("trading_bot") && marketType === "eco";

  // Trading type toggle (standard vs AI vs algo bots).
  // `?panel=algo` opens straight into the bot builder — /trading-bot/create
  // redirects here, so that is how the extension's "Create a bot" links land.
  const [tradingType, setTradingType] = useState<"standard" | "ai" | "algo">(
    () => (searchParams.get("panel") === "algo" ? "algo" : "standard")
  );

  // Never leave `tradingType` on a tab that is no longer rendered: the chain
  // below falls through "algo" to the AI form, so switching to a futures market
  // (or deep-linking to one) would silently land the user on AI Investment.
  useEffect(() => {
    if (tradingType === "algo" && !isAlgoEnabled) setTradingType("standard");
  }, [tradingType, isAlgoEnabled]);

  // Form state - use admin default order type
  const form = useOrderForm(adminSettings.defaultOrderType);

  /*
   * Which time-in-force values the SPOT venue can honour. Asked only on spot:
   * the ecosystem engine enforces all four itself and futures enforces none, so
   * neither has anything to learn from the provider.
   */
  const spotTimeInForce = useVenueTimeInForce(marketType === "spot");

  // Current price state
  const [currentPrice, setCurrentPrice] = useState<number | null>(externalPrice || null);

  // Confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);

  /**
   * Order value as typed into the quote field, when the user is driving from
   * that end ("spend 500 USDT") instead of the base amount.
   *
   * It has to be held separately from the derived value: amount is rounded to
   * the market's precision, so round-tripping 500 -> amount -> value would snap
   * the field out from under the keystroke that is still being typed.
   * `null` means "show the derived value".
   */
  const [quoteDraft, setQuoteDraft] = useState<string | null>(null);

  // Parse symbol to get currencies
  const [baseCurrency, quoteCurrency] = useMemo(() => {
    if (market) {
      return [market.currency, market.pair];
    }
    const parts = symbol.split("/");
    return [parts[0] || "BTC", parts[1] || "USDT"];
  }, [symbol, market]);

  // Balances
  const {
    baseBalance,
    quoteBalance,
    isLoading: balancesLoading,
    refresh: refreshBalances,
  } = useBalances(baseCurrency, quoteCurrency, marketType);

  // Order submission
  const { submit, isSubmitting, error } = useOrderSubmit(marketType);

  // Ref for cleanup
  const tickerUnsubscribeRef = useRef<(() => void) | null>(null);

  // Convert Trading Pro market type to WebSocket service market type
  const wsMarketType: WSMarketType = useMemo(() => {
    if (marketType === "futures") return "futures";
    if (marketType === "eco") return "eco";
    return "spot";
  }, [marketType]);

  // Update price from external source
  useEffect(() => {
    if (externalPrice !== undefined && externalPrice !== null) {
      setCurrentPrice(externalPrice);
    }
  }, [externalPrice]);

  // Subscribe to real ticker updates via WebSocket
  useEffect(() => {
    // Use external price if provided
    if (externalPrice !== undefined && externalPrice !== null) return;

    // Clean up previous subscription
    if (tickerUnsubscribeRef.current) {
      tickerUnsubscribeRef.current();
      tickerUnsubscribeRef.current = null;
    }

    // Initialize WebSocket service
    marketDataWs.initialize();

    // Subscribe to ticker for real-time price
    const unsubscribe = marketDataWs.subscribe<TickerData>(
      {
        symbol,
        type: "ticker",
        marketType: wsMarketType,
      },
      (data) => {
        if (data?.last && data.last > 0) {
          setCurrentPrice(data.last);
        }
      }
    );
    tickerUnsubscribeRef.current = unsubscribe;

    return () => {
      if (tickerUnsubscribeRef.current) {
        tickerUnsubscribeRef.current();
        tickerUnsubscribeRef.current = null;
      }
    };
  }, [symbol, wsMarketType, externalPrice]);

  /*
    A level clicked in the order book.

    A plain click fills the PRICE. A shift- or alt-click also fills the SIZE —
    either the size resting at that level, or, when the modifier lands on a
    level deeper in the ladder, the running size needed to reach it. Typing the
    number you were just looking at is the step this removes, and it is the
    reason the book carries a running total at all.
  */
  useEffect(() => {
    const handlePriceClick = (e: CustomEvent) => {
      const detail = e.detail ?? {};
      const price = Number(detail.price);
      if (!Number.isFinite(price) || price <= 0) return;

      form.setPrice(price.toString());

      const size = Number(detail.cumulative ?? detail.amount);
      if (Number.isFinite(size) && size > 0) {
        form.setAmount(size.toString());
      }

      if (form.orderType === "market") {
        form.setOrderType("limit");
      }
    };

    window.addEventListener("tp-set-order-price", handlePriceClick as EventListener);
    return () => {
      window.removeEventListener("tp-set-order-price", handlePriceClick as EventListener);
    };
  }, [form]);

  // Get precision from metadata or fallback to smart precision
  const pricePrecision = metadata?.precision?.price !== undefined
    ? metadata.precision.price
    : (currentPrice && currentPrice >= 1000 ? 2 : currentPrice && currentPrice >= 1 ? 4 : 8);

  const amountPrecision = metadata?.precision?.amount !== undefined
    ? metadata.precision.amount
    : 4;

  // The price an order would actually fill at: the book for market orders, the
  // typed limit otherwise. Every derived number below hangs off this.
  const effectivePrice = useMemo(() => {
    if (form.orderType === "market") return currentPrice;
    const typed = parseFloat(form.price);
    return Number.isFinite(typed) && typed > 0 ? typed : null;
  }, [form.orderType, form.price, currentPrice]);

  const amountNum = parseFloat(form.amount) || 0;

  // Calculate total
  const total = useMemo(() => {
    if (!effectivePrice || !amountNum) return 0;
    return effectivePrice * amountNum;
  }, [effectivePrice, amountNum]);

  // Calculate max amount based on balance
  const maxAmount = useMemo(() => {
    if (form.side === "buy") {
      if (!effectivePrice || !quoteBalance) return 0;
      return quoteBalance / effectivePrice;
    }
    return baseBalance || 0;
  }, [form.side, effectivePrice, baseBalance, quoteBalance]);

  /** Amount edits from anywhere except the quote field drop the draft. */
  const setAmount = useCallback(
    (value: string) => {
      setQuoteDraft(null);
      form.setAmount(value);
    },
    [form]
  );

  // Handle quick amount percentage
  const handleQuickAmount = useCallback(
    (percentage: number) => {
      if (maxAmount <= 0) return;
      let max = maxAmount * (percentage / 100);

      // For buy orders, account for trading fees to avoid insufficient balance errors
      if (form.side === "buy" && percentage === 100) {
        // The market's own rate, not a constant. A BUY's hold is cost + fee, so
        // sizing "100%" against a hardcoded 0.1% on a market that charges 1%
        // reserved a tenth of the fee and the order was rejected for
        // insufficient balance. Take the WORSE of maker/taker: the ticket cannot
        // know which side of the spread the order will land on, and
        // over-reserving costs a rounding crumb while under-reserving fails.
        const maker = Number(metadata?.maker);
        const taker = Number(metadata?.taker);
        const ratesKnown =
          Number.isFinite(maker) && maker >= 0 && Number.isFinite(taker) && taker >= 0;
        const feeRate = ratesKnown ? Math.max(maker, taker) / 100 : 0.001;
        // Reduce by fee + small buffer for rounding
        max = max / (1 + feeRate) * 0.9999;
      } else if (form.side === "sell" && percentage === 100) {
        // Small buffer for precision
        max = max * 0.9999;
      }

      setAmount(percentage === 0 ? "" : max.toFixed(amountPrecision));
    },
    [maxAmount, form.side, metadata?.maker, metadata?.taker, amountPrecision, setAmount]
  );

  // Where the current amount sits on the 0–100% balance scale. Derived rather
  // than stored, so the slider can never disagree with the amount field.
  const sliderPercentage = useMemo(() => {
    if (maxAmount <= 0 || !amountNum) return 0;
    return Math.min(100, (amountNum / maxAmount) * 100);
  }, [amountNum, maxAmount]);

  // Quote-denominated sizing: type an order value, get the amount.
  const handleQuoteChange = useCallback(
    (value: string) => {
      setQuoteDraft(value);
      if (value === "") {
        form.setAmount("");
        return;
      }
      const quote = parseFloat(value);
      if (effectivePrice && Number.isFinite(quote)) {
        form.setAmount((quote / effectivePrice).toFixed(amountPrecision));
      }
    },
    [effectivePrice, amountPrecision, form]
  );

  // Re-derive the amount when the limit price moves under a quote-denominated
  // order. Market orders are left alone on purpose — re-deriving on every tick
  // would rewrite the amount field while the user is looking at it.
  useEffect(() => {
    if (quoteDraft === null || form.orderType === "market") return;
    const quote = parseFloat(quoteDraft);
    if (!effectivePrice || !Number.isFinite(quote)) return;
    form.setAmount((quote / effectivePrice).toFixed(amountPrecision));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePrice]);

  const quoteValue =
    quoteDraft ?? (total > 0 ? total.toFixed(pricePrecision) : "");

  // Validation. Everything here is checkable client-side without guessing at
  // exchange state, so it fails the order before it costs a round trip.
  const validation = useMemo<Validation>(() => {
    if (amountNum <= 0) return null;

    const needsLimitPrice =
      form.orderType === "limit" || form.orderType === "stop_limit";
    const needsStopPrice =
      form.orderType === "stop_limit" || form.orderType === "stop_market";

    if (needsLimitPrice && !(parseFloat(form.price) > 0)) {
      return { level: "error", message: t("enter_a_limit_price") };
    }
    if (needsStopPrice && !(parseFloat(form.stopPrice) > 0)) {
      return { level: "error", message: t("enter_a_stop_price") };
    }

    const minAmount = metadata?.limits?.amount?.min;
    if (minAmount && amountNum < minAmount) {
      return {
        level: "error",
        message: `Min amount is ${formatNumber(minAmount, amountPrecision)} ${baseCurrency}`,
      };
    }

    const maxLimit = metadata?.limits?.amount?.max;
    if (maxLimit && amountNum > maxLimit) {
      return {
        level: "error",
        message: `Max amount is ${formatNumber(maxLimit, amountPrecision)} ${baseCurrency}`,
      };
    }

    const minCost = metadata?.limits?.cost?.min;
    if (minCost && total > 0 && total < minCost) {
      return {
        level: "error",
        message: `Min order value is ${formatNumber(minCost, pricePrecision)} ${quoteCurrency}`,
      };
    }

    // Advisory only: the wallet endpoint is a snapshot and the backend is the
    // authority on funds, so this must never be the thing that blocks a trade.
    if (maxAmount > 0 && amountNum > maxAmount * 1.0001) {
      return { level: "warn", message: t("amount_exceeds_available_balance") };
    }

    return null;
  }, [
    amountNum,
    form.orderType,
    form.price,
    form.stopPrice,
    metadata,
    amountPrecision,
    pricePrecision,
    baseCurrency,
    quoteCurrency,
    total,
    maxAmount,
  ]);

  // Handle submit
  const handleSubmit = async () => {
    // Check admin settings for confirmation requirements
    // If one-click trading is enabled, skip confirmation
    // Otherwise, respect the confirmOrders setting
    const needsConfirmation = !adminSettings.oneClickTradingEnabled && adminSettings.confirmOrders;

    if (needsConfirmation) {
      setShowConfirmation(true);
      return;
    }

    await executeOrder();
  };

  const executeOrder = async () => {
    try {
      const result = await submit({
        symbol,
        side: form.side,
        type: form.orderType,
        // Only limit-priced order types carry a limit price. Market and
        // stop-market have no limit price — sending parseFloat("") would forward
        // NaN to the backend.
        price:
          form.orderType === "limit" || form.orderType === "stop_limit"
            ? parseFloat(form.price)
            : undefined,
        amount: parseFloat(form.amount),
        stopPrice: form.stopPrice ? parseFloat(form.stopPrice) : undefined,
        takeProfitPrice: form.takeProfitPrice ? parseFloat(form.takeProfitPrice) : undefined,
        stopLossPrice: form.stopLossPrice ? parseFloat(form.stopLossPrice) : undefined,
        leverage: marketType === "futures" ? form.leverage : undefined,
        ...form.advancedOptions,
        /*
         * A time in force this market cannot honour must not travel with the
         * order. The selection deliberately survives a market and order-type
         * change, and the control is not rendered where it does not apply — so
         * a FOK picked on an ecosystem limit order would otherwise ride along
         * to a market order, or to a spot venue with no FOK, and come back a
         * 422 the trader cannot see the cause of. Same two functions the panel
         * renders from, so what is offered is what is sent.
         */
        timeInForce: effectiveTimeInForce(
          form.advancedOptions.timeInForce,
          timeInForceChoices(marketType, form.orderType, spotTimeInForce)
        ),
      });

      // Reset form on success
      form.reset();
      setQuoteDraft(null);
      setShowConfirmation(false);

      // Callback
      onOrderSuccess?.(result);
    } catch (err) {
      // Error handled by useOrderSubmit
    }
  };

  const gap = compact ? "gap-2" : "gap-2.5";
  const pad = compact ? "p-1.5" : "p-2";

  return (
    <div className={cn("tp-trading-form flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Trading type tabs - only rendered when at least one optional
          extension (AI Investment / Algo bots) is installed */}
      {(isAiInvestmentEnabled || isAlgoEnabled) && (
        <div className="flex border-b border-[var(--tp-border)] shrink-0">
          <button
            onClick={() => setTradingType("standard")}
            className={cn(
              "flex-1 py-2 text-[11px] font-medium transition-colors relative",
              tradingType === "standard"
                ? "text-[var(--tp-text-primary)]"
                : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
            )}
          >
            Standard
            {tradingType === "standard" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--tp-blue)]" />
            )}
          </button>
          {isAlgoEnabled && (
            <button
              onClick={() => setTradingType("algo")}
              className={cn(
                "flex-1 py-2 text-[11px] font-medium transition-colors relative flex items-center justify-center gap-1",
                tradingType === "algo"
                  ? "text-[var(--tp-text-primary)]"
                  : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
              )}
            >
              <Bot className="h-3 w-3" />
              Algo
              {tradingType === "algo" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--tp-blue)]" />
              )}
            </button>
          )}
          {isAiInvestmentEnabled && (
            <button
              onClick={() => setTradingType("ai")}
              className={cn(
                "flex-1 py-2 text-[11px] font-medium transition-colors relative flex items-center justify-center gap-1",
                tradingType === "ai"
                  ? "text-[var(--tp-text-primary)]"
                  : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
              )}
            >
              <Sparkles className="h-3 w-3" />
              AI
              {tradingType === "ai" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--tp-blue)]" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Algo bot builder */}
      {isAlgoEnabled && tradingType === "algo" ? (
        <AlgoTradingPanel
          symbol={symbol}
          currentPrice={currentPrice}
          className="flex-1 min-h-0"
        />
      ) : isAiInvestmentEnabled && tradingType === "ai" ? (
        <AiInvestmentForm symbol={symbol} marketType={marketType} className="flex-1" />
      ) : (
        <>
          {/*
            The INPUTS scroll. The cost summary and the action bar do not.

            The summary used to sit at the end of this scroll region, pushed
            down by `mt-auto` so that on a tall panel it rested against the
            action bar instead of the form clinging to the top edge. That reads
            correctly only while the form actually fits. Once the panel is
            shorter than the form — which the desktop grid produces routinely,
            because `.tp-orders-row` claims a 160–240px band off the bottom
            before `.tp-main-row` gets anything — `mt-auto` collapses to zero and
            the summary is just the last thing in an overflowing region: "Est.
            Fee" is sliced through the middle by the scroll edge and "Total
            cost" is off-screen entirely, while the Buy button below stays fully
            enabled. An order could be submitted without its cost ever being
            visible, and a ~50px change in window height was enough to flip
            between the two states.

            So the summary moves into the pinned footer. On a tall panel that
            draws the same picture `mt-auto` did; on a short one the two figures
            that decide whether to press the button survive, which is the
            contract `OrderSummary`'s own doc comment states ("always on
            screen"). Only the inputs — each of which has its own visible label
            and can be scrolled back to — give up ground.
          */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className={cn("flex flex-col", pad, gap)}>
              {/* Side toggle */}
              <SideToggle side={form.side} onChange={form.setSide} marketType={marketType} />

              {/* Balances */}
              <BalanceDisplay
                baseBalance={baseBalance}
                quoteBalance={quoteBalance}
                baseCurrency={baseCurrency}
                quoteCurrency={quoteCurrency}
                side={form.side}
                isLoading={balancesLoading}
                pricePrecision={pricePrecision}
                amountPrecision={amountPrecision}
                onRefresh={refreshBalances}
              />

              {/* Leverage slider (futures only) */}
              {marketType === "futures" && (
                <LeverageSlider value={form.leverage} onChange={form.setLeverage} max={125} />
              )}

              {/* Order type selector */}
              <OrderTypeSelector
                value={form.orderType}
                onChange={form.setOrderType}
                marketType={marketType}
              />

              {/* Stop price for stop orders. Above the limit price because it
                  is the trigger — it fires first, so it reads first. */}
              {(form.orderType === "stop_market" || form.orderType === "stop_limit") && (
                <PriceInput
                  value={form.stopPrice}
                  onChange={form.setStopPrice}
                  currentPrice={currentPrice}
                  precision={pricePrecision}
                  label={tCommon("stop_price")}
                  suffix={quoteCurrency}
                />
              )}

              {/* Price input (not for market orders) */}
              {form.orderType !== "market" && (
                <PriceInput
                  value={form.price}
                  onChange={form.setPrice}
                  currentPrice={currentPrice}
                  precision={pricePrecision}
                  label={form.orderType.includes("stop") ? tCommon("limit_price") : tCommon("price")}
                  suffix={quoteCurrency}
                />
              )}

              {/* Amount input */}
              <AmountInput
                value={form.amount}
                onChange={setAmount}
                max={maxAmount}
                precision={amountPrecision}
                currency={baseCurrency}
              />

              {/* Position sizing */}
              <AmountSlider
                value={sliderPercentage}
                onChange={handleQuickAmount}
                accent={
                  form.side === "buy" ? "var(--tp-green)" : "var(--tp-red)"
                }
                disabled={maxAmount <= 0}
              />

              {/* Order value — the same order, sized from the quote side */}
              <NumberField
                label={t("order_value")}
                value={quoteValue}
                onChange={handleQuoteChange}
                placeholder={(0).toFixed(pricePrecision)}
                suffix={quoteCurrency}
                disabled={!effectivePrice}
              />

              {/* Bracket order fields */}
              {form.orderType === "bracket" && (
                <>
                  <PriceInput
                    value={form.takeProfitPrice}
                    onChange={form.setTakeProfitPrice}
                    currentPrice={currentPrice}
                    precision={pricePrecision}
                    label={tCommon("take_profit")}
                    suffix={quoteCurrency}
                  />
                  <PriceInput
                    value={form.stopLossPrice}
                    onChange={form.setStopLossPrice}
                    currentPrice={currentPrice}
                    precision={pricePrecision}
                    label={tCommon("stop_loss")}
                    suffix={quoteCurrency}
                  />
                </>
              )}

              {/* Margin display (futures) */}
              {marketType === "futures" && (
                <MarginDisplay total={total} leverage={form.leverage} side={form.side} />
              )}

              {/* Time in force. The component gates ITSELF to the LIMIT paths
                  that actually enforce the field — the ecosystem engine, and a
                  spot venue for whichever values it can express — and renders
                  nothing anywhere else, so this stays unconditional. */}
              <AdvancedOptions
                options={form.advancedOptions}
                onChange={form.setAdvancedOptions}
                orderType={form.orderType}
                marketType={marketType}
                spotTimeInForce={spotTimeInForce}
              />
            </div>
          </div>

          {/* Action bar — cost summary and submit, both pinned. See above. */}
          <div className={cn("shrink-0 border-t border-[var(--tp-border)]", pad)}>
            <div className="mb-2">
              <OrderSummary
                side={form.side}
                orderValue={total}
                orderType={form.orderType}
                marketType={marketType}
                quoteCurrency={quoteCurrency}
                baseCurrency={baseCurrency}
                precision={pricePrecision}
                showFee={adminSettings.showEstimatedFees}
                metadata={metadata}
                limitPrice={
                  form.orderType === "market" ? null : parseFloat(form.price) || null
                }
                currentPrice={currentPrice}
              />
            </div>

            {/*
              THE MESSAGE SITS ABOVE THE BUTTON, AND THAT IS WHAT REMOVES THE
              RESERVED GAP UNDER IT.

              Submit errors and validation warnings used to render BELOW the
              button in a slot held open at `min-h-[16px]` whether or not there
              was anything to say. The reservation was not pointless - this bar
              is pinned to the bottom of the panel, so a slot that appears after
              the button pushes the button UP by its own height, and a primary
              action that jumps as you are reaching for it is worse than a gap.

              Putting the message before the button removes the need for the
              reservation entirely. The bar is bottom-anchored and sized by its
              content, so growing it extends it UPWARD: the button stays exactly
              where it is and the scroll region above gives up the height. The
              button now ends one padding step from the panel edge instead of
              floating 28px above it, and the reason to read a warning before
              pressing Buy rather than after is its own argument.
            */}
            {(error || validation) && (
              <div className="mb-1.5 flex items-start justify-center gap-1 px-1">
                {error ? (
                  <p className="text-[10px] leading-4 text-[var(--tp-red)] text-center">{error}</p>
                ) : validation ? (
                  <>
                    <AlertTriangle
                      className={cn(
                        "h-3 w-3 mt-0.5 shrink-0",
                        validation.level === "error"
                          ? "text-[var(--tp-red)]"
                          : "text-[var(--tp-yellow)]"
                      )}
                    />
                    <p
                      className={cn(
                        "text-[10px] leading-4",
                        validation.level === "error"
                          ? "text-[var(--tp-red)]"
                          : "text-[var(--tp-yellow)]"
                      )}
                    >
                      {validation.message}
                    </p>
                  </>
                ) : null}
              </div>
            )}

            <SubmitButton
              side={form.side}
              orderType={form.orderType}
              amount={form.amount}
              price={form.orderType === "market" ? currentPrice?.toString() : form.price}
              currency={baseCurrency}
              isSubmitting={isSubmitting}
              disabled={
                !form.amount ||
                parseFloat(form.amount) <= 0 ||
                validation?.level === "error"
              }
              onClick={handleSubmit}
            />
          </div>

          {/* Confirmation modal */}
          <ConfirmationModal
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={executeOrder}
            order={{
              symbol,
              side: form.side,
              type: form.orderType,
              price: form.orderType === "market" ? currentPrice : parseFloat(form.price) || null,
              amount: parseFloat(form.amount) || 0,
              total,
              leverage: marketType === "futures" ? form.leverage : undefined,
              quoteCurrency,
            }}
            isSubmitting={isSubmitting}
            pricePrecision={pricePrecision}
            amountPrecision={amountPrecision}
          />
        </>
      )}
    </div>
  );
});

export default TradingFormPanel;
