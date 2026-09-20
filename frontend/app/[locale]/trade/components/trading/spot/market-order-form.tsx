"use client";

import type React from "react";

import { useState } from "react";
import { Leaf } from "lucide-react";
import { $fetch } from "@/lib/api";
import type { OrderFormProps } from "./types";
import {
  DirectionalPrice,
  FeeRow,
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

export default function MarketOrderForm({
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
  const t = useTranslations("common");
  const tTradeComponents = useTranslations("trade_components");
  // A market order always takes liquidity, so this is always the taker rate —
  // but it is the MARKET's taker rate, not a hardcoded one.
  const feeRate = resolveSpotFeeRate({
    makerFee,
    takerFee,
    kind: "market",
    isBuy: buyMode,
  });
  // Sizing reads a different rate than the preview does — see resolveSpotSizingFeeRate.
  const sizingFeeRate = resolveSpotSizingFeeRate({ makerFee, takerFee });
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [percentSelected, setPercentSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow any valid number input while typing, including decimals and values less than minAmount
    // We'll validate min/max limits only on form submission
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setAmount(value);
      setPercentSelected(null);

      // Calculate total if there's a valid amount
      if (value && !isNaN(Number(value)) && Number(value) > 0) {
        const numericPrice = Number(marketPrice.replace(/,/g, ""));
        const calculatedTotal = (numericPrice * Number(value)).toFixed(
          pricePrecision
        );
        setTotal(calculatedTotal);
      } else {
        setTotal("");
      }
    }
  };

  const handlePercentClick = (percent: number) => {
    setPercentSelected(percent);

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
      // Eco only: an eco BUY pre-holds cost + fee in the quote currency, so a
      // 100% click that ignored the fee was rejected by the server. The CEX
      // path charges its BUY fee in the currency received and must keep sizing
      // off the full balance.
      buyQuoteReserve: isEco ? { feeRate: sizingFeeRate } : null,
    });

    setAmount(result.amount);
    setTotal(result.total);
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setOrderError(null);

    try {
      // Validate amount first
      const numericAmount = Number(amount);

      if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
        setOrderError("Please enter a valid amount");
        return;
      }

      if (numericAmount < minAmount) {
        setOrderError(`Minimum amount is ${minAmount} ${currency}`);
        return;
      }

      if (numericAmount > maxAmount) {
        setOrderError(`Maximum amount is ${maxAmount} ${currency}`);
        return;
      }

      const orderData = {
        currency,
        pair,
        amount: numericAmount,
        type: "MARKET",
        side: buyMode ? "BUY" : "SELL",
        price: null,
        isEco,
      };

      // Submit order using the provided callback or default implementation
      if (onOrderSubmit) {
        const result = await onOrderSubmit(orderData);
        if (!result.success) {
          setOrderError(result.error || "Failed to place order");
        } else {
          // Reset form on success
          setAmount("");
          setTotal("");
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
          setTotal("");
          setPercentSelected(null);

          // Refresh wallet data and notify other components
          fetchWalletData();
          window.dispatchEvent(new CustomEvent("order-placed"));
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("error_placing_order");
      setOrderError(errorMessage);
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <SideToggle
        buyMode={buyMode}
        onBuy={() => setBuyMode(true)}
        onSell={() => setBuyMode(false)}
        buyLabel={t("buy")}
        sellLabel={t("sell")}
      />

      <UnitField
        label={t("market_price")}
        labelAction={
          <DirectionalPrice price={marketPrice} direction={priceDirection} />
        }
        unit={pair}
        value={marketPrice}
        readOnly
        inputClassName="bg-surface-2"
      />

      <UnitField
        label={t("amount")}
        unit={currency}
        value={amount}
        onChange={handleAmountChange}
      />

      <PercentButtons
        percentSelected={percentSelected}
        onPercentClick={handlePercentClick}
      />

      <UnitField
        label={tTradeComponents("estimated_total")}
        unit={pair}
        value={total}
        readOnly
      />

      <NoteBox>
        {tTradeComponents("market_orders_execute_available_price")}.{" "}
        {tTradeComponents("the_final_execution_estimated_price")}.
      </NoteBox>

      {/* Fee Display */}
      {amount && marketPrice && Number(amount) > 0 && (
        <FeeRow
          label={
            <>
              {tTradeComponents("est_fee")}
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
        disabled={isSubmitting || !amount || Number(amount) <= 0}
        onClick={handleSubmitOrder}
        processingLabel={`${t("processing")}.`}
      >
        {isEco && <Leaf className="h-3.5 w-3.5 mr-1.5" />}
        {`${buyMode ? t("buy_1", { currency: String(currency) }) : t("sell_1", { currency: String(currency) })} at Market`}
      </SubmitOrderButton>
    </div>
  );
}
