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

export default function AdminDashboardPage() {
  const t = useTranslations("ext");
  const { stats, isLoadingStats, statsError, fetchStats } =
    useAdminDashboardStore();
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  return (
    <div className="flex flex-col gap-6" style={{ minHeight: 'calc(100vh - 232px)' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("admin_dashboard")}
        </h1>
      </div>
      {statsError && (
        <div className="rounded-md bg-destructive/15 p-3 text-destructive">
          <p>{statsError}</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Offers"
          value={stats?.totalOffers.toLocaleString() || "0"}
          change={stats?.offerGrowth || "0"}
          changeText="from yesterday"
          trend="up"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingStats}
        />
        <MetricCard
          title="Active Trades"
          value={stats?.activeTrades.toLocaleString() || "0"}
          change={stats?.tradeGrowth || "0"}
          changeText="from last week"
          trend="up"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingStats}
        />
        <MetricCard
          title="Open Disputes"
          value={stats?.openDisputes.toLocaleString() || "0"}
          change={stats?.disputeChange || "0"}
          changeText="from yesterday"
          trend="down"
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingStats}
        />
        <MetricCard
          title="Platform Revenue"
          value={stats?.platformRevenue || "$0"}
          change={stats?.revenueGrowth || "0"}
          changeText="from last month"
          trend="up"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingStats}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
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
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("recent_activity")}</CardTitle>
            <CardDescription>
              {t("latest_platform_events_requiring_attention")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminRecentActivity />
          </CardContent>
          <CardFooter>
            <Link href="/admin/p2p/activity" className="w-full">
              <Button variant="outline">{t("view_all_activity")}</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("pending_verifications")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
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
              <Button variant="outline" size="sm">
                {t("review_verifications")}
              </Button>
            </Link>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("flagged_trades")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
              <Button variant="outline" size="sm">
                {t("investigate_trades")}
              </Button>
            </Link>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("system_health")}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
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
              <Button variant="outline" size="sm">
                {t("view_system_status")}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
