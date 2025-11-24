"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Clock,
  Star,
} from "lucide-react";
import { useInvestmentStore } from "@/store/investment/user";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export function CTASection() {
  const t = useTranslations("investment/components/cta-section");
  const { stats, statsLoading } = useInvestmentStore();

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
    <section className="py-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-zinc-950 dark:via-blue-950/20 dark:to-purple-950/20 relative overflow-hidden">
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
          className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"
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
          className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl"
        />

        {/* Floating elements */}
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
          className="absolute top-20 left-20 text-blue-500/20 dark:text-blue-400/20"
        >
          <Star size={30} />
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
          className="absolute top-40 right-32 text-purple-500/20 dark:text-purple-400/20"
        >
          <Sparkles size={25} />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-8"
            >
              <Sparkles className="w-4 h-4" />
              {t("start_your_investment_journey")}
            </motion.div>

            {/* Main Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-4xl lg:text-6xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 leading-tight"
            >
              {t("ready_to")}{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {t("grow_your_wealth")}
              </span>
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-xl text-zinc-600 dark:text-zinc-300 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              {t("join_thousands_of_expert_guidance")}
            </motion.p>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
            >
              <div className="flex items-center justify-center gap-3 p-4 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-zinc-700/50">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    {t("high_returns")}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? `Up to ${formatPercentage(stats.maxProfitPercentage)} annually`
                        : "Competitive returns"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 p-4 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-zinc-700/50">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    {t("secure_platform")}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t("bank-grade_security")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 p-4 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-zinc-700/50">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    {t("quick_start")}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t("invest_in_5_minutes")}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/investment/plan">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 group px-8 py-4 text-lg"
                >
                  {t("start_investing_now")}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link href="/investment/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300 px-8 py-4 text-lg"
                >
                  {t("view_dashboard")}
                </Button>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              viewport={{ once: true }}
              className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-700"
            >
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                {t("trusted_by_investors_worldwide")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? formatCurrency(stats.totalInvested)
                        : "$0"}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t("total_invested")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? stats.activeInvestors.toLocaleString()
                        : "0"}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t("active_investors")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? formatPercentage(stats.averageReturn)
                        : "0%"}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t("average_returns")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {statsLoading
                      ? "Loading..."
                      : stats
                        ? `${stats.totalPlans}+`
                        : "0+"}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t("investment_plans")}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
