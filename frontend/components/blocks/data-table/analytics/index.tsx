import React, { useEffect, useState } from "react";
import { useTableStore } from "../store";
import { AnalyticsHeader } from "./header";
import { ErrorState } from "./error-state";
import { KpiCard } from "./kpi";
import { StatusDistribution } from "./charts/donut";
import ChartCard from "./charts/line";
import BarChart from "./charts/bar";
import StackedBarChart from "./charts/stacked-bar";
import StackedAreaChart from "./charts/area";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  getResponsiveGridClasses,
  getResponsiveItemClasses,
  getSectionGridClasses,
} from "./utils/responsive-layout";

// Premium staggered container animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Section animation with slide up effect
const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// KPI grid stagger animation
const kpiContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Individual KPI card animation with scale
const kpiItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Chart card animation with fade and slide
const chartVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const Analytics: React.FC = () => {
  const t = useTranslations("components_blocks");
  const {
    analyticsConfig,
    analyticsData,
    analyticsLoading,
    analyticsError,
    fetchAnalyticsData,
    setAnalyticsError,
    initializeAnalyticsConfig,
  } = useTableStore();

  const [timeframe, setTimeframe] = useState("1y") as any;

  useEffect(() => {
    const initializeAndFetch = async () => {
      if (!analyticsConfig) {
        await initializeAnalyticsConfig();
      }
      if (!analyticsConfig) {
        setAnalyticsError("Failed to initialize analytics configuration");
        return;
      }
      try {
        await fetchAnalyticsData(timeframe);
      } catch (error) {
        console.error("Error in fetchData:", error);
        setAnalyticsError(
          error instanceof Error
            ? error.message
            : "Failed to fetch analytics data"
        );
      }
    };
    initializeAndFetch();
  }, [
    timeframe,
    fetchAnalyticsData,
    setAnalyticsError,
    analyticsConfig,
    initializeAnalyticsConfig,
  ]);

  if (!analyticsConfig || analyticsConfig.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">
            {t("no_analytics_configuration_available")}
          </p>
          <button
            onClick={() => initializeAnalyticsConfig()}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {t("initialize_analytics")}
          </button>
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <ErrorState
        error={analyticsError}
        onRetry={() => fetchAnalyticsData(timeframe)}
      />
    );
  }

  const renderAnalyticsItem = (item: any, index: number, sectionIndex: number) => {
    if (item.type === "kpi") {
      // Use responsive grid classes
      const gridClasses = getResponsiveGridClasses(
        item.responsive,
        item.layout?.cols,
        item.layout?.rows
      );
      const itemClasses = getResponsiveItemClasses(item.responsive);

      return (
        <motion.div
          key={`kpi-${sectionIndex}-${index}`}
          variants={kpiContainerVariants}
          initial="hidden"
          animate="visible"
          className={cn(gridClasses, itemClasses)}
        >
          {item.items.map((kpiConfig: any, i: number) => {
            const kpiData = analyticsData?.kpis?.find(
              (k: any) => k.id === kpiConfig.id
            );
            return (
              <motion.div key={kpiConfig.id} variants={kpiItemVariants}>
                <KpiCard
                  id={kpiConfig.id}
                  title={kpiConfig.title}
                  icon={kpiConfig.icon}
                  value={kpiData?.value}
                  change={kpiData?.change}
                  trend={kpiData?.trend || []}
                  variant={["success", "info", "warning", "danger"][i % 4] as any}
                  loading={analyticsLoading}
                  timeframe={timeframe}
                />
              </motion.div>
            );
          })}
        </motion.div>
      );
    } else if (item.type === "chart") {
      const itemClasses = getResponsiveItemClasses(item.responsive);

      return item.items.map((chartConfig: any, i: number) => {
        const chartDelay = sectionIndex * 0.15 + i * 0.1;
        const chartElement = (() => {
          switch (chartConfig.type) {
            case "pie":
              return (
                <StatusDistribution
                  key={chartConfig.id}
                  data={analyticsData?.[chartConfig.id] || []}
                  config={chartConfig}
                  className="h-full"
                  loading={analyticsLoading}
                />
              );
            case "bar":
              return (
                <BarChart
                  key={chartConfig.id}
                  chartKey={chartConfig.id}
                  config={chartConfig}
                  data={analyticsData?.[chartConfig.id] || []}
                  formatXAxis={(value) => value}
                  width="full"
                  loading={analyticsLoading}
                  timeframe={timeframe}
                />
              );
            case "stackedBar":
              return (
                <StackedBarChart
                  key={chartConfig.id}
                  chartKey={chartConfig.id}
                  config={chartConfig}
                  data={analyticsData?.[chartConfig.id] || []}
                  formatXAxis={(value) => value}
                  width="full"
                  loading={analyticsLoading}
                  timeframe={timeframe}
                />
              );
            case "stackedArea":
              return (
                <StackedAreaChart
                  key={chartConfig.id}
                  chartKey={chartConfig.id}
                  config={chartConfig}
                  data={analyticsData?.[chartConfig.id] || []}
                  formatXAxis={(value) => value}
                  width="full"
                  loading={analyticsLoading}
                  timeframe={timeframe}
                />
              );
            default:
              return (
                <ChartCard
                  key={chartConfig.id}
                  chartKey={chartConfig.id}
                  config={chartConfig}
                  data={analyticsData?.[chartConfig.id] || []}
                  formatXAxis={(value) => value}
                  width="full"
                  loading={analyticsLoading}
                  timeframe={timeframe}
                />
              );
          }
        })();

        return (
          <motion.div
            key={chartConfig.id}
            variants={chartVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: chartDelay }}
            className={itemClasses}
          >
            {chartElement}
          </motion.div>
        );
      });
    }
    return null;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <AnalyticsHeader timeframe={timeframe} onTimeframeChange={setTimeframe} />
      <motion.div variants={sectionVariants} className="grid gap-6">
        {analyticsConfig.map((section: any, index: number) => {
          const isArray = Array.isArray(section);
          const sectionGridClasses = getSectionGridClasses(isArray);

          return (
            <motion.div
              key={index}
              variants={sectionVariants}
              className={sectionGridClasses}
            >
              {isArray
                ? section.map((subItem: any, subIndex: number) =>
                    renderAnalyticsItem(subItem, subIndex, index)
                  )
                : renderAnalyticsItem(section, index, index)}
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
