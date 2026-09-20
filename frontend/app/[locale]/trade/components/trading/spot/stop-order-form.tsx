"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react";
import { $fetch } from "@/lib/api";
import type { OrderFormProps } from "./types";
import {
  DirectionalPrice,
  FeeRow,
  FieldLabel,
  NoteBox,
  OrderErrorBox,
  PercentButtons,
  SideToggle,
  SubmitOrderButton,
  UnitField,
} from "../shared/order-form-ui";
import { computePercentAmount } from "../shared/percent-amount";
import {
  formatFeePercent,
  resolveSpotFeeRate,
  resolveSpotSizingFeeRate,
} from "./fee";
import { useTranslations } from "next-intl";
import { useOrderbookSelection } from "../use-orderbook-selection";

/**
 * Mirrors STOP_MARKET_BUY_SLIPPAGE_BUFFER in the backend's stopOrders.ts: a
 * stop-MARKET buy reserves off the stop price plus this buffer, because it has
 * no limit price to cap what it will pay when it fires.
 */
const STOP_MARKET_BUY_SLIPPAGE_BUFFER = 0.1;

export default function StopOrderForm({
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
  isEco,
  takerFee,
  makerFee,
}: OrderFormProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  // A stop is graded when it TRIGGERS, against a book that does not exist yet,
  // so the ticket cannot know which side it will land on. Quote the taker rate:
  // it is the worse of the two, so the estimate never undershoots.
  const feeRate = resolveSpotFeeRate({
    makerFee,
    takerFee,
    kind: "stop",
    isBuy: buyMode,
  });
  // Sizing reads a different rate than the preview does — see resolveSpotSizingFeeRate.
  const sizingFeeRate = resolveSpotSizingFeeRate({ makerFee, takerFee });
  const [amount, setAmount] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [percentSelected, setPercentSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [stopType, setStopType] = useState<"stop" | "stop-limit">("stop");
  /*
   * A TRAILING STOP FOLLOWS THE MARKET AND NEVER GOES BACK.
   *
   * Off by default, and that default is load-bearing: an ordinary fixed stop is
   * what every stop on the platform has been, and what the backend stores when
   * these fields are absent. `trailingDistance` empty means FIXED — the route
   * reads a missing distance as "not a trailing stop" rather than "trail by
   * zero", which would ratchet the stop onto the market price and fire it on
   * the next tick.
   */
  const [isTrailing, setIsTrailing] = useState(false);
  const [trailingDistance, setTrailingDistance] = useState("");
  const [trailingMode, setTrailingMode] = useState<"PERCENT" | "ABSOLUTE">(
    "PERCENT"
  );

  /* A clicked level fills the TRIGGER, which is the price a stop ticket is
     actually about; on a stop-limit it fills the limit leg too so the pair
     starts consistent. */
  useOrderbookSelection({
    pricePrecision,
    amountPrecision,
    onPrice: (value) => {
      setStopPrice(value);
      if (stopType === "stop-limit") setLimitPrice(value);
    },
    onAmount: setAmount,
  });

  // Update stop price when buy/sell mode changes
  useEffect(() => {
    const numericPrice = Number(marketPrice.replace(/,/g, ""));
    const stopPriceValue = buyMode
      ? (numericPrice * 1.05).toFixed(pricePrecision)
      : (numericPrice * 0.95).toFixed(pricePrecision);
    setStopPrice(stopPriceValue);
    setLimitPrice(stopPriceValue);
  }, [buyMode, marketPrice, pricePrecision]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow any valid number input while typing, including decimals and values less than minAmount
    // We'll validate min/max limits only on form submission
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setAmount(value);
      setPercentSelected(null);
    }
  };

  const handlePercentClick = (percent: number) => {
    setPercentSelected(percent);

    // A stop reserves its funds UP FRONT and off its OWN price, never off the
    // last traded price this ticket displays: a stop-limit off the limit price,
    // a stop-market off the stop price plus the slippage buffer. Sizing a 100%
    // BUY off `marketPrice` asked for ~5-10% more quote than could be reserved
    // (the stop defaults to marketPrice * 1.05), on top of the missing fee.
    const numericStopPrice = Number(stopPrice.replace(/,/g, ""));
    const numericLimitPrice = Number(limitPrice.replace(/,/g, ""));
    const reservePrice =
      stopType === "stop-limit"
        ? numericLimitPrice
        : numericStopPrice * (1 + STOP_MARKET_BUY_SLIPPAGE_BUFFER);

    // The stop form sizes the amount only — it has no total field.
    const result = computePercentAmount({
      percent,
      buyMode,
      price: marketPrice,
      walletData,
      amountPrecision,
      pricePrecision,
      minAmount,
      maxAmount,
      invalidPriceWarning: "Invalid market price for percentage calculation",
      // Eco only: the CEX path charges its BUY fee in the currency received.
      buyQuoteReserve: isEco ? { feeRate: sizingFeeRate, reservePrice } : null,
    });

    setAmount(result.amount);
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setOrderError(null);

    try {
      // Prepare order data
      const numericAmount = Number(amount);

      /*
       * THIS PAYLOAD 422'd ON BOTH VENUES SINCE LAUNCH.
       *
       * It sent `type: "STOP"` with a `limitPrice`. The ecosystem route accepts
       * exactly limit | market | stop_limit | stop_market and reads the limit
       * price from `price`, so "STOP" fell through to
       * "Only limit, market, stop_limit and stop_market orders are supported"
       * and the limit price was never read even if it had matched.
       *
       * `stopType` already distinguishes the two, so the mapping is direct:
       *   "stop"       -> stop_market   (no limit price; fires at market)
       *   "stop-limit" -> stop_limit    (rests at `price` once triggered)
       *
       * The tab is only offered on ecosystem markets — the provider path
       * cannot store a stop at all, because exchangeOrder.type is
       * ENUM("MARKET","LIMIT"). See the gate in ../index.tsx.
       */
      const orderData = {
        currency,
        pair,
        amount: numericAmount,
        type: stopType === "stop-limit" ? "stop_limit" : "stop_market",
        side: buyMode ? "BUY" : "SELL",
        isEco,
        stopPrice: Number(stopPrice),
        // `price`, not `limitPrice` — the route reads `price`.
        ...(stopType === "stop-limit" && { price: Number(limitPrice) }),
        /*
         * Sent ONLY when the trader asked for a trail, and only with a usable
         * distance. Sending `trailingDistance: 0` or NaN would be refused by
         * the route — deliberately, since a zero trail is a stop sitting on the
         * market — so the ticket must not send one just because the switch was
         * toggled and the field left blank.
         */
        ...(isTrailing && Number(trailingDistance) > 0
          ? {
              trailingDistance: Number(trailingDistance),
              trailingMode,
            }
          : {}),
      };

      // Submit order using the provided callback or default implementation
      if (onOrderSubmit) {
        const result = await onOrderSubmit(orderData);
        if (!result.success) {
          setOrderError(result.error || "Failed to place order");
        } else {
          // Reset form on success
          setAmount("");
          setPercentSelected(null);
        }
      } else {
        // Default implementation - submit to the appropriate API endpoint
        // Use ecosystem endpoint if isEco is true, otherwise use exchange endpoint
        const endpoint = isEco ? "/api/ecosystem/order" : "/api/exchange/order";

        const { data, error } = await $fetch({
          url: endpoint,
          method: "POST",
          body: orderData,
        });

        if (error) {
          setOrderError(error);
        } else {
          // Reset form on success
          setAmount("");
          setPercentSelected(null);

          // Refresh wallet data and notify other components
          fetchWalletData();
          window.dispatchEvent(new CustomEvent("order-placed"));
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : tCommon("error_placing_order");
      setOrderError(errorMessage);
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stopTypeClass = (active: boolean) =>
    cn(
      "h-7 text-xs font-medium rounded-sm",
      active
        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
        : "bg-surface-3 hover:bg-surface-3/80 text-muted-foreground"
    );

  return (
    <div className="space-y-3">
      <SideToggle
        buyMode={buyMode}
        onBuy={() => setBuyMode(true)}
        onSell={() => setBuyMode(false)}
        buyLabel={tCommon("buy")}
        sellLabel={tCommon("sell")}
      />

      <div className="grid grid-cols-2 gap-1">
        <Button
          className={stopTypeClass(stopType === "stop")}
          onClick={() => setStopType("stop")}
        >
          {t("stop_market")}
        </Button>
        <Button
          className={stopTypeClass(stopType === "stop-limit")}
          onClick={() => setStopType("stop-limit")}
        >
          {tCommon("stop_limit")}
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel>{tCommon("market_price")}</FieldLabel>
          <DirectionalPrice
            price={marketPrice}
            direction={priceDirection}
            iconSide="right"
          />
        </div>
      </div>

      <UnitField
        label={tCommon("stop_price")}
        unit={pair}
        value={stopPrice}
        onChange={(e) => setStopPrice(e.target.value)}
      />

      {/*
        Trailing sits under the trigger price because that is the number it
        takes over: once a trail is on, the stop price the trader typed is only
        where the stop STARTS, and the monitor moves it from there.
      */}
      <div className="space-y-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            size="sm"
            checked={isTrailing}
            onCheckedChange={(checked) => setIsTrailing(checked === true)}
          />
          <span className="text-xs text-muted-foreground">
            {t("trailing_stop_label")}
          </span>
        </label>

        {isTrailing && (
          <div className="space-y-1 pl-6">
            <div className="flex items-center gap-1">
              <UnitField
                label={t("trailing_distance")}
                unit={trailingMode === "PERCENT" ? "%" : pair}
                value={trailingDistance}
                onChange={(e) => setTrailingDistance(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Button
                size="2xs"
                variant={trailingMode === "PERCENT" ? "default" : "outline"}
                onClick={() => setTrailingMode("PERCENT")}
              >
                {t("percent")}
              </Button>
              <Button
                size="2xs"
                variant={trailingMode === "ABSOLUTE" ? "default" : "outline"}
                onClick={() => setTrailingMode("ABSOLUTE")}
              >
                {tCommon("amount")}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t("trailing_explainer")}
            </p>
          </div>
        )}
      </div>

      {stopType === "stop-limit" && (
        <UnitField
          label={tCommon("limit_price")}
          unit={pair}
          value={limitPrice}
          onChange={(e) => setLimitPrice(e.target.value)}
        />
      )}

      <UnitField
        label={tCommon("amount")}
        unit={currency}
        value={amount}
        onChange={handleAmountChange}
      />

      <PercentButtons
        percentSelected={percentSelected}
        onPercentClick={handlePercentClick}
      />

      <NoteBox>
        {stopType === "stop" ? (
          <>
            {t("stop_market_orders_is_reached")}.{" "}
            {t("the_order_will_available_price")}.
          </>
        ) : (
          <>
            {t("stop_limit_orders_is_reached")}.{" "}
            {t("the_order_will_or_better")}.
          </>
        )}
      </NoteBox>

      {/* Fee Display */}
      {amount && marketPrice && Number(amount) > 0 && (
        <FeeRow
          label={
            <>
              {t("est_fee")}
              {feeRate.known ? ` (${formatFeePercent(feeRate.rate)}%)` : ""}:
            </>
          }
          value={
            feeRate.known ? (
              <>
                {(
                  Number(marketPrice.replace(/,/g, "")) *
                  Number(amount) *
                  feeRate.rate
                ).toFixed(pricePrecision)}{" "}
                {pair}
              </>
            ) : (
              <>—</>
            )
          }
        />
      )}

      {orderError && <OrderErrorBox message={orderError} />}

      <SubmitOrderButton
        buyMode={buyMode}
        isSubmitting={isSubmitting}
        disabled={
          isSubmitting ||
          !amount ||
          Number(amount) <= 0 ||
          !stopPrice ||
          (stopType === "stop-limit" && !limitPrice)
        }
        onClick={handleSubmitOrder}
        processingLabel={`${tCommon("processing")}.`}
      >
        {isEco && <Leaf className="h-3.5 w-3.5 mr-1.5" />}
        {`${buyMode ? tCommon("buy_1", { currency: String(currency) }) : tCommon("sell_1", { currency: String(currency) })} ${stopType === "stop" ? tCommon("stop") : tCommon("stop_limit")}`}
      </SubmitOrderButton>
    </div>
  );
}
