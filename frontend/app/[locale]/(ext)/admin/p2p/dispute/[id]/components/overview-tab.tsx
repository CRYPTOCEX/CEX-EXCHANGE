"use client";

import { AlertTriangle, Calendar, DollarSign, Wallet, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

interface OverviewTabProps {
  dispute: any;
}

// Map dispute reason codes to readable labels
const DISPUTE_REASON_LABELS: Record<string, string> = {
  PAYMENT_NOT_RECEIVED: "Payment Not Received",
  PAYMENT_INCORRECT_AMOUNT: "Incorrect Payment Amount",
  CRYPTO_NOT_RELEASED: "Crypto Not Released",
  SELLER_UNRESPONSIVE: "Seller Unresponsive",
  BUYER_UNRESPONSIVE: "Buyer Unresponsive",
  FRAUDULENT_ACTIVITY: "Fraudulent Activity",
  TERMS_VIOLATION: "Terms Violation",
  OTHER: "Other",
};

function formatDisputeReason(reason: string): string {
  if (!reason) return "Not specified";
  // Check if it's a known code
  if (DISPUTE_REASON_LABELS[reason]) {
    return DISPUTE_REASON_LABELS[reason];
  }
  // If not a code, return as-is (might already be formatted text)
  // Or format snake_case to Title Case
  return reason
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || "?";
}

function getUserName(user: any): string {
  if (!user) return "Unknown User";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  if (user.email) return user.email.split("@")[0];
  return "Unknown User";
}

export function OverviewTab({ dispute }: OverviewTabProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  const reportedBy = dispute?.reportedBy || {};
  const against = dispute?.against || {};
  const trade = dispute?.trade || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dispute_information")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dispute Reason Alert */}
        <div className="rounded-md border-2 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800/50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-300">
                {tExt("dispute_reason")}
              </h3>
              <p className="mt-1 text-red-800 dark:text-red-300">{formatDisputeReason(dispute.reason)}</p>
            </div>
          </div>
        </div>

        {/* Dispute Details */}
        <div>
          <h3 className="mb-2 font-medium">{t("dispute_details")}</h3>
          <p className="text-sm text-muted-foreground">
            {dispute.details || t("no_additional_details_provided")}
          </p>
        </div>

        <Separator />

        {/* Trade Information */}
        {trade && trade.id && (
          <div>
            <h3 className="mb-3 font-medium">{t("related_trade")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tCommon("amount")}</p>
                  <p className="font-medium text-sm truncate">{trade.amount || "N/A"} {trade.currency || ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tCommon("status")}</p>
                  <Badge variant="outline" className="mt-0.5 text-xs">
                    {trade.status || "N/A"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tExt("trade_id")}</p>
                  <Link
                    href={`/admin/p2p/trade/${trade.id}`}
                    className="text-xs text-primary hover:underline font-mono truncate block"
                  >
                    {trade.id?.slice(0, 8) || "N/A"}...
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("filed_on_1")}</p>
                  <p className="text-xs truncate">{dispute.filedOn ? formatDate(dispute.filedOn) : "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Parties Involved */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {t("reported_by")}
            </h3>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50/50 dark:bg-red-950/20">
              <Avatar className="h-12 w-12 ring-2 ring-red-500/30">
                <AvatarImage
                  src={reportedBy.avatar || "/img/placeholder.svg"}
                  alt={getUserName(reportedBy)}
                />
                <AvatarFallback className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  {getInitials(reportedBy.firstName, reportedBy.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getUserName(reportedBy)}</p>
                {reportedBy.email && (
                  <p className="text-xs text-muted-foreground">{reportedBy.email}</p>
                )}
                {reportedBy.id && (
                  <Link
                    href={`/admin/crm/user/${reportedBy.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {tExt("view_profile")}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              {t("against")}
            </h3>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-orange-50/50 dark:bg-orange-950/20">
              <Avatar className="h-12 w-12 ring-2 ring-orange-500/30">
                <AvatarImage
                  src={against.avatar || "/img/placeholder.svg"}
                  alt={getUserName(against)}
                />
                <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  {getInitials(against.firstName, against.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getUserName(against)}</p>
                {against.email && (
                  <p className="text-xs text-muted-foreground">{against.email}</p>
                )}
                {against.id && (
                  <Link
                    href={`/admin/crm/user/${against.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {tExt("view_profile")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
