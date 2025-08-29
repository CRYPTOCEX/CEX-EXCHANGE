"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Leaf } from "lucide-react";
import { $fetch } from "@/lib/api";
import type { OrderFormProps } from "./types";
import PercentButtons from "./percent-buttons";
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
}: OrderFormProps) {
  const t = useTranslations("trade/components/trading/spot/market-order-form");
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

    try {
      // Get available balance based on trading mode
      // For buy orders (buyMode = true), use pair balance (USDT) to calculate how much currency (BTC) can be bought
      // For sell orders (buyMode = false), use currency balance (BTC) to calculate how much to sell
      const availableBalance = buyMode
        ? walletData?.pairBalance || 0
        : walletData?.currencyBalance || 0;

      let calculatedAmount: string;

      if (buyMode) {
        // For buy orders: calculate how much currency can be bought with the percentage of pair balance
        const availableForPurchase = availableBalance * (percent / 100);
        calculatedAmount = (
          availableForPurchase / Number(marketPrice.replace(/,/g, ""))
        ).toFixed(amountPrecision);
      } else {
        // For sell orders: calculate percentage of currency balance to sell
        calculatedAmount = (availableBalance * (percent / 100)).toFixed(
          amountPrecision
        );
      }

      // Ensure amount is within limits
      const numAmount = Number(calculatedAmount);
      if (numAmount < minAmount) {
        setAmount(minAmount.toFixed(amountPrecision));
      } else if (numAmount > maxAmount) {
        setAmount(maxAmount.toFixed(amountPrecision));
      } else {
        setAmount(calculatedAmount);
      }

      // Calculate total
      const numericPrice = Number(marketPrice.replace(/,/g, ""));
      const calculatedTotal = (numericPrice * Number(calculatedAmount)).toFixed(
        pricePrecision
      );
      setTotal(calculatedTotal);
    } catch (error) {
      console.error("Error calculating amount:", error);
    }
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

      // Prepare order data
      const numericPrice = Number(marketPrice.replace(/,/g, ""));

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
          setAmount("untitled");
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
          setAmount("untitled");
          setTotal("");
          setPercentSelected(null);

          // Refresh wallet data
          fetchWalletData();

          console.log(
            `Order submitted: market order to ${buyMode ? "buy" : "sell"} ${amount} ${currency}`
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error placing order";
      setOrderError(errorMessage);
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1">
        <Button
          className={cn(
            "h-8 text-xs font-medium rounded-md",
            buyMode
              ? "bg-emerald-500 hover:bg-emerald-600 dark:bg-green-500 dark:hover:bg-green-600"
              : "bg-muted hover:bg-muted/80 text-muted-foreground dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
          )}
          onClick={() => setBuyMode(true)}
        >
          {t("Buy")}
        </Button>
        <Button
          className={cn(
            "h-8 text-xs font-medium rounded-md",
            !buyMode
              ? "bg-red-500 hover:bg-red-600"
              : "bg-muted hover:bg-muted/80 text-muted-foreground dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
          )}
          onClick={() => setBuyMode(false)}
        >
          {t("Sell")}
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400">
            {t("market_price")}
          </label>
          <div className="flex items-center">
            {/* Price direction indicator moved to the left of the price */}
            <div className="w-4 h-4 flex items-center justify-center mr-1">
              {priceDirection === "up" && (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              )}
              {priceDirection === "down" && (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                priceDirection === "up"
                  ? "text-emerald-500"
                  : priceDirection === "down"
                    ? "text-red-500"
                    : "text-zinc-400"
              )}
            >
              {marketPrice}
            </span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <DollarSign className="h-3 w-3 text-muted-foreground/70 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            className="w-full pl-6 pr-3 py-1.5 text-xs border border-border dark:border-zinc-700 rounded-sm bg-muted/50 dark:bg-zinc-800/50 focus:outline-none"
            value={marketPrice}
            readOnly
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400">
          {t("Amount")}
        </label>
        <div className="relative">
          <input
            type="text"
            className="w-full pl-3 pr-12 py-1.5 text-xs border border-border dark:border-zinc-700 rounded-sm bg-background dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-emerald-500"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-xs text-muted-foreground dark:text-zinc-500">
              {currency}
            </span>
          </div>
        </div>
      </div>

      <PercentButtons
        percentSelected={percentSelected}
        onPercentClick={handlePercentClick}
      />

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400">
          {t("estimated_total")}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <DollarSign className="h-3 w-3 text-muted-foreground/70 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            className="w-full pl-6 pr-12 py-1.5 text-xs border border-border dark:border-zinc-700 rounded-sm bg-background dark:bg-zinc-900 focus:outline-none"
            placeholder="0.00"
            value={total}
            readOnly
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-xs text-muted-foreground dark:text-zinc-500">
              {pair}
            </span>
          </div>
        </div>
      </div>

      <div className="p-2 bg-muted/30 dark:bg-zinc-800/30 rounded-sm border border-muted dark:border-zinc-700/50">
        <p className="text-xs text-muted-foreground dark:text-zinc-400">
          {t("market_orders_execute_available_price")}.{" "}
          {t("the_final_execution_estimated_price")}.
        </p>
      </div>

      {orderError && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-sm text-red-500 text-xs">
          {orderError}
        </div>
      )}

      <div className="pt-1">
        <Button
          className={cn(
            "w-full h-8 text-sm font-medium rounded-sm",
            buyMode
              ? "bg-emerald-500 hover:bg-emerald-600 dark:bg-green-500 dark:hover:bg-green-600"
              : "bg-red-500 hover:bg-red-600"
          )}
          onClick={handleSubmitOrder}
          disabled={isSubmitting || !amount || Number(amount) <= 0}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              {t("Processing")}.
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {isEco && <Leaf className="h-3.5 w-3.5 mr-1.5" />}
              {`${buyMode ? `Buy ${currency}` : `Sell ${currency}`} at Market`}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
