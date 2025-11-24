"use client";

import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
import type { MutableRefObject } from "react";
import { useTranslations } from "next-intl";

interface LimitPriceInputProps {
  limitPrice: number | null;
  setLimitPrice: (price: number | null) => void;
  userSetLimitPrice: MutableRefObject<boolean>;
}

export default function LimitPriceInput({
  limitPrice,
  setLimitPrice,
  userSetLimitPrice,
}: LimitPriceInputProps) {
  const t = useTranslations(
    "trade/components/trading/futures/limit-price-input"
  );
  // Handle limit price change
  const handleLimitPriceChange = (value: string) => {
    userSetLimitPrice.current = true;
    const numValue = Number.parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setLimitPrice(numValue);
    } else if (value === "") {
      setLimitPrice(null);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs text-muted-foreground mb-1">
        {t("limit_price")}
      </label>
      <div className="relative">
        <Input
          type="number"
          value={limitPrice || ""}
          onChange={(e) => handleLimitPriceChange(e.target.value)}
          className="pr-10"
          step="any"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
