"use client";

import { motion } from "framer-motion";
import {
  UserPlus,
  Search,
  DollarSign,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { useInvestmentStore } from "@/store/investment/user";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

const steps = [
  {
    icon: UserPlus,
    title: "Create Account",
    description:
      "Sign up and complete your profile with our secure verification process.",
    details:
      "Quick registration with bank-level security and KYC verification.",
    color: "from-blue-500 to-cyan-500",
    bgColor:
      "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
  },
  {
    icon: Search,
    title: "Choose Plan",
    description:
      "Browse and select from our curated investment plans that match your goals.",
    details:
      "Expert-designed portfolios with different risk levels and return targets.",
    color: "from-purple-500 to-pink-500",
    bgColor:
      "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
  },
  {
    icon: DollarSign,
    title: "Make Investment",
    description:
      "Fund your chosen plan with your preferred payment method securely.",
    details:
      "Multiple payment options with instant processing and confirmation.",
    color: "from-green-500 to-emerald-500",
    bgColor:
      "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
  },
  {
    icon: TrendingUp,
    title: "Track & Earn",
    description:
      "Monitor your investment performance and watch your wealth grow.",
    details: "Real-time dashboard with detailed analytics and profit tracking.",
    color: "from-orange-500 to-red-500",
    bgColor:
      "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20",
  },
];

const benefits = [
  {
    icon: CheckCircle,
    title: "Transparent Process",
    description: "No hidden fees or surprise charges",
  },
  {
    icon: Clock,
    title: "Quick Setup",
    description: "Start investing in under 5 minutes",
  },
  {
    icon: BarChart3,
    title: "Real-Time Tracking",
    description: "Monitor performance 24/7",
  },
];

export function HowItWorksSection() {
  const t = useTranslations("investment/components/how-it-works-section");
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

  return (
    <section className="py-24 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 border border-green-200 dark:border-green-800 rounded-full px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 mb-6"
            >
              <BarChart3 className="w-4 h-4" />
              {t("simple_process")}
            </motion.div>

            <h2 className="text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
              {t("how_it")}{" "}
              <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {t("Works")}
              </span>
            </h2>

            <p className="text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed">
              {t("getting_started_with_been_easier")}{" "}
              {t("follow_our_simple_future_today")}
            </p>
          </motion.div>

          {/* Steps */}
          <div className="relative mb-20">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 via-green-200 to-orange-200 dark:from-blue-800 dark:via-purple-800 dark:via-green-800 dark:to-orange-800 transform -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div
                    className={`bg-gradient-to-br ${step.bgColor} rounded-3xl p-8 border border-white/20 dark:border-zinc-700/50 shadow-lg hover:shadow-xl transition-all duration-300 text-center`}
                  >
                    {/* Step Number */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div
                        className={`w-8 h-8 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                      >
                        {index + 1}
                      </div>
                    </div>

                    {/* Icon */}
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <step.icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-300 mb-4 leading-relaxed">
                      {step.description}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {step.details}
                    </p>

                    {/* Arrow for desktop */}
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                        <ArrowRight className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-white/20 dark:border-zinc-700/50 shadow-xl"
          >
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                {t("why_investors_choose_us")}
              </h3>
              <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto">
                {t("join_thousands_of_building_journey")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      {benefit.title}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Real Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-700">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {statsLoading
                    ? "..."
                    : stats
                      ? formatCurrency(stats.totalInvested)
                      : "$0"}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("total_invested")}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {statsLoading
                    ? "..."
                    : stats
                      ? stats.activeInvestors.toLocaleString()
                      : "0"}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("active_investors")}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {statsLoading ? "..." : stats ? `${stats.totalPlans}+` : "0+"}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("investment_plans")}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
