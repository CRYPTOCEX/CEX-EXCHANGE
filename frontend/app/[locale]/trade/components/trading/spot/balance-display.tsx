import { Wallet } from "lucide-react";
import type { WalletData } from "./types";
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
  const t = useTranslations("trade/components/trading/spot/balance-display");

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

  // Get the actual currency and pair balances
  const currencyBalance = walletData?.currencyBalance || 0;
  const pairBalance = walletData?.pairBalance || 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 bg-muted/50 dark:bg-zinc-900/50 border-b border-border dark:border-zinc-800 gap-1">
      <div className="flex items-center text-xs text-muted-foreground dark:text-zinc-400">
        <Wallet className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 dark:text-zinc-500" />
        <span>{t("available")}:</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {isLoadingWallet ? (
          <span className="text-foreground dark:text-zinc-300 animate-pulse">
            {t("Loading")}...
          </span>
        ) : (
          <>
            <span className="text-foreground dark:text-zinc-300 font-medium">
              {formatBalance(currencyBalance, amountPrecision)} {currency}
            </span>
            <span className="text-muted-foreground dark:text-zinc-500 hidden sm:inline">
              /
            </span>
            <span className="text-foreground dark:text-zinc-300 font-medium">
              {formatBalance(pairBalance, amountPrecision)} {pair}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
