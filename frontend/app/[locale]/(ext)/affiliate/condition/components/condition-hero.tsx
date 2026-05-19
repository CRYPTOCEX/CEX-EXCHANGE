"use client";

import { Target, Sparkles, Award, Percent, TrendingUp } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

import { useTranslations } from "next-intl";

interface ConditionHeroProps {
  totalPrograms: number;
  activePrograms: number;
  highestCommission: string;
}

export function ConditionHero({
  totalPrograms,
  activePrograms,
  highestCommission,
}: ConditionHeroProps) {
  const t = useTranslations("ext_affiliate");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Commission Rates",
        gradient: "from-blue-600/10 to-amber-600/10",
        iconColor: "text-blue-600",
        textColor: "text-blue-700 dark:text-blue-500",
      }}
      title={[
        { text: "Affiliate " },
        { text: "Programs & Rates", gradient: "from-blue-600 to-amber-600" },
      ]}
      description={t("explore_available_commission_structures_and_earning")}
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
            icon: Target,
            label: "Total Programs",
            value: totalPrograms.toString(),
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-600/10",
          },
          {
            icon: Award,
            label: "Active",
            value: activePrograms.toString(),
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-600/10",
          },
          {
            icon: Percent,
            label: "Best Rate",
            value: highestCommission,
            iconColor: `text-yellow-500`,
            iconBgColor: `bg-yellow-500/10`,
          },
        ]}
      />
    </HeroSection>
  );
}
