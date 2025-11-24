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
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
          title: "Level deleted",
          description: "The level has been successfully deleted.",
          variant: "default",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete the level. Please try again.",
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
        title: "No levels selected",
        description: "Please select at least one level to perform this action.",
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
            title: "Levels activated",
            description: `Successfully activated ${selectedLevels.length} levels.`,
            variant: "default",
          });
          break;
        case "deactivate":
          await bulkDeactivateLevels(selectedLevels);
          toast({
            title: "Levels deactivated",
            description: `Successfully deactivated ${selectedLevels.length} levels.`,
            variant: "default",
          });
          break;
        case "delete":
          await bulkDeleteLevels(selectedLevels);
          toast({
            title: "Levels deleted",
            description: `Successfully deleted ${selectedLevels.length} levels.`,
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
        title: "Action failed",
        description:
          err instanceof Error
            ? err.message
            : "An error occurred while performing the action.",
        variant: "destructive",
      });
    } finally {
      setIsBulkActionLoading(false);
      setBulkConfirmModalOpen(false);
      setPendingBulkAction(null);
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
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500 dark:bg-green-600";
      case "DRAFT":
        return "bg-amber-500 dark:bg-amber-600";
      case "INACTIVE":
        return "bg-gray-500 dark:bg-gray-600";
      default:
        return "bg-gray-500 dark:bg-gray-600";
    }
  };
  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 dark:text-green-400";
      case "DRAFT":
        return "text-amber-600 dark:text-amber-400";
      case "INACTIVE":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 dark:bg-green-900/20";
      case "DRAFT":
        return "bg-amber-50 dark:bg-amber-900/20";
      case "INACTIVE":
        return "bg-gray-50 dark:bg-gray-900/20";
      default:
        return "bg-gray-50 dark:bg-gray-900/20";
    }
  };
  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "border-green-200 dark:border-green-800";
      case "DRAFT":
        return "border-amber-200 dark:border-amber-800";
      case "INACTIVE":
        return "border-gray-200 dark:border-gray-800";
      default:
        return "border-gray-200 dark:border-gray-800";
    }
  };
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
        return "bg-blue-500 dark:bg-blue-600";
      case 2:
        return "bg-purple-500 dark:bg-purple-600";
      case 3:
        return "bg-green-500 dark:bg-green-600";
      case 4:
        return "bg-amber-500 dark:bg-amber-600";
      case 5:
        return "bg-indigo-500 dark:bg-indigo-600";
      default:
        return "bg-gray-500 dark:bg-gray-600";
    }
  };
  const getLevelTextColor = (level: number) => {
    switch (level) {
      case 1:
        return "text-blue-600 dark:text-blue-400";
      case 2:
        return "text-purple-600 dark:text-purple-400";
      case 3:
        return "text-green-600 dark:text-green-400";
      case 4:
        return "text-amber-600 dark:text-amber-400";
      case 5:
        return "text-indigo-600 dark:text-indigo-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };
  const getLevelBgColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-blue-50 dark:bg-blue-900/20";
      case 2:
        return "bg-purple-50 dark:bg-purple-900/20";
      case 3:
        return "bg-green-50 dark:bg-green-900/20";
      case 4:
        return "bg-amber-50 dark:bg-amber-900/20";
      case 5:
        return "bg-indigo-50 dark:bg-indigo-900/20";
      default:
        return "bg-gray-50 dark:bg-gray-900/20";
    }
  };
  const getLevelBorderColor = (level: number) => {
    switch (level) {
      case 1:
        return "border-blue-200 dark:border-blue-800";
      case 2:
        return "border-purple-200 dark:border-purple-800";
      case 3:
        return "border-green-200 dark:border-green-800";
      case 4:
        return "border-amber-200 dark:border-amber-800";
      case 5:
        return "border-indigo-200 dark:border-indigo-800";
      default:
        return "border-gray-200 dark:border-gray-800";
    }
  };
  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };
  const getCompletionRateBgColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-red-500";
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">KYC Verification Levels</h1>
          <p className="text-muted-foreground mt-1">
            Manage your KYC verification tiers and requirements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/admin/crm/kyc/level/create")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white dark:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Level
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Levels
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Layers className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={100} className="h-1" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.active} active, {stats.draft} draft
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Verified Users
                </p>
                <h3 className="text-3xl font-bold mt-1">
                  {analyticsData?.verifiedUsers || 0}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={
                  analyticsData?.totalUsers
                    ? (analyticsData.verifiedUsers / analyticsData.totalUsers) *
                      100
                    : 0
                }
                className="h-1 bg-green-100"
                indicatorClassName="bg-green-500"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {analyticsData?.totalUsers
                  ? Math.round(
                      (analyticsData.verifiedUsers / analyticsData.totalUsers) *
                        100
                    )
                  : 0}
                % completion rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Verifications
                </p>
                <h3 className="text-3xl font-bold mt-1">
                  {analyticsData?.pendingVerifications || 0}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={
                  analyticsData?.totalUsers
                    ? (analyticsData.pendingVerifications /
                        analyticsData.totalUsers) *
                      100
                    : 0
                }
                className="h-1 bg-yellow-100"
                indicatorClassName="bg-yellow-500"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Awaiting review
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Fields
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.totalFields}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={
                  stats.averageFields > 0 ? (stats.averageFields / 10) * 100 : 0
                }
                className="h-1 bg-purple-100"
                indicatorClassName="bg-purple-500"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Avg. {stats.averageFields} fields per level
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Funnel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Verification Funnel</CardTitle>
          <CardDescription>
            User progression through verification levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAnalytics ? (
            <div className="space-y-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {enhancedLevels.length > 0 ? (
                enhancedLevels.map((level, index) => {
                  return (
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
                          {level.usersVerified} users ({level.completionRate}%)
                        </span>
                      </div>
                      <Progress
                        value={level.completionRate || 0}
                        className={`h-3 ${getLevelBgColor(level.level)}`}
                        indicatorClassName={getLevelColor(level.level)}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No verification data available
                </div>
              )}
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
              placeholder="Search levels..."
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
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="level">Level Number</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="fields">Number of Fields</SelectItem>
                <SelectItem value="completion">Completion Rate</SelectItem>
                <SelectItem value="users">Users Verified</SelectItem>
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
            <motion.div
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
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Level Range</Label>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterStatus("all");
                          setLevelRange([1, 10]);
                          setSearchTerm("");
                        }}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions */}
        {selectedLevels.length > 0 && (
          <motion.div
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
                disabled={isBulkActionLoading}
              >
                {isBulkActionLoading && pendingBulkAction === "activate" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("deactivate")}
                disabled={isBulkActionLoading}
              >
                {isBulkActionLoading && pendingBulkAction === "deactivate" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-1" />
                )}
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction("delete")}
                disabled={isBulkActionLoading}
              >
                {isBulkActionLoading && pendingBulkAction === "delete" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({
              length: 6,
            }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24" />
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Levels Found</h3>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {searchTerm ||
                filterStatus !== "all" ||
                levelRange[0] !== 1 ||
                levelRange[1] !== 10
                  ? "No levels match your search criteria."
                  : "You haven't created any KYC levels yet. Click 'Create Level' to get started."}
              </p>
              {(searchTerm ||
                filterStatus !== "all" ||
                levelRange[0] !== 1 ||
                levelRange[1] !== 10) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setFilterStatus("all");
                    setLevelRange([1, 10]);
                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredLevels.map((level) => {
              return (
                <motion.div key={level.id} variants={itemVariants}>
                  <Card className="overflow-hidden h-full hover:shadow-md transition-shadow duration-300 group">
                    <div
                      className={`h-2 ${getStatusColor(level.status || "")}`}
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
                              {level.name || "Untitled Level"}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${getLevelBgColor(level.level)} ${getLevelTextColor(level.level)} ${getLevelBorderColor(level.level)}`}
                              >
                                Tier {level.level}
                              </Badge>
                              <span>•</span>
                              <span>{level.fields?.length || 0} fields</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          className={`${getStatusBgColor(level.status || "")} ${getStatusTextColor(level.status || "")} ${getStatusBorderColor(level.status || "")}`}
                        >
                          {level.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                        {level.description || "No description provided."}
                      </p>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Completion Rate
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
                            Users Verified
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
                              className="text-red-600"
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
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            className="space-y-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredLevels.map((level) => {
              return (
                <motion.div key={level.id} variants={itemVariants}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
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
                              {level.name || "Untitled Level"}
                              <Badge
                                className={`${getStatusBgColor(level.status || "")} ${getStatusTextColor(level.status || "")} ${getStatusBorderColor(level.status || "")}`}
                              >
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
                                  Completion rate: {level.completionRate || 0}%
                                </p>
                                <p>{level.usersVerified || 0} users verified</p>
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
                                className="text-red-600"
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
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Confirm Deletion</CardTitle>
              <CardDescription>
                Are you sure you want to delete this level? This action cannot
                be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All data associated with this level will be permanently removed.
                Users who have completed this level may need to be re-verified.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
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
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                Confirm{" "}
                {pendingBulkAction === "activate"
                  ? "Activation"
                  : pendingBulkAction === "deactivate"
                    ? "Deactivation"
                    : "Deletion"}
              </CardTitle>
              <CardDescription>
                Are you sure you want to{" "}
                {pendingBulkAction === "activate"
                  ? "activate"
                  : pendingBulkAction === "deactivate"
                    ? "deactivate"
                    : "delete"}{" "}
                {selectedLevels.length} level
                {selectedLevels.length !== 1 ? "s" : ""}?
                {pendingBulkAction === "delete" &&
                  " This action cannot be undone."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingBulkAction === "activate" && (
                <p className="text-sm text-muted-foreground">
                  Activating these levels will make them available for users to
                  complete.
                </p>
              )}
              {pendingBulkAction === "deactivate" && (
                <p className="text-sm text-muted-foreground">
                  Deactivating these levels will hide them from users. Any
                  ongoing verifications may be affected.
                </p>
              )}
              {pendingBulkAction === "delete" && (
                <p className="text-sm text-muted-foreground">
                  All data associated with these levels will be permanently
                  removed. Users who have completed these levels may need to be
                  re-verified.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkConfirmModalOpen(false);
                  setPendingBulkAction(null);
                }}
                disabled={isBulkActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={
                  pendingBulkAction === "delete" ? "destructive" : "default"
                }
                onClick={confirmBulkAction}
                disabled={isBulkActionLoading}
              >
                {isBulkActionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : pendingBulkAction === "activate" ? (
                  "Activate"
                ) : pendingBulkAction === "deactivate" ? (
                  "Deactivate"
                ) : (
                  "Delete"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
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
      {checked && <Check className="h-3 w-3 text-white" />}
    </div>
  );
}
