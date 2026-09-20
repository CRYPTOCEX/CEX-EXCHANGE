"use client";

import { useEffect, useState, useMemo } from "react";
import { useLevelBuilderStore } from "@/store/level-builder-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonText } from "@/components/ui/skeleton";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Grid,
  List,
  Search,
  CheckCircle,
  Filter,
  ArrowUpDown,
  Shield,
  Layers,
  Clock,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

/** Fill for a tone, for the card's status rule — the pill itself uses `tone`. */
const TONE_BAR: Record<BadgeTone, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted",
};

// Define the analytics data interface
interface AnalyticsData {
  totalUsers: number;
  verifiedUsers: number;
  pendingVerifications: number;
  rejectedVerifications: number;
  completionRates: {
    level: number;
    name: string;
    rate: number;
    users: number;
  }[];
}
export default function LevelsClient() {
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const router = useRouter();
  const { toast } = useToast();
  const {
    levels,
    isLoading,
    error,
    fetchLevels,
    deleteLevel,
    bulkActivateLevels,
    bulkDeactivateLevels,
    bulkDeleteLevels,
  } = useLevelBuilderStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("level");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [levelRange, setLevelRange] = useState<[number, number]>([1, 10]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [bulkConfirmModalOpen, setBulkConfirmModalOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<string | null>(
    null
  );
  useEffect(() => {
    // Fetch levels and analytics data
    fetchLevels();
    fetchAnalyticsData();
  }, [fetchLevels]);
  const fetchAnalyticsData = async () => {
    setIsLoadingAnalytics(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/crm/kyc/level/analytics",
        silentSuccess: true,
      });
      if (!error) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setAnalyticsData({
        totalUsers: 0,
        verifiedUsers: 0,
        pendingVerifications: 0,
        rejectedVerifications: 0,
        completionRates: [],
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  };
  const handleDeleteLevel = async (id: string) => {
    setLevelToDelete(id);
    setIsDeleteModalOpen(true);
  };
  const confirmDeleteLevel = async () => {
    if (levelToDelete) {
      try {
        await deleteLevel(levelToDelete);
        toast({
          title: tDashboardAdmin("level_deleted"),
          description: tDashboardAdmin("the_level_has_been_successfully_deleted"),
          variant: "default",
        });
      } catch (err) {
        toast({
          title: tCommon("error"),
          description: tDashboardAdmin("failed_to_delete_the_level_please_try_again"),
          variant: "destructive",
        });
      } finally {
        setIsDeleteModalOpen(false);
        setLevelToDelete(null);
      }
    }
  };
  const handleBulkAction = (action: string) => {
    if (selectedLevels.length === 0) {
      toast({
        title: tDashboardAdmin("no_levels_selected"),
        description: tDashboardAdmin("please_select_at_least_one_level"),
        variant: "default",
      });
      return;
    }
    setPendingBulkAction(action);
    setBulkConfirmModalOpen(true);
  };
  const confirmBulkAction = async () => {
    if (!pendingBulkAction || selectedLevels.length === 0) {
      setBulkConfirmModalOpen(false);
      return;
    }
    setIsBulkActionLoading(true);
    try {
      switch (pendingBulkAction) {
        case "activate":
          await bulkActivateLevels(selectedLevels);
          toast({
            title: tDashboardAdmin("levels_activated"),
            description: tDashboardAdmin("successfully_activated_levels", { length: selectedLevels.length }),
            variant: "default",
          });
          break;
        case "deactivate":
          await bulkDeactivateLevels(selectedLevels);
          toast({
            title: tDashboardAdmin("levels_deactivated"),
            description: tDashboardAdmin("successfully_deactivated_levels", { length: selectedLevels.length }),
            variant: "default",
          });
          break;
        case "delete":
          await bulkDeleteLevels(selectedLevels);
          toast({
            title: tDashboardAdmin("levels_deleted"),
            description: tDashboardAdmin("successfully_deleted_levels", { length: selectedLevels.length }),
            variant: "default",
          });
          break;
        default:
          break;
      }

      // Clear selection after successful action
      setSelectedLevels([]);
    } catch (err) {
      toast({
        title: tCommon("action_failed"),
        description:
          err instanceof Error
            ? err.message
            : tDashboardAdmin("an_error_occurred_while_performing_the_action"),
        variant: "destructive",
      });
    } finally {
      setIsBulkActionLoading(false);
      // `pendingBulkAction` is deliberately NOT cleared here. It is what the
      // dialog's title, body and confirm button read, so nulling it in the same
      // tick as `open=false` swapped every string to its fallback while the
      // 200ms close animation was still playing — the panel visibly flashed
      // "Confirm" / generic copy on its way out. It is overwritten on every
      // open (`handleBulkAction`), so leaving it set is inert.
      setBulkConfirmModalOpen(false);
    }
  };
  const toggleLevelSelection = (id: string) => {
    if (selectedLevels.includes(id)) {
      setSelectedLevels(selectedLevels.filter((levelId) => levelId !== id));
    } else {
      setSelectedLevels([...selectedLevels, id]);
    }
  };
  const selectAllLevels = () => {
    if (filteredLevels.length === selectedLevels.length) {
      setSelectedLevels([]);
    } else {
      setSelectedLevels(filteredLevels.map((level) => level.id));
    }
  };

  // Enhance levels with analytics data.
  const enhancedLevels: KycLevel[] = useMemo(() => {
    return levels.map((level) => {
      // If the analytics properties are already set, return as is.
      if (
        level.completionRate !== undefined &&
        level.usersVerified !== undefined &&
        level.pendingVerifications !== undefined
      ) {
        return level;
      }
      const levelStats = analyticsData?.completionRates?.find(
        (stat) => stat.level === level.level
      );
      return {
        ...level,
        completionRate: levelStats?.rate || 0,
        usersVerified: levelStats?.users || 0,
        pendingVerifications: 0,
        rejectionRate: 0,
      };
    });
  }, [levels, analyticsData]);

  // Apply filters and sorting.
  const filteredLevels: KycLevel[] = useMemo(() => {
    if (!enhancedLevels || enhancedLevels.length === 0) return [];
    let result = enhancedLevels.filter((level) => {
      const matchesSearch =
        level?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        level?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      // Compare status as lowercase strings.
      const matchesStatus =
        filterStatus === "all" ||
        level.status?.toLowerCase() === filterStatus.toLowerCase();
      const matchesLevel =
        level.level >= levelRange[0] && level.level <= levelRange[1];
      return matchesSearch && matchesStatus && matchesLevel;
    });
    result = result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "level":
          comparison = a.level - b.level;
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "updated":
          comparison =
            new Date(b.updatedAt ?? Date.now()).getTime() -
            new Date(a.updatedAt ?? Date.now()).getTime();
          break;
        case "fields":
          comparison = (b.fields?.length || 0) - (a.fields?.length || 0);
          break;
        case "completion":
          comparison = (b.completionRate || 0) - (a.completionRate || 0);
          break;
        case "users":
          comparison = (b.usersVerified || 0) - (a.usersVerified || 0);
          break;
        default:
          comparison = a.level - b.level;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return result;
  }, [enhancedLevels, searchTerm, filterStatus, levelRange, sortBy, sortOrder]);

  // "Is anything narrowing the list?" — the test that decides whether an empty
  // list means "no levels exist" or "your filters hid them all". It was written
  // out three times with the same four clauses, so a fifth filter would have had
  // to be remembered in three places; the reset it pairs with was duplicated too.
  const hasActiveFilters =
    searchTerm !== "" ||
    filterStatus !== "all" ||
    levelRange[0] !== 1 ||
    levelRange[1] !== 10;
  const resetFilters = () => {
    setFilterStatus("all");
    setLevelRange([1, 10]);
    setSearchTerm("");
  };

  // Calculate statistics.
  const stats = useMemo(() => {
    return {
      total: enhancedLevels.length,
      active: enhancedLevels.filter((t) => (t as KycLevel).status === "ACTIVE")
        .length,
      draft: enhancedLevels.filter((t) => (t as KycLevel).status === "DRAFT")
        .length,
      inactive: enhancedLevels.filter(
        (t) => (t as KycLevel).status === "INACTIVE"
      ).length,
      totalFields: enhancedLevels.reduce(
        (sum, level) => sum + (level.fields?.length || 0),
        0
      ),
      averageFields: enhancedLevels.length
        ? Math.round(
            enhancedLevels.reduce(
              (sum, level) => sum + (level.fields?.length || 0),
              0
            ) / enhancedLevels.length
          )
        : 0,
      highestLevel: enhancedLevels.length
        ? Math.max(...enhancedLevels.map((level) => level.level))
        : 0,
    };
  }, [enhancedLevels]);

  // Animation variants.
  const containerVariants = {
    hidden: {
      opacity: 0,
    },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0,
    },
    show: {
      y: 0,
      opacity: 1,
    },
  };

  // Helper functions for colors and styling.
  const getLevelTierName = (level: number) => {
    switch (level) {
      case 1:
        return "Basic Verification";
      case 2:
        return "Identity Verification";
      case 3:
        return "Address Verification";
      case 4:
        return "Financial Verification";
      case 5:
        return "Trading Experience";
      default:
        return `Tier ${level}`;
    }
  };
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-primary";
      case 2:
        return "bg-primary";
      case 3:
        return "bg-success";
      case 4:
        return "bg-warning";
      case 5:
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };
  const getLevelTextColor = (level: number) => {
    switch (level) {
      case 1:
        return "text-primary";
      case 2:
        return "text-primary";
      case 3:
        return "text-success";
      case 4:
        return "text-warning";
      case 5:
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };
  const getLevelBgColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-primary/10";
      case 2:
        return "bg-primary/10";
      case 3:
        return "bg-success/10";
      case 4:
        return "bg-warning/10";
      case 5:
        return "bg-primary/10";
      default:
        return "bg-muted";
    }
  };
  const getLevelBorderColor = (level: number) => {
    switch (level) {
      case 1:
        return "border-primary/30";
      case 2:
        return "border-primary";
      case 3:
        return "border-success";
      case 4:
        return "border-warning/30";
      case 5:
        return "border-primary";
      default:
        return "border-border";
    }
  };
  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "text-success";
    if (rate >= 50) return "text-warning";
    return "text-destructive";
  };
  const getCompletionRateBgColor = (rate: number) => {
    if (rate >= 80) return "bg-success";
    if (rate >= 50) return "bg-warning";
    return "bg-destructive";
  };
  return (
    <PageShell rhythm="none">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("kyc_verification_levels")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("manage_your_kyc_and_requirements")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/admin/crm/kyc/level/create")}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("create_level")}
          </Button>
        </div>
      </div>

      {/*
        Statistics Dashboard.

        ZERO IS NOT AN ANSWER. `stats` is derived from an empty `levels` array
        and `analyticsData` is null until its own call returns, so every one of
        these four cards printed a confident `0` — and their DESCRIPTIONS
        printed it a second time, as "0 active, 0 draft" and "0% completion
        rate", which read as a measurement rather than as an absence. The two
        fetches are independent, so each card takes the flag for the request it
        is actually waiting on. `StatsCard` renders `description` in both
        states by design (withholding it changes the card's height), so the
        pending copy has to be a caption WITHOUT a figure in it rather than a
        caption with a wrong one.
      */}
      {/* The wrapper's `space-y-6` already sets the gap to the next block; the
          `mb-6` these two carried only ever collapsed into it. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label={t("total_levels")}
          value={stats.total}
          icon={Layers}
          /* A hardcoded 100 drew a FULL bar under a count of 0 — the one
             reading the figure directly contradicts. */
          progress={stats.total > 0 ? 100 : 0}
          loading={isLoading}
          description={
            isLoading
              ? `${tCommon("active")} / ${tCommon("draft")}`
              : `${stats.active} ${tCommon("active")}, ${stats.draft} ${tCommon("draft")}`
          }
          {...statsCardColors.primary}
        />

        <StatsCard
          label={t("verified_users")}
          value={analyticsData?.verifiedUsers || 0}
          icon={CheckCircle}
          progress={
            analyticsData?.totalUsers
              ? (analyticsData.verifiedUsers / analyticsData.totalUsers) * 100
              : 0
          }
          loading={isLoadingAnalytics}
          description={
            isLoadingAnalytics
              ? tCommon("completion_rate")
              : /* `completion_rate` is the bare phrase "completion rate", so
                   concatenating the figure straight onto it printed
                   "1completion rate" — no unit, no space. */
                `${
                  analyticsData?.totalUsers
                    ? Math.round(
                        (analyticsData.verifiedUsers / analyticsData.totalUsers) * 100
                      )
                    : 0
                }% ${tCommon("completion_rate")}`
          }
          {...statsCardColors.success}
        />

        <StatsCard
          label={tCommon("pending_verifications")}
          value={analyticsData?.pendingVerifications || 0}
          icon={Clock}
          progress={
            analyticsData?.totalUsers
              ? (analyticsData.pendingVerifications /
                  analyticsData.totalUsers) *
                100
              : 0
          }
          loading={isLoadingAnalytics}
          description={t("awaiting_review")}
          {...statsCardColors.warning}
        />

        <StatsCard
          label={t("total_fields")}
          value={stats.totalFields}
          icon={FileText}
          progress={
            stats.averageFields > 0 ? (stats.averageFields / 10) * 100 : 0
          }
          loading={isLoading}
          description={
            isLoading
              ? `${tCommon("avg")} ${t("fields_per_level")}`
              : `${tCommon("avg")} ${stats.averageFields} ${t("fields_per_level")}`
          }
          {...statsCardColors.purple}
        />
      </div>

      {/* Verification Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>{t("verification_funnel")}</CardTitle>
          <CardDescription>
            {t("user_progression_through_verification_levels")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/*
            The pending rows are the REAL row with its two labels withheld.

            The `h-4` bars stood in for a `font-medium` name and a `text-sm`
            tally that sit on the same line as a 12px status dot — three type
            decisions the boxes could not follow — and the `h-3 w-full` bar
            stood in for the `Progress` track, which is also `h-3` but carries
            the level's own tint. Keeping the dot, the track and the flex row
            means only the words wait.
          */}
          {isLoadingAnalytics ? (
            <div className="space-y-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-muted" />
                      <span className="font-medium">
                        <SkeletonText placeholder={tDashboard("level_name")} />
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      <SkeletonText placeholder="000 users (00%)" />
                    </span>
                  </div>
                  <Progress value={0} className="h-3" />
                </div>
              ))}
            </div>
          ) : enhancedLevels.length === 0 ? (
            /*
              `CardContent` is `p-6 pt-0`, so the only vertical padding this
              branch gets is its own. The previous `py-8` on a bare centred
              string was the app's single most common empty-state treatment and
              the one the shared primitive exists to replace: no icon, no
              surface, body copy standing in for a heading. `size="sm"` keeps
              the same 32px it used to reserve.
            */
            <EmptyState
              size="sm"
              icon={<Layers />}
              title={t("no_verification_data_available")}
            />
          ) : (
            <div className="space-y-8">
              {enhancedLevels.map((level, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${getLevelColor(level.level)}`}
                      ></div>
                      <span className="font-medium">
                        {level.name || getLevelTierName(level.level)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {level.usersVerified} {tCommon("users")} ({level.completionRate}%)
                    </span>
                  </div>
                  <Progress
                    value={level.completionRate || 0}
                    className={`h-3 ${getLevelBgColor(level.level)}`}
                    indicatorClassName={getLevelColor(level.level)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Levels Management */}
      <div className="space-y-4">
        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${t("search_levels")}…`}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "border-primary text-primary" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder={tCommon("sort_by")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="level">{t("level_number")}</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="updated">{tCommon('last_updated')}</SelectItem>
                <SelectItem value="fields">{t("number_of_fields")}</SelectItem>
                <SelectItem value="completion">{tCommon("completion_rate")}</SelectItem>
                <SelectItem value="users">{t("users_verified")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-9"
            >
              <ArrowUpDown
                className={`h-4 w-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
              />
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <m.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration: 0.2,
              }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={filterStatus}
                        onValueChange={setFilterStatus}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={tCommon("select_status")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{tCommon("all_statuses")}</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("level_range")}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={levelRange[0]}
                          onChange={(e) =>
                            setLevelRange([
                              Number.parseInt(e.target.value),
                              levelRange[1],
                            ])
                          }
                          className="w-20"
                        />
                        <span>to</span>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={levelRange[1]}
                          onChange={(e) =>
                            setLevelRange([
                              levelRange[0],
                              Number.parseInt(e.target.value),
                            ])
                          }
                          className="w-20"
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        {tCommon("reset_filters")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </m.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions */}
        {selectedLevels.length > 0 && (
          <m.div
            initial={{
              opacity: 0,
              y: -10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            className="bg-primary/10 border border-primary/20 rounded-lg p-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 pl-2">
              <Checkbox
                checked={
                  selectedLevels.length === filteredLevels.length &&
                  filteredLevels.length > 0
                }
                onCheckedChange={selectAllLevels}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                {selectedLevels.length} level
                {selectedLevels.length !== 1 ? "s" : ""} selected
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("activate")}
                loading={isBulkActionLoading && pendingBulkAction === "activate"}
                disabled={isBulkActionLoading}
              >
                {!(isBulkActionLoading && pendingBulkAction === "activate") && (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("deactivate")}
                loading={
                  isBulkActionLoading && pendingBulkAction === "deactivate"
                }
                disabled={isBulkActionLoading}
              >
                {!(
                  isBulkActionLoading && pendingBulkAction === "deactivate"
                ) && <Clock className="h-4 w-4 mr-1" />}
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction("delete")}
                loading={isBulkActionLoading && pendingBulkAction === "delete"}
                disabled={isBulkActionLoading}
              >
                {!(isBulkActionLoading && pendingBulkAction === "delete") && (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </m.div>
        )}

        {/*
          Six pending cards, not six grey rectangles: the real rows are `Card`s
          with a `p-6` body, so the bordered surface and the padding are known
          before the fetch and only the level name, the field count and the
          status chip are not. The `h-12 w-12 rounded-full` circle the old copy
          drew does not appear on a level row at all — it was reserving space
          for an avatar that is not there.
        */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({
              length: 6,
            }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <span className="block font-medium">
                        <SkeletonText placeholder={tCommon("untitled_level")} />
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        <SkeletonText placeholder={tDashboardAdmin("tier_0_0_fields")} />
                      </span>
                    </div>
                    <Badge tone="neutral">
                      <SkeletonText placeholder="ACTIVE" />
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredLevels.length === 0 ? (
          /*
            THE CARD HAS NO HEADER, SO IT HAD NO TOP PADDING. `CardContent` is
            `p-6 pt-0` by design — it assumes a `CardHeader` above it is
            supplying the top step — so this headerless empty state opened with
            its icon flush against the card's top border and closed with 24px
            under the copy. Every `mt-*`/`mb-*` in the old body was compensating
            downward for a gap that was missing upward.

            `EmptyState` inside a bare `Card` is the fix rather than adding
            `pt-6` back by hand: the primitive owns the icon plate, the
            heading/body scale and the symmetric `py-12`, and the `Card` keeps
            the surface tokens (`--card-border-width`) that `surface="card"`
            would have hardcoded away from its neighbours.

            The nothing-here case now also carries the action its own copy tells
            the reader to look for ("Click 'Create Level' to get started") — the
            button was only in the page header, off the eye's path.
          */
          <Card>
            <EmptyState
              icon={<FileText />}
              title={t("no_levels_found")}
              description={
                hasActiveFilters
                  ? tDashboardAdmin("no_levels_match_your_search_criteria")
                  : tDashboardAdmin("you_havent_created_any_kyc_levels")
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    {tCommon("clear_filters")}
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push("/admin/crm/kyc/level/create")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("create_level")}
                  </Button>
                )
              }
            />
          </Card>
        ) : viewMode === "grid" ? (
          <m.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredLevels.map((level) => {
              return (
                <m.div key={level.id} variants={itemVariants}>
                  <Card className="overflow-hidden h-full duration-300 group">
                    <div
                      className={`h-2 ${TONE_BAR[statusTone(level.status)]}`}
                    />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedLevels.includes(level.id)}
                            onCheckedChange={() =>
                              toggleLevelSelection(level.id)
                            }
                            className="translate-y-[1px]"
                          />
                          <div>
                            <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                              {level.name || tCommon("untitled_level")}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${getLevelBgColor(level.level)} text-foreground ${getLevelBorderColor(level.level)}`}
                              >
                                Tier {level.level}
                              </Badge>
                              <span>•</span>
                              <span>{level.fields?.length || 0} fields</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge tone={statusTone(level.status)}>
                          {level.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                        {level.description || tCommon("no_description_provided")}
                      </p>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {tCommon("completion_rate")}
                          </span>
                          <span
                            className={getCompletionRateColor(
                              level.completionRate || 0
                            )}
                          >
                            {level.completionRate || 0}%
                          </span>
                        </div>
                        <Progress
                          value={level.completionRate || 0}
                          className="h-1.5"
                          indicatorClassName={getCompletionRateBgColor(
                            level.completionRate || 0
                          )}
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t("users_verified")}
                          </span>
                          <span>{level.usersVerified || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2 mt-auto">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/crm/kyc/level/${level.id}`)
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/admin/crm/kyc/level/${level.id}?preview=true`
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteLevel(level.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated{" "}
                        {new Date(
                          level.updatedAt ?? Date.now()
                        ).toLocaleDateString()}
                      </div>
                    </CardFooter>
                  </Card>
                </m.div>
              );
            })}
          </m.div>
        ) : (
          <m.div
            className="space-y-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredLevels.map((level) => {
              return (
                <m.div key={level.id} variants={itemVariants}>
                  <Card className="overflow-hidden duration-300">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedLevels.includes(level.id)}
                            onCheckedChange={() =>
                              toggleLevelSelection(level.id)
                            }
                          />
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${getLevelBgColor(level.level)}`}
                          >
                            <Shield
                              className={`h-5 w-5 ${getLevelTextColor(level.level)}`}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium flex items-center gap-2">
                              {level.name || tCommon("untitled_level")}
                              <Badge tone={statusTone(level.status)}>
                                {level.status}
                              </Badge>
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Tier {level.level}</span>
                              <span>•</span>
                              <span>{level.fields?.length || 0} fields</span>
                              <span>•</span>
                              <span>
                                Updated{" "}
                                {new Date(
                                  level.updatedAt ?? Date.now()
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col items-end mr-4">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`text-sm font-medium ${getCompletionRateColor(level.completionRate || 0)}`}
                                    >
                                      {level.completionRate || 0}%
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      completion
                                    </span>
                                  </div>
                                  <Progress
                                    value={level.completionRate || 0}
                                    className="h-1.5 w-24"
                                    indicatorClassName={getCompletionRateBgColor(
                                      level.completionRate || 0
                                    )}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {tCommon("completion_rate")}: {level.completionRate || 0}%
                                </p>
                                <p>{level.usersVerified || 0} {t("users_verified")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/admin/crm/kyc/level/${level.id}?preview=true`
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/crm/kyc/level/${level.id}`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteLevel(level.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              );
            })}
          </m.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteModalOpen(false);
            setLevelToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("confirm_deletion")}</DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to_delete_this_level")} {tCommon("this_action_cannot_be_undone")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("all_data_associated_with_this_level")} {t("users_who_have_completed_this_level")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setLevelToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteLevel}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Modal */}
      <Dialog
        open={bulkConfirmModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Mirrors the disabled Cancel button: the confirmation cannot be
            // dismissed while the bulk action is still running.
            if (isBulkActionLoading) return;
            // See the note in `confirmBulkAction`: clearing the pending action
            // here would blank the dialog's own copy mid-close.
            setBulkConfirmModalOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm{" "}
              {pendingBulkAction === "activate"
                ? tDashboardAdmin("activation")
                : pendingBulkAction === "deactivate"
                  ? tDashboardAdmin("deactivation")
                  : tDashboardAdmin("deletion")}
            </DialogTitle>
            <DialogDescription>
              {tCommon("are_you_sure_you_want_to")}{" "}
              {pendingBulkAction === "activate"
                ? "activate"
                : pendingBulkAction === "deactivate"
                  ? "deactivate"
                  : "delete"}{" "}
              {selectedLevels.length} level
              {selectedLevels.length !== 1 ? "s" : ""}?
              {pendingBulkAction === "delete" &&
                tCommon("this_action_cannot_be_undone")}
            </DialogDescription>
          </DialogHeader>
          <div>
            {pendingBulkAction === "activate" && (
              <p className="text-sm text-muted-foreground">
                {t("activating_these_levels_will_make_them")}
              </p>
            )}
            {pendingBulkAction === "deactivate" && (
              <p className="text-sm text-muted-foreground">
                {t("deactivating_these_levels_will_hide_them")} {t("any_ongoing_verifications_may_be_affected_1")}
              </p>
            )}
            {pendingBulkAction === "delete" && (
              <p className="text-sm text-muted-foreground">
                {t("all_data_associated_with_these_levels")} {t("users_who_have_completed_these_levels")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkConfirmModalOpen(false)}
              disabled={isBulkActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={
                pendingBulkAction === "delete" ? "destructive" : "default"
              }
              onClick={confirmBulkAction}
              loading={isBulkActionLoading}
            >
              {isBulkActionLoading ? (
                tCommon('processing')
              ) : pendingBulkAction === "activate" ? (
                tCommon("activate")
              ) : pendingBulkAction === "deactivate" ? (
                tCommon("deactivate")
              ) : (
                tCommon("delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageShell>
  );
}

// Helper component for Checkbox
function Checkbox({
  checked,
  onCheckedChange,
  className,
  id,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={`h-4 w-4 rounded border border-primary flex items-center justify-center cursor-pointer ${checked ? "bg-primary" : "bg-transparent"} ${className || ""}`}
      onClick={onCheckedChange}
      id={id}
    >
      {checked && <Check className="h-3 w-3 text-primary-foreground" />}
    </div>
  );
}
