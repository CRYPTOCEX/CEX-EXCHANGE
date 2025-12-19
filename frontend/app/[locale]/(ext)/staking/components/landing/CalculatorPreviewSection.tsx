"use client";

import { motion } from "framer-motion";
import {
  Calculator,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface CalculatorExample {
  amount: number;
  dailyReward: number;
  monthlyReward: number;
  yearlyReward: number;
}

interface CalculatorPreviewSectionProps {
  calculatorPreview: {
    samplePool: {
      name: string;
      symbol: string;
      apr: number;
    };
    examples: CalculatorExample[];
  } | null;
  isLoading?: boolean;
}

function RewardCard({
  example,
  symbol,
  index,
}: {
  example: CalculatorExample;
  symbol: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <div className="relative p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 hover:border-violet-500/50 dark:hover:border-violet-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
        {/* Stake Amount */}
        <div className="text-center mb-6">
          <p className="text-sm text-zinc-500 mb-1">If you stake</p>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">
            {example.amount.toLocaleString()} {symbol}
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Daily */}
          <div className="p-3 rounded-xl bg-violet-500/5 dark:bg-violet-600/10 border border-violet-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-2">
              <Calendar className="w-3 h-3" />
              <span>Daily</span>
            </div>
            <div className="font-bold text-violet-600 dark:text-violet-400">
              +{example.dailyReward.toFixed(4)}
            </div>
            <div className="text-xs text-zinc-500">{symbol}</div>
          </div>

          {/* Monthly */}
          <div className="p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-600/10 border border-indigo-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-2">
              <Calendar className="w-3 h-3" />
              <span>Monthly</span>
            </div>
            <div className="font-bold text-indigo-600 dark:text-indigo-400">
              +{example.monthlyReward.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-500">{symbol}</div>
          </div>

          {/* Yearly */}
          <div className="p-3 rounded-xl bg-green-500/5 dark:bg-green-600/10 border border-green-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-2">
              <TrendingUp className="w-3 h-3" />
              <span>Yearly</span>
            </div>
            <div className="font-bold text-green-600 dark:text-green-400">
              +{example.yearlyReward.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-500">{symbol}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-violet-200/50 dark:border-violet-800/50 animate-pulse">
      <div className="text-center mb-6">
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto mb-2" />
        <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

export default function CalculatorPreviewSection({
  calculatorPreview,
  isLoading,
}: CalculatorPreviewSectionProps) {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");

  if (!isLoading && !calculatorPreview) {
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
            <Calculator className="w-4 h-4 text-violet-500 mr-2" />
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
              {tCommon("earnings_calculator") || "Earnings Calculator"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("see_your_potential_returns") || "See Your Potential Returns"}
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("calculate_your_staking_rewards") ||
              "Calculate your staking rewards based on our top pool"}
          </p>
          {calculatorPreview && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-sm text-zinc-500">Based on</span>
              <Badge
                variant="outline"
                className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30"
              >
                {calculatorPreview.samplePool.name} -{" "}
                {calculatorPreview.samplePool.apr}% APR
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Examples Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {isLoading ? (
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : calculatorPreview ? (
            calculatorPreview.examples.map((example, index) => (
              <RewardCard
                key={example.amount}
                example={example}
                symbol={calculatorPreview.samplePool.symbol}
                index={index}
              />
            ))
          ) : null}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link href="/staking/pool">
            <Button
              size="lg"
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 hover:from-violet-700 hover:via-indigo-600 hover:to-violet-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all duration-300 group"
            >
              <Sparkles className="mr-2 w-5 h-5" />
              {t("start_earning_now") || "Start Earning Now"}
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-zinc-500">
            {t("no_fees_instant_start") ||
              "No hidden fees. Start earning instantly."}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
