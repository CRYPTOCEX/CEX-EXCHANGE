"use client";

import React, { useState, useEffect, memo, useRef, useMemo } from "react";
import { cn } from "../../utils/cn";
import { SymbolDisplay } from "./SymbolDisplay";
import { MarketStats } from "./MarketStats";
import { QuickActions } from "./QuickActions";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import type { TickerData } from "../../types/market";
import type { MarketType } from "../../types/common";
import { marketDataWs, type TickerData as WSTickerData, type MarketType as WSMarketType } from "@/services/market-data-ws";

interface MarketMetadata {
  precision?: {
    price?: number;
    amount?: number;
  };
  limits?: {
    amount?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    cost?: { min?: number; max?: number };
  };
}

interface TradingHeaderProps {
  symbol: string;
  marketType: MarketType;
  className?: string;
  onSymbolChange?: (symbol: string, marketType?: MarketType) => void;
  onSymbolClick?: () => void;
  isMobile?: boolean;
  metadata?: MarketMetadata;
}

export const TradingHeader = memo(function TradingHeader({
  symbol,
  marketType,
  className,
  onSymbolChange,
  onSymbolClick,
  isMobile = false,
  metadata,
}: TradingHeaderProps) {
  const router = useRouter();
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);

  // Ref for cleanup
  const tickerUnsubscribeRef = useRef<(() => void) | null>(null);

  // Convert Trading Pro market type to WebSocket service market type
  const wsMarketType: WSMarketType = useMemo(() => {
    if (marketType === "futures") return "futures";
    if (marketType === "eco") return "eco";
    return "spot";
  }, [marketType]);

  // Subscribe to real ticker data via WebSocket
  useEffect(() => {
    // Clean up previous subscription
    if (tickerUnsubscribeRef.current) {
      tickerUnsubscribeRef.current();
      tickerUnsubscribeRef.current = null;
    }

    // Reset state when symbol changes
    setTicker(null);
    setPrevPrice(null);

    // Initialize WebSocket service
    marketDataWs.initialize();

    // Subscribe to ticker
    const unsubscribe = marketDataWs.subscribe<WSTickerData>(
      {
        symbol,
        type: "ticker",
        marketType: wsMarketType,
      },
      (data) => {
        if (data) {
          setTicker((prev) => {
            if (prev) setPrevPrice(prev.last);
            return {
              symbol: data.symbol || symbol,
              timestamp: data.timestamp || Date.now(),
              datetime: new Date(data.timestamp || Date.now()).toISOString(),
              high: data.high || 0,
              low: data.low || 0,
              bid: data.bid || 0,
              ask: data.ask || 0,
              last: data.last || 0,
              change: data.change || 0,
              percentage: data.percentage || 0,
              baseVolume: data.baseVolume || 0,
              quoteVolume: data.quoteVolume || 0,
            };
          });
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
  }, [symbol, wsMarketType]);

  // Determine price direction
  const priceDirection =
    ticker && prevPrice
      ? ticker.last > prevPrice
        ? "up"
        : ticker.last < prevPrice
        ? "down"
        : "neutral"
      : "neutral";

  return (
    <>
      <header
        className={cn(
          "tp-header",
          "h-10 min-h-[40px]",
          "flex items-center",
          "bg-[var(--tp-bg-secondary)]",
          "border-b border-[var(--tp-border)]",
          "select-none",
          className
        )}
      >
        {/* Left section: Back button */}
        <div className="flex items-center h-full border-r border-[var(--tp-border)]">
          <button
            onClick={() => router.push("/")}
            className={cn(
              "h-10 w-9 flex items-center justify-center",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-tertiary)]",
              "transition-colors",
              "cursor-pointer"
            )}
            title="Back to home"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Symbol section - clickable when onSymbolClick is provided */}
        <div className="flex items-center h-full border-r border-[var(--tp-border)] px-3">
          <SymbolDisplay
            symbol={symbol}
            ticker={ticker}
            priceDirection={priceDirection}
            compact={isMobile}
            onClick={onSymbolClick}
            pricePrecision={metadata?.precision?.price}
          />
        </div>

        {/* Market stats section - hidden on mobile and small screens */}
        {ticker && !isMobile && (
          <div className="hidden lg:flex items-center h-full border-r border-[var(--tp-border)] px-3">
            <MarketStats ticker={ticker} pricePrecision={metadata?.precision?.price} />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section: Quick actions */}
        <QuickActions compact={isMobile} />
      </header>
    </>
  );
});

export default TradingHeader;
