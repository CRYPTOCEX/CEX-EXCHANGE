"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  DollarSign,
  TrendingUp,
  Bot,
  Globe,
  Coins,
  Rocket,
  ShoppingBag,
  Users,
  Network,
  Gift,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface Condition {
  id: string;
  name: string;
  title: string;
  description: string;
  type: string;
  reward: number;
  rewardType: "PERCENTAGE" | "FIXED";
  rewardCurrency: string;
  displayReward: string;
  category: string;
  icon: string;
}

interface RewardConditionsSectionProps {
  conditions: Condition[];
  isLoading?: boolean;
}

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  LineChart,
  DollarSign,
  TrendingUp,
  Bot,
  Globe,
  Coins,
  Rocket,
  ShoppingBag,
  Users,
  Network,
  Gift,
};

function ConditionCard({
  condition,
  index,
}: {
  condition: Condition;
  index: number;
}) {
  const IconComponent = iconMap[condition.icon] || Gift;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className="group"
    >
      <Card className="h-full border-blue-500/20 dark:border-blue-700/30 bg-gradient-to-br from-white to-blue-50/50 dark:from-zinc-900 dark:to-blue-900/10 hover:border-blue-500/40 dark:hover:border-blue-600/40 transition-all duration-300 overflow-hidden">
        <CardContent className="p-6">
          {/* Category Badge */}
          <Badge
            variant="outline"
            className="mb-4 text-xs bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
          >
            {condition.category}
          </Badge>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <IconComponent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Reward Display */}
          <div className="mb-3">
            <motion.span
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
            >
              {condition.displayReward}
            </motion.span>
            {condition.rewardType === "PERCENTAGE" && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-1">
                commission
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg mb-2 text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {condition.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {condition.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <Card className="h-full border-blue-500/20 dark:border-blue-700/30 bg-gradient-to-br from-white to-blue-50/50 dark:from-zinc-900 dark:to-blue-900/10 animate-pulse">
      <CardContent className="p-6">
        <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4" />
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
      </CardContent>
    </Card>
  );
}

export default function RewardConditionsSection({
  conditions,
  isLoading,
}: RewardConditionsSectionProps) {
  const t = useTranslations("ext_affiliate");

  if (isLoading) {
    return (
      <section className="py-24 relative">
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
            >
              <Gift className="w-4 h-4 text-amber-500 mr-2" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {t("earning_opportunities")}
              </span>
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
                {t("multiple_revenue_streams")}
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!conditions || conditions.length === 0) {
    return null;
  }

  // Group conditions by category for better organization
  const groupedConditions = conditions.reduce(
    (acc, condition) => {
      const category = condition.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(condition);
      return acc;
    },
    {} as { [key: string]: Condition[] }
  );

  // Flatten and take top conditions (max 8 for landing page)
  const displayConditions = conditions.slice(0, 8);

  return (
    <section className="py-24 relative">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
          >
            <Sparkles className="w-4 h-4 text-amber-500 mr-2" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t("earning_opportunities")}
            </span>
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
              {t("multiple_revenue_streams")}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("earn_commissions_from_various_activities_across")}
          </p>
        </motion.div>

        {/* Conditions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayConditions.map((condition, index) => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              index={index}
            />
          ))}
        </div>

        {/* Show more link if there are more conditions */}
        {conditions.length > 8 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <a
              href="/affiliate/condition"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              View all {conditions.length} commission types
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
