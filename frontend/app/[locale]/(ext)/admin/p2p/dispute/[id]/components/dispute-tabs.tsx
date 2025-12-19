"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { EvidenceTab } from "./evidence-tab";
import { TimelineTab } from "./timeline-tab";
import { useTranslations } from "next-intl";

interface DisputeTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  dispute: any;
}

export function DisputeTabs({
  activeTab,
  setActiveTab,
  dispute,
}: DisputeTabsProps) {
  const t = useTranslations("common");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
        <TabsTrigger value="timeline">{t("timeline")}</TabsTrigger>
        <TabsTrigger value="evidence">{t('tokens')}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <OverviewTab dispute={dispute} />
      </TabsContent>

      <TabsContent value="timeline" className="space-y-4">
        <TimelineTab dispute={dispute} />
      </TabsContent>

      <TabsContent value="evidence" className="space-y-4">
        <EvidenceTab dispute={dispute} />
      </TabsContent>
    </Tabs>
  );
}
