"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { TradeRow } from "./TradeRow";
import { useTranslations } from "next-intl";

interface Trade {
  id: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
}

interface TradesPanelProps {
  trades: Trade[];
  pricePrecision?: number;
  amountPrecision?: number;
  className?: string;
}

export const TradesPanel = memo(function TradesPanel({
  trades,
  pricePrecision = 2,
  amountPrecision = 4,
  className,
}: TradesPanelProps) {
  const t = useTranslations("common");

  return (
    <div className={cn("tp-trades-panel h-full flex flex-col", className)}>
      <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border)]">
        <span>{t("price")}</span>
        <span className="text-right">{t("amount")}</span>
        <span className="text-right">{t("time")}</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--tp-text-muted)] text-xs">
            {t("no_recent_trades")}
          </div>
        ) : (
          trades.map((trade, index) => (
            <TradeRow
              /*
                Keyed by the trade's own FACTS, not by `id`.

                A delta broadcast sets `id` to the ORDER id, so every partial
                fill of one order arrives with the same one — several rows in a
                single sweep sharing a React key, which React resolves by
                reusing the wrong DOM node and dropping rows. The fallback
                `trade-${index}` was worse: an index key on a list that grows at
                the TOP renumbers every row on every new trade.
              */
              key={`${trade.timestamp}-${trade.price}-${trade.amount}-${trade.side}-${index}`}
              price={trade.price}
              amount={trade.amount}
              side={trade.side}
              timestamp={trade.timestamp}
              isNew={index < 3}
              pricePrecision={pricePrecision}
              amountPrecision={amountPrecision}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default TradesPanel;
