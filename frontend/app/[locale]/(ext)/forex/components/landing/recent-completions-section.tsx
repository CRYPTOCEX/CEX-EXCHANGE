"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface RecentCompletion {
  planName: string;
  result: "WIN" | "LOSS" | "DRAW";
  profit: number;
  profitPercent: number;
  duration: string;
  timeAgo: string;
  anonymizedUser: string;
}

interface RecentCompletionsSectionProps {
  completions: RecentCompletion[];
  isLoading?: boolean;
}

const resultConfig = {
  WIN: {
    icon: TrendingUp,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    label: "Profit",
  },
  LOSS: {
    icon: TrendingDown,
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    label: "Loss",
  },
  DRAW: {
    icon: Minus,
    bg: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-400",
    border: "border-zinc-500/20",
    label: "Break Even",
  },
};

function CompletionCard({
  completion,
  index,
}: {
  completion: RecentCompletion;
  index: number;
}) {
  const config = resultConfig[completion.result] || resultConfig.DRAW;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`flex items-center gap-4 p-4 rounded-xl bg-white/80 dark:bg-zinc-900/80 border ${config.border} hover:shadow-md transition-all duration-300`}
    >
      {/* Result Icon */}
      <div
        className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-5 h-5 ${config.text}`} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-zinc-900 dark:text-white truncate">
            {completion.anonymizedUser}
          </span>
          <Badge
            variant="outline"
            className={`${config.bg} ${config.text} ${config.border} text-xs`}
          >
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
          {completion.planName} • {completion.duration}
        </p>
      </div>

      {/* Profit/Loss Amount */}
      <div className="text-right flex-shrink-0">
        <p className={`font-bold ${config.text}`}>
          {completion.result === "WIN" ? "+" : completion.result === "LOSS" ? "-" : ""}
          {Math.abs(completion.profitPercent).toFixed(1)}%
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
          {completion.timeAgo}
        </p>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex-1">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="text-right">
        <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
        <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export default function RecentCompletionsSection({
  completions,
  isLoading,
}: RecentCompletionsSectionProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  if (!isLoading && (!completions || completions.length === 0)) {
    return null;
  }

  return (
    <section className="py-20 relative overflow-hidden">
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
            <Activity className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {tExt("live_activity") || "Live Activity"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("recent") || "Recent"}{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t("completions") || "Completions"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("see_how_investors_are_performing") ||
              "See how investors are performing on our platform in real-time"}
          </p>
        </motion.div>

        {/* Completions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [...Array(6)].map((_, i) => <LoadingCard key={i} />)
              : completions.slice(0, 6).map((completion, index) => (
                  <CompletionCard
                    key={`${completion.anonymizedUser}-${index}`}
                    completion={completion}
                    index={index}
                  />
                ))}
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        {!isLoading && completions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex justify-center"
          >
            <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {completions.filter((c) => c.result === "WIN").length}
                  </span>{" "}
                  {t("wins") || "wins"}
                </span>
              </div>
              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("from_last") || "from last"} {completions.length}{" "}
                {tCommon("investments") || "investments"}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
