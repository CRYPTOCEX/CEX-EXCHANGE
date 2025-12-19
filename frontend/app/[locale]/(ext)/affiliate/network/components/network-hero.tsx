"use client";

import { Network, Sparkles, Users, TrendingUp, Target } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { useTranslations } from "next-intl";

interface NetworkHeroProps {
  totalNodes: number;
  directReferrals: number;
  networkDepth: number;
}

export function NetworkHero({
  totalNodes,
  directReferrals,
  networkDepth,
}: NetworkHeroProps) {
  const t = useTranslations("ext_affiliate");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Network Tree",
        gradient: "from-blue-600/10 to-amber-600/10",
        iconColor: "text-blue-600",
        textColor: "text-blue-700 dark:text-blue-500",
      }}
      title={[
        { text: "Visualize Your " },
        { text: "Affiliate Network", gradient: "from-blue-600 to-amber-600" },
      ]}
      description={t("explore_your_referral_tree_and_track")}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="default"
      background={{
        orbs: [
          {
            color: "#3b82f6",
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
        colors: ["#3b82f6", "#F59E0B"],
        size: 6,
      }}
    >
      <StatsGroup
        stats={[
          {
            icon: Users,
            label: "Total Network",
            value: totalNodes.toString(),
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-600/10",
          },
          {
            icon: TrendingUp,
            label: "Direct Referrals",
            value: directReferrals.toString(),
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-600/10",
          },
          {
            icon: Target,
            label: "Network Depth",
            value: `${networkDepth} Levels`,
            iconColor: `text-amber-500`,
            iconBgColor: `bg-amber-500/10`,
          },
        ]}
      />
    </HeroSection>
  );
}
