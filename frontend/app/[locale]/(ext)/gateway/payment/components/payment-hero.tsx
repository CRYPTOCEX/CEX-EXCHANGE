"use client";

import { CreditCard, Sparkles, CheckCircle, Clock, XCircle } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { useTranslations } from "next-intl";

interface PaymentHeroProps {
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
}

export function PaymentHero({
  totalPayments,
  completedPayments,
  pendingPayments,
  failedPayments,
}: PaymentHeroProps) {
  const t = useTranslations("ext_gateway");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Payment History",
        gradient: "from-indigo-600/10 to-cyan-600/10",
        iconColor: "text-indigo-600",
        textColor: "text-indigo-700 dark:text-indigo-500",
      }}
      title={[
        { text: "Transaction " },
        { text: "History", gradient: "from-indigo-600 to-cyan-600" },
      ]}
      description={t("view_and_manage_all_your_payment_transactions")}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="default"
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
    >
      <StatsGroup
        stats={[
          {
            icon: CreditCard,
            label: "Total",
            value: totalPayments.toString(),
            iconColor: "text-indigo-600",
            iconBgColor: "bg-indigo-600/10",
          },
          {
            icon: CheckCircle,
            label: "Completed",
            value: completedPayments.toString(),
            iconColor: "text-green-500",
            iconBgColor: "bg-green-500/10",
          },
          {
            icon: Clock,
            label: "Pending",
            value: pendingPayments.toString(),
            iconColor: "text-yellow-500",
            iconBgColor: "bg-yellow-500/10",
          },
          {
            icon: XCircle,
            label: "Failed",
            value: failedPayments.toString(),
            iconColor: "text-red-500",
            iconBgColor: "bg-red-500/10",
          },
        ]}
      />
    </HeroSection>
  );
}
