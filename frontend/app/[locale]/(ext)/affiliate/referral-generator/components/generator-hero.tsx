"use client";

import { Link2, Sparkles, Share2, QrCode, Zap } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

import { useTranslations } from "next-intl";

export function GeneratorHero() {
  const t = useTranslations("ext_affiliate");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Link Generator",
        
        
        
      }}
      title={[
        { text: "Custom " },
        { text: "Referral Links",  },
      ]}
      description={t("create_personalized_referral_links_and_qr")}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="default"
      
      
    >
      <StatsGroup
        stats={[
          {
            icon: Link2,
            label: "Custom Links",
            value: "",
            iconColor: "text-blue-600",
            iconBgColor: "bg-blue-600/10",
          },
          {
            icon: QrCode,
            label: "QR Codes",
            value: "",
            iconColor: "text-amber-500",
            iconBgColor: "bg-amber-500/10",
          },
          {
            icon: Zap,
            label: "Easy Sharing",
            value: "",
            iconColor: "text-amber-600",
            iconBgColor: "bg-amber-600/10",
          },
        ]}
      />
    </HeroSection>
  );
}
