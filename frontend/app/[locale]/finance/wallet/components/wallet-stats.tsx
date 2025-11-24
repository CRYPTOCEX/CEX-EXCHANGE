"use client";

import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
} from "lucide-react";
import { useWalletStore } from "@/store/finance/wallet-store";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect } from "react";

export function WalletStats() {
  const {
    totalBalance = 0,
    totalChange = 0,
    totalChangePercent = 0,
    totalWallets = 0,
    activeWallets = 0,
    isLoading,
    fetchStats,
  } = useWalletStore();

  // Fetch stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Ensure we have numeric values with defaults
  const safeBalance = typeof totalBalance === "number" ? totalBalance : 0;
  const safeChange = typeof totalChange === "number" ? totalChange : 0;
  const safeChangePercent =
    typeof totalChangePercent === "number" ? totalChangePercent : 0;
  const safeTotalWallets = typeof totalWallets === "number" ? totalWallets : 0;
  const safeActiveWallets = typeof activeWallets === "number" ? activeWallets : 0;

  const isPositiveChange = safeChange >= 0;

  const stats = [
    {
      title: "Total Balance",
      value: safeBalance,
      icon: DollarSign,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      isCurrency: true,
    },
    {
      title: "24h Change",
      value: safeChange,
      percent: `${safeChangePercent.toFixed(2)}%`,
      icon: isPositiveChange ? ArrowUpRight : ArrowDownRight,
      color: isPositiveChange ? "bg-green-500" : "bg-red-500",
      textColor: isPositiveChange ? "text-green-500" : "text-red-500",
      isCurrency: true,
    },
    {
      title: "Total Wallets",
      value: safeTotalWallets,
      subtitle: `${safeActiveWallets} active`,
      icon: Wallet,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      isCurrency: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 -mr-6 -mt-6 opacity-10">
              <div className={`w-full h-full rounded-full ${stat.color}`}></div>
            </div>

            <div className="flex items-center mb-2">
              <div
                className={`p-1.5 sm:p-2 rounded-lg ${stat.color} bg-opacity-10 mr-2 sm:mr-3`}
              >
                <stat.icon
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.textColor}`}
                />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {stat.title}
              </span>
            </div>

            <div className="flex items-baseline">
              <h3 className="text-lg sm:text-2xl font-bold">
                {stat.isCurrency ? formatCurrency(stat.value, "USD") : stat.value}
              </h3>
              {stat.percent && (
                <span
                  className={`ml-2 text-xs sm:text-sm font-medium ${isPositiveChange ? "text-green-500" : "text-red-500"}`}
                >
                  {stat.percent}
                </span>
              )}
            </div>
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
