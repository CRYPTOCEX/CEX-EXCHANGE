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

function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateString);
  }
}

function getOutcomeLabel(outcome: string | undefined): string {
  switch (outcome) {
    case "BUYER_WINS":
      return "Buyer";
    case "SELLER_WINS":
      return "Seller";
    case "SPLIT":
      return "Both Parties";
    case "CANCELLED":
      return "Cancelled";
    default:
      return outcome || "Unknown";
  }
}

function parseResolution(resolution: any): { outcome?: string; notes?: string; resolvedAt?: string } {
  if (!resolution) return {};
  if (typeof resolution === "string") {
    try {
      return JSON.parse(resolution);
    } catch {
      return {};
    }
  }
  return resolution;
}

export function ResolutionDetails({ dispute }: ResolutionDetailsProps) {
  const t = useTranslations("ext_admin");
  const resolution = parseResolution(dispute.resolution);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resolution_details")}</CardTitle>
        <CardDescription>{t("this_dispute_has_been_resolved")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200">
                {t("resolved_for")} {getOutcomeLabel(resolution.outcome)}
              </h3>
              <p className="mt-1 text-sm text-green-800 dark:text-green-300">
                {resolution.notes || t("dispute_was_resolved_based_on_evidence")}
              </p>
              <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                {t("resolved_on")} {formatDate(dispute.resolvedOn || resolution.resolvedAt)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
