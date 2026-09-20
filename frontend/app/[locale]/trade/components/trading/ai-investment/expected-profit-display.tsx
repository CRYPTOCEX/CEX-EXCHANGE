import { useTranslations } from "next-intl";
import { formatCurrencyValue } from "../shared/percent-amount";
import { MoneyFigure } from "@/components/ui/money-figure";

interface ExpectedProfitDisplayProps {
  investmentAmount: number;
  /**
   * The plan's advertised profit percentage — the rate settlement actually
   * pays. Formerly `defaultProfit`, which is a DIFFERENT column: the payout
   * engine resolves `plan.profitPercentage` first and only falls back to
   * `defaultProfit`, so whenever the two differed this panel quoted a number
   * the user was never going to receive.
   *
   * This is the only outcome-related figure the API serves. Whether a plan is
   * configured to settle WIN, LOSS or DRAW is deliberately withheld — the
   * result is not knowable to the investor before the investment matures.
   */
  profitPercentage: number;
  currency: string;
}

export default function ExpectedProfitDisplay({
  investmentAmount,
  profitPercentage,
  currency,
}: ExpectedProfitDisplayProps) {
  const t = useTranslations("common");
  const rate = Number(profitPercentage) || 0;
  const profit = (investmentAmount * rate) / 100;

  // Format the profit based on the currency
  const formattedProfit = formatCurrencyValue(profit, currency);

  // The figure keeps `--up` (R1) but sits on the neutral ramp, not on an `up`
  // tint: `--up` ink over its own 10% tint measures 3.13:1 in light mode.
  return (
    <div className="p-2 bg-surface-2 border border-border rounded-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {t("expected_profit")}
        </span>
        <span className="text-xs font-bold text-up tabular-nums">
          <MoneyFigure value={`${formattedProfit} ${currency}`} /> ({rate}%)
        </span>
      </div>
    </div>
  );
}
