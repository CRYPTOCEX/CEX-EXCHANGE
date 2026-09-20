"use client";

import React, { Suspense } from "react";
import { TradingProProvider } from "./TradingProProvider";
import { TradingProLayout } from "./TradingProLayout";
import { useTradingProStatus } from "./hooks/useTradingProStatus";
import { LoadingOverlay } from "./components/shared/LoadingOverlay";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import "./styles/trading-pro.css";
import type { MarketType } from "./types/common";
import { useTranslations } from "next-intl";

interface TradingProProps {
  initialSymbol?: string;
  marketType?: MarketType;
}

function TradingProContent({ initialSymbol, marketType }: TradingProProps) {
  // Get settings
  const { chartProvider } = useTradingProStatus();

  /**
   * `if (isLoading) return <LoadingOverlay/>` used to be here, and it replaced
   * the ENTIRE Pro terminal with an `h-screen` centred spinner.
   * ==========================================================================
   *
   * WHAT IT WAS ACTUALLY WAITING FOR
   *
   * `isLoading` is `!settingsFetched` from the global config store. That store
   * is `persist()`-ed — but `settingsFetched` is NOT in its `partialize` list,
   * only `settings` is. So on every load after the first, the settings this
   * gate is waiting for are ALREADY REHYDRATED AND CORRECT before React runs,
   * and the flag says "loading" purely because the network has not yet
   * re-confirmed what localStorage already holds. The terminal — header,
   * markets rail, chart, order book, trading form, orders, positions — was
   * being withheld for a round trip whose answer was on screen a millisecond
   * later, unchanged.
   *
   * A workspace this size cannot be rebuilt from a spinner without a full
   * relayout: `GridLayout` sizes every panel from `layout.panels[*].size`, the
   * chart mounts a canvas/iframe, and three WebSocket subscriptions open in
   * effects. All of that now happens once, on the first frame.
   *
   * The one decision that genuinely cannot be guessed is WHICH CHART COMPONENT
   * to mount, because `chartProvider` selects between TradingView and the
   * in-house engine and getting it wrong means mounting a chart and then
   * tearing it down. That decision — and only that one — still waits, inside
   * the chart panel's own fixed grid cell. See `TradingProLayout`.
   */
  return (
    <TradingProLayout
      initialSymbol={initialSymbol}
      marketType={marketType}
      chartProvider={chartProvider}
    />
  );
}

export default function TradingPro(props: TradingProProps) {
  const t = useTranslations("trade_pro");
  return (
    <ErrorBoundary
      fallback={<div>{t("something_went_wrong_please_refresh")}</div>}
    >
      <TradingProProvider>
        <Suspense fallback={<LoadingOverlay />}>
          <TradingProContent {...props} />
        </Suspense>
      </TradingProProvider>
    </ErrorBoundary>
  );
}
