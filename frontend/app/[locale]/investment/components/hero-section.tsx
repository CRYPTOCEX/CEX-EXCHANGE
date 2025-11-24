"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import {
  TrendingUp,
  Shield,
  Target,
  Zap,
  ArrowRight,
  DollarSign,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useInvestmentStore } from "@/store/investment/user";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface HeroSectionProps {
  onStatsLoaded?: () => void;
}

export function HeroSection({ onStatsLoaded }: HeroSectionProps) {
  const t = useTranslations("investment/components/hero-section");
  const { stats, statsLoading } = useInvestmentStore();

  useEffect(() => {
    if (stats && onStatsLoaded) {
      onStatsLoaded();
    }
  }, [stats, onStatsLoaded]);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M+`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K+`;
    }
    return `$${amount.toLocaleString()}`;
  };

  // Format percentage
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-zinc-950 dark:via-blue-950/20 dark:to-purple-950/20">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated background shapes */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"
        />

        {/* Floating icons */}
        <motion.div
          animate={{
            y: [-10, 10, -10],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-20 text-blue-500/30 dark:text-blue-400/30"
        >
          <TrendingUp size={40} />
        </motion.div>
        <motion.div
          animate={{
            y: [10, -10, 10],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-40 right-32 text-purple-500/30 dark:text-purple-400/30"
        >
          <BarChart3 size={35} />
        </motion.div>
        <motion.div
          animate={{
            y: [-15, 15, -15],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-32 left-32 text-indigo-500/30 dark:text-indigo-400/30"
        >
          <PieChart size={30} />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300"
              >
                <Zap className="w-4 h-4" />
                {t("smart_investment_platform")}
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-5xl lg:text-7xl font-bold leading-tight"
              >
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {t("grow_your")}
                </span>
                <br />
                <span className="text-zinc-900 dark:text-zinc-100">
                  {t("wealth_smart")}
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-xl text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-lg"
              >
                {t("discover_intelligent_investment_curated_plans")}{" "}
                {t("start_building_your_transparent_returns")}
              </motion.p>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-white/20 dark:border-zinc-700/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {t("Secure")}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {t("bank-grade_security")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-white/20 dark:border-zinc-700/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {t("Targeted")}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {t("high-yield_plans")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-white/20 dark:border-zinc-700/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {t("Profitable")}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {t("proven_returns")}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/investment/plan">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    {t("explore_plans")}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/investment/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300"
                  >
                    {t("view_dashboard")}
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Content - Stats Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-6">
                {/* Stats Card 1 - Total Invested */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-zinc-700/50 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-green-500 text-sm font-medium">
                      {statsLoading
                        ? "..."
                        : stats?.averageReturn
                          ? `+${formatPercentage(stats.averageReturn)}`
                          : "+0%"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? formatCurrency(stats.totalInvested)
                        : "$0"}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    {t("total_invested")}
                  </p>
                </motion.div>

                {/* Stats Card 2 - Active Investors */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-zinc-700/50 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-blue-500 text-sm font-medium">
                      {t("Active")}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? stats.activeInvestors.toLocaleString()
                        : "0"}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    {t("active_investors")}
                  </p>
                </motion.div>

                {/* Stats Card 3 - Average Returns */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-zinc-700/50 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <PieChart className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-purple-500 text-sm font-medium">
                      {t("ROI")}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? formatPercentage(stats.averageReturn)
                        : "0%"}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    {t("Avg")} {t("Returns")}
                  </p>
                </motion.div>

                {/* Stats Card 4 - Investment Plans */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-zinc-700/50 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-orange-500 text-sm font-medium">
                      {t("Plans")}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? `${stats.totalPlans}+`
                        : "0+"}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    {t("investment_plans")}
                  </p>
                </motion.div>
              </div>

              {/* Floating decoration */}
              <motion.div
                animate={{
                  y: [-5, 5, -5],
                  rotate: [0, 2, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-xl"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
