"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DollarSign, ChevronDown, ChevronUp, Leaf } from "lucide-react";
import { $fetch } from "@/lib/api";
import type { OrderFormProps } from "./types";
import PercentButtons from "./percent-buttons";
import { useTranslations } from "next-intl";

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
}: OrderFormProps) {
  const t = useTranslations("trade/components/trading/spot/limit-order-form");
  const [price, setPrice] = useState(marketPrice);
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [percentSelected, setPercentSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [userModifiedPrice, setUserModifiedPrice] = useState(false);
  const prevSymbolRef = useRef<string>(symbol);

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
          availableForPurchase / Number(price.replace(/,/g, ""))
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
      const numericPrice = Number(price.replace(/,/g, ""));
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
            `Order submitted: limit order to ${buyMode ? "buy" : "sell"} ${amount} ${currency}`
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
            {t("Price")}
          </label>
          <div className="flex items-center space-x-1">
            <button
              className="text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-300 bg-muted dark:bg-zinc-800 rounded p-0.5"
              onClick={() => {
                const numericPrice = Number(price.replace(/,/g, ""));
                const step = Math.pow(10, -pricePrecision);
                const newPrice = (numericPrice + step).toFixed(pricePrecision);
                setPrice(newPrice);
                setUserModifiedPrice(true); // Mark that user has manually changed the price

                if (amount) {
                  const calculatedTotal = (
                    Number(newPrice) * Number(amount)
                  ).toFixed(pricePrecision);
                  setTotal(calculatedTotal);
                }
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              className="text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-300 bg-muted dark:bg-zinc-800 rounded p-0.5"
              onClick={() => {
                const numericPrice = Number(price.replace(/,/g, ""));
                const step = Math.pow(10, -pricePrecision);
                const newPrice = (numericPrice - step).toFixed(pricePrecision);
                setPrice(newPrice);
                setUserModifiedPrice(true); // Mark that user has manually changed the price

                if (amount) {
                  const calculatedTotal = (
                    Number(newPrice) * Number(amount)
                  ).toFixed(pricePrecision);
                  setTotal(calculatedTotal);
                }
              }}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <DollarSign className="h-3 w-3 text-muted-foreground/70 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            className="w-full pl-6 pr-3 py-1.5 text-xs border border-border dark:border-zinc-700 rounded-sm bg-background dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-emerald-500"
            placeholder="0.00"
            value={price}
            onChange={handlePriceChange}
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
          {t("Total")}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <DollarSign className="h-3 w-3 text-muted-foreground/70 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            className="w-full pl-6 pr-12 py-1.5 text-xs border border-border dark:border-zinc-700 rounded-sm bg-background dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-emerald-500"
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
              {`${buyMode ? `Buy ${currency}` : `Sell ${currency}`}`}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
