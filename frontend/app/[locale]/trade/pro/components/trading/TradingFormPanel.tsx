"use client";

import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "../../utils/cn";
import { SideToggle, type OrderSide } from "./SideToggle";
import { OrderTypeSelector, type OrderType } from "./OrderTypeSelector";
import { BalanceDisplay } from "./BalanceDisplay";
import { PriceInput } from "./PriceInput";
import { AmountInput } from "./AmountInput";
import { QuickAmountButtons } from "./QuickAmountButtons";
import { TotalDisplay } from "./TotalDisplay";
import { FeeEstimate } from "./FeeEstimate";
import { SubmitButton } from "./SubmitButton";
import { ConfirmationModal } from "./ConfirmationModal";
import { AdvancedOptions, type AdvancedOptionsState } from "./advanced/AdvancedOptions";
import { LeverageSlider } from "./futures/LeverageSlider";
import { MarginDisplay } from "./futures/MarginDisplay";
import { useOrderForm } from "./hooks/useOrderForm";
import { useOrderSubmit } from "./hooks/useOrderSubmit";
import { useBalances } from "./hooks/useBalances";
import { useExtensionStatus } from "../../providers/ExtensionStatusProvider";
import type { MarketType, TPMarket, MarketMetadata } from "../../types/common";
import { marketDataWs, type TickerData, type MarketType as WSMarketType } from "@/services/market-data-ws";
import { AiInvestmentForm } from "./AiInvestmentForm";
import { useConfigStore } from "@/store/config";

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
  // Admin settings
  const { settings: adminSettings } = useExtensionStatus();

  // Check if AI Investment extension is installed
  const extensions = useConfigStore((state) => state.extensions);
  const isAiInvestmentEnabled = extensions?.includes("ai_investment");

  // Trading type toggle (standard vs AI)
  const [tradingType, setTradingType] = useState<"standard" | "ai">("standard");

  // Form state - use admin default order type
  const form = useOrderForm(adminSettings.defaultOrderType);

  // Current price state
  const [currentPrice, setCurrentPrice] = useState<number | null>(externalPrice || null);

  // Confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Selected percentage for quick buttons
  const [selectedPercentage, setSelectedPercentage] = useState<number | undefined>();

  // Parse symbol to get currencies
  const [baseCurrency, quoteCurrency] = useMemo(() => {
    if (market) {
      return [market.currency, market.pair];
    }
    const parts = symbol.split("/");
    return [parts[0] || "BTC", parts[1] || "USDT"];
  }, [symbol, market]);

  // Balances
  const { baseBalance, quoteBalance, isLoading: balancesLoading } = useBalances(
    baseCurrency,
    quoteCurrency,
    marketType
  );

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

  // Listen for price click from orderbook
  useEffect(() => {
    const handlePriceClick = (e: CustomEvent) => {
      form.setPrice(e.detail.price.toString());
      if (form.orderType === "market") {
        form.setOrderType("limit");
      }
    };

    window.addEventListener("tp-set-order-price", handlePriceClick as EventListener);
    return () => {
      window.removeEventListener("tp-set-order-price", handlePriceClick as EventListener);
    };
  }, [form]);

  // Calculate total
  const total = useMemo(() => {
    const p = form.orderType === "market" ? currentPrice : parseFloat(form.price);
    const a = parseFloat(form.amount);
    if (!p || !a || isNaN(p) || isNaN(a)) return 0;
    return p * a;
  }, [form.orderType, form.price, form.amount, currentPrice]);

  // Calculate max amount based on balance
  const maxAmount = useMemo(() => {
    if (form.side === "buy") {
      const p = form.orderType === "market" ? currentPrice : parseFloat(form.price);
      if (!p || !quoteBalance) return 0;
      return quoteBalance / p;
    } else {
      return baseBalance || 0;
    }
  }, [form.side, form.orderType, form.price, currentPrice, baseBalance, quoteBalance]);

  // Handle quick amount percentage
  const handleQuickAmount = useCallback(
    (percentage: number) => {
      const max = maxAmount * (percentage / 100);
      form.setAmount(max.toFixed(4));
      setSelectedPercentage(percentage);
    },
    [maxAmount, form]
  );

  // Clear selected percentage when amount changes manually
  useEffect(() => {
    const currentAmount = parseFloat(form.amount) || 0;
    const expectedAmount25 = maxAmount * 0.25;
    const expectedAmount50 = maxAmount * 0.5;
    const expectedAmount75 = maxAmount * 0.75;
    const expectedAmount100 = maxAmount;

    const isApprox = (a: number, b: number) => Math.abs(a - b) < 0.0001;

    if (
      !isApprox(currentAmount, expectedAmount25) &&
      !isApprox(currentAmount, expectedAmount50) &&
      !isApprox(currentAmount, expectedAmount75) &&
      !isApprox(currentAmount, expectedAmount100)
    ) {
      setSelectedPercentage(undefined);
    }
  }, [form.amount, maxAmount]);

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
        price: form.orderType !== "market" ? parseFloat(form.price) : undefined,
        amount: parseFloat(form.amount),
        stopPrice: form.stopPrice ? parseFloat(form.stopPrice) : undefined,
        takeProfitPrice: form.takeProfitPrice ? parseFloat(form.takeProfitPrice) : undefined,
        stopLossPrice: form.stopLossPrice ? parseFloat(form.stopLossPrice) : undefined,
        leverage: marketType === "futures" ? form.leverage : undefined,
        ...form.advancedOptions,
      });

      // Reset form on success
      form.reset();
      setSelectedPercentage(undefined);
      setShowConfirmation(false);

      // Callback
      onOrderSuccess?.(result);
    } catch (err) {
      // Error handled by useOrderSubmit
    }
  };

  // Get precision from metadata or fallback to smart precision
  const pricePrecision = metadata?.precision?.price !== undefined
    ? metadata.precision.price
    : (currentPrice && currentPrice >= 1000 ? 2 : currentPrice && currentPrice >= 1 ? 4 : 8);

  const amountPrecision = metadata?.precision?.amount !== undefined
    ? metadata.precision.amount
    : 4;

  return (
    <div className={cn("tp-trading-form flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Trading type tabs (Standard vs AI) - only show if AI Investment extension is installed */}
      {isAiInvestmentEnabled && (
        <div className="flex border-b border-[var(--tp-border)]">
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
            AI Investment
            {tradingType === "ai" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--tp-blue)]" />
            )}
          </button>
        </div>
      )}

      {/* AI Investment Form */}
      {isAiInvestmentEnabled && tradingType === "ai" ? (
        <AiInvestmentForm symbol={symbol} marketType={marketType} className="flex-1" />
      ) : (
        <>
          {/* Side toggle */}
          <SideToggle side={form.side} onChange={form.setSide} marketType={marketType} />

          {/* Balance display */}
          <BalanceDisplay
            baseBalance={baseBalance}
            quoteBalance={quoteBalance}
            baseCurrency={baseCurrency}
            quoteCurrency={quoteCurrency}
            side={form.side}
            isLoading={balancesLoading}
            pricePrecision={pricePrecision}
            amountPrecision={amountPrecision}
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

          {/* Form fields */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Price input (not for market orders) */}
            {form.orderType !== "market" && (
              <PriceInput
                value={form.price}
                onChange={form.setPrice}
                currentPrice={currentPrice}
                precision={pricePrecision}
                label={form.orderType.includes("stop") ? "Limit Price" : "Price"}
              />
            )}

            {/* Stop price for stop orders */}
            {(form.orderType === "stop_market" || form.orderType === "stop_limit") && (
              <PriceInput
                value={form.stopPrice}
                onChange={form.setStopPrice}
                currentPrice={currentPrice}
                precision={pricePrecision}
                label="Stop Price"
              />
            )}

            {/* Amount input */}
            <AmountInput
              value={form.amount}
              onChange={form.setAmount}
              max={maxAmount}
              precision={amountPrecision}
              currency={baseCurrency}
            />

            {/* Quick amount buttons */}
            <QuickAmountButtons onSelect={handleQuickAmount} selectedPercentage={selectedPercentage} />

            {/* Bracket order fields */}
            {form.orderType === "bracket" && (
              <>
                <PriceInput
                  value={form.takeProfitPrice}
                  onChange={form.setTakeProfitPrice}
                  currentPrice={currentPrice}
                  precision={pricePrecision}
                  label="Take Profit"
                  className="[&_input]:border-[var(--tp-green)]/30"
                />
                <PriceInput
                  value={form.stopLossPrice}
                  onChange={form.setStopLossPrice}
                  currentPrice={currentPrice}
                  precision={pricePrecision}
                  label="Stop Loss"
                  className="[&_input]:border-[var(--tp-red)]/30"
                />
              </>
            )}

            {/* Total */}
            <TotalDisplay total={total} currency={quoteCurrency} precision={pricePrecision} />

            {/* Margin display (futures) */}
            {marketType === "futures" && (
              <MarginDisplay total={total} leverage={form.leverage} side={form.side} />
            )}

            {/* Fee estimate */}
            <FeeEstimate total={total} orderType={form.orderType} marketType={marketType} />

            {/* Advanced options - Hidden for now, not yet implemented */}
            {/* <AdvancedOptions
              options={form.advancedOptions}
              onChange={form.setAdvancedOptions}
              orderType={form.orderType}
              marketType={marketType}
            /> */}
          </div>

          {/* Submit button */}
          <div className="p-2 border-t border-[var(--tp-border)]">
            <SubmitButton
              side={form.side}
              orderType={form.orderType}
              amount={form.amount}
              price={form.orderType === "market" ? currentPrice?.toString() : form.price}
              isSubmitting={isSubmitting}
              disabled={!form.amount || parseFloat(form.amount) <= 0}
              onClick={handleSubmit}
            />

            {error && <p className="mt-1 text-[10px] text-[var(--tp-red)] text-center">{error}</p>}
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
            }}
            isSubmitting={isSubmitting}
          />
        </>
      )}
    </div>
  );
});

export default TradingFormPanel;
