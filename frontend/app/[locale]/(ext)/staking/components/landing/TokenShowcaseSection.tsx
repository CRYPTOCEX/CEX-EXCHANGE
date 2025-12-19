"use client";

import { motion } from "framer-motion";
import { Coins, TrendingUp, Layers, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface TokenStat {
  token: string;
  symbol: string;
  icon: string | null;
  poolCount: number;
  avgApr: number;
  highestApr: number;
}

interface TokenShowcaseSectionProps {
  tokenStats: TokenStat[];
  isLoading?: boolean;
}

function TokenCard({ token, index }: { token: TokenStat; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group"
    >
      <Link href={`/staking/pool?token=${token.symbol}`}>
        <div className="relative p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 hover:border-violet-500/50 dark:hover:border-violet-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative">
            {/* Token Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 dark:from-violet-600/30 dark:to-indigo-600/30 border border-violet-500/30 flex items-center justify-center">
                {token.icon ? (
                  <img
                    src={token.icon}
                    alt={token.token}
                    className="w-10 h-10 rounded-xl"
                  />
                ) : (
                  <span className="font-bold text-2xl text-violet-600 dark:text-violet-400">
                    {token.symbol?.substring(0, 1)}
                  </span>
                )}
              </div>
            </div>

            {/* Token Info */}
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {token.token}
              </h3>
              <p className="text-sm text-zinc-500">{token.symbol}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                  <Layers className="w-3 h-3" />
                  <span>Pools</span>
                </div>
                <div className="font-bold text-zinc-900 dark:text-white">
                  {token.poolCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Best APR</span>
                </div>
                <div className="font-bold text-green-600 dark:text-green-400">
                  {token.highestApr}%
                </div>
              </div>
            </div>

            {/* Average APR */}
            <div className="mt-3 p-3 rounded-xl bg-violet-500/10 dark:bg-violet-600/10 border border-violet-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Avg. APR
                </span>
                <span className="font-bold text-violet-600 dark:text-violet-400">
                  {token.avgApr.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 animate-pulse">
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="text-center mb-4 space-y-2">
        <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto" />
        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
      <div className="mt-3 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
    </div>
  );
}

export default function TokenShowcaseSection({
  tokenStats,
  isLoading,
}: TokenShowcaseSectionProps) {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");

  if (!isLoading && (!tokenStats || tokenStats.length === 0)) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/20"
          >
            <Coins className="w-4 h-4 text-violet-500 mr-2" />
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
              {t("available_tokens") || "Available Tokens"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("stake_your_favorite_tokens") || "Stake Your Favorite Tokens"}
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("diverse_token_selection") ||
              "Choose from a diverse selection of tokens with competitive staking rewards"}
          </p>
        </motion.div>

        {/* Token Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {isLoading ? (
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : (
            tokenStats.map((token, index) => (
              <TokenCard key={token.symbol} token={token} index={index} />
            ))
          )}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link href="/staking/pool">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 rounded-xl border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 group"
            >
              <Sparkles className="mr-2 w-4 h-4" />
              {tCommon("view_all_tokens") || "View All Tokens"}
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
