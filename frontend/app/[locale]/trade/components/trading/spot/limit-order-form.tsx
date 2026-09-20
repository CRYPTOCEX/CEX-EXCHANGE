"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Leaf } from "lucide-react";
import { $fetch } from "@/lib/api";
import type { OrderFormProps } from "./types";
import {
  FeeRow,
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

export default function LimitOrderForm({
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
  onOrderSubmit,
  fetchWalletData,
  isEco,
  takerFee,
  makerFee,
}: OrderFormProps) {
  const t = useTranslations("common");
  const tTradeComponents = useTranslations("trade_components");
  const [price, setPrice] = useState(marketPrice);
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [percentSelected, setPercentSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [userModifiedPrice, setUserModifiedPrice] = useState(false);
  const prevSymbolRef = useRef<string>(symbol);

  /* Clicking a level in the order book fills this ticket. `userModifiedPrice`
     is set with it: a price the trader PICKED is theirs, and the market-price
     effect above must not overwrite it on the next tick. */
  useOrderbookSelection({
    pricePrecision,
    amountPrecision,
    onPrice: (value) => {
      setPrice(value);
      setUserModifiedPrice(true);
    },
    onAmount: setAmount,
  });

  // Update price when market price changes or symbol changes
  useEffect(() => {
    // If symbol changed, always update price regardless of user modification
    const symbolChanged = prevSymbolRef.current !== symbol;

    if (symbolChanged || !userModifiedPrice) {
      setPrice(marketPrice);
      setUserModifiedPrice(false); // Reset user modification flag on symbol change

      if (amount) {
        const numericPrice = Number(marketPrice.replace(/,/g, ""));
        const calculatedTotal = (numericPrice * Number(amount)).toFixed(
          pricePrecision
        );
        setTotal(calculatedTotal);
      }
    }

    prevSymbolRef.current = symbol;
  }, [marketPrice, amount, pricePrecision, symbol, userModifiedPrice]);

  // A limit order that does NOT cross the spread rests on the book and pays the
  // MAKER rate. This ticket used to quote `takerFee` unconditionally and never
  // read `makerFee` at all, so on any market where the two differ it named the
  // wrong rate for the most common case it exists to serve.
  const feeRate = resolveSpotFeeRate({
    makerFee,
    takerFee,
    kind: "limit",
    isBuy: buyMode,
    limitPrice: Number(price.replace(/,/g, "")) || null,
    marketPrice: Number(marketPrice.replace(/,/g, "")) || null,
  });

  // Sizing reads a different rate than the preview does — see resolveSpotSizingFeeRate.
  const sizingFeeRate = resolveSpotSizingFeeRate({ makerFee, takerFee });

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPrice(value);
    setUserModifiedPrice(true); // Mark that user has manually changed the price

    if (amount) {
      const numericPrice = Number(value.replace(/,/g, ""));
      const calculatedTotal = (numericPrice * Number(amount)).toFixed(
        pricePrecision
      );
      setTotal(calculatedTotal);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow any valid number input while typing, including decimals and values less than minAmount
    // We'll validate min/max limits only on form submission
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setAmount(value);
      setPercentSelected(null);

      // Calculate total if there's a valid amount
      if (value && !isNaN(Number(value)) && Number(value) > 0) {
        const numericPrice = Number(price.replace(/,/g, ""));
        const calculatedTotal = (numericPrice * Number(value)).toFixed(
          pricePrecision
        );
        setTotal(calculatedTotal);
      } else {
        setTotal("");
      }
    }
  };

  const stepPrice = (direction: 1 | -1) => {
    const numericPrice = Number(price.replace(/,/g, ""));
    const step = Math.pow(10, -pricePrecision);
    const newPrice = (numericPrice + direction * step).toFixed(pricePrecision);
    setPrice(newPrice);
    setUserModifiedPrice(true); // Mark that user has manually changed the price

    if (amount) {
      const calculatedTotal = (Number(newPrice) * Number(amount)).toFixed(
        pricePrecision
      );
      setTotal(calculatedTotal);
    }
  };

  const handlePercentClick = (percent: number) => {
    setPercentSelected(percent);

    const result = computePercentAmount({
      percent,
      buyMode,
      price,
      walletData,
      amountPrecision,
      pricePrecision,
      minAmount,
      maxAmount,
      invalidPriceWarning: "Invalid price for percentage calculation",
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
      // Prepare order data
      const numericPrice = Number(price.replace(/,/g, ""));
      const numericAmount = Number(amount);

      const orderData = {
        currency,
        pair,
        amount: numericAmount,
        type: "LIMIT",
        side: buyMode ? "BUY" : "SELL",
        price: numericPrice,
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
        label={t("price")}
        labelAction={
          <div className="flex items-center space-x-1">
            <button
              className="text-muted-foreground hover:text-foreground bg-surface-3 rounded p-0.5"
              onClick={() => stepPrice(1)}
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              className="text-muted-foreground hover:text-foreground bg-surface-3 rounded p-0.5"
              onClick={() => stepPrice(-1)}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        }
        unit={pair}
        value={price}
        onChange={handlePriceChange}
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

      <UnitField label={t("total")} unit={pair} value={total} readOnly />

      {/* Fee Display */}
      {amount && price && Number(amount) > 0 && (
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
                  Number(price.replace(/,/g, "")) *
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
        {`${buyMode ? t("buy_1", { currency: String(currency) }) : t("sell_1", { currency: String(currency) })}`}
      </SubmitOrderButton>
    </div>
  );
}
