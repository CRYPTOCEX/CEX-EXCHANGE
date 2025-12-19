"use client";

import { Suspense, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioOverview } from "./components/overview/portfolio-overview";
import { PerformanceChart } from "./components/overview/performance-chart";
import DashboardLoading from "./loading";
import { useTranslations } from "next-intl";
import { Sparkles, Wallet, TrendingUp, Rocket } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { usePortfolioStore } from "@/store/ico/portfolio/portfolio-store";
import { formatCurrency } from "@/lib/ico/utils";
import { motion } from "framer-motion";
export default function DashboardClientPage() {
  const t = useTranslations("ext_ico");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { portfolio, fetchPortfolio } = usePortfolioStore();

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: t("portfolio_dashboard"),
          gradient: "from-teal-500/10 to-cyan-500/10",
          iconColor: "text-teal-500",
          textColor: "text-teal-600 dark:text-teal-400",
        }}
        title={[
          { text: tExt("your") + " " },
          { text: t("portfolio"), gradient: "from-teal-600 via-cyan-500 to-teal-600 dark:from-teal-400 dark:via-cyan-400 dark:to-teal-400" },
        ]}
        description={t("track_your_ico_investments_and_portfolio_performance")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="default"
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
              icon: Wallet,
              label: tCommon("total_invested"),
              value: portfolio ? formatCurrency(portfolio.totalInvested) : "$0.00",
              iconColor: "text-teal-500",
              iconBgColor: "bg-teal-500/10",
            },
            {
              icon: TrendingUp,
              label: tExt("current_value"),
              value: portfolio ? formatCurrency(portfolio.currentValue) : "$0.00",
              iconColor: "text-cyan-500",
              iconBgColor: "bg-cyan-500/10",
            },
            {
              icon: Rocket,
              label: tCommon("active_investments"),
              value: portfolio ? (portfolio as any).activeInvestments : 0,
              iconColor: "text-teal-500",
              iconBgColor: "bg-teal-500/10",
            },
          ]}
        />
      </HeroSection>

      {/* Dashboard Content */}
      <div className="container mx-auto py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Suspense fallback={<DashboardLoading />}>
            <PortfolioOverview />
          </Suspense>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
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
        </motion.div>
      </div>
    </div>
  );
}
