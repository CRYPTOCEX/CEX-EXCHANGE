"use client";

import { Sparkles } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface PayoutHeroProps {
  bottomSlot?: ReactNode;
  rightContent?: ReactNode;
}

export function PayoutHero({ bottomSlot, rightContent }: PayoutHeroProps) {
  const t = useTranslations("ext_gateway");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Payouts",
      }}
      title={t("your_payouts")}
      description={t("manage_withdrawals_and_track_your_earnings")}
      layout="split"
      rightContent={rightContent}
      bottomSlot={bottomSlot}
    />
  );
}
