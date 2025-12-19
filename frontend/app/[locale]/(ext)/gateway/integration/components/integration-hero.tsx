"use client";

import { Sparkles } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { ReactNode } from "react";

interface IntegrationHeroProps {
  rightContent?: ReactNode;
}

export function IntegrationHero({ rightContent }: IntegrationHeroProps) {
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "API Integration",
        gradient: "from-indigo-500/10 to-cyan-500/10",
        iconColor: "text-indigo-600",
        textColor: "text-indigo-700 dark:text-indigo-400",
      }}
      title={[
        { text: "Developer " },
        { text: "Integration", gradient: "from-indigo-600 to-cyan-600" },
      ]}
      description="API keys, webhooks, and integration guides for your payment gateway"
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="split"
      rightContent={rightContent}
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
    />
  );
}
