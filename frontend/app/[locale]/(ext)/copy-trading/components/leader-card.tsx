"use client";

import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Zap,
  Shield,
  Trophy,
  Flame,
  ArrowRight,
  Target,
  Percent,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Leader {
  id: string;
  displayName: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  winRate: number;
  roi: number;
  totalFollowers: number;
  totalTrades?: number;
  profitSharePercent: number;
  maxFollowers?: number;
  sparkline?: number[];
  rank?: number;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  isFollowing?: boolean;
}

interface LeaderCardProps {
  leader: Leader;
  index?: number;
  variant?: "default" | "compact" | "featured";
}

const riskLevelConfig: Record<
  string,
  { color: string; bg: string; label: string; textColor: string }
> = {
  LOW: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Low Risk",
    textColor: "text-emerald-400",
  },
  MEDIUM: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Medium Risk",
    textColor: "text-amber-400",
  },
  HIGH: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "High Risk",
    textColor: "text-red-400",
  },
};

const tradingStyleConfig: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  SCALPING: {
    icon: Zap,
    color: "text-violet-400",
    label: "Scalping",
  },
  DAY_TRADING: {
    icon: BarChart3,
    color: "text-blue-400",
    label: "Day Trading",
  },
  SWING: {
    icon: TrendingUp,
    color: "text-cyan-400",
    label: "Swing",
  },
  POSITION: {
    icon: Shield,
    color: "text-indigo-400",
    label: "Position",
  },
};

export default function LeaderCard({
  leader,
  index = 0,
}: LeaderCardProps) {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const avatar = leader.avatar || leader.user?.avatar;
  const initials = leader.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isPositiveRoi = leader.roi >= 0;
  const riskConfig = riskLevelConfig[leader.riskLevel] || riskLevelConfig.MEDIUM;
  const styleConfig =
    tradingStyleConfig[leader.tradingStyle] || tradingStyleConfig.DAY_TRADING;
  const StyleIcon = styleConfig.icon;

  const isTopPerformer = leader.roi > 30;
  const isHotTrader = leader.totalFollowers > 50;
  const spotsUsed = leader.maxFollowers
    ? (leader.totalFollowers / leader.maxFollowers) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group h-full"
    >
      <Link href={`/copy-trading/leader/${leader.id}`} className="block h-full">
        <Card className="relative h-full overflow-hidden border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-lg dark:hover:shadow-zinc-900/50">
          {/* Top accent line */}
          <div
            className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${
              isPositiveRoi
                ? "from-emerald-500 via-emerald-400 to-teal-500"
                : "from-red-500 via-red-400 to-orange-500"
            }`}
          />

          <CardContent className="p-5">
            {/* Header: Avatar + Name + Badges */}
            <div className="flex items-start gap-3.5 mb-5">
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12 ring-2 ring-zinc-100 dark:ring-zinc-800">
                  <AvatarImage src={avatar} alt={leader.displayName} />
                  <AvatarFallback className="bg-linear-to-br from-zinc-700 to-zinc-900 text-white font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 truncate">
                    {leader.displayName}
                  </h3>
                  {/* Status badges */}
                  {isTopPerformer && (
                    <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10">
                      <Trophy className="h-3 w-3 text-amber-500" />
                    </div>
                  )}
                  {isHotTrader && !isTopPerformer && (
                    <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10">
                      <Flame className="h-3 w-3 text-rose-500" />
                    </div>
                  )}
                </div>

                {/* Style and risk badges */}
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 text-xs ${styleConfig.color}`}>
                    <StyleIcon className="h-3 w-3" />
                    <span className="font-medium">{styleConfig.label}</span>
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className={`text-xs font-medium ${riskConfig.textColor}`}>
                    {riskConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* ROI */}
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {isPositiveRoi ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
                    ROI
                  </span>
                </div>
                <p
                  className={`text-lg font-bold ${
                    isPositiveRoi
                      ? "text-emerald-500"
                      : "text-red-500"
                  }`}
                >
                  {isPositiveRoi ? "+" : ""}
                  {leader.roi.toFixed(1)}%
                </p>
              </div>

              {/* Win Rate */}
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
                    {tCommon("win_rate")}
                  </span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {leader.winRate.toFixed(1)}%
                </p>
              </div>

              {/* Followers */}
              <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
                    Followers
                  </span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {leader.totalFollowers}
                </p>
              </div>
            </div>

            {/* Capacity Progress */}
            {leader.maxFollowers && (
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400">Capacity</span>
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                    {leader.totalFollowers}/{leader.maxFollowers}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      spotsUsed > 90
                        ? "bg-red-500"
                        : spotsUsed > 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(spotsUsed, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer: Profit Share + CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <Percent className="h-3 w-3 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {leader.profitSharePercent}%
                  </span>
                </div>
                <span className="text-xs text-zinc-400">{tCommon("profit_share")}</span>
              </div>

              <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                <span>{tExt("view_profile")}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* Following indicator */}
            {leader.isFollowing && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  Following
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
