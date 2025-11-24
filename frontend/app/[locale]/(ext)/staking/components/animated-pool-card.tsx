"use client";

import { Link } from "@/i18n/routing";
import { ArrowRight, TrendingUp, Shield, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface PoolCardProps {
  pool: StakingPool;
  index?: number;
}

export default function AnimatedPoolCard({ pool, index = 0 }: PoolCardProps) {
  const t = useTranslations("ext");
  const [isHovered, setIsHovered] = useState(false);

  // Calculate percentage of total staked vs available
  const totalStaked = pool.totalStaked ?? 0;
  const availableToStake = pool.availableToStake ?? 0;
  const totalAvailable = totalStaked + availableToStake;
  const percentageStaked =
    totalAvailable > 0 ? (totalStaked / totalAvailable) * 100 : 0;

  // Dynamic gradient based on APR
  const getGradient = (apr: number) => {
    if (apr >= 20) return "from-emerald-500 via-teal-500 to-cyan-500";
    if (apr >= 15) return "from-blue-500 via-indigo-500 to-purple-500";
    if (apr >= 10) return "from-orange-500 via-amber-500 to-yellow-500";
    return "from-zinc-500 via-zinc-600 to-zinc-700";
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -8, scale: 1.02 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative z-10"
      >
        {/* Glowing background effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

        <Card className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-zinc-700/50 shadow-xl dark:shadow-zinc-900/50 rounded-2xl">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-purple-500/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-400/30 to-transparent rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/30 to-transparent rounded-full blur-xl"></div>
          </div>

          {/* Promoted pool special effects */}
          {pool.isPromoted && (
            <>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>
              <div className="absolute -top-3 -right-3 z-50 w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse shadow-lg">
                <Star className="w-4 h-4 text-white absolute top-2 left-2" />
              </div>
            </>
          )}

          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <motion.div
                  className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 mr-4 flex items-center justify-center backdrop-blur-sm border border-white/20 dark:border-zinc-700/50"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {pool.icon ? (
                    <img
                      src={pool.icon || "/img/placeholder.svg"}
                      alt={pool.name}
                      className="w-8 h-8 rounded-lg"
                    />
                  ) : (
                    <span className="font-bold text-lg bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                      {pool.symbol.substring(0, 1)}
                    </span>
                  )}
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                    {pool.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    {pool.symbol}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-4 relative z-10">
            <div className="space-y-6">
              {/* APR Display with enhanced styling */}
              <div className="relative p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200/50 dark:border-green-800/50">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                    {t("annual_percentage_rate")}
                  </span>
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {pool.apr}%
                    </span>
                  </div>
                </div>
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Pool Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {t("lock_period")}
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                    {pool.lockPeriod}
                    {t("days")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center">
                    <Shield className="w-3 h-3 mr-1" />
                    {t("Min")}. {t("Stake")}
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                    {pool.minStake} {pool.symbol}
                  </span>
                </div>
                {pool.maxStake && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {t("Max")}. {t("Stake")}
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                      {pool.maxStake} {pool.symbol}
                    </span>
                  </div>
                )}
              </div>

              {/* Enhanced Progress Section */}
              <div className="space-y-3 p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                    {t("total_staked")}
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                    {totalStaked.toLocaleString()} {pool.symbol}
                  </span>
                </div>

                <div className="relative">
                  <Progress
                    value={percentageStaked}
                    className="h-3 bg-zinc-200 dark:bg-zinc-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full opacity-50"></div>
                </div>

                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    0
                    {pool.symbol}
                  </span>
                  <span className="font-medium">
                    {Math.round(percentageStaked)}
                    {t("%_filled")}
                  </span>
                  <span>
                    {totalAvailable.toLocaleString()} {pool.symbol}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-4 relative z-10">
            <Link href={`/staking/pool/${pool.id}`} className="w-full">
              <Button className="w-full h-12 bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/90 hover:via-blue-600/90 hover:to-purple-600/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
                <span className="flex items-center justify-center">
                  {t("view_details")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

// Helper function to display status in a user-friendly format
function getStatusDisplay(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "COMING_SOON":
      return "Coming Soon";
    default:
      return status;
  }
}
