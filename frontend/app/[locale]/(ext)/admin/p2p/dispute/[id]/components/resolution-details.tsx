"use client";

import { CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface ResolutionDetailsProps {
  dispute: any;
}

export function ResolutionDetails({ dispute }: ResolutionDetailsProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resolution_details")}</CardTitle>
        <CardDescription>{t("this_dispute_has_been_resolved")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border-2 border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-medium text-green-800">
                {t("resolved_for")}{" "}
                {dispute.resolution?.outcome === "buyer"
                  ? "Buyer"
                  : dispute.resolution?.outcome === "seller"
                    ? "Seller"
                    : "Both Parties"}
              </h3>
              <p className="mt-1 text-sm text-green-800">
                {dispute.resolution?.notes ||
                  "Dispute was resolved based on the evidence provided."}
              </p>
              <p className="mt-2 text-xs text-green-700">
                {t("resolved_on")}
                {dispute.resolvedOn}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
