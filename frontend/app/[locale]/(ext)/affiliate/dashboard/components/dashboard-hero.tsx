"use client";

import { LayoutDashboard, Sparkles, TrendingUp, Users, Wallet } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { formatCurrency } from "@/utils/formatters";
import { useTranslations } from "next-intl";

interface DashboardHeroProps {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  conversionRate: number;
}

export function DashboardHero({
  totalReferrals,
  activeReferrals,
  totalEarnings,
  conversionRate,
}: DashboardHeroProps) {
  const t = useTranslations("ext_affiliate");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Affiliate Dashboard",
        gradient: "from-blue-600/10 to-amber-600/10",
        iconColor: "text-blue-600",
        textColor: "text-blue-700 dark:text-blue-500",
      }}
      title={[
        { text: "Your " },
        { text: "Affiliate Performance", gradient: "from-blue-600 to-amber-600" },
      ]}
      description={t("track_your_referrals_earnings_and_network")}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="default"
      background={{
        orbs: [
          {
            color: "#2563EB",
            position: { top: "-8rem", right: "-8rem" },
            size: "18rem",
          },
          {
            color: "#F59E0B",
            position: { bottom: "-4rem", left: "-4rem" },
            size: "14rem",
          },
        ],
      }}
      particles={{
        count: 5,
        type: "floating",
        colors: ["#2563EB", "#F59E0B"],
        size: 6,
      }}
    >
      <StatsGroup
        stats={[
          {
            icon: Users,
            label: "Total Referrals",
            value: totalReferrals.toString(),
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-600/10",
          },
          {
            icon: TrendingUp,
            label: "Active Referrals",
            value: activeReferrals.toString(),
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-600/10",
          },
          {
            icon: Wallet,
            label: "Total Earnings",
            value: formatCurrency(totalEarnings),
            iconColor: `text-yellow-500`,
            iconBgColor: `bg-yellow-500/10`,
          },
          {
            icon: LayoutDashboard,
            label: "Conversion Rate",
            value: `${conversionRate}%`,
            iconColor: `text-amber-500`,
            iconBgColor: `bg-amber-500/10`,
          },
        ]}
      />
    </HeroSection>
  );
}
