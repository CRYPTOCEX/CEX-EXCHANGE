"use client";

import { Link } from "@/i18n/routing";
import { Plus, Sparkles, ArrowLeftRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

export function DashboardHeader() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "Trade Center",
        
        
        
      }}
      title={[
        { text: t("trade_dashboard") },
      ]}
      description={t("manage_your_active_trading_activity")}
      paddingTop="pt-24"
      paddingBottom="pb-16"
      layout="split"
      
      
      rightContent={
        <div className="flex flex-col gap-3 w-full sm:w-auto lg:mt-8">
          <Link href="/p2p/offer/create">
            <Button size="lg" className={`w-full sm:w-48 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-600 text-white font-semibold rounded-xl shadow-lg`}>
              <Plus className="mr-2 h-5 w-5" />
              {tCommon("create_new_offer")}
            </Button>
          </Link>
        </div>
      }
    >
      <StatsGroup
        stats={[
          {
            icon: ArrowLeftRight,
            label: t("instant_trades"),
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
