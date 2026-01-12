"use client";

import React, { Suspense } from "react";
import { TradingProProvider } from "./TradingProProvider";
import { TradingProLayout } from "./TradingProLayout";
import { useTradingProStatus } from "./hooks/useTradingProStatus";
import { LoadingOverlay } from "./components/shared/LoadingOverlay";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import "./styles/trading-pro.css";
import type { MarketType } from "./types/common";

interface TradingProProps {
  initialSymbol?: string;
  marketType?: MarketType;
}

function TradingProContent({ initialSymbol, marketType }: TradingProProps) {
  // Get settings
  const { isLoading, chartProvider } = useTradingProStatus();

  if (isLoading) {
    return <LoadingOverlay message="Loading Trading Pro..." />;
  }

  return (
    <TradingProLayout
      initialSymbol={initialSymbol}
      marketType={marketType}
      chartProvider={chartProvider}
    />
  );
}

export default function TradingPro(props: TradingProProps) {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong. Please refresh.</div>}
    >
      <TradingProProvider>
        <Suspense fallback={<LoadingOverlay />}>
          <TradingProContent {...props} />
        </Suspense>
      </TradingProProvider>
    </ErrorBoundary>
  );
}
