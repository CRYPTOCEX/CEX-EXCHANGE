"use client";

import { useEffect, useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  BarChart3,
  DollarSign,
  FileText,
  Plus,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { CreatorTokensList } from "@/app/[locale]/(ext)/ico/creator/components/tokens-list";
import { CreatorInvestorsList } from "@/app/[locale]/(ext)/ico/creator/components/investors-list";
import { CreatorStats } from "@/app/[locale]/(ext)/ico/creator/components/stats";
import { useCreatorStore } from "@/store/ico/creator/creator-store";
import { CreatorPerformanceChart } from "@/app/[locale]/(ext)/ico/creator/components/performance-chart";
import { NotificationsCard } from "@/app/[locale]/(dashboard)/user/notification/components";
import { useTranslations } from "next-intl";

export default function CreatorDashboardClient() {
  const t = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ["overview", "tokens", "investors"];
  const initialTab =
    searchParams.get("tab") && validTabs.includes(searchParams.get("tab")!)
      ? searchParams.get("tab")!
      : "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);

  const { tokens, fetchTokens } = useCreatorStore();

  // Only fetch tokens on mount, no stats here
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const hasActiveTokens = tokens.active.length > 0;
  const hasPendingTokens = tokens.pending.length > 0;

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab && validTabs.includes(currentTab)) {
      setActiveTab(currentTab);

      // Scroll to tabs section if navigating from alert
      if (searchParams.get("status")) {
        setTimeout(() => {
          tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [searchParams]);

  if (!hasActiveTokens && !hasPendingTokens) {
    return (
      <div className="container py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">{t("launch_your_first_token")}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("create_and_launch_our_platform")}.{" "}
            {t("we_provide_the_you_succeed")}.
          </p>
          <div className="pt-4">
            <Link href="/ico/creator/launch">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                {t("create_token_offering")}
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center mb-2">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t("Create")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                {t("define_your_token_details_team_and_roadmap")}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center mb-2">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t("Launch")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                {t("set_your_offering_parameters_and_go_live")}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center mb-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t("Manage")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                {t("track_performance_and_engage_with_investors")}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("creator_dashboard")}
          </h1>
          <p className="text-muted-foreground">
            {t("manage_your_token_investor_activity")}
          </p>
        </div>
        <Link href="/ico/creator/launch">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("create_new_token")}
          </Button>
        </Link>
      </div>

      {hasPendingTokens && (
        <Alert className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-800 dark:text-yellow-400" />
          <AlertTitle>{t("pending_approval")}</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span>
              {t("you_have_token_offerings_awaiting_approval")}.{" "}
              {t("our_team_is_reviewing_your_submission")}.
            </span>
            <Link href="/ico/creator?tab=tokens&status=pending">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
              >
                {t("view_pending_tokens")}
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Just read stats from store; do NOT call fetchStats here */}
      <CreatorStats />

      <div ref={tabsRef}>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6 pb-20"
        >
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="tokens">{t("my_tokens")}</TabsTrigger>
          <TabsTrigger value="investors">{t("Investors")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CreatorPerformanceChart />
            </div>
            <NotificationsCard filterType="ico" />
          </div>
        </TabsContent>

        <TabsContent value="tokens">
          <CreatorTokensList />
        </TabsContent>

        <TabsContent value="investors">
          <CreatorInvestorsList />
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
