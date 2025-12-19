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
  takerFee = 0.001,
  makerFee = 0.001,
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
      // Validate price first
      const numericPrice = Number(price.replace(/,/g, ""));
      if (!numericPrice || isNaN(numericPrice) || numericPrice <= 0) {
        console.warn("Invalid price for percentage calculation");
        setAmount("");
        setTotal("");
        return;
      }

      // Get available balance based on trading mode
      // For buy orders (buyMode = true), use pair balance (USDT) to calculate how much currency (BTC) can be bought
      // For sell orders (buyMode = false), use currency balance (BTC) to calculate how much to sell
      const rawBalance = buyMode
        ? walletData?.pairBalance
        : walletData?.currencyBalance;

      // Extract numeric balance (handle both number and WalletBalance object)
      const availableBalance = typeof rawBalance === 'object' && rawBalance !== null
        ? rawBalance.balance
        : (rawBalance || 0);

      // Check if balance is available
      if (!availableBalance || availableBalance <= 0) {
        setAmount("0");
        setTotal("0");
        return;
      }

      let calculatedAmount: string;

      if (buyMode) {
        // For buy orders: calculate how much currency can be bought with the percentage of pair balance
        // Need to account for the fee which is charged in the quote currency (pair)
        let availableForPurchase = availableBalance * (percent / 100);

        // For 100% buy orders, reduce slightly to avoid precision issues with fee calculation
        if (percent === 100) {
          availableForPurchase = availableForPurchase * 0.9999;
        }

        // The fee is calculated as: (amount * price * feeRate)
        // Total cost = amount * price + fee = amount * price + (amount * price * feeRate)
        // Total cost = amount * price * (1 + feeRate)
        // Therefore: amount = availableForPurchase / (price * (1 + takerFee))
        const amountValue = availableForPurchase / (numericPrice * (1 + takerFee));

        // Check for NaN
        if (isNaN(amountValue) || amountValue <= 0) {
          setAmount("0");
          setTotal("0");
          return;
        }

        // Round DOWN to ensure we never exceed available balance
        calculatedAmount = (Math.floor(amountValue * Math.pow(10, amountPrecision)) / Math.pow(10, amountPrecision)).toString();
      } else {
        // For sell orders: calculate percentage of currency balance to sell
        // Fee is deducted from the proceeds, not from the amount being sold
        // So we can use the full percentage of the balance
        let amountValue = availableBalance * (percent / 100);

        // For 100% sell orders, reduce by a tiny amount (0.0001%) to avoid
        // floating-point precision issues in backend validation
        if (percent === 100) {
          amountValue = amountValue * 0.999999;
        }

        // Check for NaN
        if (isNaN(amountValue) || amountValue <= 0) {
          setAmount("0");
          setTotal("0");
          return;
        }

        calculatedAmount = amountValue.toFixed(amountPrecision);
      }

      // Ensure amount is within limits
      const numAmount = Number(calculatedAmount);
      if (isNaN(numAmount)) {
        setAmount("0");
        setTotal("0");
        return;
      }

      // Determine the final amount to use (respecting min/max limits)
      let finalAmount: number;
      if (numAmount < minAmount) {
        finalAmount = minAmount;
        setAmount(minAmount.toFixed(amountPrecision));
      } else if (numAmount > maxAmount) {
        finalAmount = maxAmount;
        setAmount(maxAmount.toFixed(amountPrecision));
      } else {
        finalAmount = numAmount;
        setAmount(calculatedAmount);
      }

      // Calculate total using the FINAL amount that was actually set
      const calculatedTotal = numericPrice * finalAmount;
      if (isNaN(calculatedTotal)) {
        setTotal("0");
      } else {
        setTotal(calculatedTotal.toFixed(pricePrecision));
      }
    } catch (error) {
      console.error("Error calculating amount:", error);
      setAmount("0");
      setTotal("0");
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
          {t("buy")}
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
          {t("sell")}
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400">
            {t("price")}
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
          <input
            type="text"
            className="w-full pl-3 pr-12 py-1.5 text-xs border border-border dark:border-zinc-700 rounded-sm bg-background dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-emerald-500"
            placeholder="0.00"
            value={price}
            onChange={handlePriceChange}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-xs text-muted-foreground dark:text-zinc-500">
              {pair}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400">
          {t("amount")}
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
          {t("total")}
        </label>
        <div className="relative">
          <input
            type="text"
            className="w-full pl-3 pr-12 py-1.5 text-xs border border-border dark:border-zinc-700 rounded-sm bg-background dark:bg-zinc-900 focus:outline-none"
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

      {/* Fee Display */}
      {amount && price && Number(amount) > 0 && (
        <div className="flex items-center justify-between px-1 py-0.5 text-[10px] text-muted-foreground dark:text-zinc-500">
          <span>{tTradeComponents("est_fee")} ({(takerFee * 100).toFixed(2)}%):</span>
          <span>
            {(Number(price.replace(/,/g, "")) * Number(amount) * takerFee).toFixed(pricePrecision)} {pair}
          </span>
        </div>
      )}

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
              {t("processing")}.
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
