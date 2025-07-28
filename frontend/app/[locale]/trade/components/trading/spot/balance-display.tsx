import { Wallet } from "lucide-react";
import type { WalletData } from "./types";
import { useTranslations } from "next-intl";

interface BalanceDisplayProps {
  walletData: WalletData | null;
  isLoadingWallet: boolean;
  currency: string;
  pair: string;
  marketPrice: string;
}

export default function BalanceDisplay({
  walletData,
  isLoadingWallet,
  currency,
  pair,
  marketPrice,
}: BalanceDisplayProps) {
  const t = useTranslations("trade/components/trading/spot/balance-display");
  // Format currency based on type
  const formatCurrency = (value: number, currencyType: string) => {
    if (currencyType.includes("BTC")) return value.toFixed(8);
    if (currencyType.includes("ETH")) return value.toFixed(6);
    return value.toFixed(2);
  };

  // Get the actual currency and pair balances
  const currencyBalance = walletData?.currencyBalance || 0;
  const pairBalance = walletData?.pairBalance || 0;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 dark:bg-zinc-900/50 border-b border-border dark:border-zinc-800">
      <div className="flex items-center text-xs text-muted-foreground dark:text-zinc-400">
        <Wallet className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 dark:text-zinc-500" />
        <span>{t("available")}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {isLoadingWallet ? (
          <span className="text-foreground dark:text-zinc-300 animate-pulse">
            {t("Loading")}.
          </span>
        ) : (
          <>
            <span className="text-foreground dark:text-zinc-300">
              {formatCurrency(currencyBalance, currency)} {currency}
            </span>
            <span className="text-muted-foreground dark:text-zinc-500">
              {t("_")}
            </span>
            <span className="text-foreground dark:text-zinc-300">
              {formatCurrency(pairBalance, pair)} {pair}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
