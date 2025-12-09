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

export default function GuideClient() {
  const t = useTranslations("ext");
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-muted-800 dark:text-muted-100">
            AI Market Maker Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("complete_documentation_for_ai_market_maker")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/ai/market-maker")}
          >
            <Icon icon="mdi:arrow-left" className="w-5 h-5 mr-1" />
            Dashboard
          </Button>
          <Button onClick={() => router.push("/admin/ai/market-maker/market/create")}>
            <Icon icon="mdi:plus" className="w-5 h-5 mr-1" />
            {t("create_market")}
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
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
  );
}
