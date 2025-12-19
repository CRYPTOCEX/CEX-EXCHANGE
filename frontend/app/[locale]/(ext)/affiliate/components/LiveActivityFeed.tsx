"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Zap,
  Activity,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface ActivityItem {
  type: "reward_earned";
  amount: number;
  conditionType: string;
  conditionName: string;
  currency: string;
  timeAgo: string;
}

interface LiveActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

const conditionIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
  TRADE: TrendingUp,
  DEPOSIT: DollarSign,
  INVESTMENT: TrendingUp,
  AI_INVESTMENT: Zap,
  FOREX_INVESTMENT: TrendingUp,
  STAKING: DollarSign,
  ICO_CONTRIBUTION: Zap,
  ECOMMERCE_PURCHASE: DollarSign,
  P2P_TRADE: TrendingUp,
};

function ActivityItemCard({
  activity,
  index,
}: {
  activity: ActivityItem;
  index: number;
}) {
  const IconComponent = conditionIcons[activity.conditionType] || DollarSign;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-blue-500/30 dark:hover:border-blue-600/30 transition-all duration-300">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <IconComponent className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-white">
              Someone earned
            </span>
            <motion.span
              className="text-sm font-bold text-green-600 dark:text-green-400"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              +${activity.amount.toFixed(2)}
            </motion.span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            from {activity.conditionName || activity.conditionType.toLowerCase().replace(/_/g, " ")}
          </p>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span>{activity.timeAgo}</span>
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
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-1" />
        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
      <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
    </div>
  );
}

export default function LiveActivityFeed({
  activities,
  isLoading,
}: LiveActivityFeedProps) {
  const t = useTranslations("ext_affiliate");
  const tExt = useTranslations("ext");

  if (isLoading) {
    return (
      <section className="py-24 relative">
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Badge
                variant="outline"
                className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20"
              >
                <Activity className="w-4 h-4 text-green-500 mr-2 animate-pulse" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Live Activity
                </span>
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
                  Real-Time Earnings
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

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />

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
              className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20"
            >
              <Sparkles className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {tExt("live_activity") || "Live Activity"}
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
                {t("real_time_earnings") || "Real-Time Earnings"}
              </span>
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {t("see_what_our_affiliates_are_earning") ||
                "See what our affiliates are earning right now"}
            </p>
          </motion.div>

          {/* Activity Feed */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {activities.map((activity, index) => (
                <ActivityItemCard
                  key={`${activity.conditionType}-${activity.timeAgo}-${index}`}
                  activity={activity}
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>Activity from the last 30 days</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
