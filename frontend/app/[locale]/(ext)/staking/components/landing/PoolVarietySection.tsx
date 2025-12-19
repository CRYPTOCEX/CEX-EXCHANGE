"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  Zap,
  Timer,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface HighAprPool {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  apr: number;
  lockPeriod: number;
  earningFrequency: string;
}

interface FlexiblePool {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  apr: number;
  lockPeriod: number;
  earlyWithdrawalFee: number;
}

interface UpcomingPool {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  description: string;
  apr: number;
  lockPeriod: number;
}

interface PoolVarietySectionProps {
  highestAprPools: HighAprPool[];
  flexiblePools: FlexiblePool[];
  upcomingPools: UpcomingPool[];
  isLoading?: boolean;
}

type TabType = "high-apr" | "flexible" | "coming-soon";

function HighAprCard({ pool, index }: { pool: HighAprPool; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group"
    >
      <Link href={`/staking/pool/${pool.id}`}>
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 hover:border-violet-500/50 dark:hover:border-violet-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 dark:bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
              {pool.icon ? (
                <img
                  src={pool.icon}
                  alt={pool.name}
                  className="w-7 h-7 rounded-lg"
                />
              ) : (
                <span className="font-bold text-lg text-violet-600 dark:text-violet-400">
                  {pool.symbol?.substring(0, 1)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {pool.name}
              </h4>
              <p className="text-sm text-zinc-500">{pool.symbol}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xl font-bold">{pool.apr}%</span>
              </div>
              <p className="text-xs text-zinc-500">APR</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{pool.lockPeriod} days lock</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {pool.earningFrequency.toLowerCase()}
            </Badge>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function FlexibleCard({ pool, index }: { pool: FlexiblePool; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group"
    >
      <Link href={`/staking/pool/${pool.id}`}>
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-indigo-200/50 dark:border-indigo-800/50 hover:border-indigo-500/50 dark:hover:border-indigo-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
              {pool.icon ? (
                <img
                  src={pool.icon}
                  alt={pool.name}
                  className="w-7 h-7 rounded-lg"
                />
              ) : (
                <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                  {pool.symbol?.substring(0, 1)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {pool.name}
              </h4>
              <p className="text-sm text-zinc-500">{pool.symbol}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                <Zap className="w-4 h-4" />
                <span className="text-xl font-bold">{pool.apr}%</span>
              </div>
              <p className="text-xs text-zinc-500">APR</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Timer className="w-3.5 h-3.5" />
              <span>
                {pool.lockPeriod === 0 ? "No lock" : `${pool.lockPeriod} days`}
              </span>
            </div>
            {pool.earlyWithdrawalFee > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {pool.earlyWithdrawalFee}% early withdrawal fee
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function UpcomingCard({ pool, index }: { pool: UpcomingPool; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/5 to-indigo-500/5 dark:from-violet-600/10 dark:to-indigo-600/10 border border-dashed border-violet-300/50 dark:border-violet-700/50">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 dark:bg-violet-600/20 border border-violet-500/20 flex items-center justify-center relative">
            {pool.icon ? (
              <img
                src={pool.icon}
                alt={pool.name}
                className="w-7 h-7 rounded-lg opacity-60"
              />
            ) : (
              <span className="font-bold text-lg text-violet-600/60 dark:text-violet-400/60">
                {pool.symbol?.substring(0, 1)}
              </span>
            )}
            <div className="absolute -top-1 -right-1">
              <Rocket className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300">
                {pool.name}
              </h4>
              <Badge
                variant="outline"
                className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-zinc-500">{pool.symbol}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-zinc-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xl font-bold">{pool.apr}%</span>
            </div>
            <p className="text-xs text-zinc-400">Est. APR</p>
          </div>
        </div>
        {pool.description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {pool.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export default function PoolVarietySection({
  highestAprPools,
  flexiblePools,
  upcomingPools,
  isLoading,
}: PoolVarietySectionProps) {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<TabType>("high-apr");

  const tabs = [
    {
      id: "high-apr" as TabType,
      label: t("highest_apr") || "Highest APR",
      icon: TrendingUp,
      count: highestAprPools.length,
    },
    {
      id: "flexible" as TabType,
      label: t("flexible_staking") || "Flexible",
      icon: Timer,
      count: flexiblePools.length,
    },
    {
      id: "coming-soon" as TabType,
      label: tCommon("coming_soon") || "Coming Soon",
      icon: Rocket,
      count: upcomingPools.length,
    },
  ];

  // Only show section if we have pools to display
  const hasPools =
    highestAprPools.length > 0 ||
    flexiblePools.length > 0 ||
    upcomingPools.length > 0;

  if (!isLoading && !hasPools) {
    return null;
  }

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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/20"
          >
            <Sparkles className="w-4 h-4 text-violet-500 mr-2" />
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
              {t("pool_variety") || "Pool Variety"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("find_the_perfect_pool") || "Find the Perfect Pool"}
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("choose_from_high_yield_pools") ||
              "Choose from high-yield, flexible, or upcoming pools to match your staking strategy"}
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                    ${
                      isActive
                        ? "bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`
                      text-xs px-1.5 py-0.5 rounded-full
                      ${
                        isActive
                          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                      }
                    `}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Pool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <>
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
              </>
            ) : activeTab === "high-apr" ? (
              highestAprPools.map((pool, index) => (
                <HighAprCard key={pool.id} pool={pool} index={index} />
              ))
            ) : activeTab === "flexible" ? (
              flexiblePools.map((pool, index) => (
                <FlexibleCard key={pool.id} pool={pool} index={index} />
              ))
            ) : (
              upcomingPools.map((pool, index) => (
                <UpcomingCard key={pool.id} pool={pool} index={index} />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link href="/staking/pool">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 rounded-xl border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 group"
            >
              {tCommon("explore_all_pools") || "Explore All Pools"}
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
