"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  ArrowUpDown,
  DollarSign,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface ActivityItem {
  type: string;
  currency?: string;
  amount?: number;
  total?: number;
  timeAgo: string;
}

interface LiveActivitySectionProps {
  activity: ActivityItem[];
  isLoading?: boolean;
}

function ActivityCard({
  item,
  index,
}: {
  item: ActivityItem;
  index: number;
}) {
  const isTradeCompleted = item.type === "TRADE_COMPLETED";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300"
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isTradeCompleted
            ? "bg-emerald-500/10"
            : "bg-blue-500/10"
        }`}
      >
        {isTradeCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <ArrowUpDown className="w-5 h-5 text-blue-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
          {isTradeCompleted
            ? `${item.currency} trade completed`
            : "New activity"}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {item.timeAgo}
        </p>
      </div>

      {/* Amount */}
      {isTradeCompleted && item.amount && (
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          <span>{item.amount.toLocaleString()}</span>
          <span className="text-xs font-normal opacity-75">
            {item.currency}
          </span>
        </div>
      )}

      {/* Total */}
      {isTradeCompleted && item.total && (
        <div className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <DollarSign className="w-3 h-3" />
          {item.total.toLocaleString()}
        </div>
      )}
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex-1">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
    </div>
  );
}

export default function LiveActivitySection({
  activity,
  isLoading,
}: LiveActivitySectionProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const gradient = { from: "#3b82f6", to: "#8b5cf6" };

  if (!isLoading && (!activity || activity.length === 0)) {
    return null;
  }

  // Calculate stats from activity (with safety check for undefined)
  const safeActivity = activity || [];
  const totalVolume = safeActivity
    .filter((a) => a.type === "TRADE_COMPLETED" && a.total)
    .reduce((sum, a) => sum + (a.total || 0), 0);
  const tradeCount = safeActivity.filter((a) => a.type === "TRADE_COMPLETED").length;

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background line */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-500/20"
          >
            <Activity className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {tExt("live_activity") || "Live Activity"}
            </span>
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
            {tCommon("recent_trades") || "Recent Trades"}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            {tExt("see_whats_happening") ||
              "See what's happening on our platform right now"}
          </p>
        </motion.div>

        {/* Activity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [...Array(6)].map((_, i) => <LoadingCard key={i} />)
              : safeActivity.slice(0, 6).map((item, index) => (
                  <ActivityCard
                    key={`${item.type}-${index}`}
                    item={item}
                    index={index}
                  />
                ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        {!isLoading && safeActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex justify-center"
          >
            <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Recent volume:{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    ${totalVolume.toLocaleString()}
                  </span>
                </span>
              </div>
              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {tradeCount} {t("trades_completed") || "trades completed"}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
