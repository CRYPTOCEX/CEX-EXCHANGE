"use client";

import { motion } from "framer-motion";
import { ArrowRight, Star, TrendingUp, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface FeaturedPoolsSectionProps {
  pools: any[];
  isLoading: boolean;
}

function PoolCard({ pool, index }: { pool: any; index: number }) {
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const totalStaked = pool.totalStaked ?? 0;
  const availableToStake = pool.availableToStake ?? 0;
  const totalAvailable = totalStaked + availableToStake;
  const percentageStaked = totalAvailable > 0 ? (totalStaked / totalAvailable) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-linear-to-r from-violet-600 via-indigo-500 to-violet-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />

      <div className="relative h-full p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 hover:border-violet-500/30 dark:hover:border-violet-600/30 transition-all duration-500 shadow-lg dark:shadow-none">
        {/* Featured badge */}
        {pool.isPromoted && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              Featured
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 dark:bg-linear-to-br dark:from-violet-600/20 dark:to-indigo-600/20 border border-violet-500/20 dark:border-violet-600/20 flex items-center justify-center">
            {pool.icon ? (
              <img
                src={pool.icon}
                alt={pool.name}
                className="w-9 h-9 rounded-xl"
              />
            ) : (
              <span className="font-bold text-xl text-violet-600 dark:text-violet-400">
                {pool.symbol?.substring(0, 1)}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {pool.name}
            </h3>
            <p className="text-sm text-zinc-500">{pool.symbol}</p>
          </div>
        </div>

        {/* APR highlight */}
        <div className="p-4 rounded-2xl bg-violet-500/5 dark:bg-violet-600/10 border border-violet-500/20 dark:border-violet-600/20 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">APR</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">{pool.apr}%</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
              <Clock className="w-3 h-3" />
              {tCommon("lock_period")}
            </div>
            <div className="font-semibold text-zinc-900 dark:text-white">{pool.lockPeriod} Days</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
            <div className="text-zinc-500 text-xs mb-1">{tCommon("min_stake")}</div>
            <div className="font-semibold text-zinc-900 dark:text-white">{pool.minStake} {pool.symbol}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-500">{tExt("pool_capacity")}</span>
            <span className="text-zinc-700 dark:text-zinc-300">{Math.round(percentageStaked)}%</span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${percentageStaked}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link href={`/staking/pool/${pool.id}`} className="block">
          <Button className="w-full h-12 rounded-xl bg-linear-to-r from-violet-600 via-indigo-500 to-violet-600 hover:from-violet-700 hover:via-indigo-600 hover:to-violet-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all duration-300 group/btn">
            {tCommon("view_details")}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 animate-pulse shadow-lg dark:shadow-none">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl mb-6" />
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
      <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
    </div>
  );
}

export default function FeaturedPoolsSection({ pools, isLoading }: FeaturedPoolsSectionProps) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return (
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 dark:bg-violet-500/10 border border-violet-500/20 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 text-sm font-medium mb-4">
              <Star className="w-4 h-4 inline mr-2" />
              {tCommon("featured_pools")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              {t("top_performing_staking_pools")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!pools || pools.length === 0) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 dark:bg-violet-500/10 border border-violet-500/20 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 text-sm font-medium mb-4">
            <Star className="w-4 h-4 inline mr-2" />
            {tCommon("featured_pools")}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("top_performing_staking_pools")}
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("discover_our_handpicked_track_records")}
          </p>
        </motion.div>

        {/* Pools grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {pools.slice(0, 3).map((pool, index) => (
            <PoolCard key={pool.id} pool={pool} index={index} />
          ))}
        </div>

        {/* View all button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <Link href="/staking/pool">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:border-violet-500/30 dark:hover:border-violet-600/30 transition-all duration-300 group"
            >
              {tCommon("explore_all_pools")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
