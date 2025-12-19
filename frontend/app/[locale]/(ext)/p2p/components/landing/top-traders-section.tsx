"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Trophy,
  MessageCircle,
  Zap,
  Shield,
  ArrowRight,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopTrader {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  completedTrades: number;
  totalVolume: number;
  successRate: number;
  avgRating: number;
  avgCommunicationRating: number;
  avgSpeedRating: number;
  avgTrustRating: number;
  memberSince?: string;
}

interface TopTradersSectionProps {
  traders: TopTrader[];
  isLoading?: boolean;
}

function TraderCard({ trader, index }: { trader: TopTrader; index: number }) {
  const gradient = { from: "#3b82f6", to: "#8b5cf6" };

  // Rating color based on score
  const getRatingColor = (rating: number) => {
    if (rating >= 90) return "text-emerald-500";
    if (rating >= 70) return "text-amber-500";
    return "text-zinc-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative overflow-hidden rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 p-5"
    >
      {/* Rank badge */}
      {index < 3 && (
        <div className="absolute top-3 right-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index === 0
                ? "bg-amber-500/20 text-amber-500"
                : index === 1
                ? "bg-zinc-400/20 text-zinc-500"
                : "bg-orange-500/20 text-orange-500"
            }`}
          >
            <Trophy className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Avatar and Name */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-14 h-14 border-2 border-blue-500/20">
          <AvatarImage src={trader.avatar} />
          <AvatarFallback
            className="text-lg font-bold"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}20, ${gradient.to}20)`,
              color: gradient.from,
            }}
          >
            {trader.firstName?.charAt(0) || "T"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-white">
            {trader.firstName} {trader.lastName?.charAt(0) || ""}.
          </h3>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {trader.avgRating.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
            Trades
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white">
            {trader.completedTrades.toLocaleString()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
            Volume
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white">
            ${trader.totalVolume > 1000
              ? `${(trader.totalVolume / 1000).toFixed(1)}K`
              : trader.totalVolume.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Communication</span>
          </div>
          <span className={`font-medium ${getRatingColor(trader.avgCommunicationRating)}`}>
            {trader.avgCommunicationRating.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Speed</span>
          </div>
          <span className={`font-medium ${getRatingColor(trader.avgSpeedRating)}`}>
            {trader.avgSpeedRating.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Trust</span>
          </div>
          <span className={`font-medium ${getRatingColor(trader.avgTrustRating)}`}>
            {trader.avgTrustRating.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* View Profile */}
      <Link href={`/p2p/offer?trader=${trader.id}`}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full rounded-lg group/btn hover:bg-blue-500/10"
        >
          View Offers
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      </Link>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div>
          <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
          <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-14 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-14 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-9 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
    </div>
  );
}

export default function TopTradersSection({
  traders,
  isLoading,
}: TopTradersSectionProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const gradient = { from: "#3b82f6", to: "#8b5cf6" };

  if (!isLoading && (!traders || traders.length === 0)) {
    return null;
  }

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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20"
          >
            <Trophy className="w-4 h-4 text-amber-500 mr-2" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t("leaderboard") || "Leaderboard"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tCommon("top") || "Top"}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              {t("traders") || "Traders"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("meet_our_highest_rated_traders") ||
              "Meet our highest-rated traders with the best track records"}
          </p>
        </motion.div>

        {/* Traders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [...Array(6)].map((_, i) => <LoadingCard key={i} />)
              : traders.slice(0, 6).map((trader, index) => (
                  <TraderCard key={trader.id} trader={trader} index={index} />
                ))}
          </AnimatePresence>
        </div>

        {/* Become a Trader CTA */}
        {!isLoading && traders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mt-10"
          >
            <div className="flex items-center gap-4">
              <Link href="/p2p/offer/create">
                <Button
                  className="rounded-xl text-white"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Become a Trader
                </Button>
              </Link>
              <Link href="/p2p/offer">
                <Button
                  variant="outline"
                  className="rounded-xl border-2 border-zinc-300 dark:border-zinc-700 hover:border-blue-500"
                >
                  View All Traders
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
