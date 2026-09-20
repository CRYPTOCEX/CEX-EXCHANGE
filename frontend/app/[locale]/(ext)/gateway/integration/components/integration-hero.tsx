"use client";

import { Sparkles } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface IntegrationHeroProps {
  rightContent?: ReactNode;
}

export function IntegrationHero({ rightContent }: IntegrationHeroProps) {
  const t = useTranslations("ext_gateway");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "API Integration",
      }}
      title={t("developer_integration")}
      description={t("api_keys_webhooks_and_integration_guides")}
      layout="split"
      rightContent={rightContent}
    />
  );
}
