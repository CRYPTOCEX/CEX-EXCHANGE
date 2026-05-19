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
}

const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { text: string; gradient: string; iconColor: string; textColor: string }> = {
    ACTIVE: {
      text: "Active Account",
      gradient: "from-green-500/10 to-emerald-400/10",
      iconColor: "text-green-600",
      textColor: "text-green-700 dark:text-green-400",
    },
    PENDING: {
      text: "Pending Approval",
      gradient: "from-yellow-500/10 to-amber-400/10",
      iconColor: "text-yellow-600",
      textColor: "text-yellow-700 dark:text-yellow-400",
    },
    SUSPENDED: {
      text: "Account Suspended",
      gradient: "from-red-500/10 to-rose-400/10",
      iconColor: "text-red-600",
      textColor: "text-red-700 dark:text-red-400",
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
}: DashboardHeroProps) {
  const t = useTranslations("ext_gateway");
  const statusConfig = getStatusConfig(merchantStatus);

  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: statusConfig.text,
        gradient: statusConfig.gradient,
        iconColor: statusConfig.iconColor,
        textColor: statusConfig.textColor,
      }}
      title={[
        { text: "Your " },
        { text: "Payment Gateway", gradient: "from-indigo-600 to-cyan-600" },
      ]}
      description={t("monitor_transactions_manage_payouts_and_track")}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="split"
      rightContentAlign="start"
      background={{
        orbs: [
          {
            color: "#6366F1",
            position: { top: "-8rem", right: "-8rem" },
            size: "18rem",
          },
          {
            color: "#06B6D4",
            position: { bottom: "-4rem", left: "-4rem" },
            size: "14rem",
          },
        ],
      }}
      particles={{
        count: 5,
        type: "floating",
        colors: ["#6366F1", "#06B6D4"],
        size: 6,
      }}
      rightContent={rightContent}
      bottomSlot={bottomSlot}
    />
  );
}
