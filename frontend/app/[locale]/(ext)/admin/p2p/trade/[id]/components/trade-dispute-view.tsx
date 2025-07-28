"use client";

import { AlertTriangle, FileText, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface TradeDisputeViewProps {
  reason: string;
  details: string;
  trade: any;
}

export function TradeDisputeView({
  reason,
  details,
  trade,
}: TradeDisputeViewProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-6">
      <div className="rounded-md border-2 border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-800">{t("dispute_reason")}</h3>
            <p className="mt-1 text-red-800">{reason}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium">{t("dispute_details")}</h3>
        <p className="text-sm">{details}</p>
      </div>

      <Separator />

      <div>
        <h3 className="mb-2 font-medium">{t("dispute_filed_by")}</h3>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{trade.buyer.name}</span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium">{t("supporting_evidence")}</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border p-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {t("Payment_receipt")}. {t("pdf")}
            </span>
            <Button variant="outline" size="sm" className="ml-auto">
              {t("View")}
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {t("Bank_statement")}. {t("pdf")}
            </span>
            <Button variant="outline" size="sm" className="ml-auto">
              {t("View")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
