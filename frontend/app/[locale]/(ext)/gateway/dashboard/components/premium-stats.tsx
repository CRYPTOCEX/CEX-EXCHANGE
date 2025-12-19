"use client";

import { motion } from "framer-motion";
import { DollarSign, CreditCard, TrendingUp, RefreshCcw, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface PremiumStatsProps {
  availableBalance: number;
  currencyCount: number;
  payments30d: number;
  totalAmount30d: number;
  netRevenue30d: number;
  fees30d: number;
  pendingRefunds: number;
}

export function PremiumStats({
  availableBalance,
  currencyCount,
  payments30d,
  totalAmount30d,
  netRevenue30d,
  fees30d,
  pendingRefunds,
}: PremiumStatsProps) {
  const stats = [
    {
      icon: DollarSign,
      label: "Available Balance",
      value: `$${availableBalance.toFixed(2)}`,
      subtitle: `Across ${currencyCount} currencies`,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/10",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-500/10",
      iconBorder: "border-emerald-600/20",
      trend: null,
    },
    {
      icon: CreditCard,
      label: "Payments (30d)",
      value: payments30d.toString(),
      subtitle: `$${totalAmount30d.toFixed(2)} total`,
      gradient: "from-indigo-500 to-cyan-500",
      bgGradient: "from-indigo-500/10 to-cyan-500/10",
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-500/10",
      iconBorder: "border-indigo-600/20",
      trend: { value: "+12.5%", positive: true },
    },
    {
      icon: TrendingUp,
      label: "Net Revenue (30d)",
      value: `$${netRevenue30d.toFixed(2)}`,
      subtitle: `$${fees30d.toFixed(2)} fees`,
      gradient: "from-indigo-500 to-cyan-500",
      bgGradient: "from-indigo-500/10 to-cyan-500/10",
      iconColor: "text-cyan-600",
      iconBg: "bg-cyan-500/10",
      iconBorder: "border-cyan-600/20",
      trend: { value: "+8.3%", positive: true },
    },
    {
      icon: RefreshCcw,
      label: "Pending Refunds",
      value: pendingRefunds.toString(),
      subtitle: "Awaiting processing",
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/10",
      iconColor: "text-orange-600",
      iconBg: "bg-orange-500/10",
      iconBorder: "border-orange-600/20",
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend?.positive ? ArrowUpRight : ArrowDownRight;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: [0.21, 0.47, 0.32, 0.98],
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative"
          >
            {/* Card */}
            <div className={`relative h-full rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm p-4 overflow-hidden transition-all duration-300 hover:shadow-xl`}>
              {/* Background gradient orb */}
              <div
                className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${stat.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">
                {/* Icon and Trend */}
                <div className="flex items-start justify-between mb-3">
                  <motion.div
                    className={`flex items-center justify-center h-10 w-10 rounded-lg ${stat.iconBg} border ${stat.iconBorder}`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                  >
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </motion.div>

                  {stat.trend && (
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${
                        stat.trend.positive
                          ? "text-green-600 bg-green-500/10"
                          : "text-red-600 bg-red-500/10"
                      }`}
                    >
                      <TrendIcon className="h-3 w-3" />
                      {stat.trend.value}
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {stat.label}
                </div>

                {/* Value */}
                <div className="text-2xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>

                {/* Subtitle */}
                <div className="text-xs text-zinc-500 dark:text-zinc-500">
                  {stat.subtitle}
                </div>
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
