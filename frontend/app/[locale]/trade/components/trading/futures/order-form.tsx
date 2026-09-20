"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Calculator,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { DISABLED_ORDER_BUTTON, NoticeBox } from "../shared/order-form-ui";
import type { FuturesMarket, WalletData } from "./types";

/**
 * The futures order ticket, for both MARKET and LIMIT.
 *
 * These were two files of 571 and 663 lines that differed in six places: which
 * price they read, the fee rate, one placeholder string, and whether a limit
 * price input is shown. Everything else — the leverage slider, the whole SL/TP
 * calculator, risk/reward, position summary and the LONG/SHORT buttons — was
 * duplicated verbatim, which is how the two copies would eventually disagree
 * about what a stop loss means.
 */

export interface FuturesOrderFormProps {
  symbol: string;
  currency: string;
  pair: string;
  currentPrice: number | null;
  marketPrice: string;
  pricePrecision: number;
  amountPrecision: number;
  walletData: WalletData | null;
  priceDirection: "up" | "down" | "neutral";
  onOrderSubmit?: (order: any) => Promise<any>;
  fetchWalletData: () => void;
  marketInfo: FuturesMarket | null;
  fundingRate: number | null;
  formatPrice: (price: number | null) => string;
}

interface Props extends FuturesOrderFormProps {
  mode: "MARKET" | "LIMIT";
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const QUICK_SL_PERCENTAGES = [1, 2, 5, 10];
const QUICK_TP_PERCENTAGES = [2, 5, 10, 20];

/**
 * Risk is a STATUS, not a price direction, so it takes the status tokens —
 * but the label stays on `--foreground` and a dot carries the hue. Status ink
 * on a light ground measures 3.39-3.60:1 at this size.
 */
function getRiskLevel(ratio: number | null) {
  if (!ratio) return null;
  if (ratio >= 3) return { level: "Low", dot: "bg-success" };
  if (ratio >= 2) return { level: "Medium", dot: "bg-warning" };
  return { level: "High", dot: "bg-destructive" };
}

export default function FuturesOrderForm({
  mode,
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
  formatPrice,
}: Props) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");

  const isLimit = mode === "LIMIT";

