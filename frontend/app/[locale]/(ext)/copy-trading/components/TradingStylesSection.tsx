"use client";

import { motion } from "framer-motion";
import {
  Zap,
  BarChart3,
  TrendingUp,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface StyleStats {
  count: number;
  avgRoi: number;
  topRoi: number;
}

interface TradingStylesSectionProps {
  byTradingStyle: Record<string, StyleStats>;
  isLoading?: boolean;
}

const styleConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  SCALPING: {
    icon: Zap,
    label: "Scalping",
    description: "Quick trades, small profits, high frequency",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10 dark:bg-violet-600/20",
    borderColor: "border-violet-500/30 hover:border-violet-500/50",
  },
  DAY_TRADING: {
    icon: BarChart3,
    label: "Day Trading",
    description: "Intraday positions, closed before market end",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10 dark:bg-blue-600/20",
    borderColor: "border-blue-500/30 hover:border-blue-500/50",
  },
  SWING: {
    icon: TrendingUp,
    label: "Swing Trading",
    description: "Multi-day holds, capture larger moves",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10 dark:bg-cyan-600/20",
    borderColor: "border-cyan-500/30 hover:border-cyan-500/50",
  },
  POSITION: {
    icon: Shield,
    label: "Position Trading",
    description: "Long-term holds, fundamental focus",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10 dark:bg-indigo-600/20",
    borderColor: "border-indigo-500/30 hover:border-indigo-500/50",
  },
};

function StyleCard({
  style,
  stats,
  index,
}: {
  style: string;
  stats: StyleStats;
  index: number;
}) {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const config = styleConfig[style] || styleConfig.DAY_TRADING;
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <Link href={`/copy-trading/leader?tradingStyle=${style}`}>
        <div
          className={`relative p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border ${config.borderColor} transition-all duration-300 hover:shadow-lg`}
        >
          {/* Icon */}
          <div
            className={`w-14 h-14 rounded-xl ${config.bgColor} flex items-center justify-center mb-4`}
          >
            <IconComponent className={`w-7 h-7 ${config.color}`} />
          </div>

          {/* Title and Description */}
          <h3
            className={`font-bold text-lg mb-1 ${config.color} group-hover:opacity-80 transition-opacity`}
          >
            {config.label}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {config.description}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">Leaders</div>
              <div className="font-bold text-zinc-900 dark:text-white">
                {stats.count}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1">{t('avg_roi')}</div>
              <div
                className={`font-bold ${stats.avgRoi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {stats.avgRoi >= 0 ? "+" : ""}
                {stats.avgRoi.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Top ROI indicator */}
          {stats.topRoi > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-zinc-500">{tExt("top_performer")}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{stats.topRoi.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Hover indicator */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className={`w-5 h-5 ${config.color}`} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
      <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

export default function TradingStylesSection({
  byTradingStyle,
  isLoading,
}: TradingStylesSectionProps) {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");

  const styles = ["SCALPING", "DAY_TRADING", "SWING", "POSITION"];

  // Check if we have any data
  const hasData = Object.values(byTradingStyle).some((s) => s.count > 0);

  if (!isLoading && !hasData) {
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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-500/20"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 mr-2" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {t("trading_styles") || "Trading Styles"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("find_your_trading_style") || "Find Your Trading Style"}
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("choose_leaders_that_match") ||
              "Choose leaders that match your preferred trading approach and risk tolerance"}
          </p>
        </motion.div>

        {/* Styles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {isLoading
            ? styles.map((_, i) => <LoadingCard key={i} />)
            : styles.map((style, index) => (
                <StyleCard
                  key={style}
                  style={style}
                  stats={byTradingStyle[style] || { count: 0, avgRoi: 0, topRoi: 0 }}
                  index={index}
                />
              ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link href="/copy-trading/leader">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 rounded-xl border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group"
            >
              {tCommon("view_all_leaders") || "View All Leaders"}
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
