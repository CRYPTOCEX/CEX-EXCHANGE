"use client";

import { Symbol } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

interface PriceIndicatorProps {
  price: number;
  symbol: Symbol;
}

export default function PriceIndicator({ price, symbol }: PriceIndicatorProps) {
  const t = useTranslations("binary/components/chart/price-indicator");
  return (
    <div className="absolute top-2 left-2 bg-[#1A1D29]/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-[#2A2E39]/50 z-10">
      <div className="flex items-center">
        <span className="font-bold mr-2">{symbol.replace("USDT", "")}</span>
        <span>
          $
          {price.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
