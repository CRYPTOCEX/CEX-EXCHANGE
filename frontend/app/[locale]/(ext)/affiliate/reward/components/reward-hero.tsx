"use client";

import { Gift, Sparkles, Wallet, TrendingUp, DollarSign } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

import { formatCurrency } from "@/utils/formatters";
import { useTranslations } from "next-intl";

interface RewardHeroProps {
  totalRewards: number;
  totalEarnings: number;
  thisMonthEarnings: number;
}

export function RewardHero({
  totalRewards,
  totalEarnings,
  thisMonthEarnings,
}: RewardHeroProps) {
  const t = useTranslations("ext_affiliate");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Rewards",
        
        
        
      }}
      title={[
        { text: "Your " },
        { text: "Earnings & Rewards",  },
      ]}
      description={t("track_all_your_commissions_and_bonus_rewards")}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="default"
      
      
    >
      <StatsGroup
        stats={[
          {
            icon: Gift,
            label: "Total Rewards",
            value: totalRewards.toString(),
            iconColor: `text-yellow-500`,
            iconBgColor: `bg-yellow-500/10`,
          },
          {
            icon: Wallet,
            label: "Total Earnings",
            value: formatCurrency(totalEarnings),
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-600/10",
          },
          {
            icon: TrendingUp,
            label: "This Month",
            value: formatCurrency(thisMonthEarnings),
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-600/10",
          },
        ]}
      />
    </HeroSection>
  );
}
