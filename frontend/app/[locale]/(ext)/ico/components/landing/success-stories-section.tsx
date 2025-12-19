"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  CheckCircle2,
  Users,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface SuccessStory {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  targetAmount: number;
  totalRaised: number;
  fundedPercentage: number;
  participants: number;
  completedAt: string;
  daysToComplete: number;
  blockchain: string;
}

interface SuccessStoriesSectionProps {
  stories: SuccessStory[];
  isLoading?: boolean;
}

function StoryCard({
  story,
  index,
}: {
  story: SuccessStory;
  index: number;
}) {
  const gradient = { from: "#14b8a6", to: "#06b6d4" };
  const isOverfunded = story.fundedPercentage > 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-emerald-500/30 transition-all duration-300"
    >
      {/* Success badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Funded
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div className="relative">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${gradient.from}20, ${gradient.to}20)`,
              }}
            >
              {story.icon ? (
                <img
                  src={story.icon}
                  alt={story.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Trophy
                  className="w-7 h-7"
                  style={{ color: gradient.from }}
                />
              )}
            </div>
            {/* Trophy overlay for overfunded */}
            {isOverfunded && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                <Trophy className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
              {story.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                ${story.symbol}
              </span>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {story.blockchain}
              </span>
            </div>
          </div>
        </div>

        {/* Funding Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Funding Achieved
            </span>
            <span
              className={`text-sm font-bold ${
                isOverfunded
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {story.fundedPercentage}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.min(story.fundedPercentage, 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: index * 0.1 }}
              className={`h-full rounded-full ${
                isOverfunded
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-400"
              }`}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Raised
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">
              ${story.totalRaised.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <Users className="w-3.5 h-3.5" />
              Investors
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">
              {story.participants.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Time to complete */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Clock className="w-4 h-4 text-teal-500" />
          <span>
            Completed in{" "}
            <span className="font-semibold text-zinc-900 dark:text-white">
              {story.daysToComplete} days
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-4" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export default function SuccessStoriesSection({
  stories,
  isLoading,
}: SuccessStoriesSectionProps) {
  const t = useTranslations("ext_ico");
  const gradient = { from: "#14b8a6", to: "#06b6d4" };

  if (!isLoading && (!stories || stories.length === 0)) {
    return null;
  }

  // Calculate total stats
  const totalRaised = stories.reduce((sum, s) => sum + s.totalRaised, 0);
  const totalInvestors = stories.reduce((sum, s) => sum + s.participants, 0);
  const avgFunding =
    stories.length > 0
      ? Math.round(
          stories.reduce((sum, s) => sum + s.fundedPercentage, 0) / stories.length
        )
      : 0;

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
          >
            <Trophy className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t("success_stories") || "Success Stories"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("recently_funded") || "Recently Funded"}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              {t("projects") || "Projects"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("see_the_projects_that_reached") ||
              "See the projects that reached their funding goals and are now building the future."}
          </p>
        </motion.div>

        {/* Summary Stats */}
        {!isLoading && stories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-10"
          >
            <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Total Raised:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ${totalRaised.toLocaleString()}
                  </span>
                </span>
              </div>
              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {totalInvestors.toLocaleString()} investors
              </span>
              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Avg. {avgFunding}% funded
              </span>
            </div>
          </motion.div>
        )}

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [...Array(4)].map((_, i) => <LoadingCard key={i} />)
              : stories.slice(0, 4).map((story, index) => (
                  <StoryCard key={story.id} story={story} index={index} />
                ))}
          </AnimatePresence>
        </div>

        {/* View All CTA */}
        {!isLoading && stories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mt-10"
          >
            <Link href="/ico/offer?status=SUCCESS">
              <Button
                variant="outline"
                className="rounded-xl border-2 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500"
              >
                View All Success Stories
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
