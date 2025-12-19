"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, ThumbsUp, ThumbsDown, HelpCircle, Calendar, Sparkles, BarChart3 } from "lucide-react";
import { useFAQAdminStore } from "@/store/faq/admin";
import { useAnalyticsStore } from "@/store/faq/analytics-store";

// Import the professional analytics components
import { KpiCard } from "@/components/blocks/data-table/analytics/kpi";
import ChartCard from "@/components/blocks/data-table/analytics/charts/line";
import BarChart from "@/components/blocks/data-table/analytics/charts/bar";
import { StatusDistribution } from "@/components/blocks/data-table/analytics/charts/donut";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { motion } from "framer-motion";

type TimeframeOption = "weekly" | "monthly" | "yearly";

export function FAQAnalyticsDashboard() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  // Data from the FAQ admin store.
  const { faqs } = useFAQAdminStore();

  // Analytics data from our analytics store.
  const { analytics, fetchAnalytics } = useAnalyticsStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState<TimeframeOption>("monthly");

  // Fetch analytics data on mount and when timeframe changes.
  const fetchAnalyticsData = useCallback(
    async (selectedTimeframe?: TimeframeOption) => {
      // For now, we'll fetch all analytics data and the backend can handle timeframe filtering
      // In the future, you can pass timeframe parameters to the backend
      await fetchAnalytics();
    },
    [fetchAnalytics]
  );

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback(
    (newTimeframe: TimeframeOption) => {
      setTimeframe(newTimeframe);
      fetchAnalyticsData(newTimeframe);
    },
    [fetchAnalyticsData]
  );

  // Color scheme for category charts
  const categoryColors = [
    "#6366F1",
    "#22C55E",
    "#EF4444",
    "#F97316",
    "#A855F7",
  ];

  // Helper function to convert timeframe to chart format
  const getChartTimeframe = useCallback(
    (tf: TimeframeOption): "d" | "m" | "y" => {
      switch (tf) {
        case "weekly":
          return "d";
        case "monthly":
          return "m";
        case "yearly":
          return "y";
        default:
          return "m";
      }
    },
    []
  );

  // Helper function to create continuous date range for FAQ analytics
  const createContinuousData = useCallback(
    (rawData: any[], dataType: "views" | "feedback") => {
      if (!rawData || rawData.length === 0) {
        return [];
      }

      const now = new Date();
      const dates: string[] = [];

      // Generate date range based on timeframe
      switch (timeframe) {
        case "weekly": {
          // Last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split("T")[0]);
          }
          break;
        }
        case "monthly": {
          // Last 30 days
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split("T")[0]);
          }
          break;
        }
        case "yearly": {
          // Last 12 months
          for (let i = 11; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            dates.push(yearMonth);
          }
          break;
        }
      }

      // Create a map of existing data
      const existingDataMap = new Map();
      rawData.forEach((item) => {
        let key = "";
        if (dataType === "views") {
          // viewsOverTime has { month: string, views: number }
          key = item.month || item.date;
        } else {
          // feedbackOverTime has { date: string, positive: number, negative: number }
          key = item.date;
          // Convert date to appropriate format for yearly view
          if (timeframe === "yearly" && key && key.length >= 7) {
            key = key.substring(0, 7); // Convert YYYY-MM-DD to YYYY-MM
          }
        }

        if (key) {
          existingDataMap.set(key, item);
        }
      });

      // Generate continuous data
      return dates.map((dateStr) => {
        const existingItem = existingDataMap.get(dateStr);

        if (existingItem) {
          // Return existing data with normalized date
          return {
            ...existingItem,
            date: dateStr,
          };
        } else {
          // Create zero-filled entry for missing date
          if (dataType === "views") {
            return {
              date: dateStr,
              month: dateStr,
              views: 0,
            };
          } else {
            return {
              date: dateStr,
              positive: 0,
              negative: 0,
            };
          }
        }
      });
    },
    [timeframe]
  );

  // Memoized views-over-time data with continuous date range
  const viewsOverTimeData = useMemo(() => {
    const rawData = analytics.viewsOverTime || [];

    // Create continuous data
    const continuousData = createContinuousData(rawData, "views");

    return continuousData.map((item) => ({
      ...item,
      period: item.date,
      views: item.views || 0,
    }));
  }, [analytics.viewsOverTime, createContinuousData]);

  // Memoized feedback-over-time data with continuous date range
  const timeSeriesData = useMemo(() => {
    const rawData = analytics.feedbackOverTime || [];

    // Create continuous data
    const continuousData = createContinuousData(rawData, "feedback");

    return continuousData.map((item) => ({
      ...item,
      positive: item.positive || 0,
      negative: item.negative || 0,
    }));
  }, [analytics.feedbackOverTime, createContinuousData]);

  // Convert category distribution for the donut chart.
  const categoryData = useMemo(() => {
    return (analytics.categoryDistribution || []).map((item, index) => ({
      id: item.category,
      name: item.category,
      value: item.count,
      color: categoryColors[index % categoryColors.length],
    }));
  }, [analytics.categoryDistribution]);

  // Memoize KPI data for the professional KPI cards
  const kpiData = useMemo(() => {
    if (!analytics) return [];

    return [
      {
        id: "total-views",
        title: "Total Views",
        value: analytics.totalViews || 0,
        change: analytics.viewsComparison?.percentageChange || 0,
        trend: viewsOverTimeData.map((item) => ({
          date: item.date,
          value: item.views,
        })),
        icon: "Eye",
        variant: "info" as const,
      },
      {
        id: "positive-feedback",
        title: "Positive Feedback",
        value: Math.round(analytics.positiveRatingPercentage || 0),
        change: analytics.feedbackComparison?.positive?.percentageChange || 0,
        trend: timeSeriesData.map((item) => ({
          date: item.date,
          value: item.positive,
        })),
        icon: "ThumbsUp",
        variant: "success" as const,
      },
      {
        id: "negative-feedback",
        title: "Negative Feedback",
        value: Math.round(analytics.negativeRatingPercentage || 0),
        change: analytics.feedbackComparison?.negative?.percentageChange || 0,
        trend: timeSeriesData.map((item) => ({
          date: item.date,
          value: item.negative,
        })),
        icon: "ThumbsDown",
        variant: "danger" as const,
      },
      {
        id: "active-faqs",
        title: "Active FAQs",
        value: analytics.activeFaqs || 0,
        change: 0, // Would need historical data
        trend: [],
        icon: "HelpCircle",
        variant: "warning" as const,
      },
    ];
  }, [analytics, viewsOverTimeData, timeSeriesData]);

  // Memoize chart configurations with proper timeframe context
  const chartConfigs = useMemo(
    () => ({
      viewsOverTime: {
        title: `FAQ Views Over Time ${timeframe === "weekly" ? "Last 7 Days" : timeframe === "monthly" ? "Last 30 Days" : "Current Year"}`,
        metrics: ["views"],
        labels: {
          views: "Views",
        },
      },
      feedbackOverTime: {
        title: `Feedback Trends ${timeframe === "weekly" ? "Last 7 Days" : timeframe === "monthly" ? "Last 30 Days" : "Current Year"}`,
        type: "bar" as "bar",
        model: "feedback",
        metrics: ["positive", "negative"],
        labels: {
          positive: "Positive Feedback",
          negative: "Negative Feedback",
        },
      },
      categoryDistribution: {
        title: "FAQ Distribution by Category",
      },
    }),
    [timeframe]
  );

  // Get timeframe display label
  const getTimeframeLabel = useCallback((tf: TimeframeOption) => {
    switch (tf) {
      case "weekly":
        return "Last 7 Days";
      case "monthly":
        return "Last 30 Days";
      case "yearly":
        return "Current Year";
      default:
        return "Last 30 Days";
    }
  }, []);

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Knowledge Base",
          gradient: "from-sky-500/20 via-blue-500/20 to-sky-500/20",
          iconColor: "text-sky-500",
          textColor: "text-sky-600 dark:text-sky-400",
        }}
        title={[
          { text: "FAQ " },
          {
            text: "Analytics",
            gradient:
              "from-sky-600 via-blue-500 to-sky-600 dark:from-sky-400 dark:via-blue-400 dark:to-sky-400",
          },
        ]}
        description={t("comprehensive_insights_and_performance_metrics_for")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        background={{
          orbs: [
            {
              color: "#0ea5e9",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#3b82f6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#0ea5e9", "#3b82f6"],
          size: 8,
        }}
        rightContent={
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-[150px] border-sky-500/50">
                <SelectValue placeholder={tCommon("select_timeframe")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{tCommon("last_7_days")}</SelectItem>
                <SelectItem value="monthly">
                  {tCommon("last_30_days")}
                </SelectItem>
                <SelectItem value="yearly">
                  {tCommon("current_year")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        bottomSlot={
          <Card className="bg-card/50 backdrop-blur border-sky-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {analytics.totalViews?.toLocaleString() || "0"} Total Views
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {analytics.activeFaqs || 0} active FAQs in your knowledge base
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      />

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-8">
        {/* KPI Cards using professional analytics components */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {kpiData.map((kpi) => (
            <KpiCard
              key={kpi.id}
              id={kpi.id}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              variant={kpi.variant}
              icon={kpi.icon}
              loading={false}
              timeframe={getChartTimeframe(timeframe)}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search">{t("search_queries")}</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Views Over Time - Professional Line Chart */}
            <ChartCard
              chartKey="faq-views-over-time"
              config={chartConfigs.viewsOverTime}
              data={viewsOverTimeData}
              formatXAxis={(value) => value}
              width="full"
              loading={false}
              timeframe={getChartTimeframe(timeframe)}
            />

            {/* Category Distribution - Professional Donut Chart */}
            <StatusDistribution
              data={categoryData}
              config={chartConfigs.categoryDistribution}
              loading={false}
            />
          </div>

          {/* Top Performing FAQs */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("top_performing_faqs")}</CardTitle>
              <CardDescription>
                FAQs with the most views and positive feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.mostViewedFaqs &&
                analytics.mostViewedFaqs.length > 0 ? (
                  analytics.mostViewedFaqs.map((faq, index) => {
                    return (
                      <div
                        key={faq.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center">
                          <div className="bg-primary/10 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{faq.title}</p>
                            <div className="flex items-center mt-1 text-sm text-muted-foreground">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              <span className="mr-3">{faq.views} views</span>
                              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                              <span>
                                {faq.positiveRating
                                  ? faq.positiveRating.toFixed(0)
                                  : 0}
                                % {t("positive")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {index === 0 ? "Top performer" : `#${index + 1}`}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground">
                    {t("no_top_faqs_available")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Queries Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>{t("top_search_queries")}</CardTitle>
              <CardDescription>
                {t("most_common_search_terms_used_by_your_users")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topSearchQueries &&
                analytics.topSearchQueries.length > 0 ? (
                  analytics.topSearchQueries.map((item, index) => {
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center">
                          <div className="bg-primary/10 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <p className="font-medium">{item.query}</p>
                        </div>
                        <Badge variant="secondary">{item.count} searches</Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground">
                    {t("no_search_data_available")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>{t("feedback_analysis")}</CardTitle>
              <CardDescription>
                {t("user_feedback_trends_over_time")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col items-center justify-center p-6 border rounded-md">
                  <div className="text-5xl font-bold text-green-500">
                    {analytics.positiveRatingPercentage?.toFixed(0) || 0}%
                  </div>
                  <div className="flex items-center mt-2">
                    <ThumbsUp className="h-5 w-5 text-green-500 mr-1" />
                    <span className="font-medium">
                      {t("positive_feedback")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {t("percentage_of_users_who_found_faqs_helpful")}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 border rounded-md">
                  <div className="text-5xl font-bold text-red-500">
                    {analytics.negativeRatingPercentage?.toFixed(0) || 0}%
                  </div>
                  <div className="flex items-center mt-2">
                    <ThumbsDown className="h-5 w-5 text-red-500 mr-1" />
                    <span className="font-medium">
                      {t("negative_feedback")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {t("percentage_of_users_who_didnt_find_faqs_helpful")}
                  </p>
                </div>
              </div>

              {/* Professional Bar Chart for Feedback Trends */}
              <BarChart
                chartKey="faq-feedback-trends"
                config={chartConfigs.feedbackOverTime}
                data={timeSeriesData}
                formatXAxis={(value) => value}
                width="full"
                loading={false}
                timeframe={getChartTimeframe(timeframe)}
              />
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

// Export a function to get a basic report (faqs and categories) from the admin store.
export function getReport() {
  const store = useFAQAdminStore.getState();
  return {
    faqs: store.faqs,
    categories: store.categories,
  };
}

// Export the report endpoint (used in the store).
export const reportEndpoint = "/api/admin/faq/report";
