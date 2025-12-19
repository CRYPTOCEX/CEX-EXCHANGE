"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import {
  Trophy,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
  Star,
  Clock,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface TopPlan {
  id: string;
  name: string;
  title: string;
  description?: string;
  image?: string;
  currency: string;
  minProfit: number;
  maxProfit: number;
  minAmount: number;
  maxAmount: number;
  profitPercentage: number;
  totalInvested: number;
  investorCount: number;
  winRate: number;
  durations?: { duration: number; timeframe: string }[];
  badge: string;
}

interface TopPlanSpotlightSectionProps {
  plan: TopPlan | null;
  isLoading?: boolean;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function LoadingSpotlight() {
  return (
    <div className="relative p-8 md:p-12 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        <div className="flex-1 space-y-4">
          <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-20 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="flex gap-4">
            <div className="h-16 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-16 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-16 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="w-full lg:w-80 h-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    </div>
  );
}

export default function TopPlanSpotlightSection({
  plan,
  isLoading,
}: TopPlanSpotlightSectionProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  if (!isLoading && !plan) {
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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border-amber-500/20"
          >
            <Trophy className="w-4 h-4 text-amber-500 mr-2" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {tExt("top_performer") || "Top Performer"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("highest_roi") || "Highest ROI"}{" "}
            <span className="bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent">
              {tCommon("investment_plan") || "Investment Plan"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("our_best_performing_plan") ||
              "Our best performing plan based on returns and success rate"}
          </p>
        </motion.div>

        {/* Spotlight Card */}
        {isLoading ? (
          <LoadingSpotlight />
        ) : (
          plan && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative max-w-5xl mx-auto"
            >
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 rounded-3xl blur-xl" />

              <div className="relative p-8 md:p-12 rounded-3xl bg-white/90 dark:bg-zinc-900/90 border border-amber-500/30 dark:border-amber-500/20 backdrop-blur-sm">
                {/* Top Badge */}
                <div className="absolute -top-4 left-8">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold">#1 Performing Plan</span>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-center pt-4">
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
                      {plan.title || plan.name}
                    </h3>
                    {plan.description && (
                      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                        {plan.description}
                      </p>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Percent className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            ROI
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {plan.profitPercentage}%
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-teal-500" />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Win Rate
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          {plan.winRate}%
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-sky-500" />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Investors
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                          {plan.investorCount}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-violet-500" />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Invested
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                          {formatCurrency(plan.totalInvested)}
                        </p>
                      </div>
                    </div>

                    {/* Investment Range & Durations */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          Min: <strong>${plan.minAmount}</strong>
                        </span>
                        {plan.maxAmount && (
                          <>
                            <span>-</span>
                            <span>
                              Max: <strong>${plan.maxAmount}</strong>
                            </span>
                          </>
                        )}
                      </div>
                      {plan.durations && plan.durations.length > 0 && (
                        <>
                          <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              {plan.durations.length} duration
                              {plan.durations.length > 1 ? "s" : ""} available
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* CTA */}
                    <Link href={`/forex/plan/${plan.id}`}>
                      <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-8 py-6 text-lg font-semibold shadow-lg shadow-emerald-500/25 group">
                        {tCommon("invest_now") || "Invest Now"}
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>

                  {/* Visual Element */}
                  <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="relative aspect-square max-w-[280px] mx-auto">
                      {/* Animated rings */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/30"
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 rounded-full border-2 border-dashed border-teal-500/30"
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-8 rounded-full border-2 border-dashed border-amber-500/30"
                      />

                      {/* Center content */}
                      <div className="absolute inset-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col items-center justify-center text-white shadow-2xl shadow-emerald-500/30">
                        <span className="text-sm font-medium opacity-80">Up to</span>
                        <span className="text-4xl font-bold">{plan.maxProfit}%</span>
                        <span className="text-sm font-medium opacity-80">Returns</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        )}
      </div>
    </section>
  );
}
