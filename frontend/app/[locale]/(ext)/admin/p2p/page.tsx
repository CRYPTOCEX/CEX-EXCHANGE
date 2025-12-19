"use client";
import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import {
  Users,
  BarChart3,
  Shield,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminOverviewChart } from "./components/admin-overview-chart";
import { AdminRecentActivity } from "./components/admin-recent-activity";
import { MetricCard } from "./components/metric-card";
import { useAdminDashboardStore } from "@/store/p2p/admin-dashboard-store";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion } from "framer-motion";

export default function AdminDashboardPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { stats, isLoadingStats, statsError, fetchStats } =
    useAdminDashboardStore();
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "P2P Trading",
          gradient: "from-blue-500/20 via-violet-500/20 to-blue-500/20",
          iconColor: "text-blue-500",
          textColor: "text-blue-600 dark:text-blue-400",
        }}
        title={[
          { text: "P2P " },
          {
            text: "Admin",
            gradient:
              "from-blue-600 via-violet-500 to-blue-600 dark:from-blue-400 dark:via-violet-400 dark:to-blue-400",
          },
          { text: " Dashboard" },
        ]}
        description="Monitor and manage your peer-to-peer trading platform"
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            {
              color: "#3b82f6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#8b5cf6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#3b82f6", "#8b5cf6"],
          size: 8,
        }}
        rightContent={
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/admin/p2p/offer">
              <Button className="bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg font-semibold">
                <DollarSign className="h-4 w-4 mr-2" />
                {t("manage_offers")}
              </Button>
            </Link>
            <Link href="/admin/p2p/trade">
              <Button
                variant="outline"
                className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {t("view_trades")}
              </Button>
            </Link>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">
                    {t("total_offers")}
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.totalOffers?.toLocaleString() || "0"}
                </p>
                {stats?.offerGrowth && (
                  <p className="text-xs text-green-500 mt-1">
                    +{stats.offerGrowth}% from yesterday
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">
                    {tExt("active_trades")}
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.activeTrades?.toLocaleString() || "0"}
                </p>
                {stats?.tradeGrowth && (
                  <p className="text-xs text-green-500 mt-1">
                    +{stats.tradeGrowth}% from last week
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <p className="text-sm text-muted-foreground">
                    {t("open_disputes")}
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.openDisputes?.toLocaleString() || "0"}
                </p>
                {stats?.disputeChange && (
                  <p className="text-xs text-amber-500 mt-1">
                    {stats.disputeChange}% from yesterday
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">
                    {t("platform_revenue")}
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.platformRevenue || "$0"}
                </p>
                {stats?.revenueGrowth && (
                  <p className="text-xs text-green-500 mt-1">
                    +{stats.revenueGrowth}% from last month
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-8">
        {statsError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-md bg-destructive/15 p-3 text-destructive"
          >
            <p>{statsError}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
        >
          <Card className="col-span-4 border-blue-500/20">
            <CardHeader>
              <CardTitle>{t("platform_activity")}</CardTitle>
              <CardDescription>
                {t("monthly_active_trades_volume_and_revenue")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <AdminOverviewChart />
            </CardContent>
          </Card>
          <Card className="col-span-3 border-blue-500/20">
            <CardHeader>
              <CardTitle>{tCommon("recent_activity")}</CardTitle>
              <CardDescription>
                {t("latest_platform_events_requiring_attention")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminRecentActivity />
            </CardContent>
            <CardFooter>
              <Link href="/admin/p2p/activity" className="w-full">
                <Button variant="outline" className="w-full">
                  {tExt("view_all_activity")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <Card className="border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {tCommon("pending_verifications")}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.pendingVerifications || "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("users_waiting_for_kyc_approval")}
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/admin/users?filter=pending" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  {t("review_verifications")}
                </Button>
              </Link>
            </CardFooter>
          </Card>
          <Card className="border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("flagged_trades")}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.flaggedTrades || "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("potentially_suspicious_activities")}
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/admin/trades?filter=flagged" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  {t("investigate_trades")}
                </Button>
              </Link>
            </CardFooter>
          </Card>
          <Card className="border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("system_health")}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.systemHealth || "0%"}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("platform_uptime_in_the_last_30_days")}
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/admin/settings/system" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  {t("view_system_status")}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
