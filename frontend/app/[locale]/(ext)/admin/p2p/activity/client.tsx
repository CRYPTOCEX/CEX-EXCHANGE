"use client";

import { useEffect, useState } from "react";
import { useAdminDashboardStore } from "@/store/p2p/admin-dashboard-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Info,
  Search,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

export function AdminActivityClient() {
  const t = useTranslations("ext");
  const { allActivity, isLoadingAllActivity, fetchAllActivity } =
    useAdminDashboardStore();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAllActivity();
  }, [fetchAllActivity]);

  const activities = Array.isArray(allActivity) ? allActivity : [];
  
  const filteredActivity = activities.filter((activity) => {
    if (filter !== "all" && activity.type !== filter) return false;
    if (
      searchQuery &&
      !activity.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !activity.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-5 w-5 text-blue-500" />;
      case "trade":
        return <ArrowUpDown className="h-5 w-5 text-green-500" />;
      case "dispute":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "payment":
        return <Shield className="h-5 w-5 text-indigo-500" />;
      case "security":
        return <Shield className="h-5 w-5 text-purple-500" />;
      case "system":
        return <Info className="h-5 w-5 text-gray-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("activity_log")}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("platform_activity")}</CardTitle>
          <CardDescription>
            {t("complete_log_of_all_platform_events_and_activities")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_activities")}</SelectItem>
                  <SelectItem value="user">{t("user_activities")}</SelectItem>
                  <SelectItem value="trade">{t("trade_activities")}</SelectItem>
                  <SelectItem value="dispute">{t("Disputes")}</SelectItem>
                  <SelectItem value="payment">{t("payment_activities")}</SelectItem>
                  <SelectItem value="security">
                    {t("security_events")}
                  </SelectItem>
                  <SelectItem value="system">{t("system_events")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t("All")}</TabsTrigger>
              <TabsTrigger value="critical">{t("Critical")}</TabsTrigger>
              <TabsTrigger value="warnings">{t("Warnings")}</TabsTrigger>
              <TabsTrigger value="info">{t("Informational")}</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {isLoadingAllActivity ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : filteredActivity.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-lg border">
                  <p className="text-muted-foreground">
                    {t("no_activities_found")}
                  </p>
                </div>
              ) : (
                filteredActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.title}</p>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(activity.status)}
                          <span className="text-xs text-muted-foreground">
                            {activity.createdAt}
                          </span>
                        </div>
                      </div>
                      {activity.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                      {activity.user && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-6 w-6 overflow-hidden rounded-full">
                            <img
                              src={activity.user.avatar || "/placeholder.svg"}
                              alt={`${activity.user.firstName} ${activity.user.lastName}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {activity.user.firstName} {activity.user.lastName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="critical" className="space-y-4">
              {/* Critical events would be filtered here */}
              <div className="flex h-40 items-center justify-center rounded-lg border">
                <p className="text-muted-foreground">
                  {t("no_critical_events_found")}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="warnings" className="space-y-4">
              {/* Warning events would be filtered here */}
              <div className="flex h-40 items-center justify-center rounded-lg border">
                <p className="text-muted-foreground">
                  {t("no_warnings_found")}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              {/* Info events would be filtered here */}
              <div className="flex h-40 items-center justify-center rounded-lg border">
                <p className="text-muted-foreground">
                  {t("no_informational_events_found")}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
