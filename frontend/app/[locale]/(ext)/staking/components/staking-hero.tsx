"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { userStakingStore } from "@/store/staking/user";
import { useStakingStatsStore } from "@/store/staking/stats-store";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/i18n/routing";
import { Lightbox } from "@/components/ui/lightbox";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function StakingHero() {
  const t = useTranslations("ext");
  const getPools = userStakingStore((state) => state.getPools);

  // Subscribe to staking stats store
  const stats = useStakingStatsStore((state) => state.stats);
  const statsLoading = useStakingStatsStore((state) => state.loading);
  const statsError = useStakingStatsStore((state) => state.error);
  const fetchStats = useStakingStatsStore((state) => state.fetchStats);

  const [isVisible, setIsVisible] = useState(false);
  const [featuredPool, setFeaturedPool] = useState<StakingPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const fetchFeaturedPool = async () => {
      setIsLoading(true);
      await Promise.all([getPools({ status: "ACTIVE" }), fetchStats()]);
      const activePools = userStakingStore.getState().pools;
      if (activePools && activePools.length > 0) {
        setFeaturedPool(activePools[0]);
      }
      setIsLoading(false);
    };

    fetchFeaturedPool();
  }, []);

  // Helper function to format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B+`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M+`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K+`;
    }
    return `$${num}`;
  };

  const formatUserCount = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M+`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K+`;
    }
    return num.toString();
  };

  return (
    <section className="min-h-screen relative py-24 overflow-hidden">
      {/* Epic background with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950"></div>

      {/* Animated grid */}
      <div className="absolute inset-0 bg-grid-white/10 dark:bg-grid-white/5 bg-[length:60px_60px] animate-pulse"></div>

      {/* Multiple floating orbs with different animations */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute top-40 right-20 w-64 h-64 bg-gradient-to-r from-purple-400/30 to-pink-500/30 rounded-full blur-2xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
      <div
        className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>
      <div
        className="absolute bottom-40 right-1/3 w-48 h-48 bg-gradient-to-r from-emerald-400/30 to-teal-500/30 rounded-full blur-xl animate-pulse"
        style={{ animationDelay: "3s" }}
      ></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => {
          // Generate deterministic positions based on index
          const left = ((i * 37 + 13) % 100);
          const top = ((i * 47 + 23) % 100);
          const delay = ((i * 31 + 7) % 50) / 10; // 0-5 seconds
          const duration = 3 + ((i * 41 + 17) % 40) / 10; // 3-7 seconds
          
          return (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary/20 rounded-full animate-bounce"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            ></div>
          );
        })}
      </div>

      <div className="container px-4 md:px-6 relative z-10">
        <div
          className={cn(
            "grid gap-16 items-center h-full min-h-[calc(100vh-12rem)]",
            featuredPool
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1 max-w-5xl mx-auto text-center"
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={cn("space-y-10", !featuredPool && "mx-auto")}
          >
            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={cn(
                "inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10 border border-primary/20 dark:border-primary/30 backdrop-blur-xl shadow-lg",
                !featuredPool && "mx-auto"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center mr-3">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {t("earn_up_to")}{" "}
                {statsLoading ? "..." : stats ? `${stats.avgApr}%` : "25%"}{" "}
                {t("apr_with_premium_staking")}
              </span>
            </motion.div>

            {/* Main heading with enhanced styling */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter"
              >
                <span className="relative inline-block text-zinc-900 dark:text-zinc-100">
                  {t("Maximize")}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-lg opacity-50"></div>
                </span>{" "}
                <span className="relative inline-block text-zinc-900 dark:text-zinc-100">
                  {t("Your")}
                </span>
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-primary via-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                    {t("crypto_returns")}
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 rounded-full"></div>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className={cn(
                  "mt-8 text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium",
                  featuredPool ? "max-w-[600px]" : "max-w-4xl mx-auto"
                )}
              >
                {t("stake_your_tokens_industry-leading_rewards")}.{" "}
                {t("join_the_future_staking_platform")}.
              </motion.p>
            </div>

            {/* Enhanced stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className={cn(
                "grid grid-cols-3 gap-6",
                !featuredPool && "max-w-2xl mx-auto"
              )}
            >
              {[
                {
                  label: "Total Staked",
                  value: statsLoading
                    ? "..."
                    : stats
                      ? formatNumber(stats.totalStaked)
                      : "$2.5B+",
                  icon: TrendingUp,
                },
                {
                  label: "Active Users",
                  value: statsLoading
                    ? "..."
                    : stats
                      ? formatUserCount(stats.activeUsers)
                      : "50K+",
                  icon: Shield,
                },
                {
                  label: "Avg APR",
                  value: statsLoading
                    ? "..."
                    : stats
                      ? `${stats.avgApr}%`
                      : "15.2%",
                  icon: Zap,
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-4 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-white/20 dark:border-zinc-700/50"
                >
                  <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {stat.value}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Enhanced CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className={cn(
                "flex flex-wrap gap-6 pt-4",
                !featuredPool && "justify-center"
              )}
            >
              <Link href="/staking/pool">
                <Button
                  size="lg"
                  className="relative group overflow-hidden h-16 px-10 bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/90 hover:via-blue-600/90 hover:to-purple-600/90 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center gap-3 text-lg">
                    {t("start_staking_now")}
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </Link>
              <Link href="/staking/guide">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 px-10 border-2 border-primary/30 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 font-bold rounded-2xl backdrop-blur-sm text-lg"
                >
                  {t("learn_more")}
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Enhanced featured pool card */}
          {featuredPool && (
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="relative"
              >
                {/* Glowing background */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 rounded-3xl blur opacity-30 animate-pulse"></div>

                <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-zinc-900/50 border border-white/20 dark:border-zinc-700/50 overflow-hidden">
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-5 dark:opacity-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-cyan-500/20"></div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-400/30 to-transparent rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-400/30 to-transparent rounded-full blur-xl"></div>
                  </div>

                  <div className="p-8 relative z-10">
                    {/* Pool header */}
                    <div className="flex items-center mb-8">
                      <motion.div
                        className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 mr-6 flex items-center justify-center backdrop-blur-sm border border-white/20 dark:border-zinc-700/50"
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        {featuredPool.icon ? (
                          <Lightbox
                            src={featuredPool.icon || "/img/placeholder.svg"}
                            alt={featuredPool.name}
                            className="w-16 h-16 rounded-2xl"
                          />
                        ) : (
                          <span className="text-primary font-bold text-2xl">
                            {featuredPool.symbol.substring(0, 1)}
                          </span>
                        )}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 to-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </motion.div>
                      <div>
                        <h3 className="font-bold text-2xl text-zinc-900 dark:text-zinc-100 mb-2">
                          {featuredPool.name}
                        </h3>
                        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="font-medium">
                            {t(
                              "Flexible term • High liquidity • Instant rewards"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* APR highlight */}
                      <div className="relative p-6 rounded-2xl bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 border border-green-200/50 dark:border-green-800/50 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 opacity-50"></div>
                        <div className="relative z-10 flex justify-between items-center">
                          <span className="text-zinc-600 dark:text-zinc-400 font-semibold">
                            {t("annual_percentage_rate")}
                          </span>
                          <div className="flex items-center">
                            <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                            <span className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              {featuredPool.apr}
                              % APR
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pool stats grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/50">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                            {t("lock_period")}
                          </div>
                          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {featuredPool.lockPeriod}{" "}
                            {t("days")}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/50">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                            {t("Min")}. {t("Stake")}
                          </div>
                          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {featuredPool.minStake} {featuredPool.symbol}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/50">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-zinc-500 dark:text-zinc-400">
                            {t("total_staked")}
                          </span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                            {featuredPool.totalStaked?.toLocaleString() ?? "0"}{" "}
                            {featuredPool.symbol}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Progress
                            value={
                              ((featuredPool.totalStaked ?? 0) /
                                ((featuredPool.totalStaked ?? 0) +
                                  (featuredPool.availableToStake ?? 0))) *
                              100
                            }
                            className="h-3"
                          />
                          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>{t("pool_capacity")}</span>
                            <span className="font-medium">
                              {Math.round(
                                ((featuredPool.totalStaked ?? 0) /
                                  ((featuredPool.totalStaked ?? 0) +
                                    (featuredPool.availableToStake ?? 0))) *
                                  100
                              )}
                              {t("%_filled")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CTA button */}
                      <Link href={`/staking/pool/${featuredPool.id}`}>
                        <Button className="w-full h-14 bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/90 hover:via-blue-600/90 hover:to-purple-600/90 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group text-lg">
                          <span className="flex items-center justify-center">
                            {t("stake_now")}
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
