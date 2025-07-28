"use client";

import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { WalletData } from "./types";

interface BalanceDisplayProps {
  walletData: WalletData | null;
  isLoadingWallet: boolean;
  currency: string;
  pair: string;
  marketPrice: string;
  fundingRate: number | null;
  fundingTime: string;
}

export default function BalanceDisplay({
  walletData,
  isLoadingWallet,
  currency,
  pair,
  marketPrice,
  fundingRate,
  fundingTime,
}: BalanceDisplayProps) {
  const t = useTranslations("trade/components/trading/futures/balance-display");

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
    <div className="px-3 py-2 border-b border-border dark:border-zinc-800">
      {/* Current Price */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{t("current_price")}</span>
        <div className="text-sm font-medium">
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
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            {t("funding_rate")}
          </span>
          <div className="text-xs">
            <span
              className={cn(
                "font-medium",
                fundingRate >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatFundingRate(fundingRate)}
            </span>
            {fundingTime && (
              <span className="text-muted-foreground ml-1">
                - {fundingTime}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Available Balance */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center">
          <Wallet className="h-3 w-3 mr-1" />
          {t("Available")}:
        </span>
        <div className="text-right">
          {isLoadingWallet ? (
            <div className="text-xs text-muted-foreground">{t("Loading")}...</div>
          ) : walletData ? (
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">
                {formatBalance(walletData.availableBalance)} {walletData.currency}
              </div>
              {walletData.margin && walletData.margin > 0 && (
                <div className="text-xs text-muted-foreground">
                  {t("Margin")}: {formatBalance(walletData.margin)} {walletData.currency}
                </div>
              )}
              {walletData.unrealizedPnl !== undefined && walletData.unrealizedPnl !== 0 && (
                <div
                  className={cn(
                    "text-xs font-medium",
                    walletData.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  PnL: {walletData.unrealizedPnl >= 0 ? "+" : ""}
                  {formatBalance(walletData.unrealizedPnl)} {walletData.currency}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm font-medium text-muted-foreground">
              {formatBalance(0)} {pair}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 