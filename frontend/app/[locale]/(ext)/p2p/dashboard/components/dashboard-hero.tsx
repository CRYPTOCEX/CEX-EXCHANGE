"use client";

import { Link } from "@/i18n/routing";
import { Search, Zap, Sparkles, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

interface DashboardHeroProps {
  name?: string;
  notifications?: number | any[];
}

export function DashboardHero({ name }: DashboardHeroProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");

  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "P2P Dashboard",
        gradient: `from-blue-500/10 to-violet-500/10`,
        iconColor: `text-blue-500`,
        textColor: `text-blue-600 dark:text-blue-400`,
      }}
      title={[
        { text: tCommon("welcome_back") },
        { text: name || "Trader", gradient: `from-blue-600 via-violet-500 to-blue-600` },
      ]}
      description={t("your_p2p_crypto_personalized_recommendations") + "."}
      paddingTop="pt-24"
      paddingBottom="pb-12"
      layout="split"
      background={{
        orbs: [
          {
            color: "#3b82f6",
            position: { top: "-10rem", right: "-10rem" },
            size: "20rem",
          },
          {
            color: "#8b5cf6",
            position: { bottom: "-5rem", left: "-5rem" },
            size: "15rem",
          },
        ],
      }}
      particles={{
        count: 6,
        type: "floating",
        colors: ["#3b82f6", "#8b5cf6"],
        size: 8,
      }}
      rightContent={
        <div className="flex flex-col gap-3 w-full sm:w-auto lg:mt-8">
          <Link href="/p2p/offer">
            <Button size="lg" className={`w-full sm:w-48 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg`}>
              <Zap className="mr-2 h-5 w-5" />
              {tCommon("start_trading")}
            </Button>
          </Link>
          <Link href="/p2p/guide">
            <Button size="lg" variant="outline" className={`w-full sm:w-48 border-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 font-semibold rounded-xl shadow-lg`}>
              <Search className="mr-2 h-5 w-5" />
              {t("explore_features")}
            </Button>
          </Link>
        </div>
      }
    >
      <StatsGroup
        stats={[
          {
            icon: TrendingUp,
            label: t("real_time_prices"),
            value: "",
            iconColor: `text-blue-500`,
            iconBgColor: `bg-blue-500/10`,
          },
          {
            icon: Shield,
            label: t("secure_escrow"),
            value: "",
            iconColor: `text-blue-500`,
            iconBgColor: `bg-blue-500/10`,
          },
        ]}
      />
    </HeroSection>
  );
}
