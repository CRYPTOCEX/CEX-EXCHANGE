"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  ArrowRight,
  Zap,
  Shield,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface FeaturedLeader {
  id: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  tradingStyle: string;
  riskLevel: string;
  roi?: number;
  winRate?: number;
  totalFollowers?: number;
  totalProfit?: number;
  totalTrades?: number;
  profitSharePercent?: number;
  sparkline?: number[];
  rank?: number;
}

interface FeaturedLeaderSectionProps {
  leader: FeaturedLeader | null;
  isLoading?: boolean;
}

const tradingStyleConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  SCALPING: { icon: Zap, label: "Scalping", color: "text-violet-500" },
  DAY_TRADING: { icon: BarChart3, label: "Day Trading", color: "text-blue-500" },
  SWING: { icon: TrendingUp, label: "Swing", color: "text-cyan-500" },
  POSITION: { icon: Shield, label: "Position", color: "text-indigo-500" },
};

const riskColors: Record<string, string> = {
  LOW: "text-emerald-500 bg-emerald-500/10",
  MEDIUM: "text-amber-500 bg-amber-500/10",
  HIGH: "text-red-500 bg-red-500/10",
};

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(Math.abs), 1);
  const height = 40;
  const width = 120;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height / 2 - (value / max) * ((height - padding * 2) / 2);
    return `${x},${y}`;
  });

  const isPositive = data[data.length - 1] >= 0;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={isPositive ? "#10b981" : "#ef4444"}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={isPositive ? "#10b981" : "#ef4444"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      {/* Zero line */}
      <line
        x1={padding}
        y1={height / 2}
        x2={width - padding}
        y2={height / 2}
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeDasharray="2,2"
      />
      {/* Area fill */}
      <polygon
        points={`${padding},${height / 2} ${points.join(" ")} ${width - padding},${height / 2}`}
        fill="url(#sparkline-gradient)"
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={isPositive ? "#10b981" : "#ef4444"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={
            height / 2 -
            (data[data.length - 1] / max) * ((height - padding * 2) / 2)
          }
          r="3"
          fill={isPositive ? "#10b981" : "#ef4444"}
        />
      )}
    </svg>
  );
}

function LoadingState() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-10 w-72 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto animate-pulse" />
          </div>
          <div className="h-80 bg-zinc-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    </section>
  );
}

export default function FeaturedLeaderSection({
  leader,
  isLoading,
}: FeaturedLeaderSectionProps) {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return <LoadingState />;
  }

  if (!leader) {
    return null;
  }

  const styleConfig = tradingStyleConfig[leader.tradingStyle] || tradingStyleConfig.DAY_TRADING;
  const StyleIcon = styleConfig.icon;
  const isPositiveRoi = (leader.roi ?? 0) >= 0;
  const initials = leader.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
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
                {tExt("top_performer") || "Top Performer"}
              </span>
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              {t("featured_leader") || "Featured Leader"}
            </h2>
          </motion.div>

          {/* Featured Leader Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group"
          >
            <div className="relative p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-amber-200/50 dark:border-amber-800/30 shadow-xl shadow-amber-500/5 overflow-hidden">
              {/* Trophy badge */}
              <div className="absolute top-6 right-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/30">
                  <Trophy className="w-4 h-4" />
                  #{leader.rank} Ranked
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Leader Info */}
                <div className="flex items-start gap-5">
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-4 ring-amber-500/20 shadow-xl">
                      <AvatarImage src={leader.avatar} alt={leader.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 text-white text-xl font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-2xl text-zinc-900 dark:text-white">
                        {leader.displayName}
                      </h3>
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge className={`${styleConfig.color} bg-opacity-10`}>
                        <StyleIcon className="w-3 h-3 mr-1" />
                        {styleConfig.label}
                      </Badge>
                      <Badge className={riskColors[leader.riskLevel]}>
                        {leader.riskLevel} Risk
                      </Badge>
                    </div>

                    {leader.bio && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md line-clamp-2">
                        {leader.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sparkline Chart */}
                <div className="lg:ml-auto flex flex-col items-center justify-center">
                  <span className="text-xs text-zinc-500 mb-2">{t("n_14_day_performance")}</span>
                  <MiniSparkline data={leader.sparkline ?? []} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    ROI
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      isPositiveRoi
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isPositiveRoi ? "+" : ""}
                    {(leader.roi ?? 0).toFixed(1)}%
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <Target className="w-3.5 h-3.5" />
                    {tCommon("win_rate")}
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {(leader.winRate ?? 0).toFixed(1)}%
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <Users className="w-3.5 h-3.5" />
                    Followers
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {leader.totalFollowers}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {tExt("total_trades")}
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {leader.totalTrades}
                  </div>
                </div>
              </div>

              {/* Profit Share Info */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-500">{tCommon("profit_share")}</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {leader.profitSharePercent}%
                  </span>
                  <span className="text-sm text-zinc-500">|</span>
                  <span className="text-sm text-zinc-500">{tExt("total_profit")}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ${(leader.totalProfit ?? 0).toLocaleString()}
                  </span>
                </div>

                <Link href={`/copy-trading/leader/${leader.id}`}>
                  <Button
                    size="lg"
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/25 group"
                  >
                    {tExt("view_profile") || "View Profile"}
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>

              {/* Decorative gradient */}
              <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 opacity-5" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
