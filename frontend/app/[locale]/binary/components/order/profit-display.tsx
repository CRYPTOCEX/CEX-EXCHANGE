"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { FieldLabel, Panel, PayoutChip } from "./order-ui";

interface ProfitDisplayProps {
  profitPercentage: number;
  profitAmount: number;
  amount: number;
  symbol: string;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
}

export default function ProfitDisplay({
  profitPercentage,
  profitAmount,
  amount,
  symbol,
}: ProfitDisplayProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");

  const getCurrency = (symbol: string) => {
    const parts = symbol.split("/");
    return parts[1] || "USDT";
  };

  const currency = getCurrency(symbol);

  return (
    <Panel>
      {/* Profit row */}
      <div className="px-2.5 py-2 bg-up/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-up" />
            <FieldLabel className="tracking-normal">
              {t("potential")} {tCommon("profit")}
            </FieldLabel>
          </div>
          <PayoutChip className="text-[11px]">+{profitPercentage}%</PayoutChip>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-[10px] text-subtle-foreground">Win</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold text-up">
              +{profitAmount.toFixed(2)}
            </span>
            <span className="text-[10px] text-subtle-foreground">
              {currency}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full overflow-hidden mt-1.5 bg-surface-3">
          <div
            className="h-full bg-up rounded-full"
            style={{ width: `${Math.min(profitPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Loss row */}
      <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-1.5">
          <TrendingDown size={12} className="text-down" />
          <span className="text-[10px] text-subtle-foreground">
            {tCommon("loss")}
          </span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-base font-semibold text-foreground">
            -{amount.toFixed(2)}
          </span>
          <span className="text-[10px] text-subtle-foreground">{currency}</span>
        </div>
      </div>

      {/* Risk/Reward */}
      <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-border">
        <span className="text-[9px] uppercase tracking-wide text-subtle-foreground">
          {tCommon("risk_reward")}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <div className="w-3 h-1 rounded-full bg-down/40" />
            <div className="w-4 h-1 rounded-full bg-up" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            1:{(profitPercentage / 100).toFixed(1)}
          </span>
        </div>
      </div>
    </Panel>
  );
}
