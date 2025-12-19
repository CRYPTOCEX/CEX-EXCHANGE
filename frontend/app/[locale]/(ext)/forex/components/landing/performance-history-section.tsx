"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface PerformanceMonth {
  month: string;
  totalInvested: number;
  totalProfit: number;
  avgReturn: number;
  completions: number;
}

interface PerformanceHistorySectionProps {
  history: PerformanceMonth[];
  isLoading?: boolean;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function BarChart({
  data,
  isLoading,
}: {
  data: PerformanceMonth[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    // Fixed heights for skeleton to avoid hydration mismatch
    const skeletonHeights = ['45%', '70%', '55%', '85%', '60%', '75%'];

    return (
      <div className="flex items-end justify-between gap-3 h-48">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-t animate-pulse"
              style={{ height: skeletonHeights[i] }}
            />
            <div className="h-3 w-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.totalInvested), 1);

  return (
    <div className="flex items-end justify-between gap-3 h-48">
      {data.map((month, index) => {
        const heightPercent = (month.totalInvested / maxValue) * 100;
        const isPositive = month.totalProfit >= 0;

        return (
          <motion.div
            key={month.month}
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 1, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="flex-1 flex flex-col items-center gap-2 group"
            style={{ transformOrigin: "bottom" }}
          >
            {/* Tooltip */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg">
                <p className="font-semibold">{month.month}</p>
                <p>Invested: {formatCurrency(month.totalInvested)}</p>
                <p className={isPositive ? "text-emerald-400" : "text-red-400"}>
                  Profit: {isPositive ? "+" : ""}
                  {formatCurrency(month.totalProfit)}
                </p>
                <p>Return: {month.avgReturn}%</p>
              </div>
            </div>

            {/* Bar */}
            <div className="relative w-full flex justify-center">
              <div
                className={`w-full max-w-12 rounded-t-lg transition-all duration-300 group-hover:opacity-80 ${
                  isPositive
                    ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                    : "bg-gradient-to-t from-red-600 to-red-400"
                }`}
                style={{ height: `${Math.max(heightPercent, 10)}%` }}
              />
            </div>

            {/* Month Label */}
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {month.month}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: { value: number; positive: boolean };
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div>
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-4 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-zinc-900 dark:text-white">
              {value}
            </p>
            {trend && (
              <span
                className={`flex items-center text-xs font-medium ${
                  trend.positive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {trend.positive ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function PerformanceHistorySection({
  history,
  isLoading,
}: PerformanceHistorySectionProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  if (!isLoading && (!history || history.length === 0)) {
    return null;
  }

  // Calculate summary stats
  const totalInvested = history.reduce((sum, m) => sum + m.totalInvested, 0);
  const totalProfit = history.reduce((sum, m) => sum + m.totalProfit, 0);
  const totalCompletions = history.reduce((sum, m) => sum + m.completions, 0);
  const avgReturn =
    history.length > 0
      ? history.reduce((sum, m) => sum + m.avgReturn, 0) / history.length
      : 0;

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
          >
            <BarChart3 className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t("platform_performance") || "Platform Performance"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tExt("monthly") || "Monthly"}{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {tExt("performance_history") || "Performance History"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("track_our_consistent_performance") ||
              "Track our consistent performance over the last 6 months"}
          </p>
        </motion.div>

        {/* Chart and Stats */}
        <div className="max-w-5xl mx-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              icon={DollarSign}
              label={tCommon("total_invested") || "Total Invested"}
              value={formatCurrency(totalInvested)}
              isLoading={isLoading}
            />
            <StatCard
              icon={TrendingUp}
              label={tExt("total_profit") || "Total Profit"}
              value={formatCurrency(totalProfit)}
              trend={
                totalProfit !== 0
                  ? { value: avgReturn, positive: totalProfit >= 0 }
                  : undefined
              }
              isLoading={isLoading}
            />
            <StatCard
              icon={CheckCircle}
              label={t("completions") || "Completions"}
              value={totalCompletions.toString()}
              isLoading={isLoading}
            />
            <StatCard
              icon={BarChart3}
              label={t("avg_return") || "Avg Return"}
              value={`${avgReturn.toFixed(1)}%`}
              isLoading={isLoading}
            />
          </div>

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 md:p-8 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                {t("monthly_investments") || "Monthly Investments"}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {tCommon("profit") || "Profit"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {tCommon("loss") || "Loss"}
                  </span>
                </div>
              </div>
            </div>
            <BarChart data={history} isLoading={isLoading} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
