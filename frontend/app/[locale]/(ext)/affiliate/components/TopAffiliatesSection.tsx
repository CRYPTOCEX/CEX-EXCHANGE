"use client";

import { motion } from "framer-motion";
import { Trophy, Award, Star, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

interface TopAffiliate {
  rank: number;
  avatar: string | null;
  displayName: string;
  totalEarnings: number;
  rewardCount: number;
  joinedAgo: string;
}

interface TopAffiliatesSectionProps {
  affiliates: TopAffiliate[];
  isLoading?: boolean;
}

const rankColors = {
  1: {
    bg: "from-amber-500/20 to-yellow-500/20",
    border: "border-amber-500/30",
    icon: "text-amber-500",
    badge: "bg-amber-500",
  },
  2: {
    bg: "from-zinc-400/20 to-zinc-300/20",
    border: "border-zinc-400/30",
    icon: "text-zinc-400",
    badge: "bg-zinc-400",
  },
  3: {
    bg: "from-orange-600/20 to-orange-500/20",
    border: "border-orange-600/30",
    icon: "text-orange-600",
    badge: "bg-orange-600",
  },
};

function AffiliateCard({
  affiliate,
  index,
}: {
  affiliate: TopAffiliate;
  index: number;
}) {
  const colors = rankColors[affiliate.rank as keyof typeof rankColors] || {
    bg: "from-blue-500/10 to-blue-400/10",
    border: "border-blue-500/20",
    icon: "text-blue-500",
    badge: "bg-blue-500",
  };

  const formatEarnings = (amount: number) => {
    if (amount >= 10000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -3 }}
      className="group"
    >
      <Card
        className={`h-full ${colors.border} bg-gradient-to-br ${colors.bg} hover:shadow-lg transition-all duration-300`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            {/* Rank Badge */}
            <div
              className={`w-10 h-10 rounded-full ${colors.badge} flex items-center justify-center shadow-lg`}
            >
              {affiliate.rank <= 3 ? (
                <Trophy className="w-5 h-5 text-white" />
              ) : (
                <span className="text-white font-bold">#{affiliate.rank}</span>
              )}
            </div>

            {/* Earnings */}
            <div className="text-right">
              <motion.div
                className="text-2xl font-bold text-zinc-900 dark:text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
              >
                {formatEarnings(affiliate.totalEarnings)}
              </motion.div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Total Earned
              </div>
            </div>
          </div>

          {/* Avatar & Name */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12 border-2 border-white dark:border-zinc-800 shadow-md">
              <AvatarImage src={affiliate.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-amber-500 text-white font-bold">
                {affiliate.displayName.slice(-2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                {affiliate.displayName}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Joined {affiliate.joinedAgo}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <Award className="w-4 h-4" />
              <span className="text-sm">{affiliate.rewardCount} rewards</span>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <Card className="h-full border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-400/5 animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="text-right">
            <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div>
            <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded mt-4 pt-4" />
      </CardContent>
    </Card>
  );
}

export default function TopAffiliatesSection({
  affiliates,
  isLoading,
}: TopAffiliatesSectionProps) {
  const t = useTranslations("ext_affiliate");
  const tExt = useTranslations("ext");

  if (isLoading) {
    return (
      <section className="py-24 relative">
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
            >
              <Trophy className="w-4 h-4 text-amber-500 mr-2" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Top Performers
              </span>
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
                Our Success Stories
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!affiliates || affiliates.length === 0) {
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
          className="text-center mb-16"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
          >
            <Sparkles className="w-4 h-4 text-amber-500 mr-2" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {tExt("top_performers") || "Top Performers"}
            </span>
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
              {t("our_success_stories") || "Our Success Stories"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("join_our_top_earning_affiliates") ||
              "Join our top-earning affiliates and start building your passive income today"}
          </p>
        </motion.div>

        {/* Affiliates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {affiliates.map((affiliate, index) => (
            <AffiliateCard
              key={affiliate.displayName}
              affiliate={affiliate}
              index={index}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-zinc-600 dark:text-zinc-400">
            <Star className="w-4 h-4 inline mr-1 text-amber-500" />
            You could be next! Start your affiliate journey today.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
