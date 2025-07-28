"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface OrderTypeSelectorProps {
  orderType: "market" | "limit";
  setOrderType: (type: "market" | "limit") => void;
}

export default function OrderTypeSelector({
  orderType,
  setOrderType,
}: OrderTypeSelectorProps) {
  const t = useTranslations(
    "trade/components/trading/futures/order-type-selector"
  );
  return (
    <div className="flex mb-4">
      <button
        className={cn(
          "flex-1 py-2 text-sm font-medium rounded-l-md border",
          orderType === "market"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-muted-foreground border-border dark:border-zinc-800"
        )}
        onClick={() => setOrderType("market")}
      >
        {t("Market")}
      </button>
      <button
        className={cn(
          "flex-1 py-2 text-sm font-medium rounded-r-md border",
          orderType === "limit"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-muted-foreground border-border dark:border-zinc-800"
        )}
        onClick={() => setOrderType("limit")}
      >
        {t("Limit")}
      </button>
    </div>
  );
}
