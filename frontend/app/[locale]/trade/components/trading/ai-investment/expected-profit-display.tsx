import { useTranslations } from "next-intl";
interface ExpectedProfitDisplayProps {
  investmentAmount: number;
  profitPercentage: number;
  currency: string;
}

export default function ExpectedProfitDisplay({
  investmentAmount,
  profitPercentage,
  currency,
}: ExpectedProfitDisplayProps) {
  const t = useTranslations(
    "trade/components/trading/ai-investment/expected-profit-display"
  );
  // Calculate expected profit
  const profit = (investmentAmount * profitPercentage) / 100;

  // Format the profit based on the currency
  const formattedProfit = formatCurrencyValue(profit, currency);

  return (
    <div className="p-2 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {t("expected_profit")}
        </span>
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {formattedProfit} {currency} {t("(")}
          {profitPercentage}
          {t("%)")}
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
