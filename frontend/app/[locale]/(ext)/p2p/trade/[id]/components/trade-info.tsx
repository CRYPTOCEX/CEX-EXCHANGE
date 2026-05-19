"use client";

import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, DollarSign } from "lucide-react";
import { useTranslations } from "next-intl";
import { getCurrencySymbol } from "@/utils/currency";

interface TradeInfoProps {
  amount: number;
  coin: string;
  price: number;
  total: number;
  priceCurrency?: string;
}

export function TradeInfo({ amount, coin, price, total, priceCurrency = "USD" }: TradeInfoProps) {
  const t = useTranslations("common");
  const tExtP2p = useTranslations("ext_p2p");
  const currencySymbol = getCurrencySymbol(priceCurrency);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 bg-card/50 border-primary/10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("amount")}</p>
            <p className="text-lg font-medium mt-1">
              {amount} {coin}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowDown className="h-4 w-4 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card/50 border-primary/10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("price")}</p>
            <p className="text-lg font-medium mt-1">
              {currencySymbol}{price.toLocaleString()}{" "}
              <span className="text-xs text-muted-foreground">
                {tExtP2p("per")} {coin}
              </span>
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowUp className="h-4 w-4 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card/50 border-primary/10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("total")}</p>
            <p className="text-lg font-medium mt-1">
              {currencySymbol}{total.toLocaleString()}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
        </div>
      </Card>
    </div>
  );
}
