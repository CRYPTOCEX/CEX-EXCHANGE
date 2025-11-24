"use client";

import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";

interface LeverageSliderProps {
  leverage: number;
  setLeverage: (leverage: number) => void;
  maxLeverage: number;
  calculateLiquidationPrice: (
    price: number,
    lev: number,
    direction: "long" | "short"
  ) => void;
  currentPrice: number | null;
}

export default function LeverageSlider({
  leverage,
  setLeverage,
  maxLeverage,
  calculateLiquidationPrice,
  currentPrice,
}: LeverageSliderProps) {
  const t = useTranslations("trade/components/trading/futures/leverage-slider");
  // Handle leverage change
  const handleLeverageChange = (value: number[]) => {
    setLeverage(value[0]);
    if (currentPrice) {
      calculateLiquidationPrice(currentPrice, value[0], "long");
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-muted-foreground">{t("Leverage")}</label>
        <span className="text-xs font-medium">
          {leverage} x
        </span>
      </div>
      <Slider
        value={[leverage]}
        min={1}
        max={maxLeverage}
        step={1}
        onValueChange={handleLeverageChange}
        className="mb-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1x</span>
        <span>
          {maxLeverage} x
        </span>
      </div>
    </div>
  );
}
