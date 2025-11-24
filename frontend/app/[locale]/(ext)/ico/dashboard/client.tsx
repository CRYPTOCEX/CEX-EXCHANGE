"use client";

import { Suspense, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioOverview } from "./components/overview/portfolio-overview";
import { PerformanceChart } from "./components/overview/performance-chart";
import DashboardLoading from "./loading";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import IcoTransactionsPage from "./components/transaction";
import { useTranslations } from "next-intl";

export default function DashboardClientPage() {
  const t = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["overview", "transactions"];
  const [activeTab, setActiveTab] = useState(
    tabParam && validTabs.includes(tabParam) ? tabParam : "overview"
  );

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="container py-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("Dashboard")}</h1>
        <p className="text-muted-foreground max-w-3xl">
          {t("track_your_transactions_one_place")}.
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-8"
      >
        <TabsList className="border-b">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("Transactions")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          <Suspense fallback={<DashboardLoading />}>
            <PortfolioOverview />
          </Suspense>
          <Card>
            <CardHeader>
              <CardTitle>{t("portfolio_performance")}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <Suspense fallback={<DashboardLoading />}>
                <PerformanceChart />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="pb-20">
          <IcoTransactionsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
