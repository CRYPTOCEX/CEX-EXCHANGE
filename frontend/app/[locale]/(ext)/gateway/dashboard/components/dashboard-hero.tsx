"use client";

import { Sparkles } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface DashboardHeroProps {
  totalPayments: number;
  totalRevenue: number;
  pendingAmount: number;
  successRate: number;
  merchantStatus: string;
  rightContent?: ReactNode;
  bottomSlot?: ReactNode;
  /**
   * The merchant status has not arrived yet.
   *
   * The hero renders in both states — it is the page's chrome and everything in
   * it except the badge is static — but the badge PRINTS the account's status,
   * and `getStatusConfig` falls back to PENDING for anything it does not
   * recognise. With the page's `if (loading) return <Skeleton/>` gone, that
   * fallback would tell every merchant their account is "Pending Approval" for
   * the length of the fetch, including the ones whose accounts are active and
   * the ones who are suspended. A status is a value; it waits.
   */
  loading?: boolean;
}

/**
 * The badge while the status is unknown. Same pill, same box, no claim — and
 * deliberately not a `SkeletonText`, because a pulsing bar where a status chip
 * goes reads as "something is wrong with your account".
 */
const PENDING_STATUS = {
  text: "Account status",
  gradient: "bg-muted",
  iconColor: "text-muted-foreground",
  textColor: "text-muted-foreground",
};

const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { text: string; gradient: string; iconColor: string; textColor: string }> = {
    ACTIVE: {
      text: "Active Account",
      gradient: "bg-success/10",
      iconColor: "text-success",
      textColor: "text-success",
    },
    PENDING: {
      text: "Pending Approval",
      gradient: "bg-warning/10",
      iconColor: "text-warning",
      textColor: "text-warning",
    },
    /* `from-destructive/10 to-primary/10` was the odd one out: two stops where
       its siblings are a flat tint, and mixing the error hue with the brand
       accent (R2 keeps those apart). One tint, like ACTIVE and PENDING. */
    SUSPENDED: {
      text: "Account Suspended",
      gradient: "bg-destructive/10",
      iconColor: "text-destructive",
      textColor: "text-destructive",
    },
  };

  return statusMap[status] || statusMap.PENDING;
};

export function GatewayDashboardHero({
  totalPayments,
  totalRevenue,
  pendingAmount,
  successRate,
  merchantStatus,
  rightContent,
  bottomSlot,
  loading = false,
}: DashboardHeroProps) {
  const t = useTranslations("ext_gateway");
  const statusConfig = loading ? PENDING_STATUS : getStatusConfig(merchantStatus);

  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: statusConfig.text,
      }}
      title={t("your_payment_gateway")}
      description={t("monitor_transactions_manage_payouts_and_track")}
      layout="split"
      rightContentAlign="start"
      rightContent={rightContent}
      bottomSlot={bottomSlot}
    />
  );
}
