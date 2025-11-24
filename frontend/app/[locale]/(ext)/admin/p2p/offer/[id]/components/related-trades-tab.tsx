"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function RelatedTradesTab() {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("related_trades")}</CardTitle>
        <CardDescription>{t("trades_created_from_this_offer")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">
          {t("no_trades_have_been_created_from_this_offer_yet")}
        </p>
      </CardContent>
    </Card>
  );
}
