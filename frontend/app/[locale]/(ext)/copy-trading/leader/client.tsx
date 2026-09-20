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
  Coins,
  Timer,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { $fetch } from "@/lib/api";
import LeaderCard from "../components/leader-card";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { Loadable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface Leader {
  id: string;
  displayName: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  tradingType?: string;
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
  { value: "LOW", label: "Low Risk", color: 'text-success' },
  { value: "MEDIUM", label: "Medium Risk", color: 'text-warning' },
  { value: "HIGH", label: "High Risk", color: 'text-destructive' },
];

const marketTypes = [
  { value: "all", label: "All Types", icon: LayoutGrid },
  { value: "SPOT", label: "Spot", icon: Coins },
  { value: "BINARY", label: "Binary", icon: Timer },
];

/**
 * Pending cards to draw. The request asks for `limit: 12`, but this grid tops
 * out at four columns and eight is the count this page has always reserved —
 * what has to be stable is the GRID, not the child count, and the grid
 * definition is now identical in both states.
 */
const PAGE_SIZE_PENDING_ROWS = 8;

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
  const [marketType, setMarketType] = useState<string>("all");
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
        if (marketType !== "all") params.tradingType = marketType;

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
  }, [page, tradingStyle, riskLevel, marketType, sortBy]);

  // Filter locally by search term
  const filteredLeaders = leaders.filter((leader) =>
    leader.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const activeFiltersCount = [
    tradingStyle !== "all",
    riskLevel !== "all",
    marketType !== "all",
    search !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setTradingStyle("all");
    setRiskLevel("all");
    setMarketType("all");
    setSortBy("roi");
    setPage(1);
  };

  return (
    /* The root carries no fill. `HeroSection` mounts `WorkspaceGround`
       (`fixed inset-0 -z-10`) for this page, and the `via-muted/20` wash that
       used to be here is an ordinary in-flow background: it painted last and
       hid the ground entirely. `min-h-screen` stays — the ground is fixed, so
       the page still has to be tall enough to own the viewport. */
    <div className="min-h-screen">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-4 w-4" />,
          text: `${stats.totalLeaders}+ Verified Leaders`,
        }}
        title={t("discover_top_trading_leaders")}
        description={`${t("browse_our_curated_selection_of_verified_traders")} ${t("analyze_performance_metrics_and_find_the")}`}
        maxWidth="max-w-3xl"
      >
        {/* `StatsGroup.value` is a ReactNode, so the three hero figures wait in
            place inside their own typography rather than reading a hardcoded
            `+0.0%` / `0.0%` / `0` for the length of the fetch — three zeroes
            that are not a pending state, they are a wrong answer. */}
        <StatsGroup
          stats={[
            {
              icon: TrendingUp,
              label: t("avg_roi"),
              value: (
                <Loadable loading={isLoading} placeholder="+12.3%">
                  {`+${stats.avgRoi.toFixed(1)}%`}
                </Loadable>
              ),
              iconColor: "text-success",
              iconBgColor: "bg-success/10",
              valueColor: "text-success",
            },
            {
              icon: Target,
              label: t("top_win_rate"),
              value: (
                <Loadable loading={isLoading} placeholder="67.5%">
                  {`${stats.topWinRate.toFixed(1)}%`}
                </Loadable>
              ),
              iconColor: "text-primary",
              iconBgColor: "bg-primary/10",
            },
            {
              icon: Users,
              label: tExt("active_leaders"),
              value: (
                <Loadable loading={isLoading} chars={3}>
                  {stats.totalLeaders}
                </Loadable>
              ),
              iconColor: "text-primary",
              iconBgColor: "bg-primary/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8">
        {/* Search and filters bar */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 md:mb-8"
        >
          <Card className="border border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`${t("search_leaders_by_name")}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 bg-muted dark:bg-muted/50 border-border rounded-xl"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter controls */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  <Select value={tradingStyle} onValueChange={setTradingStyle}>
                    <SelectTrigger className="w-full sm:w-[160px] h-11 rounded-xl bg-muted dark:bg-muted/50 border-border">
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
                    <SelectTrigger
                      data-tour="copy-risk-filter"
                      className="w-full sm:w-[160px] h-11 rounded-xl bg-muted dark:bg-muted/50 border-border"
                    >
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

                  <Select value={marketType} onValueChange={setMarketType}>
                    <SelectTrigger className="w-full sm:w-[150px] h-11 rounded-xl bg-muted dark:bg-muted/50 border-border">
                      <SelectValue placeholder="Market" />
                    </SelectTrigger>
                    <SelectContent>
                      {marketTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger
                      data-tour="copy-sort"
                      className="w-full sm:w-[180px] h-11 rounded-xl bg-muted dark:bg-muted/50 border-border"
                    >
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
        </m.div>

        {/* Active filters display */}
        <AnimatePresence>
          {activeFiltersCount > 0 && (
            <m.div
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
              {marketType !== "all" && (
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 rounded-lg gap-2"
                >
                  {tCommon("market")}: {marketType === "SPOT" ? tCommon("spot") : tCommon("binary")}
                  <button onClick={() => setMarketType("all")}>
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
            </m.div>
          )}
        </AnimatePresence>

        {/*
          Results count — renders in BOTH states now.

          `{!isLoading && ...}` withheld a 20px line plus its 24px margin, so
          the entire grid below it sat 44px too high for the duration of the
          fetch and then dropped. And the fetch re-runs on every filter, sort
          and page change, so this was not a once-per-visit jump: it fired every
          time the user touched a control, which is precisely when their eyes
          are on the results. Only the two counts are unknown.
        */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex items-center justify-between"
        >
          <p className="text-sm text-subtle-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              <Loadable loading={isLoading} chars={2}>
                {filteredLeaders.length}
              </Loadable>
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              <Loadable loading={isLoading} chars={2}>
                {pagination?.total || 0}
              </Loadable>
            </span>{" "}
            leaders
          </p>
        </m.div>

        {/* Leaders grid — ONE grid definition, one card component, both states.
            The pending pass used to be eight `h-[340px] rounded-2xl bg-muted`
            slabs, a shape that shares neither radius, border, fill nor height
            with the card it stood in for. */}
        {isLoading ? (
          <div
            data-tour="copy-leaders"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
          >
            {Array.from({ length: PAGE_SIZE_PENDING_ROWS }, (_, i) => (
              <LeaderCard
                key={`pending-${i}`}
                index={i}
                loading
                data-tour={i === 0 ? "copy-leader-card" : undefined}
              />
            ))}
          </div>
        ) : filteredLeaders.length > 0 ? (
          <>
            <div
              data-tour="copy-leaders"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
            >
              {filteredLeaders.map((leader, index) => (
                <LeaderCard
                  key={leader.id || `leader-${index}`}
                  leader={leader}
                  index={index}
                  data-tour={index === 0 ? "copy-leader-card" : undefined}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <m.div
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
                              ? "bg-primary hover:bg-primary text-primary-foreground"
                              : "hover:bg-muted"
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
              </m.div>
            )}
          </>
        ) : (
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* The empty state carries `copy-leaders` too. Without it the third
                branch of this chain is the one state with no anchor, so a
                walkthrough opened by somebody whose filters match nothing had
                nothing to point at — and that is exactly the customer most
                likely to have asked for help. */}
            <Card data-tour="copy-leaders" className="border border-border bg-card">
              <CardContent className="py-20">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-lg bg-surface-3 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {t("no_leaders_found")}
                  </h3>
                  <p className="text-subtle-foreground mb-6 max-w-md mx-auto">
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
          </m.div>
        )}
      </div>
    </div>
  );
}
