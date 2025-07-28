"use client";

import { AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface TradeDetailsTabProps {
  dispute: any;
}

export function TradeDetailsTab({ dispute }: TradeDetailsTabProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trade_details")}</CardTitle>
        <CardDescription>
          {t("information_about_the_disputed_trade")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("trade_id")}
              </h3>
              <p className="text-lg">
                <Link
                  href={`/admin/trades/${dispute.tradeId}`}
                  className="text-primary hover:underline"
                >
                  {dispute.tradeId}
                </Link>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("Amount")}
              </h3>
              <p className="text-lg">{dispute.amount}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("payment_method")}
              </h3>
              <p className="text-lg">{t("bank_transfer")}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("trade_created")}
              </h3>
              <p className="text-lg">{t("jul_3_2023")}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 font-medium">{t("trade_timeline")}</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-green-200 bg-green-100">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("trade_created")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("jul_3_2023_0915_am")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-green-200 bg-green-100">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("escrow_funded")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("jul_3_2023_0920_am")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-orange-200 bg-orange-100">
                  <Clock className="h-3 w-3 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {t("payment_marked_as_sent")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("jul_3_2023_1045_am")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-100">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("dispute_filed")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("jul_5_2023_1030_am")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            <Eye className="mr-2 h-4 w-4" />
            {t("view_complete_trade_details")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
