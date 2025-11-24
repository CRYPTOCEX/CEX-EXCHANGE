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

export default function AdminDashboard() {
  const t = useTranslations("ext");
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
    <div className="container pb-40 pt-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("admin_dashboard")}
          </h1>
          <p className="text-muted-foreground">
            {t("welcome_to_the_admin_dashboard")}.{" "}
            {t("monitor_platform_performance_and_manage_offerings")}.
          </p>
        </div>
        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Offerings */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("total_offerings")}
              </CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {numOrZero(stats?.totalOfferings)}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-4 w-28 mt-1" />
                ) : (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span>
                      +{numOrZero(stats?.offeringGrowth)}
                      {t("%_from_last_month")}
                    </span>
                  </span>
                )}
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-primary/40 to-primary"></div>
          </Card>
          {/* Pending Approval */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("pending_approval")}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {numOrZero(stats?.pendingOfferings)}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-4 w-28 mt-1" />
                ) : (
                  <span>{t("requires_your_attention")}</span>
                )}
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-yellow-500/40 to-yellow-500"></div>
          </Card>
          {/* Total Raised */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("total_raised")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">{formattedTotalRaised}</div>
              )}
              <div className="text-xs text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-4 w-28 mt-1" />
                ) : (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span>
                      +{numOrZero(stats?.raiseGrowth)}
                      {t("%_from_last_month")}
                    </span>
                  </span>
                )}
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-green-500/40 to-green-500"></div>
          </Card>
          {/* Success Rate */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("success_rate")}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {numOrZero(stats?.successRate)}%
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-4 w-28 mt-1" />
                ) : (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span>
                      +{numOrZero(stats?.successRateGrowth)}
                      {t("%_from_last_month")}
                    </span>
                  </span>
                )}
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500/40 to-blue-500"></div>
          </Card>
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
              <CardTitle>{t("create_offering")}</CardTitle>
              <CardDescription>
                {t("launch_a_new_token_offering")}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/admin/ico/offer/create" className="w-full">
                <Button variant="outline" className="w-full">
                  {t("Create")}
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
                      <div className="text-sm">{t("Active")}</div>
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
                      <div className="text-sm">{t("Pending")}</div>
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
                      <div className="text-sm">{t("Completed")}</div>
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
                      <div className="text-sm">{t("Rejected")}</div>
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
