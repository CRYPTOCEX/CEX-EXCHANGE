"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./components/overview-tab";
import { BuyersTab } from "./components/buyers-tab";
import { SellersTab } from "./components/sellers-tab";
import { SafetyTab } from "./components/safety-tab";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { BookOpen, Shield, TrendingUp } from "lucide-react";
import { StatsGroup } from "@/components/ui/stats-group";

export default function GuidePage() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section - Using HeroSection component */}
      <HeroSection
        badge={{
          icon: <BookOpen className="h-3.5 w-3.5" />,
          text: "P2P Trading Guide",
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[
          { text: t("p2p_trading_guide") },
        ]}
        description={t("learn_how_to_safely_trade_cryptocurrencies")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
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
      >
        <StatsGroup
          stats={[
            {
              icon: BookOpen,
              label: "Comprehensive Guides",
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
            {
              icon: Shield,
              label: "Safety Best Practices",
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
            {
              icon: TrendingUp,
              label: "Trading Strategies",
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
          ]}
        />
      </HeroSection>

      <main className="container mx-auto px-4 py-12">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="overview">{tCommon("overview")}</TabsTrigger>
            <TabsTrigger value="buyers">{t("for_buyers")}</TabsTrigger>
            <TabsTrigger value="sellers">{t("for_sellers")}</TabsTrigger>
            <TabsTrigger value="safety">{t("safety_tips")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab />
          </TabsContent>

          {/* For Buyers Tab */}
          <TabsContent value="buyers" className="space-y-6">
            <BuyersTab />
          </TabsContent>

          {/* For Sellers Tab */}
          <TabsContent value="sellers" className="space-y-6">
            <SellersTab />
          </TabsContent>

          {/* Safety Tips Tab */}
          <TabsContent value="safety" className="space-y-6">
            <SafetyTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
