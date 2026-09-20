"use client";
import { useEffect, useMemo } from "react";
import { useAdminStore } from "@/store/ico/admin/admin-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { RecentActivity } from "@/app/[locale]/(ext)/admin/ico/components/recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  DollarSign,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";

export default function AdminDashboard() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { stats, isLoading, error, fetchStats } = useAdminStore();
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {t("failed_to_load_admin_dashboard")}
              {error}
            </AlertDescription>
          </>
        </Alert>
      </div>
    );
  }
  // Helper to ensure numeric display even if stat is undefined
  const numOrZero = (value?: number) => value ?? 0;
  const formattedTotalRaised = useMemo(() => {
    const amount = stats?.totalRaised ?? 0;
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (amount >= 10_000) {
      return `$${(amount / 1_000).toFixed(2)}K`;
    }
    return `$${amount.toFixed(2)}`;
  }, [stats?.totalRaised]);
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {tCommon("admin_dashboard")}
          </h1>
          <p className="text-muted-foreground">
            {t("welcome_to_the_admin_dashboard")}.{" "}
            {t("monitor_platform_performance_and_manage_offerings")}.
          </p>
        </div>
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label={tExt("total_offerings")}
            value={numOrZero(stats?.totalOfferings)}
            icon={ListChecks}
            index={0}
            change={`+${numOrZero(stats?.offeringGrowth)}% ${tExt("from_last_month")}`}
            {...statsCardColors.purple}
          />
          <StatsCard
            label={tExt("pending_approval")}
            value={numOrZero(stats?.pendingOfferings)}
            icon={Clock}
            index={1}
            description={t("requires_your_attention")}
            {...statsCardColors.amber}
          />
          <StatsCard
            label={tExt("total_raised")}
            value={formattedTotalRaised}
            icon={DollarSign}
            index={2}
            change={`+${numOrZero(stats?.raiseGrowth)}% ${tExt("from_last_month")}`}
            {...statsCardColors.green}
          />
          <StatsCard
            label={tCommon("success_rate")}
            value={`${numOrZero(stats?.successRate)}%`}
            icon={BarChart3}
            index={3}
            change={`+${numOrZero(stats?.successRateGrowth)}% ${tExt("from_last_month")}`}
            {...statsCardColors.blue}
          />
        </div>
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle>{t("review_pending")}</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {numOrZero(stats?.pendingOfferings)}
                {t("offerings_awaiting_review")}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/admin/ico/offer/status/pending" className="w-full">
                <Button variant="secondary" className="w-full">
                  <span>{t("review_now")}</span>{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{tCommon('create_offer')}</CardTitle>
              <CardDescription>
                {t("launch_a_new_token_offering")}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/admin/ico/offer/create" className="w-full">
                <Button variant="outline" className="w-full">
                  {tCommon("create")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
        {/* Charts and Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>{t("offering_status")}</CardTitle>
              <CardDescription>
                {t("distribution_of_offerings_by_status")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{tCommon("active")}</div>
                      <div className="text-sm font-medium">
                        {numOrZero(stats?.activeOfferings)}
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${
                            stats?.totalOfferings
                              ? (numOrZero(stats.activeOfferings) /
                                  stats.totalOfferings) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  {/* Pending */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{tCommon("pending")}</div>
                      <div className="text-sm font-medium">
                        {numOrZero(stats?.pendingOfferings)}
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: `${
                            stats?.totalOfferings
                              ? (numOrZero(stats.pendingOfferings) /
                                  stats.totalOfferings) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  {/* Completed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{tCommon("completed")}</div>
                      <div className="text-sm font-medium">
                        {numOrZero(stats?.completedOfferings)}
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            stats?.totalOfferings
                              ? (numOrZero(stats.completedOfferings) /
                                  stats.totalOfferings) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  {/* Rejected */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{tCommon("rejected")}</div>
                      <div className="text-sm font-medium">
                        {numOrZero(stats?.rejectedOfferings)}
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{
                          width: `${
                            stats?.totalOfferings
                              ? (numOrZero(stats.rejectedOfferings) /
                                  stats.totalOfferings) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Recent Activity */}
          <RecentActivity activities={stats?.recentActivity} />
        </div>
      </div>
    </div>
  );
}
