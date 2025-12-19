import { Wallet, Lock } from "lucide-react";
import type { WalletData, WalletBalance } from "./types";
import { useTranslations } from "next-intl";

interface BalanceDisplayProps {
  walletData: WalletData | null;
  isLoadingWallet: boolean;
  currency: string;
  pair: string;
  marketPrice: string;
  pricePrecision?: number;
  amountPrecision?: number;
}

export default function BalanceDisplay({
  walletData,
  isLoadingWallet,
  currency,
  pair,
  marketPrice,
  pricePrecision = 2,
  amountPrecision = 4,
}: BalanceDisplayProps) {
  const t = useTranslations("common");

  // Format balance based on market precision
  const formatBalance = (value: number, precision: number) => {
    // Handle very small values
    if (value === 0) {
      return value.toFixed(Math.min(precision, 8));
    }

    // For non-zero values, show appropriate precision
    const formatted = value.toFixed(Math.min(precision, 8));

    // Remove trailing zeros but keep at least 2 decimal places
    const parts = formatted.split('.');
    if (parts.length === 2) {
      const decimals = parts[1].replace(/0+$/, '');
      const minDecimals = Math.min(2, precision);
      if (decimals.length < minDecimals) {
        return value.toFixed(minDecimals);
      }
      return decimals.length === 0 ? parts[0] : `${parts[0]}.${decimals}`;
    }
    return formatted;
  };

  // Helper to extract balance details from WalletBalance or number
  const getBalanceDetails = (balance: number | WalletBalance | undefined) => {
    if (!balance) {
      return { total: 0, inOrder: 0, available: 0 };
    }
    if (typeof balance === 'object') {
      return {
        total: balance.total,        // Total owned (balance + inOrder)
        inOrder: balance.inOrder,    // Locked in orders
        available: balance.balance,  // Available/spendable
      };
    }
    // Backward compatibility: if it's a number, treat it as available balance
    return { total: balance, inOrder: 0, available: balance };
  };

  // Get the actual currency and pair balance details
  const currencyDetails = getBalanceDetails(walletData?.currencyBalance);
  const pairDetails = getBalanceDetails(walletData?.pairBalance);

  return (
    <div className="flex flex-col px-3 py-2 bg-muted/50 dark:bg-zinc-900/50 border-b border-border dark:border-zinc-800 gap-2">
      {/* Currency Balance */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center text-muted-foreground dark:text-zinc-400">
          <Wallet className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 dark:text-zinc-500" />
          <span>{currency} {t("balance")}</span>
        </div>
        {isLoadingWallet ? (
          <span className="text-foreground dark:text-zinc-300 animate-pulse">
            {t("loading")}...
          </span>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-foreground dark:text-zinc-300 font-medium">
              {formatBalance(currencyDetails.total, amountPrecision)} {currency}
            </span>
            {currencyDetails.inOrder > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground dark:text-zinc-500">
                <Lock className="h-2.5 w-2.5" />
                <span>{formatBalance(currencyDetails.inOrder, amountPrecision)} {t("in_orders")}</span>
              </div>
            )}
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              {t("available")}: {formatBalance(currencyDetails.available, amountPrecision)}
            </span>
          </div>
        )}
      </div>

      {/* Pair Balance */}
      <div className="flex items-center justify-between text-xs border-t border-border/50 dark:border-zinc-800/50 pt-2">
        <div className="flex items-center text-muted-foreground dark:text-zinc-400">
          <Wallet className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 dark:text-zinc-500" />
          <span>{pair} {t("balance")}</span>
        </div>
        {isLoadingWallet ? (
          <span className="text-foreground dark:text-zinc-300 animate-pulse">
            {t("loading")}...
          </span>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-foreground dark:text-zinc-300 font-medium">
              {formatBalance(pairDetails.total, amountPrecision)} {pair}
            </span>
            {pairDetails.inOrder > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground dark:text-zinc-500">
                <Lock className="h-2.5 w-2.5" />
                <span>{formatBalance(pairDetails.inOrder, amountPrecision)} {t("in_orders")}</span>
              </div>
            )}
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              {t("available")}: {formatBalance(pairDetails.available, amountPrecision)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
