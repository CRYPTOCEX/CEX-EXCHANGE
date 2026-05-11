import { useTranslations } from "next-intl";
interface ExpectedProfitDisplayProps {
  investmentAmount: number;
  defaultProfit: number;
  currency: string;
}

export default function ExpectedProfitDisplay({
  investmentAmount,
  defaultProfit,
  currency,
}: ExpectedProfitDisplayProps) {
  const t = useTranslations("common");
  // Calculate expected profit using defaultProfit (matches cron payout logic)
  const profit = (investmentAmount * defaultProfit) / 100;

  // Format the profit based on the currency
  const formattedProfit = formatCurrencyValue(profit, currency);

  return (
    <div className="p-2 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {t("expected_profit")}
        </span>
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {formattedProfit} {currency} ({defaultProfit}%)
        </span>
      </div>
    </div>
  );
}

// Format currency value based on the currency
function formatCurrencyValue(value: number, currency: string): string {
  if (currency.includes("BTC")) {
    return value.toFixed(8);
  } else if (currency.includes("ETH")) {
    return value.toFixed(6);
  } else {
    return value.toFixed(2);
  }
}
