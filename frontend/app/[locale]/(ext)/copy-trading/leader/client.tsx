"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Users,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { $fetch } from "@/lib/api";
import LeaderCard from "../components/leader-card";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { useTranslations } from "next-intl";

interface Leader {
  id: string;
  displayName: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  winRate: number;
  roi: number;
  totalFollowers: number;
  totalTrades?: number;
  profitSharePercent: number;
  maxFollowers?: number;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  isFollowing?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const tradingStyles = [
  { value: "all", label: "All Styles", icon: LayoutGrid },
  { value: "SCALPING", label: "Scalping", icon: Zap },
  { value: "DAY_TRADING", label: "Day Trading", icon: BarChart3 },
  { value: "SWING", label: "Swing", icon: TrendingUp },
  { value: "POSITION", label: "Position", icon: Shield },
];

const riskLevels = [
  { value: "all", label: "All Risk Levels" },
  { value: "LOW", label: "Low Risk", color: 'text-emerald-600 dark:text-emerald-400' },
  { value: "MEDIUM", label: "Medium Risk", color: 'text-amber-600 dark:text-amber-400' },
  { value: "HIGH", label: "High Risk", color: 'text-red-600 dark:text-red-400' },
];

const sortOptions = [
  { value: "roi", label: "Highest ROI", icon: TrendingUp },
  { value: "winRate", label: "Highest Win Rate", icon: Target },
  { value: "totalFollowers", label: "Most Popular", icon: Users },
  { value: "totalProfit", label: "Most Profitable", icon: BarChart3 },
];

export default function LeadersPage() {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [tradingStyle, setTradingStyle] = useState<string>("all");
  const [riskLevel, setRiskLevel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("roi");
  const [page, setPage] = useState(1);

  // Stats
  const [stats, setStats] = useState({
    totalLeaders: 0,
    avgRoi: 0,
    topWinRate: 0,
  });

  useEffect(() => {
    let ignore = false;
    const fetchLeaders = async () => {
      setIsLoading(true);
      try {
        const params: any = {
          page,
          limit: 12,
          sortBy,
          sortOrder: "desc",
        };

        if (tradingStyle !== "all") params.tradingStyle = tradingStyle;
        if (riskLevel !== "all") params.riskLevel = riskLevel;

        const { data } = await $fetch({
          url: "/api/copy-trading/leader",
          method: "GET",
          params,
          silent: true,
        });

        if (!ignore) {
          const items = data?.items || [];
          setLeaders(items);
          setPagination(data?.pagination || null);

          // Calculate stats
          if (items.length > 0) {
            const avgRoi =
              items.reduce((sum: number, l: Leader) => sum + l.roi, 0) /
              items.length;
            const topWinRate = Math.max(
              ...items.map((l: Leader) => l.winRate)
            );
            setStats({
              totalLeaders: data?.pagination?.total || items.length,
              avgRoi,
              topWinRate,
            });
          }
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to fetch leaders:", error);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchLeaders();
    return () => {
      ignore = true;
    };
  }, [page, tradingStyle, riskLevel, sortBy]);

  // Filter locally by search term
  const filteredLeaders = leaders.filter((leader) =>
    leader.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const activeFiltersCount = [
    tradingStyle !== "all",
    riskLevel !== "all",
    search !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setTradingStyle("all");
    setRiskLevel("all");
    setSortBy("roi");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-4 w-4" />,
          text: `${stats.totalLeaders}+ Verified Leaders`,
          gradient: "from-indigo-500/10 to-violet-500/10",
          iconColor: "text-indigo-500",
          textColor: "text-indigo-600 dark:text-indigo-400",
          borderColor: "border-indigo-500/20",
        }}
        title={[
          { text: "Discover Top" },
          {
            text: "Trading Leaders",
            gradient: "from-indigo-500 via-violet-500 to-indigo-600",
          },
        ]}
        description={`${t("browse_our_curated_selection_of_verified_traders")} ${t("analyze_performance_metrics_and_find_the")}`}
        maxWidth="max-w-3xl"
        paddingTop="pt-24"
        paddingBottom="pb-12"
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
      >
        <StatsGroup
          stats={[
            {
              icon: TrendingUp,
              label: "Avg. ROI",
              value: `+${stats.avgRoi.toFixed(1)}%`,
              iconColor: "text-emerald-500",
              iconBgColor: "bg-emerald-500/10",
              valueColor: "text-emerald-600 dark:text-emerald-400",
            },
            {
              icon: Target,
              label: "Top Win Rate",
              value: `${stats.topWinRate.toFixed(1)}%`,
              iconColor: "text-blue-500",
              iconBgColor: "bg-blue-500/10",
            },
            {
              icon: Users,
              label: "Active Leaders",
              value: stats.totalLeaders,
              iconColor: "text-indigo-500",
              iconBgColor: "bg-indigo-500/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8">
        {/* Search and filters bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 md:mb-8"
        >
          <Card className="border-0 shadow-lg shadow-zinc-200/50 dark:shadow-zinc-900/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    placeholder={t("search_leaders_by_name_ellipsis")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter controls */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  <Select value={tradingStyle} onValueChange={setTradingStyle}>
                    <SelectTrigger className="w-full sm:w-[160px] h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
                      <SelectValue placeholder={tExt("trading_style")} />
                    </SelectTrigger>
                    <SelectContent>
                      {tradingStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex items-center gap-2">
                            <style.icon className="h-4 w-4" />
                            {style.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={riskLevel} onValueChange={setRiskLevel}>
                    <SelectTrigger className="w-full sm:w-[160px] h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
                      <SelectValue placeholder={tCommon("risk_level")} />
                    </SelectTrigger>
                    <SelectContent>
                      {riskLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <span className={level.color}>{level.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
                      <SelectValue placeholder={tCommon("sort_by")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full sm:w-auto h-11 rounded-xl gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="hidden sm:inline">{tCommon("clear")}{activeFiltersCount})</span>
                      <span className="sm:hidden">{tCommon("clear_filters")}</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active filters display */}
        <AnimatePresence>
          {activeFiltersCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 flex flex-wrap gap-2"
            >
              {tradingStyle !== "all" && (
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 rounded-lg gap-2"
                >
                  {tCommon("style")}: {tradingStyle.replace("_", " ")}
                  <button onClick={() => setTradingStyle("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {riskLevel !== "all" && (
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 rounded-lg gap-2"
                >
                  {tCommon("risk")}: {riskLevel}
                  <button onClick={() => setRiskLevel("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {search && (
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 rounded-lg gap-2"
                >
                  {t("search_1")}{search}"
                  <button onClick={() => setSearch("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex items-center justify-between"
          >
            <p className="text-sm text-zinc-500">
              Showing{" "}
              <span className="font-medium text-zinc-900 dark:text-white">
                {filteredLeaders.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-zinc-900 dark:text-white">
                {pagination?.total || 0}
              </span>{" "}
              leaders
            </p>
          </motion.div>
        )}

        {/* Leaders grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-[340px] rounded-2xl bg-linear-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 animate-pulse"
              />
            ))}
          </div>
        ) : filteredLeaders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredLeaders.map((leader, index) => (
                <LeaderCard key={leader.id || `leader-${index}`} leader={leader} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2 mt-8 md:mt-12"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-full sm:w-auto rounded-xl gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>

                <div className="flex items-center gap-1 px-2 sm:px-4">
                  {Array.from(
                    { length: Math.min(pagination.totalPages, 5) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${
                            page === pageNum
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page === pagination.totalPages}
                  className="w-full sm:w-auto rounded-xl gap-2"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="py-20">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {t("no_leaders_found")}
                  </h3>
                  <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                    {t("we_couldnt_find_any_leaders_matching_your_criteria")} {t("try_adjusting_your_filters_or_search_terms")}
                  </p>
                  <Button
                    onClick={clearFilters}
                    className="rounded-xl gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {tExt("clear_all_filters")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
