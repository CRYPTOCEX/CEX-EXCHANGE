"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GettingStartedSection from "./components/getting-started";
import BotTypesSection from "./components/bot-types";
import ConfigurationSection from "./components/configuration";
import BestPracticesSection from "./components/best-practices";
import TroubleshootingSection from "./components/troubleshooting";
import FaqSection from "./components/faq";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { BookOpen, Sparkles } from "lucide-react";

export default function GuideClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("getting-started");

  const tabs = [
    { id: "getting-started", label: "Getting Started", icon: "mdi:rocket-launch" },
    { id: "bot-types", label: "Bot Types", icon: "mdi:robot" },
    { id: "configuration", label: "Configuration", icon: "mdi:cog" },
    { id: "best-practices", label: "Best Practices", icon: "mdi:lightbulb" },
    { id: "troubleshooting", label: "Troubleshooting", icon: "mdi:wrench" },
    { id: "faq", label: "FAQ", icon: "mdi:frequently-asked-questions" },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section with AI Theme */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: tCommon("documentation"),
          gradient: "from-cyan-100 to-purple-100 dark:from-cyan-950 dark:to-purple-950",
          iconColor: "text-cyan-500",
          textColor: "text-cyan-600 dark:text-cyan-400",
        }}
        title={[
          { text: "AI Market Maker " },
          {
            text: "Guide",
            gradient:
              "from-cyan-600 via-purple-500 to-cyan-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400",
          },
        ]}
        description={t("complete_documentation_for_ai_market_maker")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: [
            {
              color: "#06b6d4",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#a855f7",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#06b6d4", "#a855f7"],
          size: 8,
        }}
        rightContent={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/ai/market-maker")}
              className="border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/5"
            >
              <Icon icon="mdi:arrow-left" className="w-5 h-5 mr-1" />
              Dashboard
            </Button>
            <Button
              onClick={() => router.push("/admin/ai/market-maker/market/create")}
              className="bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
            >
              <Icon icon="mdi:plus" className="w-5 h-5 mr-1" />
              {t("create_market")}
            </Button>
          </div>
        }
      />

      {/* Main Content with Tabs */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm">
                <Icon icon={tab.icon} className="w-4 h-4 mr-1 hidden sm:inline" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="getting-started" className="mt-6">
            <GettingStartedSection />
          </TabsContent>

          <TabsContent value="bot-types" className="mt-6">
            <BotTypesSection />
          </TabsContent>

          <TabsContent value="configuration" className="mt-6">
            <ConfigurationSection />
          </TabsContent>

          <TabsContent value="best-practices" className="mt-6">
            <BestPracticesSection />
          </TabsContent>

          <TabsContent value="troubleshooting" className="mt-6">
            <TroubleshootingSection />
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <FaqSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
