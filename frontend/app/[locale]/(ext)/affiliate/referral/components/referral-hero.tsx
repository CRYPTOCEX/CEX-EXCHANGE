"use client";

import { UserPlus, Sparkles, Users, CheckCircle, Clock } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

import { useTranslations } from "next-intl";

interface ReferralHeroProps {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
}

export function ReferralHero({
  totalReferrals,
  activeReferrals,
  pendingReferrals,
}: ReferralHeroProps) {
  const t = useTranslations("ext_affiliate");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Referrals",
        
        
        
      }}
      title={[
        { text: "Manage Your " },
        { text: "Referrals",  },
      ]}
      description={t("track_and_monitor_all_your_referrals_in_one_place")}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="default"
      
      
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
            icon: CheckCircle,
            label: "Active",
            value: activeReferrals.toString(),
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-600/10",
          },
          {
            icon: Clock,
            label: "Pending",
            value: pendingReferrals.toString(),
            iconColor: `text-yellow-500`,
            iconBgColor: `bg-yellow-500/10`,
          },
        ]}
      />
    </HeroSection>
  );
}
