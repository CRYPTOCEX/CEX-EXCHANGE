"use client";

import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
import { useTranslations } from "next-intl";

interface StopLossTakeProfitProps {
  stopLoss: number | null;
  setStopLoss: (price: number | null) => void;
  takeProfit: number | null;
  setTakeProfit: (price: number | null) => void;
}

export default function StopLossTakeProfit({
  stopLoss,
  setStopLoss,
  takeProfit,
  setTakeProfit,
}: StopLossTakeProfitProps) {
  const t = useTranslations(
    "trade/components/trading/futures/stop-loss-take-profit"
  );
  // Handle stop loss change
  const handleStopLossChange = (value: string) => {
    const numValue = Number.parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setStopLoss(numValue);
    } else if (value === "") {
      setStopLoss(null);
    }
  };

  // Handle take profit change
  const handleTakeProfitChange = (value: string) => {
    const numValue = Number.parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setTakeProfit(numValue);
    } else if (value === "") {
      setTakeProfit(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          {t("stop_loss")}
        </label>
        <div className="relative">
          <Input
            type="number"
            value={stopLoss || ""}
            onChange={(e) => handleStopLossChange(e.target.value)}
            className="pr-10"
            placeholder="Optional"
            step="any"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          {t("take_profit")}
        </label>
        <div className="relative">
          <Input
            type="number"
            value={takeProfit || ""}
            onChange={(e) => handleTakeProfitChange(e.target.value)}
            className="pr-10"
            placeholder="Optional"
            step="any"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
