"use client";

import React from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useTranslations } from "next-intl";

/**
 * Chart Error Boundary - Wraps the chart component
 * Shows a placeholder when the chart fails to render
 */
interface ChartErrorFallbackProps {
  error: Error;
  onReset: () => void;
}

function ChartErrorFallback({ error, onReset }: ChartErrorFallbackProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-muted/30 rounded-lg border border-border">
      <div className="text-muted-foreground mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
          <path d="m16 15-3-3-2 2-3-3" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t("chart_error")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
        {t("chart_failed_to_load") + ' ' + t("connection_issue_or_invalid_data")}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t("reload_chart")}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          {tCommon("refresh_page")}
        </button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="mt-4 text-xs text-muted-foreground max-w-md">
          <summary className="cursor-pointer">{tCommon("error_details_development_only")}</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto max-h-32">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
}

export function ChartErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <ChartErrorFallback error={error} onReset={reset} />
      )}
      onError={(error) => {
        console.error("[ChartErrorBoundary] Chart error:", error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Order Panel Error Boundary - Wraps the order placement form
 * Shows a retry option when order panel fails
 */
function OrderPanelErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  const t = useTranslations("binary_components");
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-card rounded-lg border border-border">
      <div className="text-amber-500 mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">
        {t("order_panel_unavailable")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("unable_to_load_trading_controls")}
      </p>
      <button
        onClick={onReset}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export function OrderPanelErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <OrderPanelErrorFallback error={error} onReset={reset} />
      )}
      onError={(error) => {
        console.error("[OrderPanelErrorBoundary] Order panel error:", error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Positions Error Boundary - Wraps active/completed positions
 * Shows a refresh option when positions fail to load
 */
function PositionsErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  const t = useTranslations("binary_components");
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <div className="text-muted-foreground mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {t("failed_to_load_positions")}
      </p>
      <button
        onClick={onReset}
        className="text-sm text-primary hover:underline"
      >
        Refresh
      </button>
    </div>
  );
}

export function PositionsErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <PositionsErrorFallback error={error} onReset={reset} />
      )}
      onError={(error) => {
        console.error("[PositionsErrorBoundary] Positions error:", error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Trading Interface Error Boundary - Top-level wrapper
 * Shows a full-page error when the entire trading interface fails
 */
function TradingInterfaceErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-destructive mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-foreground mb-3">
        {t("trading_interface_error")}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t("unexpected_error_loading_trading_interface") + ' ' + t("funds_safe_may_need_refresh")}
      </p>
      <div className="flex gap-4">
        <button
          onClick={onReset}
          className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          {tCommon("try_again")}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          {tCommon("refresh_page")}
        </button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="mt-6 text-xs text-muted-foreground max-w-lg w-full">
          <summary className="cursor-pointer">{t("developer_info")}</summary>
          <pre className="mt-2 p-3 bg-muted rounded text-left overflow-auto max-h-48">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
}

export function TradingInterfaceErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <TradingInterfaceErrorFallback error={error} onReset={reset} />
      )}
      onError={(error) => {
        console.error(
          "[TradingInterfaceErrorBoundary] Trading interface error:",
          error
        );
        // Here you could send to error monitoring service like Sentry
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
