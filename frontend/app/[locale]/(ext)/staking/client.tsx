"use client";

import { useEffect, useMemo } from "react";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  Star,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { userStakingStore } from "@/store/staking/user";
import { useStakingStatsStore } from "@/store/staking/stats-store";
import StakingHero from "./components/staking-hero";
import { motion } from "framer-motion";
import AnimatedPoolCard from "./components/animated-pool-card";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";
import { StakingErrorBoundary, StakingError } from "@/app/[locale]/(ext)/staking/components/staking-error-boundary";
import { StakingPoolsLoading, StakingStatsLoading } from "@/app/[locale]/(ext)/staking/components/staking-loading";

export default function StakingLanding() {
  const t = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  // Subscribe to global store state for pools, loading, and error.
  const pools = userStakingStore((state) => state.pools);
  const isLoading = userStakingStore((state) => state.isLoading);
  const error = userStakingStore((state) => state.error);
  const getPools = userStakingStore((state) => state.getPools);

  // Subscribe to staking stats store
  const stats = useStakingStatsStore((state) => state.stats);
  const statsLoading = useStakingStatsStore((state) => state.loading);
  const statsError = useStakingStatsStore((state) => state.error);
  const fetchStats = useStakingStatsStore((state) => state.fetchStats);

  useEffect(() => {
    // Fetch active pools and stats on mount.
    getPools({ status: "ACTIVE" });
    fetchStats();
  }, []);

  // Compute featured pools using memoization.
  const featuredPools = useMemo(() => {
    return pools.filter((pool) => pool.isPromoted).slice(0, 3);
  }, [pools]);

  const hasFeaturedPools = !isLoading && !error && featuredPools.length > 0;

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

  // KYC/feature gating logic
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasStakingAccess = hasKyc() && canAccessFeature("view_staking");

  if (kycEnabled && !hasStakingAccess) {
    return <KycRequiredNotice feature="view_staking" />;
  }

  return (
    <StakingErrorBoundary>
      <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Global background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950"></div>
      <div className="fixed inset-0 bg-grid-white/10 dark:bg-grid-white/5 bg-[length:50px_50px]"></div>

      {/* Floating orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="fixed bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "4s" }}
      ></div>

      <div className="relative z-10">
        <StakingHero />

        {/* How it works section */}
        <section className="py-24 relative">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center text-center mb-16"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 dark:border-primary/30 mb-6">
                <Sparkles className="w-4 h-4 text-primary mr-2" />
                <span className="text-sm font-semibold text-primary">
                  {t("how_it_works")}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-100 bg-clip-text text-transparent">
                {t("start_earning_in_4_simple_steps")}
              </h2>
              <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                {t("our_streamlined_staking_institutional-grade_security")}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Target,
                  title: "Choose a Pool",
                  description:
                    "Browse our curated selection of high-yield staking pools with competitive APRs and flexible terms.",
                  gradient: "from-blue-500 to-cyan-500",
                  delay: 0,
                },
                {
                  icon: Shield,
                  title: "Stake Your Assets",
                  description:
                    "Securely deposit your crypto assets with our enterprise-grade infrastructure and smart contract security.",
                  gradient: "from-emerald-500 to-teal-500",
                  delay: 0.1,
                },
                {
                  icon: TrendingUp,
                  title: "Earn Rewards",
                  description:
                    "Watch your rewards accumulate automatically based on the pool's APR with real-time tracking.",
                  gradient: "from-purple-500 to-pink-500",
                  delay: 0.2,
                },
                {
                  icon: Zap,
                  title: "Withdraw Anytime",
                  description:
                    "Access your staked assets and rewards with flexible withdrawal options and minimal fees.",
                  gradient: "from-orange-500 to-red-500",
                  delay: 0.3,
                },
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: step.delay }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative"
                >
                  {/* Glowing background */}
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r ${step.gradient} rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300`}
                  ></div>

                  <Card className="relative h-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-zinc-700/50 rounded-2xl overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5 dark:opacity-10">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${step.gradient}/20`}
                      ></div>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/30 to-transparent rounded-full blur-xl"></div>
                    </div>

                    <CardHeader className="pb-4 relative z-10">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} p-0.5 mb-6 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center">
                          <step.icon className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured pools section */}
        {isLoading ? (
          <section className="py-24 relative">
            <div className="container px-4 md:px-6">
              <StakingPoolsLoading />
            </div>
          </section>
        ) : error ? (
          <section className="py-24 relative">
            <div className="container px-4 md:px-6">
              <StakingError error={new Error(error)} />
            </div>
          </section>
        ) : hasFeaturedPools && (
          <section className="py-24 relative">
            <div className="container px-4 md:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center text-center mb-16"
              >
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-amber-500/30 mb-6">
                  <Star className="w-4 h-4 text-amber-500 mr-2" />
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {t("featured_pools")}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-100 bg-clip-text text-transparent">
                  {t("top-performing_staking_pools")}
                </h2>
                <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                  {t("discover_our_handpicked_track_records")}
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredPools.map((pool, index) => (
                  <AnimatedPoolCard key={pool.id} pool={pool} index={index} />
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex justify-center mt-16"
              >
                <Link href="/staking/pool">
                  <Button
                    size="lg"
                    className="h-14 px-8 bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/90 hover:via-blue-600/90 hover:to-purple-600/90 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group"
                  >
                    <span className="flex items-center">
                      {t("explore_all_pools")}
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </Link>
              </motion.div>
            </div>
          </section>
        )}

        {/* Benefits section */}
        <section className="py-24 relative">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-green-500/30 mb-6">
                  <Users className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {t("why_choose_us")}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-100 bg-clip-text text-transparent">
                  {t("the_future_of_staking_is_here")}
                </h2>
                <ul className="space-y-8">
                  {[
                    {
                      icon: Shield,
                      title: "Bank-Grade Security",
                      description:
                        "Multi-signature wallets, cold storage, and 24/7 monitoring protect your assets with institutional-level security.",
                      gradient: "from-blue-500 to-cyan-500",
                    },
                    {
                      icon: TrendingUp,
                      title: "Maximum Returns",
                      description:
                        "Optimized staking strategies and direct validator relationships ensure you earn the highest possible rewards.",
                      gradient: "from-green-500 to-emerald-500",
                    },
                    {
                      icon: Zap,
                      title: "Lightning Fast",
                      description:
                        "Instant staking, real-time rewards tracking, and rapid withdrawals with our cutting-edge infrastructure.",
                      gradient: "from-purple-500 to-pink-500",
                    },
                  ].map((benefit, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="flex items-start group"
                    >
                      <div
                        className={`mr-6 mt-2 bg-gradient-to-br ${benefit.gradient} p-0.5 rounded-xl group-hover:scale-110 transition-transform duration-300`}
                      >
                        <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                          <benefit.icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl mb-3 text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                          {benefit.title}
                        </h3>
                        <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="relative h-[600px] rounded-3xl overflow-hidden group">
                  {/* Glowing border */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>

                  <div className="relative h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-3xl overflow-hidden">
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/20 to-transparent rounded-full blur-2xl"></div>

                    {/* Content overlay */}
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="text-center text-white">
                        <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                          <TrendingUp className="w-12 h-12" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">
                          {statsLoading
                            ? "Loading..."
                            : stats
                              ? formatNumber(stats.totalStaked)
                              : "$2.5B+"}{" "}
                          {t("Staked")}
                        </h3>
                        <p className="text-xl opacity-90 mb-6">
                          {t("trusted_by")}{" "}
                          {statsLoading
                            ? "..."
                            : stats
                              ? formatUserCount(stats.activeUsers)
                              : "50,000+"}{" "}
                          {t("users_worldwide")}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-2xl font-bold">
                              {statsLoading
                                ? "..."
                                : stats
                                  ? `${stats.avgApr}%`
                                  : "15.2%"}
                            </div>
                            <div className="text-sm opacity-80">
                              {t("avg_apr")}
                            </div>
                          </div>
                          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-2xl font-bold">
                              {statsLoading
                                ? "..."
                                : stats
                                  ? formatNumber(stats.totalRewards)
                                  : "$500M+"}
                            </div>
                            <div className="text-sm opacity-80">
                              {t("total_rewards")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-24 relative">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Glowing background */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 rounded-3xl blur opacity-30"></div>

              <div className="relative bg-gradient-to-r from-primary via-blue-600 to-purple-600 rounded-3xl overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-white/20 to-transparent rounded-full blur-2xl"></div>

                <div className="relative z-10 px-8 py-16 md:px-16 md:py-24 text-center text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                      {t("ready_to_start_earning")}
                    </h2>
                    <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-90 leading-relaxed">
                      {t("join_thousands_of_staking_platform")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/staking/pool">
                        <Button
                          size="lg"
                          variant="secondary"
                          className="h-14 px-8 bg-white text-primary dark:text-primary-foreground hover:bg-white/90 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group"
                        >
                          <span className="flex items-center">
                            {t("start_staking_now")}
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </Button>
                      </Link>
                      <Link href="/staking/guide">
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-14 px-8 border-white/30 text-black dark:text-primary hover:bg-white/10 font-semibold rounded-2xl backdrop-blur-sm"
                        >
                          {t("learn_more")}
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
    </StakingErrorBoundary>
  );
}
