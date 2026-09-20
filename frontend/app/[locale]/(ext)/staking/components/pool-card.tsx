"use client";

import { Link } from "@/i18n/routing";
import { ArrowRight, TrendingUp, Clock, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface PoolCardProps {
  pool: StakingPool;
}

export default function PoolCard({ pool }: PoolCardProps) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  // Calculate percentage of total staked vs available
  const totalStaked = pool.totalStaked ?? 0;
  const availableToStake = pool.availableToStake ?? 0;
  const totalAvailable = totalStaked + availableToStake;
  const percentageStaked =
    totalAvailable > 0 ? (totalStaked / totalAvailable) * 100 : 0;

  return (
    <div className="group relative">
      {/* Glow effect on hover */}
      <div className="absolute -inset-1 bg-linear-to-r from-violet-600/20 via-indigo-500/20 to-violet-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        {/* Promoted badge */}
        {pool.isPromoted && (
          <div className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-lg">
              <Sparkles className="w-3 h-3" />
              Featured
            </div>
          </div>
        )}

        {/* Header with icon and name */}
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 flex items-center justify-center">
                {pool.icon ? (
                  <img
                    src={pool.icon || "/img/placeholder.svg"}
                    alt={pool.name}
                    className="w-9 h-9 rounded-xl"
                  />
                ) : (
                  <span className="font-bold text-xl text-violet-600 dark:text-violet-400">
                    {pool.symbol.substring(0, 1)}
                  </span>
                )}
              </div>
              {/* Subtle glow */}
              <div className="absolute -inset-1 bg-violet-500/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {pool.name}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {pool.symbol}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* APR Highlight */}
          <div className="relative p-4 rounded-xl bg-linear-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {tCommon("annual_percentage_rate")}
              </span>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {pool.apr}%
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs mb-1">
                <Clock className="w-3 h-3" />
                {tCommon("lock_period")}
              </div>
              <div className="font-semibold text-zinc-900 dark:text-white">
                {pool.lockPeriod} {tCommon("days")}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs mb-1">
                <Coins className="w-3 h-3" />
                {tCommon("min")}. {t("stake")}
              </div>
              <div className="font-semibold text-zinc-900 dark:text-white">
                {pool.minStake} {pool.symbol}
              </div>
            </div>
          </div>

          {/* Pool Capacity */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                {t("total_staked")}
              </span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {totalStaked.toLocaleString()} {pool.symbol}
              </span>
            </div>
            <div className="relative h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-500"
                style={{ width: `${percentageStaked}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{Math.round(percentageStaked)} {tCommon("filled")}</span>
              <span>{totalAvailable.toLocaleString()} {pool.symbol}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Link href={`/staking/pool/${pool.id}`} className="w-full">
            <Button className="w-full h-11 rounded-xl bg-linear-to-r from-violet-600 via-indigo-500 to-violet-600 hover:from-violet-700 hover:via-indigo-600 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group/btn">
              {tCommon("view_details")}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
