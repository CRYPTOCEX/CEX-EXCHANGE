"use client";

import type React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Coins, Award, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface PositionCardProps {
  position: {
    id: number;
    stakedAmount: number;
    rewardTokenSymbol: string;
    pendingRewards: number;
    apy: number;
    status: string;
  };
  index?: number;
}

const PositionCard: React.FC<PositionCardProps> = ({ position, index = 0 }) => {
  const t = useTranslations("ext");
  // Default values for pendingRewards if undefined
  const pendingRewardsValue = position.pendingRewards || 0;

  // Status-based styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "from-green-500 to-emerald-500";
      case "COMPLETED":
        return "from-blue-500 to-cyan-500";
      case "PENDING_WITHDRAWAL":
        return "from-amber-500 to-orange-500";
      default:
        return "from-zinc-500 to-zinc-600";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
      case "COMPLETED":
        return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800";
      case "PENDING_WITHDRAWAL":
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800";
      default:
        return "bg-zinc-50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative"
    >
      {/* Glowing border effect */}
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${getStatusColor(position.status)} rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300`}
      ></div>

      <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-zinc-900/50 border border-white/20 dark:border-zinc-700/50 overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${getStatusColor(position.status)}/20`}
          ></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-400/30 to-transparent rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-blue-400/30 to-transparent rounded-full blur-lg"></div>
        </div>

        {/* Status indicator */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getStatusColor(position.status)}`}
        ></div>

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getStatusColor(position.status)} p-0.5`}
              >
                <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {t("position_#")}
                  {position.id}
                </h3>
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBg(position.status)}`}
                >
                  {getStatusDisplay(position.status)}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Staked Amount */}
            <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center mb-2">
                <Coins className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mr-2" />
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {t("Staked")}
                </span>
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {position.stakedAmount.toLocaleString()}
              </div>
            </div>

            {/* APY */}
            <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  APY
                </span>
              </div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {position.apy}%
              </div>
            </div>
          </div>

          {/* Pending Rewards - Featured */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-primary/5 via-purple-500/5 to-cyan-500/5 border border-primary/20 dark:border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Award className="w-5 h-5 text-primary mr-2" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("pending_rewards")}
                  </span>
                </div>
                <Clock className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-1">
                {pendingRewardsValue.toFixed(6)}
              </div>
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {position.rewardTokenSymbol}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6">
            <Button className="w-full h-12 bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/90 hover:via-blue-600/90 hover:to-purple-600/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
              {position.status === "ACTIVE"
                ? "Claim Rewards"
                : position.status === "PENDING_WITHDRAWAL"
                  ? "Complete Withdrawal"
                  : "View Details"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Helper function to display status in a user-friendly format
function getStatusDisplay(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "PENDING_WITHDRAWAL":
      return "Pending Withdrawal";
    default:
      return status;
  }
}

export default PositionCard;
