"use client";

import { AlertTriangle, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface TradeDisputeViewProps {
  reason: string;
  details: string;
  trade: any;
}

function getFullName(user: any): string {
  if (!user) return "Unknown";
  if (user.name) return user.name;
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
}

export function TradeDisputeView({
  reason,
  details,
  trade,
}: TradeDisputeViewProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  // Determine who filed the dispute
  const disputeFiledById = trade.disputeFiledBy || trade.dispute?.reportedById;
  const filedByBuyer = disputeFiledById === trade.buyerId || disputeFiledById === trade.buyer?.id;
  const filedBySeller = disputeFiledById === trade.sellerId || disputeFiledById === trade.seller?.id;
  const filedBy = filedByBuyer ? trade.buyer : filedBySeller ? trade.seller : null;

  return (
    <div className="space-y-6">
      <div className="rounded-md border-2 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800/50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-300">{tExt("dispute_reason")}</h3>
            <p className="mt-1 text-red-800 dark:text-red-300">{reason}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium">{t("dispute_details")}</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{details}</p>
      </div>

      <Separator />

      <div>
        <h3 className="mb-2 font-medium">{t("dispute_filed_by")}</h3>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {filedBy ? (
            <Link
              href={`/admin/crm/user/${filedBy.id}`}
              className="text-primary hover:underline"
            >
              {getFullName(filedBy)} ({filedByBuyer ? tExt("buyer") : tCommon("seller")})
            </Link>
          ) : (
            <span className="text-muted-foreground">{t("unknown")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
