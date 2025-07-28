import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuideHeader } from "./components/guide-header";
import { OverviewTab } from "./components/overview-tab";
import { BuyersTab } from "./components/buyers-tab";
import { SellersTab } from "./components/sellers-tab";
import { SafetyTab } from "./components/safety-tab";
import { useTranslations } from "next-intl";

export default function GuidePage() {
  const t = useTranslations("ext");
  return (
    <div className="container mx-auto py-8 px-4">
      <GuideHeader
        title="P2P Trading Guide"
        description="Learn how to safely trade cryptocurrencies on our P2P platform with this comprehensive guide."
      />

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
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
    </div>
  );
}
