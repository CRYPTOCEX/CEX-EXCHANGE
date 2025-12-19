"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Activity,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface TradeActivity {
  leaderDisplayName: string;
  symbol: string;
  side: "BUY" | "SELL";
  profit: number;
  profitPercent: number;
  timeAgo: string;
  followersCount: number;
}

interface LiveActivityFeedProps {
  recentTrades: TradeActivity[];
  isLoading?: boolean;
}

function TradeActivityCard({
  trade,
  index,
}: {
  trade: TradeActivity;
  index: number;
}) {
  const isProfitable = trade.profit >= 0;
  const isBuy = trade.side === "BUY";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-indigo-500/30 dark:hover:border-indigo-600/30 transition-all duration-300">
        {/* Trade Direction Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isProfitable
              ? "bg-emerald-500/10 dark:bg-emerald-600/20"
              : "bg-red-500/10 dark:bg-red-600/20"
          }`}
        >
          {isProfitable ? (
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
        </div>

        {/* Trade Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-900 dark:text-white truncate">
              {trade.leaderDisplayName}
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${
                isBuy
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
              }`}
            >
              {trade.side}
            </Badge>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {trade.symbol}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span
              className={`font-semibold ${
                isProfitable
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isProfitable ? "+" : ""}
              {trade.profitPercent.toFixed(2)}%
            </span>
            {trade.followersCount > 0 && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Users className="w-3 h-3" />
                {trade.followersCount} copied
              </span>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span>{trade.timeAgo}</span>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingItem() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
      <div className="flex-1">
        <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
      <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
    </div>
  );
}

export default function LiveActivityFeed({
  recentTrades,
  isLoading,
}: LiveActivityFeedProps) {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  if (isLoading) {
    return (
      <section className="py-24 relative">
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Badge
                variant="outline"
                className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-500/20"
              >
                <Activity className="w-4 h-4 text-indigo-500 mr-2 animate-pulse" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {tExt("live_activity") || "Live Activity"}
                </span>
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  {tCommon("recent_trades") || "Recent Trades"}
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <LoadingItem key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!recentTrades || recentTrades.length === 0) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      <div className="container mx-auto relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge
              variant="outline"
              className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-500/20"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 mr-2" />
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {tExt("live_activity") || "Live Activity"}
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                {tCommon("recent_trades") || "Recent Trades"}
              </span>
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {t("see_what_leaders_are_trading") ||
                "See what our top leaders are trading right now"}
            </p>
          </motion.div>

          {/* Activity Feed */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {recentTrades.map((trade, index) => (
                <TradeActivityCard
                  key={`${trade.leaderDisplayName}-${trade.symbol}-${trade.timeAgo}-${index}`}
                  trade={trade}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Live indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 mt-8 text-sm text-zinc-500 dark:text-zinc-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>{t("trades_from_last_24h") || "Trades from the last 24 hours"}</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
