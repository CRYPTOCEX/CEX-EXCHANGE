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
  Sparkles,
  Rocket,
  TrendingUp,
  Users,
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
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { motion } from "framer-motion";
export default function CreatorDashboardClient() {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ["overview", "tokens", "investors"];
  const initialTab =
    searchParams.get("tab") && validTabs.includes(searchParams.get("tab")!)
      ? searchParams.get("tab")!
      : "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);

  // MUST call all hooks before any conditional returns
  const { tokens, fetchTokens, stats } = useCreatorStore();

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
      <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
        {/* Hero Section */}
        <HeroSection
          badge={{
            icon: <Sparkles className="h-3.5 w-3.5" />,
            text: tExt("creator_dashboard"),
            gradient: "from-teal-500/10 to-cyan-500/10",
            iconColor: "text-teal-600",
            textColor: "text-teal-600 dark:text-teal-400",
          }}
          title={[
            { text: t("launch_your") + " " },
            { text: t("first_token"), gradient: "from-teal-600 via-cyan-500 to-teal-600 dark:from-teal-400 dark:via-cyan-400 dark:to-teal-400" },
          ]}
          description={t("create_and_launch_our_platform") + ". " + t("we_provide_the_you_succeed")}
          paddingTop="pt-24"
          paddingBottom="pb-12"
          layout="centered"
          background={{
            orbs: [
              {
                color: "#14b8a6",
                position: { top: "-10rem", right: "-10rem" },
                size: "20rem",
              },
              {
                color: "#06b6d4",
                position: { bottom: "-5rem", left: "-5rem" },
                size: "15rem",
              },
            ],
          }}
          particles={{
            count: 6,
            type: "floating",
            colors: ["#14b8a6", "#06b6d4"],
            size: 8,
          }}
        >
          <Link href="/ico/creator/launch">
            <Button
              size="lg"
              className={"bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg"}
            >
              <Plus className="mr-2 h-5 w-5" />
              {t("create_token_offering")}
            </Button>
          </Link>
        </HeroSection>

        {/* Steps Section */}
        <div className="container mx-auto py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <Card className={"border-teal-500/20 hover:border-teal-500/40 transition-colors"}>
              <CardHeader className="text-center">
                <div className={"mx-auto bg-teal-500/10 h-16 w-16 rounded-2xl flex items-center justify-center mb-4"}>
                  <FileText className={"h-8 w-8 text-teal-500"} />
                </div>
                <CardTitle className="text-xl">{tCommon("create")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                {t("define_your_token_details_team_and_roadmap")}
              </CardContent>
            </Card>
            <Card className={"border-cyan-500/20 hover:border-cyan-500/40 transition-colors"}>
              <CardHeader className="text-center">
                <div className={"mx-auto bg-cyan-500/10 h-16 w-16 rounded-2xl flex items-center justify-center mb-4"}>
                  <DollarSign className={"h-8 w-8 text-cyan-500"} />
                </div>
                <CardTitle className="text-xl">{t("launch")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                {t("set_your_offering_parameters_and_go_live")}
              </CardContent>
            </Card>
            <Card className={"border-teal-500/20 hover:border-teal-500/40 transition-colors"}>
              <CardHeader className="text-center">
                <div className={"mx-auto bg-teal-500/10 h-16 w-16 rounded-2xl flex items-center justify-center mb-4"}>
                  <BarChart3 className={"h-8 w-8 text-teal-500"} />
                </div>
                <CardTitle className="text-xl">{tCommon("manage")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                {t("track_performance_and_engage_with_investors")}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: tExt("creator_dashboard"),
          gradient: "from-teal-500/10 to-cyan-500/10",
          iconColor: "text-teal-600",
          textColor: "text-teal-600 dark:text-teal-400",
        }}
        title={[
          { text: tExt("creator") + " " },
          { text: tCommon("dashboard"), gradient: "from-teal-600 via-cyan-500 to-teal-600 dark:from-teal-400 dark:via-cyan-400 dark:to-teal-400" },
        ]}
        description={t("manage_your_token_investor_activity")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        rightContent={
          <Link href="/ico/creator/launch">
            <Button
              size="lg"
              className={"bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg"}
            >
              <Plus className="mr-2 h-5 w-5" />
              {tCommon("create_new_token")}
            </Button>
          </Link>
        }
        background={{
          orbs: [
            {
              color: "#14b8a6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#06b6d4",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#14b8a6", "#06b6d4"],
          size: 8,
        }}
      >
        <StatsGroup
          stats={[
            {
              icon: DollarSign,
              label: tExt("total_raised"),
              value: `$${stats.totalRaised.toLocaleString()}`,
              iconColor: "text-teal-600",
              iconBgColor: "bg-teal-600/10",
            },
            {
              icon: Rocket,
              label: tCommon('active_offers'),
              value: stats.activeOfferings,
              iconColor: "text-cyan-500",
              iconBgColor: "bg-cyan-500/10",
            },
            {
              icon: TrendingUp,
              label: tCommon("success_rate"),
              value: `${stats.successRate}%`,
              iconColor: "text-teal-600",
              iconBgColor: "bg-teal-600/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8 space-y-8">
        {hasPendingTokens && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Alert className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-800 dark:text-yellow-400" />
              <AlertTitle>{tExt("pending_approval")}</AlertTitle>
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
          </motion.div>
        )}

        {/* Detailed Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CreatorStats />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          ref={tabsRef}
        >
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="overview">{tCommon("overview")}</TabsTrigger>
              <TabsTrigger value="tokens">{t("my_tokens")}</TabsTrigger>
              <TabsTrigger value="investors">{t("investors")}</TabsTrigger>
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
        </motion.div>
      </div>
    </div>
  );
}
