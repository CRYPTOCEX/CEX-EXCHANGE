"use client";

import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, DollarSign } from "lucide-react";
import { useTranslations } from "next-intl";

interface TradeInfoProps {
  amount: number;
  coin: string;
  price: number;
  total: number;
}

export function TradeInfo({ amount, coin, price, total }: TradeInfoProps) {
  const t = useTranslations("ext");
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 bg-card/50 border-primary/10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("Amount")}</p>
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
            <p className="text-sm text-muted-foreground">{t("Price")}</p>
            <p className="text-lg font-medium mt-1">
              / $
              {price.toLocaleString()}{" "}
              <span className="text-xs text-muted-foreground">
                {t("per")}
                {coin}
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
            <p className="text-sm text-muted-foreground">{t("Total")}</p>
            <p className="text-lg font-medium mt-1">
              / $
              {total.toLocaleString()}
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
