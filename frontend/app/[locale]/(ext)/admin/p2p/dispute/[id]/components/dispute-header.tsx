"use client";

import { DisputeStatusBadge } from "./dispute-status-badge";
import { PriorityBadge } from "./priority-badge";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { format } from "date-fns";

interface DisputeHeaderProps {
  id: string;
  status: string;
  filedOn: string;
  tradeId: string;
  priority: string;
  dispute: any;
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
  if (!reason) return "Dispute";
  if (DISPUTE_REASON_LABELS[reason]) {
    return DISPUTE_REASON_LABELS[reason];
  }
  return reason
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function DisputeHeader({
  id,
  status,
  filedOn,
  tradeId,
  priority,
  dispute,
}: DisputeHeaderProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");

  const reportedBy = dispute?.reportedBy || {};
  const against = dispute?.against || {};
  const trade = dispute?.trade || {};

  return (
    <Card className="border-destructive/20">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Reported By */}
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-14 w-14 ring-2 ring-red-500/30">
              <AvatarImage
                src={reportedBy.avatar || "/img/placeholder.svg"}
                alt={getUserName(reportedBy)}
              />
              <AvatarFallback className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                {getInitials(reportedBy.firstName, reportedBy.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("reported_by")}</p>
              <p className="font-semibold">{getUserName(reportedBy)}</p>
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

          {/* Dispute info center */}
          <div className="flex flex-col items-center gap-2 px-6">
            <div className="flex items-center gap-2">
              <Badge
                variant="destructive"
                className="flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                {tExt("dispute")}
              </Badge>
              <DisputeStatusBadge status={status} />
              <PriorityBadge priority={priority} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{formatDisputeReason(dispute?.reason)}</p>
              {trade.amount && trade.currency && (
                <p className="text-sm text-muted-foreground">
                  {trade.amount} {trade.currency}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(filedOn)}</span>
            </div>
            <Link
              href={`/admin/p2p/trade/${tradeId}`}
              className="text-xs text-primary hover:underline"
            >
              {t("view_trade")} →
            </Link>
          </div>

          {/* Against */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("against")}</p>
              <p className="font-semibold">{getUserName(against)}</p>
              {against.id && (
                <Link
                  href={`/admin/crm/user/${against.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {tExt("view_profile")}
                </Link>
              )}
            </div>
            <Avatar className="h-14 w-14 ring-2 ring-orange-500/30">
              <AvatarImage
                src={against.avatar || "/img/placeholder.svg"}
                alt={getUserName(against)}
              />
              <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                {getInitials(against.firstName, against.lastName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
