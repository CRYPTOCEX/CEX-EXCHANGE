"use client";

/**
 * WHO - an operator meeting this addon for the first time, or one who has hit
 *       something they do not recognise.
 * WHAT - decides what to do next: which setting to reach for, which bot type
 *       does what, why a market is behaving the way it is.
 * CLICK - through to the screen that owns the thing they just read about.
 *
 * The frame was a bare `min-h-screen` div, a hero and a `container mx-auto`.
 * `PageShell` and the console's masthead own it now, so the documentation reads
 * as part of the product rather than as a page from a different one. The tab
 * strip is the platform `underline` variant - the same one the market record
 * page uses - instead of a six-column `grid` that squeezed each label to
 * `text-xs`.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Bot,
  CircleHelp,
  Lightbulb,
  Plus,
  Rocket,
  Settings,
  Wrench,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/routing";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GettingStartedSection from "./components/getting-started";
import BotTypesSection from "./components/bot-types";
import ConfigurationSection from "./components/configuration";
import BestPracticesSection from "./components/best-practices";
import TroubleshootingSection from "./components/troubleshooting";
import FaqSection from "./components/faq";

export default function GuideClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("getting-started");

  const tabs = [
    { id: "getting-started", label: tCommon("getting_started"), icon: Rocket },
    { id: "bot-types", label: t("bot_types"), icon: Bot },
    { id: "configuration", label: tCommon("configuration"), icon: Settings },
    { id: "best-practices", label: tCommon("best_practices"), icon: Lightbulb },
    { id: "troubleshooting", label: t("troubleshooting"), icon: Wrench },
    { id: "faq", label: tCommon("faq"), icon: CircleHelp },
  ];

  const masthead = (
    <div className="border-b border-border bg-card">
      <div className="mx-auto w-full px-4 container pt-header-clear pb-8">
        <div className="divide-y divide-border">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
            <Link
              href="/admin/ai/market-maker"
              className="flex items-center gap-1.5 rounded-sm text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ArrowLeft className="h-3 w-3" />
              {tCommon("back_to_dashboard")}
            </Link>
            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
            <span>{tCommon("documentation")}</span>
          </div>
          <PageHeader
            className="py-5"
            title={t("ai_market_maker_guide")}
            description={t("complete_documentation_for_ai_market_maker")}
            actions={
              <Button
                onClick={() => router.push("/admin/ai/market-maker/market/create")}
              >
                <Plus className="h-4 w-4" />
                {tCommon("create_market")}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );

  return (
    <PageShell ground="subtle" width="default" rhythm="lg" header={masthead}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList variant="underline" className="overflow-x-auto">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id}>
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="getting-started" className="mt-0">
          <GettingStartedSection />
        </TabsContent>
        <TabsContent value="bot-types" className="mt-0">
          <BotTypesSection />
        </TabsContent>
        <TabsContent value="configuration" className="mt-0">
          <ConfigurationSection />
        </TabsContent>
        <TabsContent value="best-practices" className="mt-0">
          <BestPracticesSection />
        </TabsContent>
        <TabsContent value="troubleshooting" className="mt-0">
          <TroubleshootingSection />
        </TabsContent>
        <TabsContent value="faq" className="mt-0">
          <FaqSection />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
