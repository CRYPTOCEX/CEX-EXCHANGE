"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { EvidenceTab } from "./evidence-tab";
import { MessagesTab } from "./messages-tab";
import { TradeDetailsTab } from "./trade-details-tab";
import { useTranslations } from "next-intl";

interface DisputeTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  dispute: any;
  messageText: string;
  setMessageText: (value: string) => void;
  handleSendMessage: () => Promise<void>;
}

export function DisputeTabs({
  activeTab,
  setActiveTab,
  dispute,
  messageText,
  setMessageText,
  handleSendMessage,
}: DisputeTabsProps) {
  const t = useTranslations("ext");
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
        <TabsTrigger value="evidence">{t("Evidence")}</TabsTrigger>
        <TabsTrigger value="messages">{t("Messages")}</TabsTrigger>
        <TabsTrigger value="trade">{t("trade_details")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <OverviewTab dispute={dispute} />
      </TabsContent>

      <TabsContent value="evidence" className="space-y-4">
        <EvidenceTab dispute={dispute} />
      </TabsContent>

      <TabsContent value="messages" className="space-y-4">
        <MessagesTab
          dispute={dispute}
          messageText={messageText}
          setMessageText={setMessageText}
          handleSendMessage={handleSendMessage}
        />
      </TabsContent>

      <TabsContent value="trade" className="space-y-4">
        <TradeDetailsTab dispute={dispute} />
      </TabsContent>
    </Tabs>
  );
}
