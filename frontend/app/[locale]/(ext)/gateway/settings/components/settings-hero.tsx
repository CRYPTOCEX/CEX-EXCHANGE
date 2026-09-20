"use client";

import { Sparkles } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface SettingsHeroProps {
  rightContent?: ReactNode;
}

export function SettingsHero({ rightContent }: SettingsHeroProps) {
  const t = useTranslations("ext_gateway");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Settings",
      }}
      title={t("merchant_settings")}
      description={t("configure_your_payment_gateway_preferences_and")}
      layout="split"
      rightContent={rightContent}
    />
  );
}
