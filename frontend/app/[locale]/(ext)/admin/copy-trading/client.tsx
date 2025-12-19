"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  BarChart3,
  Settings,
  Loader2,
  ArrowRight,
  CheckCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion } from "framer-motion";

interface DashboardData {
  stats: {
    leaders: { total: number; active: number; pending: number; suspended: number };
    followers: { total: number; active: number; paused: number };
    totalAllocated: number;
    platformRevenue: number;
    todaysTrades: number;
    todaysVolume: number;
  };
  pendingApplications: Array<{
    id: string;
    displayName: string;
    userId: string;
    createdAt: string;
    user?: { firstName?: string; lastName?: string; email?: string };
  }>;
  recentActivity: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    oldValue: any;
    newValue: any;
    reason?: string;
    createdAt: string;
    user?: { id: string; firstName: string; lastName: string };
    admin?: { id: string; firstName: string; lastName: string };
  }>;
}

export default function DashboardClient() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatActivityMessage = (activity: DashboardData['recentActivity'][0]) => {
    const actor = activity.admin
      ? `${activity.admin.firstName} ${activity.admin.lastName}`
      : activity.user
      ? `${activity.user.firstName} ${activity.user.lastName}`
      : "System";

    const entityType = activity.entityType.toLowerCase();

    switch (activity.action) {
      case "APPROVE":
        return `${actor} approved a ${entityType} application`;
      case "REJECT":
        return `${actor} rejected a ${entityType} application`;
      case "SUSPEND":
        return `${actor} suspended a ${entityType}`;
      case "ACTIVATE":
        return `${actor} activated a ${entityType}`;
      case "CREATE":
        return `${actor} created a new ${entityType}`;
      case "FOLLOW":
        return `${actor} started following a leader`;
      case "UNFOLLOW":
        return `${actor} stopped following a leader`;
      case "UPDATE":
        // Try to be more specific about what was updated
        if (activity.reason) {
          return `${actor} ${activity.reason.toLowerCase()}`;
        }
        if (activity.oldValue && activity.newValue) {
          try {
            const oldVal = typeof activity.oldValue === 'string' ? JSON.parse(activity.oldValue) : activity.oldValue;
            const newVal = typeof activity.newValue === 'string' ? JSON.parse(activity.newValue) : activity.newValue;

            if (oldVal.isPublic !== undefined && newVal.isPublic !== undefined) {
              return `${actor} ${newVal.isPublic ? 'made public' : 'made private'} a ${entityType}`;
            }
            if (oldVal.status && newVal.status) {
              return `${actor} changed ${entityType} status to ${newVal.status.toLowerCase()}`;
            }
            if (oldVal.symbol || newVal.symbol) {
              const symbol = oldVal.symbol || newVal.symbol;
              const isActive = newVal.isActive !== undefined ? newVal.isActive : true;
              return `${actor} ${isActive ? 'enabled' : 'disabled'} ${symbol} market`;
            }
          } catch (e) {
            // Fall through to default
          }
        }
        return `${actor} updated a ${entityType}`;
      case "DELETE":
        return `${actor} deleted a ${entityType}`;
      default:
        return `${actor} performed ${activity.action.toLowerCase()} on ${entityType}`;
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: result } = await $fetch({
          url: "/api/admin/copy-trading",
          method: "GET",
          silent: true,
        });
        setData(result);
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    leaders: {
      total: data?.stats?.leaders?.total ?? 0,
      active: data?.stats?.leaders?.active ?? 0,
      pending: data?.stats?.leaders?.pending ?? 0,
      suspended: data?.stats?.leaders?.suspended ?? 0,
    },
    followers: {
      total: data?.stats?.followers?.total ?? 0,
      active: data?.stats?.followers?.active ?? 0,
      paused: data?.stats?.followers?.paused ?? 0,
    },
    totalAllocated: data?.stats?.totalAllocated ?? 0,
    platformRevenue: data?.stats?.platformRevenue ?? 0,
    todaysTrades: data?.stats?.todaysTrades ?? 0,
    todaysVolume: data?.stats?.todaysVolume ?? 0,
  };

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Copy Trading",
          gradient: "from-indigo-500/20 via-violet-500/20 to-indigo-500/20",
          iconColor: "text-indigo-500",
          textColor: "text-indigo-600 dark:text-indigo-400",
        }}
        title={[
          { text: "Copy Trading " },
          {
            text: "Admin",
            gradient: "from-indigo-600 via-violet-500 to-indigo-600 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400",
          },
        ]}
        description={t("manage_leaders_followers_and_platform_settings")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            {
              color: "#6366f1",
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
          colors: ["#6366f1", "#8b5cf6"],
          size: 8,
        }}
        rightContent={
          <div className="flex gap-2">
            <Link href="/admin/copy-trading/leader">
              <Button className="bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg font-semibold">
                <Users className="h-4 w-4 mr-2" />
                {t("manage_leaders")}
              </Button>
            </Link>
            <Link href="/admin/copy-trading/settings">
              <Button
                variant="outline"
                className="border-indigo-500/50 text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        }
        bottomSlot={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur border-indigo-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <p className="text-sm text-muted-foreground">{t("total_leaders")}</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.leaders.total}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {stats.leaders.active} active
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-violet-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-violet-500" />
                  <p className="text-sm text-muted-foreground">{tExt("active_followers")}</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.followers.active}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.followers.total} total
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-indigo-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">{tExt("total_allocated")}</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${stats.totalAllocated.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-violet-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">{t("platform_revenue")}</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.platformRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <Users className="h-4 w-4" />
                <span>{t("total_leaders")}</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.leaders.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span>{t("active_leaders")}</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.leaders.active}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.leaders.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <Activity className="h-4 w-4" />
                <span>{tExt("active_followers")}</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.followers.active}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span>{tExt("total_allocated")}</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                ${stats.totalAllocated.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>{t("platform_revenue")}</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${stats.platformRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pending Applications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("pending_applications")}</CardTitle>
              <Link href="/admin/copy-trading/leader?status=PENDING">
                <Button variant="ghost" size="sm">
                  {tCommon("view_all")} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {data?.pendingApplications && data.pendingApplications.length > 0 ? (
                <div className="space-y-3">
                  {data.pendingApplications.slice(0, 5).map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{app.displayName}</div>
                        <div className="text-sm text-zinc-500">
                          {app.user?.email || "No email"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/admin/copy-trading/leader/${app.id}`}>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  {tCommon("no_pending_applications")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{tCommon("recent_activity")}</CardTitle>
              <Link href="/admin/copy-trading/audit">
                <Button variant="ghost" size="sm">
                  {tCommon("view_all")} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {data.recentActivity.slice(0, 5).map((activity) => {
                    const message = formatActivityMessage(activity);
                    const icon = activity.action === "APPROVE" || activity.action === "ACTIVATE" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : activity.action === "REJECT" || activity.action === "SUSPEND" || activity.action === "DELETE" ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : activity.action === "FOLLOW" ? (
                      <UserCheck className="h-5 w-5 text-blue-500" />
                    ) : activity.action === "CREATE" ? (
                      <Sparkles className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <Activity className="h-5 w-5 text-zinc-500" />
                    );

                    return (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex-shrink-0">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {message}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  {tExt("no_recent_activity")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/copy-trading/leader">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">{t("manage_leaders")}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/copy-trading/follower">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <UserCheck className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">{t("manage_followers")}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/copy-trading/trade">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">{t("view_trades")}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/copy-trading/settings">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">{t("platform_settings")}</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