  const [limitPrice, setLimitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [orderType, setOrderType] = useState<"long" | "short">("long");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Enhanced Stop Loss and Take Profit states
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [slPercentage, setSlPercentage] = useState("");
  const [tpPercentage, setTpPercentage] = useState("");
  const [riskRewardRatio, setRiskRewardRatio] = useState<number | null>(null);
  const [estimatedLoss, setEstimatedLoss] = useState<number | null>(null);
  const [estimatedProfit, setEstimatedProfit] = useState<number | null>(null);
  const [userModifiedPrice, setUserModifiedPrice] = useState(false);
  const prevSymbolRef = useRef<string>(symbol);

  /**
   * What the trader already holds on this symbol.
   *
   * This desk is HEDGE MODE and never said so anywhere the trader could see: a
   * SELL placed while holding a long opens a second, independently-margined
   * SHORT rather than reducing the long. Nothing in the ticket, the positions
   * table or the API named the mode, so the only way to find out was to place
   * the order.
   */
  const [openPositions, setOpenPositions] = useState<any[]>([]);

  useEffect(() => {
    if (!currency || !pair) return;
    let cancelled = false;
    // `$fetch` ALWAYS resolves `{ data, error }` and never throws — a try/catch
    // around it would be dead code.
    (async () => {
      const { data, error } = await $fetch({
        url: `/api/futures/position?type=OPEN_POSITIONS&currency=${currency}&pair=${pair}`,
        method: "GET",
        silent: true,
      });
      if (cancelled) return;
      setOpenPositions(!error && Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [currency, pair, successMessage]);

  const intendedSide = orderType === "long" ? "BUY" : "SELL";
  const opposingPosition = openPositions.find(
    (p) => String(p?.side ?? "").toUpperCase() !== intendedSide
  );

  /**
   * The leverages this market offers, as a list.
   *
   * `limits.leverage` is a COMMA-SEPARATED string ("1,20,50,125"). Running
   * `parseInt` over it returns 1 — so on every market the slider's maximum was
   * 1x while its initial value was 10, and the backend now rejects anything the
   * market does not actually offer. Parse the whole list, snap the slider to
   * it, and start on the lowest rung.
   */
  const offeredLeverages = React.useMemo(() => {
    const parsed = String(marketInfo?.metadata?.limits?.leverage ?? "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    return parsed.length ? parsed : [1, 5, 10, 20, 50, 100];
  }, [marketInfo?.metadata?.limits?.leverage]);
  const maxLeverage = offeredLeverages[offeredLeverages.length - 1];

  /**
   * The price every calculation on this ticket hangs off: the live mark for a
   * market order, the typed limit for a limit order. `hasPrice` keeps the
   * original truthiness — a limit of "0" is a non-empty string and used to
   * pass the guards, so it still does.
   */
  const priceSource = isLimit ? limitPrice : currentPrice;
  const hasPrice = Boolean(priceSource);
  const basePrice = isLimit ? Number(limitPrice) : (currentPrice ?? 0);

  /**
   * A MARKET ticket no longer needs a price to be submittable.
   *
   * It used to send the live mark as the order's price, and the backend used to
   * demand one — so the button was gated on having a mark. The backend now
   * prices a market order from the book itself and IGNORES anything sent, so all
   * the ticket needs is a size. It still wants a mark to show a position value,
   * which is why the estimate blocks keep using `hasPrice`.
   */
  const canSubmit = Boolean(amount) && (isLimit ? hasPrice : true);

  // Set initial limit price to current price or when symbol changes
  useEffect(() => {
    if (!isLimit) return;

    // If symbol changed, always update price regardless of user modification
    const symbolChanged = prevSymbolRef.current !== symbol;

    if (currentPrice && (symbolChanged || (!limitPrice && !userModifiedPrice))) {
      setLimitPrice(currentPrice.toFixed(pricePrecision));
      if (symbolChanged) {
        setUserModifiedPrice(false); // Reset user modification flag on symbol change
      }
    }

    prevSymbolRef.current = symbol;
  }, [isLimit, currentPrice, pricePrecision, symbol, limitPrice, userModifiedPrice]);

  // `amount` is the CONTRACT SIZE — the exposure itself, and what the market's
  // amount limits bound. Leverage does not multiply it; it divides the margin
  // that backs it. (This used to read `amount * price * leverage`, which
  // presented a position value the backend never opened and a margin figure
  // that was in fact the full notional.)
  const positionValue = hasPrice && amount ? Number(amount) * basePrice : 0;
  const margin = positionValue / leverage;

  /**
   * The fee preview, from the market's OWN rates and the same maker/taker rule
   * the backend applies.
   *
   * This used to be two hardcoded constants keyed by ORDER TYPE — 0.04% for
   * market, 0.02% for limit — while the backend charged by SIDE and read the
   * market's configured rates. The displayed fee was therefore wrong on every
   * futures order on every market. The rule is now the real one: an order that
   * CROSSES takes liquidity and pays taker; one that rests pays maker.
   *
   * The crossing test uses the last traded price rather than the top of book,
   * which the ticket does not subscribe to. It agrees with the backend except
   * inside the spread, where the preview may name the wrong side of a rate the
   * market itself sets — the charge is still the market's own published rate.
   */
  const takerPct = Number(marketInfo?.metadata?.taker ?? 0) / 100;
  const makerPct = Number(marketInfo?.metadata?.maker ?? 0) / 100;
  const feeIsTaker =
    !isLimit ||
    (currentPrice != null &&
      currentPrice > 0 &&
      (orderType === "long" ? basePrice >= currentPrice : basePrice <= currentPrice));
  const feePct = feeIsTaker ? takerPct : makerPct;
  const fee = positionValue * feePct;

  // Keep the chosen leverage on a rung this market offers — the list changes
  // when the symbol does, and an off-list value is refused at placement.
  useEffect(() => {
    if (!offeredLeverages.includes(leverage)) setLeverage(offeredLeverages[0]);
  }, [offeredLeverages, leverage]);
  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Calculate Stop Loss/Take Profit based on percentage
  const calculateSLTP = useCallback(() => {
    if (!hasPrice || !amount) return;

    const price = basePrice;
    const isLong = orderType === "long";

    // Calculate Stop Loss
    if (slPercentage) {
      const slPercent = Number(slPercentage);
      const slPrice = isLong
        ? price * (1 - slPercent / 100)
        : price * (1 + slPercent / 100);
      setStopLoss(slPrice.toFixed(pricePrecision));

      // Calculate estimated loss
      // PnL follows the contract size; leverage is already reflected in the margin.
      const loss = Number(amount) * Math.abs(price - slPrice);
      setEstimatedLoss(loss);
    }

    // Calculate Take Profit
    if (tpPercentage) {
      const tpPercent = Number(tpPercentage);
      const tpPrice = isLong
        ? price * (1 + tpPercent / 100)
        : price * (1 - tpPercent / 100);
      setTakeProfit(tpPrice.toFixed(pricePrecision));

      // Calculate estimated profit
      const profit = Number(amount) * Math.abs(tpPrice - price);
      setEstimatedProfit(profit);
    }

    // Calculate Risk/Reward Ratio
    if (slPercentage && tpPercentage) {
      const ratio = Number(tpPercentage) / Number(slPercentage);
      setRiskRewardRatio(ratio);
    }
  }, [
    hasPrice,
    basePrice,
    amount,
    orderType,
    slPercentage,
    tpPercentage,
    leverage,
    pricePrecision,
  ]);

  // Recalculate when dependencies change
  useEffect(() => {
    calculateSLTP();
  }, [calculateSLTP]);

  // Handle SL percentage change
  const handleSLPercentageChange = (value: string) => {
    setSlPercentage(value);
    if (value && hasPrice) {
      const percent = Number(value);
      const isLong = orderType === "long";
      const slPrice = isLong
        ? basePrice * (1 - percent / 100)
        : basePrice * (1 + percent / 100);
      setStopLoss(slPrice.toFixed(pricePrecision));
    }
  };

  // Handle TP percentage change
  const handleTPPercentageChange = (value: string) => {
    setTpPercentage(value);
    if (value && hasPrice) {
      const percent = Number(value);
      const isLong = orderType === "long";
      const tpPrice = isLong
        ? basePrice * (1 + percent / 100)
        : basePrice * (1 - percent / 100);
      setTakeProfit(tpPrice.toFixed(pricePrecision));
    }
  };

  // Handle direct SL price change
  const handleSLPriceChange = (value: string) => {
    setStopLoss(value);
    if (value && hasPrice) {
      const slPrice = Number(value);
      const isLong = orderType === "long";
      const percent = isLong
        ? ((basePrice - slPrice) / basePrice) * 100
        : ((slPrice - basePrice) / basePrice) * 100;
      setSlPercentage(Math.abs(percent).toFixed(2));
    }
  };

  // Handle direct TP price change
  const handleTPPriceChange = (value: string) => {
    setTakeProfit(value);
    if (value && hasPrice) {
      const tpPrice = Number(value);
      const isLong = orderType === "long";
      const percent = isLong
        ? ((tpPrice - basePrice) / basePrice) * 100
        : ((basePrice - tpPrice) / basePrice) * 100;
      setTpPercentage(Math.abs(percent).toFixed(2));
    }
  };

  // Price adjustment function (limit only)
  const adjustPrice = (percentage: number) => {
    if (!limitPrice) return;

    const currentPriceNum = Number(limitPrice);
    const adjustment = currentPriceNum * (percentage / 100);
    const newPrice = currentPriceNum + adjustment;
    setLimitPrice(newPrice.toFixed(pricePrecision));
    setUserModifiedPrice(true); // Mark that user has manually changed the price
  };

  const riskLevel = getRiskLevel(riskRewardRatio);

  /**
   * `side` is a parameter, not read from state.
   *
   * The buttons used to do `setOrderType("short"); handleSubmit();` — but
   * `handleSubmit` closes over the `orderType` of the render it was created in,
   * and `setOrderType` does not update that closure. So every futures order was
   * placed on the PREVIOUS side: the first click on SHORT submitted LONG. The
   * state setter still runs, so the UI showed the side the user picked while the
   * request carried the other one.
   */
  const handleSubmit = async (side: "long" | "short" = orderType) => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setOrderError(null);

    {
      /**
       * The payload the futures API actually takes.
       *
       * This used to send `symbol` where the route reads `currency` and `pair`,
       * so EVERY order from this ticket was refused with "Invalid symbol" — and
       * because the handler returns early on that error, the `onOrderSubmit`
       * fallback below never ran either. The ticket could not place an order at
       * all. It also sent `stopLoss` / `takeProfit`, which the route reads as
       * `stopLossPrice` / `takeProfitPrice`, so a stop set here never reached
       * the server; and it omitted `price` on a market order, which the engine
       * has no way to fill.
       */
      const orderData = {
        currency,
        pair,
        side: side.toUpperCase(),
        type: mode,
        amount: Number(amount),
        // A LIMIT order carries its price; a MARKET order does NOT.
        //
        // This used to send the live mark for both, on the theory that "the
        // engine matches on a price". It does — and a market order priced at a
        // stale mark filled at whatever the book happened to hold, then rested
        // there forever if it did not. The backend now walks the book at
        // placement and prices the sweep itself, so anything sent here would
        // only be discarded.
        price: isLimit ? basePrice : undefined,
        leverage,
        stopLossPrice: stopLoss ? Number(stopLoss) : undefined,
        takeProfitPrice: takeProfit ? Number(takeProfit) : undefined,
        // Kept for `onOrderSubmit`, which maps these names itself.
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
      };

      // `$fetch` ALWAYS resolves `{ data, error }` and never throws, so the
      // `try/catch` that used to wrap this was dead code: a rejected order fell
      // straight through to the success path, cleared the form and told the user
      // "Order placed successfully". The spot forms already destructure the
      // envelope correctly — only futures had this.
      // Submit ONCE. This used to post here AND then call `onOrderSubmit`,
      // which is itself a submitter — two orders for one click, whenever the
      // first one happened to succeed. Delegate when a submitter is supplied
      // (the spot tickets already do), and post directly only when it is not.
      let failure: string | null = null;
      if (onOrderSubmit) {
        try {
          await onOrderSubmit(orderData);
        } catch (e: any) {
          failure = e?.message || t("order_failed");
        }
      } else {
        const { error } = await $fetch({
          url: `/api/futures/order`,
          method: "POST",
          body: orderData,
        });
        if (error) failure = typeof error === "string" ? error : t("order_failed");
      }

      if (failure) {
        setOrderError(failure);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(tCommon("order_placed_successfully"));
      setAmount("");
      if (isLimit) setLimitPrice("");
      setStopLoss("");
      setTakeProfit("");
      setSlPercentage("");
      setTpPercentage("");
      fetchWalletData();
      fetchWalletData?.();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Current Price Display */}
      <div className="flex items-center justify-between p-2 bg-surface-2 rounded-md">
        <span className="text-xs text-muted-foreground">
          {tCommon("current_price")}
        </span>
        <div className="flex items-center gap-1">
          {priceDirection === "up" && (
            <TrendingUp className="h-3 w-3 text-up" />
          )}
          {priceDirection === "down" && (
            <TrendingDown className="h-3 w-3 text-down" />
          )}
          <span className="text-sm font-medium tabular-nums">
            {currentPrice
              ? `${currentPrice.toFixed(pricePrecision)}`
              : isLimit
                ? "0.00"
                : "$0.00"}
          </span>
        </div>
      </div>

      {/* Price input (limit only) */}
      {isLimit && (
        <div className="space-y-1.5">
          <Label className="text-xs">{tCommon("limit_price")}</Label>
          <div className="relative">
            <Input
              type="number"
              value={limitPrice}
              onChange={(e) => {
                setLimitPrice(e.target.value);
                setUserModifiedPrice(true); // Mark that user has manually changed the price
              }}
              placeholder={currentPrice?.toFixed(pricePrecision) || "0.00"}
              min="0"
              step={`0.${"0".repeat(pricePrecision - 1)}1`}
            />
          </div>

          {/* Price adjustment buttons */}
          <div className="grid grid-cols-4 gap-1">
            {[-1, -0.5, 0.5, 1].map((step) => (
              <Button
                key={step}
                variant="outline"
                size="sm"
                onClick={() => adjustPrice(step)}
                // Control, not a price figure — the sign carries the direction
                // and the hue rides the border, which keeps the numeral legible.
                className={cn(
                  "text-xs h-7 text-foreground",
                  step < 0
                    ? "border-down/40 hover:bg-down/10"
                    : "border-up/40 hover:bg-up/10"
                )}
              >
                {step > 0 ? `+${step}%` : `${step}%`}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          {tCommon("amount")} ({currency})
        </Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step={`0.${"0".repeat(amountPrecision - 1)}1`}
        />

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {QUICK_AMOUNTS.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              size="sm"
              onClick={() => setAmount(quickAmount.toString())}
              className="text-xs h-7"
            >
              {/*
                THE BASE ASSET, NOT DOLLARS. This button sets `amount`, and the
                label two elements up already says `Amount ({currency})` —
                `futures/order/index.post.ts:317` treats it as the contract size
                (`notional = numericAmount × feeBasisPrice`). Rendered with a
                `$`, "$5000" on BTC/USDT read as five thousand dollars and
                requested FIVE THOUSAND BITCOIN.
              */}
              {quickAmount}
            </Button>
          ))}
        </div>
      </div>

      {/* Leverage Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label className="text-xs">{tCommon("leverage")}</Label>
          <Badge variant="outline" className="text-xs">
            {leverage}x
          </Badge>
        </div>
        {/* The slider moves between the RUNGS the market offers, not over a
            continuous range: anything in between is rejected at placement. */}
        <Slider
          value={[Math.max(0, offeredLeverages.indexOf(leverage))]}
          onValueChange={(value) => setLeverage(offeredLeverages[value[0]] ?? offeredLeverages[0])}
          max={offeredLeverages.length - 1}
          min={0}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{offeredLeverages[0]}x</span>
          <span>{maxLeverage}x</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t("hedge_mode_hint")}
        </p>
      </div>

      {/* Advanced Stop Loss Section */}
      <Card className="p-3 space-y-3 border-down/30">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-down" />
          <Label className="text-xs font-medium text-foreground">
            {tCommon("stop_loss")} {`(${tCommon("optional")})`}
          </Label>
        </div>

        {/* SL Percentage Input */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {tCommon("percentage")}
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={slPercentage}
                onChange={(e) => handleSLPercentageChange(e.target.value)}
                placeholder="0.00"
                className="pr-8"
                min="0"
                max="50"
                step="0.1"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {tCommon("price")}
            </Label>
            <Input
              type="number"
              value={stopLoss}
              onChange={(e) => handleSLPriceChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step={`0.${"0".repeat(pricePrecision - 1)}1`}
            />
          </div>
        </div>

        {/* Quick SL Percentage Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {QUICK_SL_PERCENTAGES.map((percent) => (
            <Button
              key={percent}
              variant="outline"
              size="sm"
              onClick={() => handleSLPercentageChange(percent.toString())}
              // The hue rides the border and hover, not the numeral: `--down`
              // as 12px ink measures 4.16:1 in light, `--up` 3.12:1.
              className="text-xs h-6 text-foreground border-down/40 hover:bg-down/10"
            >
              {percent}%
            </Button>
          ))}
        </div>

        {/* Estimated Loss — the figure keeps the hue (R1); it sits on the plain
            card ground, never on a matching tint. */}
        {estimatedLoss && (
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-down" />
              {t("estimated_loss")}
            </span>
            <span className="text-xs font-medium text-down tabular-nums">
              -${estimatedLoss.toFixed(2)}
            </span>
          </div>
        )}
      </Card>

      {/* Advanced Take Profit Section */}
      <Card className="p-3 space-y-3 border-up/30">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-up" />
          <Label className="text-xs font-medium text-foreground">
            {tCommon("take_profit")} {`(${tCommon("optional")})`}
          </Label>
        </div>

        {/* TP Percentage Input */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {tCommon("percentage")}
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={tpPercentage}
                onChange={(e) => handleTPPercentageChange(e.target.value)}
                placeholder="0.00"
                className="pr-8"
                min="0"
                max="1000"
                step="0.1"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {tCommon("price")}
            </Label>
            <Input
              type="number"
              value={takeProfit}
              onChange={(e) => handleTPPriceChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step={`0.${"0".repeat(pricePrecision - 1)}1`}
            />
          </div>
        </div>

        {/* Quick TP Percentage Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {QUICK_TP_PERCENTAGES.map((percent) => (
            <Button
              key={percent}
              variant="outline"
              size="sm"
              onClick={() => handleTPPercentageChange(percent.toString())}
              className="text-xs h-6 text-foreground border-up/40 hover:bg-up/10"
            >
              {percent}%
            </Button>
          ))}
        </div>

        {/* Estimated Profit */}
        {estimatedProfit && (
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3 text-up" />
              {tCommon("estimated_profit")}
            </span>
            <span className="text-xs font-medium text-up tabular-nums">
              +${estimatedProfit.toFixed(2)}
            </span>
          </div>
        )}
      </Card>

      {/* Risk/Reward Analysis */}
      {riskRewardRatio && riskLevel && (
        <Card className="p-3 space-y-2 bg-surface-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t("risk_reward_analysis")}
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-xs text-foreground gap-1.5"
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", riskLevel.dot)}
                aria-hidden
              />
              {riskLevel.level} Risk
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("ratio")}:</span>
              <span className="font-medium tabular-nums">
                1:{riskRewardRatio.toFixed(2)}
              </span>
            </div>
            {estimatedLoss && estimatedProfit && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("net_potential")}:
                </span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    estimatedProfit > estimatedLoss ? "text-up" : "text-down"
                  )}
                >
                  ${(estimatedProfit - estimatedLoss).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Position Information */}
      {amount && hasPrice && (
        <div className="space-y-1 p-2 bg-surface-2 rounded-md text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {tCommon("position_value")}:
            </span>
            <span className="font-medium tabular-nums">
              ${positionValue.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tCommon("margin")}:</span>
            <span className="font-medium tabular-nums">
              ${margin.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {tCommon("fees")} ({feeIsTaker ? tCommon("taker") : tCommon("maker")}{" "}
              {(feePct * 100).toFixed(3)}%):
            </span>
            <span className="font-medium tabular-nums">${fee.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Hedge-mode warning: the opposite order does NOT close what is held. */}
      {opposingPosition && (
        <NoticeBox
          tone="warning"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        >
          {t("hedge_mode_notice", {
            symbol,
            held:
              String(opposingPosition.side).toUpperCase() === "BUY"
                ? "LONG"
                : "SHORT",
          })}
        </NoticeBox>
      )}

      {/* Order Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            setOrderType("long");
            handleSubmit("long");
          }}
          loading={isSubmitting && orderType === "long"}
          disabled={!canSubmit || isSubmitting}
          className={cn(
            "bg-up hover:bg-up/90 text-primary-foreground",
            DISABLED_ORDER_BUTTON
          )}
        >
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            {!(isSubmitting && orderType === "long") && tCommon("long")}
          </div>
        </Button>

        <Button
          onClick={() => {
            setOrderType("short");
            handleSubmit("short");
          }}
          loading={isSubmitting && orderType === "short"}
          disabled={!canSubmit || isSubmitting}
          className={cn(
            "bg-down hover:bg-down/90 text-primary-foreground",
            DISABLED_ORDER_BUTTON
          )}
        >
          <div className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4" />
            {!(isSubmitting && orderType === "short") && tCommon("short")}
          </div>
        </Button>
      </div>

      {/* Error Message */}
      {orderError && (
        <NoticeBox
          tone="destructive"
          icon={<AlertTriangle className="h-3 w-3" />}
        >
          {orderError}
        </NoticeBox>
      )}

      {/* Success Message */}
      {successMessage && (
        <NoticeBox tone="success" icon={<Info className="h-3 w-3" />}>
          {successMessage}
        </NoticeBox>
      )}

      {/* Risk Warning */}
      <NoticeBox
        tone="warning"
        icon={<AlertTriangle className="h-3 w-3" />}
      >
        {t("futures_trading_involves_substantial_risk_leverage")}
      </NoticeBox>
    </div>
  );
}
