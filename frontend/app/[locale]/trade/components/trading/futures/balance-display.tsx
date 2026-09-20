"use client";

import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { MoneyFigure } from "@/components/ui/money-figure";
import type { WalletData } from "./types";

interface BalanceDisplayProps {
  walletData: WalletData | null;
  isLoadingWallet: boolean;
  currency: string;
  pair: string;
  marketPrice: string;
  /**
   * The market's effective funding rate, or null when the market is unfunded.
   *
   * Resolved server-side by `parseFundingConfig`: null for a market with no
   * rate or a rate of exactly zero, otherwise the rate CLAMPED to
   * ±MAX_ABS_FUNDING_RATE. That is the same number the settlement charges —
   * `settleFuturesFunding` runs every 60s and debits payers / credits
   * receivers through the wallet ledger — so this figure is a charge against
   * an open position, not a reference.
   */
  fundingRate: number | null;
}

export default function BalanceDisplay({
  walletData,
  isLoadingWallet,
  currency,
  pair,
  marketPrice,
  fundingRate,
}: BalanceDisplayProps) {
  const t = useTranslations("common");
  const tTradeComponents = useTranslations("trade_components");

  const formatBalance = (balance: number) => {
    return balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatFundingRate = (rate: number) => {
    const percentage = (rate * 100).toFixed(4);
    return `${percentage}%`;
  };

  return (
    <div className="px-3 py-2 border-b border-border">
      {/* Current Price */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{t("current_price")}</span>
        <div className="text-sm font-medium tabular-nums">
          {marketPrice === "0.00" ? (
            <span className="text-muted-foreground">$0.00</span>
          ) : (
            <span className="text-foreground">${marketPrice}</span>
          )}
        </div>
      </div>

      {/* Funding Rate */}
      {fundingRate !== null && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground flex items-center">
            {fundingRate >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-up" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-down" />
            )}
            {t("funding_rate")}
          </span>
          <div className="text-xs" title={tTradeComponents("funding_rate_reference_only")}>
            <span
              className={cn(
                "font-medium tabular-nums",
                fundingRate >= 0 ? "text-up" : "text-down"
              )}
            >
              {formatFundingRate(fundingRate)}
            </span>
          </div>
        </div>
      )}

      {/* Available Balance */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center">
          <Wallet className="h-3 w-3 mr-1" />
          {t("available")}:
        </span>
        <div className="text-right">
          {isLoadingWallet ? (
            <div className="text-xs text-muted-foreground">{t("loading")}...</div>
          ) : walletData ? (
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground tabular-nums">
                <MoneyFigure value={`${formatBalance(walletData.availableBalance)} ${walletData.currency}`} />
              </div>
              {walletData.margin && walletData.margin > 0 && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {t("margin")}:{" "}
                  <MoneyFigure value={`${formatBalance(walletData.margin)} ${walletData.currency}`} />
                </div>
              )}
              {walletData.unrealizedPnl !== undefined && walletData.unrealizedPnl !== 0 && (
                <div
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    walletData.unrealizedPnl >= 0 ? "text-up" : "text-down"
                  )}
                >
                  PnL:{" "}
                  <MoneyFigure
                    value={`${walletData.unrealizedPnl >= 0 ? "+" : ""}${formatBalance(walletData.unrealizedPnl)} ${walletData.currency}`}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm font-medium text-muted-foreground tabular-nums">
              <MoneyFigure value={`${formatBalance(0)} ${pair}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 