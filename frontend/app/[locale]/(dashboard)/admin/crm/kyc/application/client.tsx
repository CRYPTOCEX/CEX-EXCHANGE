"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  XCircle,
  CalendarIcon,
  BarChart3,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

// Define the ApplicationStatus type
type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";

// Define the ApplicationWithDetails type
type ApplicationWithDetails = {
  id: string;
  status: ApplicationStatus;
  data: any;
  adminNotes: string;
  createdAt?: string;
  reviewedAt?: string;
  level: any;
  user: any;
};

export default function ApplicationsClient() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string; }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    infoRequired: 0,
    completionRate: 0,
    averageProcessingTime: 0,
  });
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    perPage: perPage,
    totalPages: 1,
  });
  const [mounted, setMounted] = useState(false);

  // Handle mounting state to prevent SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch applications and levels whenever filters, sorting, or pagination change.
  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoading(true);
      try {
        // Build query parameters for the listing endpoint
        const queryParams = new URLSearchParams();
        queryParams.set("page", page.toString());
        queryParams.set("perPage", perPage.toString());

        // Set sort fields based on sortBy
        if (sortBy === "newest") {
          queryParams.set("sortField", "createdAt");
          queryParams.set("sortOrder", "desc");
        } else if (sortBy === "oldest") {
          queryParams.set("sortField", "createdAt");
          queryParams.set("sortOrder", "asc");
        } else if (sortBy === "status") {
          queryParams.set("sortField", "status");
          queryParams.set("sortOrder", "asc");
        } else if (sortBy === "verificationType") {
          queryParams.set("sortField", "level.verificationService.name");
          queryParams.set("sortOrder", "asc");
        }

        // Build filter object based on current selections
        const filterObj: Record<string, any> = {};
        if (statusFilter !== "all") {
          filterObj.status = statusFilter;
        }
        if (levelFilter !== "all") {
          filterObj.levelId = levelFilter;
        }
        if (verificationFilter !== "all") {
          if (verificationFilter === "service") {
            filterObj["level.verificationService"] = {
              operator: "notEqual",
              value: null,
            };
          } else if (verificationFilter === "manual") {
            filterObj["level.verificationService"] = null;
          }
        }
        if (Object.keys(filterObj).length > 0) {
          queryParams.set("filter", JSON.stringify(filterObj));
        }

        // Fetch applications using $fetch
        const { data, error } = await $fetch({
          url: `/api/admin/crm/kyc/application?${queryParams.toString()}`,
          silentSuccess: true,
        });
        if (!error) {
          const { items, pagination } = data;
          setApplications(Array.isArray(items) ? items : []);
          setPagination(pagination);
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplications();
  }, [statusFilter, levelFilter, verificationFilter, sortBy, page]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/crm/kyc/application/analytics",
          silentSuccess: true,
        });
        if (!error) setStats(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };
    const fetchLevels = async () => {
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/crm/kyc/level/options",
          silentSuccess: true,
        });
        setLevels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching levels:", error);
      }
    };
    fetchAnalytics();
    fetchLevels();
  }, []);

  // Client-side search filtering (this only filters within the current page)
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          app.id?.toLowerCase().includes(query) ||
          app.user?.firstName?.toLowerCase().includes(query) ||
          app.user?.lastName?.toLowerCase().includes(query) ||
          app.user?.email?.toLowerCase().includes(query) ||
          app.level?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [applications, searchQuery]);

  // Get applications by tab (using the status property)
  const getApplicationsByTab = (tab: string) => {
    if (tab === "all") return filteredApplications;
    return filteredApplications.filter(
      (app) => app.status === tab.toUpperCase()
    );
  };
  const currentApplications = getApplicationsByTab(activeTab);

  // Handle view application - navigates to the detail page
  const handleViewApplication = (id: string) => {
    router.push(`/admin/crm/kyc/application/${id}`);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
    switch (status) {
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center gap-1 px-2 py-1"
          >
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 flex items-center gap-1 px-2 py-1"
          >
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      case "ADDITIONAL_INFO_REQUIRED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1 px-2 py-1"
          >
            <AlertCircle className="h-3 w-3 mr-1" /> {tCommon("info_required")}
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 flex items-center gap-1 px-2 py-1"
          >
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            KYC Applications
          </h1>
          <p className="text-muted-foreground">
            {t("manage_and_review_verification_applications")}
          </p>
        </div>
        <Button
          className="md:w-auto"
          onClick={() => router.push("/admin/crm/kyc/level")}
        >
          <Shield className="mr-2 h-4 w-4" /> KYC Levels
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tCommon("total_applications")}
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Layers className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={100} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tCommon("pending_review")}
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.pending}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={
                  stats.total > 0 ? (stats.pending / stats.total) * 100 : 0
                }
                className="h-1 bg-yellow-100 dark:bg-yellow-900/30"
                indicatorClassName="bg-yellow-500 dark:bg-yellow-400"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.total > 0
                  ? Math.round((stats.pending / stats.total) * 100)
                  : 0}
                % {t("of_total_applications")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approved
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.approved}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={
                  stats.total > 0 ? (stats.approved / stats.total) * 100 : 0
                }
                className="h-1 bg-green-100 dark:bg-green-900/30"
                indicatorClassName="bg-green-500 dark:bg-green-400"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.total > 0
                  ? Math.round((stats.approved / stats.total) * 100)
                  : 0}
                % {tCommon("approval_rate")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tCommon("processing_time")}
                </p>
                <h3 className="text-3xl font-bold mt-1">
                  {stats.averageProcessingTime.toFixed(1)}h
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={Math.min(100, (stats.averageProcessingTime / 24) * 100)}
                className="h-1 bg-blue-100 dark:bg-blue-900/30"
                indicatorClassName="bg-blue-500 dark:bg-blue-400"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {tCommon("average_time_to_process_applications")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="shrink-0 flex flex-col gap-4">
        <Input
          placeholder={t("search_applications_users_or_levels_ellipsis")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon="mdi:magnify"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 shrink-0" />
                <span className="truncate">Status</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all_statuses")}</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ADDITIONAL_INFO_REQUIRED">
                {tCommon("info_required")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                <span className="truncate">Level</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all_levels")}</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={verificationFilter}
            onValueChange={setVerificationFilter}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">Verification</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all_verification_types")}</SelectItem>
              <SelectItem value="service">{tCommon("service_verification")}</SelectItem>
              <SelectItem value="manual">{tCommon("manual_verification")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 shrink-0" />
                <span className="truncate">{tCommon("sort_by")}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{tCommon("newest_first")}</SelectItem>
              <SelectItem value="oldest">{tCommon("oldest_first")}</SelectItem>
              <SelectItem value="status">{tCommon("by_status")}</SelectItem>
              <SelectItem value="verificationType">
                {tCommon("by_verification_type")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs and Applications List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-16 z-20 bg-background pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
          <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <span className="hidden md:inline">{tCommon("all_applications")}</span>
            <span className="md:hidden">All</span>
            <Badge variant="secondary">{filteredApplications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="flex items-center gap-2">
            <span className="hidden md:inline">Pending</span>
            <span className="md:hidden">Pending</span>
            <Badge variant="secondary">
              {
                filteredApplications.filter((app) => app.status === "PENDING")
                  .length
              }
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="flex items-center gap-2">
            <span className="hidden md:inline">Approved</span>
            <span className="md:hidden">Approved</span>
            <Badge variant="secondary">
              {
                filteredApplications.filter((app) => app.status === "APPROVED")
                  .length
              }
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" className="flex items-center gap-2">
            <span className="hidden md:inline">Rejected</span>
            <span className="md:hidden">Rejected</span>
            <Badge variant="secondary">
              {
                filteredApplications.filter((app) => app.status === "REJECTED")
                  .length
              }
            </Badge>
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-4 min-h-[60vh]">
          {currentApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">{tCommon("no_applications_found")}</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                  {t("no_applications_match_your_current_filters_1")} {t("try_adjusting_your_search_criteria_or_filters_1")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setLevelFilter("all");
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {tCommon("reset_filters")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
                {currentApplications.map((app) => {
                  return (
                    <Card
                      key={app.id}
                      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewApplication(app.id)}
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage
                                  src={
                                    app.user?.avatar || "/img/placeholder.svg"
                                  }
                                  alt={app.user?.firstName || "User Avatar"}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {app.user?.firstName?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-lg">
                                  {app.user?.firstName} {app.user?.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {app.user?.email || "No email available"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={app.status} />
                              <Badge
                                variant="outline"
                                className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border-primary/20 dark:border-primary/30 flex items-center gap-1"
                              >
                                <Layers className="h-3 w-3 mr-1" />
                                {app.level?.name || "Unknown"}
                              </Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {app.level?.verificationService ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                                      >
                                        <ShieldCheck className="h-3 w-3 mr-1" />{" "}
                                        {app.level.verificationService.name}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 flex items-center gap-1"
                                      >
                                        <ShieldOff className="h-3 w-3 mr-1" />{" "}
                                        Manual
                                      </Badge>
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {app.level?.verificationService
                                      ? `Verified by ${app.level.verificationService.name} service`
                                      : "Manual verification by admin"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                {tCommon("application_id")}
                              </p>
                              <p className="text-sm font-mono mt-1">{app.id}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Submitted
                              </p>
                              <p className="text-sm mt-1 flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(app.createdAt ?? ""), "PPP p")}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Reviewed
                              </p>
                              <p className="text-sm mt-1 flex items-center gap-1">
                                {app.reviewedAt ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    {format(new Date(app.reviewedAt), "PPP p")}
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 text-yellow-500" />
                                    {tCommon("not_reviewed_yet")}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {app.adminNotes && (
                            <div className="mt-4 bg-muted/50 dark:bg-muted/20 p-3 rounded-md border border-muted dark:border-muted/40">
                              <p className="text-sm font-medium text-foreground">{tCommon("admin_notes")}</p>
                              <p className="text-sm mt-1 text-muted-foreground">{app.adminNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
