"use client";

import React, { memo, useState, useCallback } from "react";
import { cn } from "../../utils/cn";

type OrderSide = "buy" | "sell";
type OrderType = "limit" | "market" | "stop_limit" | "stop_market";

interface MobileTradingFormProps {
  symbol: string;
  currentPrice?: number;
  availableBalance?: number;
  className?: string;
  onSubmit?: (order: {
    side: OrderSide;
    type: OrderType;
    price?: number;
    amount: number;
    stopPrice?: number;
  }) => void;
}

export const MobileTradingForm = memo(function MobileTradingForm({
  symbol,
  currentPrice = 0,
  availableBalance = 10000,
  className,
  onSubmit,
}: MobileTradingFormProps) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState(currentPrice.toString());
  const [amount, setAmount] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [sliderValue, setSliderValue] = useState(0);

  const baseAsset = symbol.split("/")[0];
  const quoteAsset = symbol.split("/")[1] || "USDT";

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const percent = Number(e.target.value);
      setSliderValue(percent);

      const priceNum = orderType === "market" ? currentPrice : parseFloat(price) || currentPrice;
      if (priceNum > 0 && availableBalance > 0) {
        const maxAmount = availableBalance / priceNum;
        const newAmount = (maxAmount * percent) / 100;
        setAmount(newAmount.toFixed(6));
      }
    },
    [price, orderType, currentPrice, availableBalance]
  );

  const handleSubmit = useCallback(() => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) return;

    onSubmit?.({
      side,
      type: orderType,
      price: orderType !== "market" ? parseFloat(price) : undefined,
      amount: amountNum,
      stopPrice: orderType.includes("stop") ? parseFloat(stopPrice) : undefined,
    });
  }, [side, orderType, price, amount, stopPrice, onSubmit]);

  const total = parseFloat(amount || "0") * parseFloat(price || currentPrice.toString());

  return (
    <div className={cn("flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Side Toggle */}
      <div className="flex p-2 gap-2">
        <button
          onClick={() => setSide("buy")}
          className={cn(
            "flex-1 py-3 rounded-lg font-semibold transition-colors",
            side === "buy"
              ? "bg-[var(--tp-green)] text-white"
              : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={cn(
            "flex-1 py-3 rounded-lg font-semibold transition-colors",
            side === "sell"
              ? "bg-[var(--tp-red)] text-white"
              : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]"
          )}
        >
          Sell
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex px-2 gap-1 overflow-x-auto">
        {(["limit", "market", "stop_limit", "stop_market"] as OrderType[]).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors",
              orderType === type
                ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
                : "text-[var(--tp-text-muted)]"
            )}
          >
            {type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Form Fields */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Available Balance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--tp-text-muted)]">Available</span>
          <span className="font-mono text-[var(--tp-text-primary)]">
            {availableBalance.toFixed(2)} {quoteAsset}
          </span>
        </div>

        {/* Stop Price (for stop orders) */}
        {orderType.includes("stop") && (
          <div>
            <label className="block text-xs text-[var(--tp-text-muted)] mb-1">
              Stop Price
            </label>
            <div className="flex items-center bg-[var(--tp-bg-tertiary)] rounded-lg border border-[var(--tp-border)] focus-within:border-[var(--tp-blue)]">
              <input
                type="text"
                inputMode="decimal"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3 py-3 text-sm font-mono bg-transparent text-[var(--tp-text-primary)] outline-none"
              />
              <span className="px-3 text-xs text-[var(--tp-text-muted)]">{quoteAsset}</span>
            </div>
          </div>
        )}

        {/* Price (for limit orders) */}
        {orderType !== "market" && orderType !== "stop_market" && (
          <div>
            <label className="block text-xs text-[var(--tp-text-muted)] mb-1">
              Price
            </label>
            <div className="flex items-center bg-[var(--tp-bg-tertiary)] rounded-lg border border-[var(--tp-border)] focus-within:border-[var(--tp-blue)]">
              <button
                onClick={() => setPrice((p) => (parseFloat(p) - 1).toFixed(2))}
                className="px-3 py-3 text-[var(--tp-text-muted)]"
              >
                -
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-2 py-3 text-sm font-mono text-center bg-transparent text-[var(--tp-text-primary)] outline-none"
              />
              <button
                onClick={() => setPrice((p) => (parseFloat(p) + 1).toFixed(2))}
                className="px-3 py-3 text-[var(--tp-text-muted)]"
              >
                +
              </button>
            </div>
            {/* Market Price Button */}
            <button
              onClick={() => setPrice(currentPrice.toString())}
              className="w-full mt-1 py-1 text-[10px] text-[var(--tp-blue)]"
            >
              Use Market Price ({currentPrice.toFixed(2)})
            </button>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs text-[var(--tp-text-muted)] mb-1">
            Amount
          </label>
          <div className="flex items-center bg-[var(--tp-bg-tertiary)] rounded-lg border border-[var(--tp-border)] focus-within:border-[var(--tp-blue)]">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-3 py-3 text-sm font-mono bg-transparent text-[var(--tp-text-primary)] outline-none"
            />
            <span className="px-3 text-xs text-[var(--tp-text-muted)]">{baseAsset}</span>
          </div>
        </div>

        {/* Amount Slider */}
        <div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            className="w-full h-1 bg-[var(--tp-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--tp-blue)]"
          />
          <div className="flex justify-between mt-1">
            {[0, 25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => {
                  setSliderValue(percent);
                  const priceNum = orderType === "market" ? currentPrice : parseFloat(price) || currentPrice;
                  if (priceNum > 0 && availableBalance > 0) {
                    const maxAmount = availableBalance / priceNum;
                    setAmount(((maxAmount * percent) / 100).toFixed(6));
                  }
                }}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  sliderValue === percent
                    ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]"
                    : "text-[var(--tp-text-muted)]"
                )}
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-2 border-t border-[var(--tp-border)]">
          <span className="text-xs text-[var(--tp-text-muted)]">Total</span>
          <span className="text-sm font-mono text-[var(--tp-text-primary)]">
            {total.toFixed(2)} {quoteAsset}
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-3 border-t border-[var(--tp-border)]">
        <button
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
          className={cn(
            "w-full py-4 rounded-lg font-semibold text-white transition-colors",
            "disabled:opacity-50",
            side === "buy"
              ? "bg-[var(--tp-green)] active:bg-[var(--tp-green)]/80"
              : "bg-[var(--tp-red)] active:bg-[var(--tp-red)]/80"
          )}
        >
          {side === "buy" ? "Buy" : "Sell"} {baseAsset}
        </button>
      </div>
    </div>
  );
});

export default MobileTradingForm;
