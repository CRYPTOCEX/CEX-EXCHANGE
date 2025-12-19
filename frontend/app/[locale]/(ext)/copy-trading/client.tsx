"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Users,
  Sparkles,
  Target,
  BarChart3,
  Copy,
  Zap,
  CheckCircle,
  Trophy,
  Clock,
  Globe,
  Lock,
  ChevronRight,
  Award,
  Flame,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { $fetch } from "@/lib/api";
import LeaderCard from "./components/leader-card";
import FeaturedLeaderSection from "./components/FeaturedLeaderSection";
import TradingStylesSection from "./components/TradingStylesSection";
import LiveActivityFeed from "./components/LiveActivityFeed";
import {
  FeaturesSection,
  ProcessSection,
  HeroSection,
  TrustBar,
  CTASection,
} from "@/components/sections";
import {
  InteractivePattern,
  FloatingShapes,
} from "@/components/sections/shared";

interface Leader {
  id: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  tradingStyle: string;
  riskLevel: string;
  winRate: number;
  roi: number;
  totalFollowers: number;
  profitSharePercent: number;
  totalTrades?: number;
  totalProfit?: number;
  maxFollowers?: number;
  sparkline?: number[];
  rank?: number;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

interface TradeActivity {
  leaderDisplayName: string;
  symbol: string;
  side: "BUY" | "SELL";
  profit: number;
  profitPercent: number;
  timeAgo: string;
  followersCount: number;
}

interface StyleStats {
  count: number;
  avgRoi: number;
  topRoi: number;
}

interface LandingData {
  stats: {
    totalLeaders: number;
    totalFollowers: number;
    totalVolume: number;
    avgRoi: number;
    avgWinRate: number;
    totalTrades: number;
    topLeaderRoi: number;
    totalProfitGenerated: number;
  };
  featuredLeader: Leader | null;
  topLeaders: Leader[];
  byTradingStyle: Record<string, StyleStats>;
  byRiskLevel: Record<string, { count: number; avgRoi: number }>;
  recentTrades: TradeActivity[];
  copyModes: Array<{
    mode: string;
    title: string;
    description: string;
    example: string;
    recommended: boolean;
    icon: string;
  }>;
}

export default function CopyTradingLanding() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls during React Strict Mode double-mounting
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await $fetch({
          url: "/api/copy-trading/landing",
          method: "GET",
          silent: true,
        });

        if (response.data && isMounted) {
          setLandingData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch landing data:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      // Reset ref on cleanup to allow re-fetching on next mount
      fetchInitiatedRef.current = false;
    };
  }, []);

  // Theme colors - indigo/violet for Copy-Trading
  const gradient = { from: "#6366f1", to: "#8b5cf6" };

  const stats = landingData?.stats;
  const showStats =
    stats &&
    (stats.totalLeaders > 0 ||
      stats.totalFollowers > 0 ||
      stats.totalVolume > 0 ||
      stats.avgRoi > 0);

  // Hero stats items
  const heroStatsItems = showStats
    ? [
        {
          icon: Users,
          value: stats.totalLeaders,
          label: "Active Leaders",
          suffix: "+",
        },
        {
          icon: Target,
          value: stats.totalFollowers,
          label: "Total Followers",
          suffix: "+",
        },
        {
          icon: BarChart3,
          value: stats.totalVolume / 1000000,
          label: "Trading Volume",
          prefix: "$",
          suffix: "M+",
          decimals: 1,
        },
        {
          icon: TrendingUp,
          value: stats.topLeaderRoi || stats.avgRoi,
          label: "Top ROI",
          prefix: "+",
          suffix: "%",
          decimals: 1,
        },
      ]
    : [];

  // How It Works steps
  const howItWorksSteps = [
    {
      id: "choose",
      icon: Target,
      number: 1,
      title: "Choose a Leader",
      description:
        "Browse our verified leaders, analyze their performance metrics, and pick traders that match your risk appetite.",
      features: [
        "Verified track record",
        "Real-time statistics",
        "Risk profiling",
      ],
    },
    {
      id: "configure",
      icon: Copy,
      number: 2,
      title: "Configure & Subscribe",
      description:
        "Set your investment amount, choose copy mode, and configure risk management settings tailored to your needs.",
      features: [
        "Multiple copy modes",
        "Custom risk limits",
        "Flexible allocation",
      ],
    },
    {
      id: "earn",
      icon: TrendingUp,
      number: 3,
      title: "Earn Automatically",
      description:
        "Sit back as trades are copied in real-time. Monitor your portfolio and watch your profits grow.",
      features: [
        "Real-time copying",
        "Automatic execution",
        "Full transparency",
      ],
    },
  ];

  // Features
  const features = [
    {
      id: "risk",
      icon: Shield,
      title: "Advanced Risk Management",
      description:
        "Set custom stop-loss limits, max daily loss, and position size controls to protect your capital.",
      highlights: [
        "Custom stop-loss settings",
        "Max daily loss limits",
        "Position size controls",
      ],
    },
    {
      id: "transparent",
      icon: BarChart3,
      title: "Transparent Performance",
      description:
        "Access detailed statistics, historical data, and real-time performance metrics for all leaders.",
      highlights: [
        "Detailed statistics",
        "Historical performance",
        "Real-time metrics",
      ],
    },
    {
      id: "execution",
      icon: Zap,
      title: "Lightning Fast Execution",
      description:
        "Trades are copied within milliseconds, ensuring you capture the same entry and exit points.",
      highlights: [
        "Millisecond execution",
        "Same entry points",
        "Precise copying",
      ],
    },
    {
      id: "control",
      icon: Lock,
      title: "Full Control & Flexibility",
      description:
        "Pause, resume, or stop copying anytime. Adjust your settings without restrictions.",
      highlights: [
        "Pause/resume anytime",
        "Flexible settings",
        "No restrictions",
      ],
    },
  ];

  // Get top leaders (skip featured leader for the grid)
  const topLeaders = landingData?.topLeaders?.slice(1) || [];

  return (
    <div className="flex flex-col overflow-hidden relative">
      {/* Interactive pattern background */}
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.015,
          size: 40,
          interactive: true,
          parallaxStrength: 50,
          animate: true,
        }}
        theme={{ primary: "indigo", secondary: "violet" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "indigo", secondary: "violet" }}
        count={8}
        interactive={true}
      />

      {/* Unified continuous background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg,
              transparent 0%,
              ${gradient.from}03 10%,
              ${gradient.from}05 25%,
              ${gradient.to}05 40%,
              ${gradient.from}08 55%,
              ${gradient.to}05 70%,
              ${gradient.from}05 85%,
              transparent 100%
            )`,
          }}
        />
        <div
          className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
          style={{ background: gradient.from }}
        />
        <div
          className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-15"
          style={{ background: gradient.to }}
        />
        <div
          className="absolute top-[60%] left-[20%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10"
          style={{ background: gradient.from }}
        />
        <div
          className="absolute top-[80%] right-[30%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-15"
          style={{ background: gradient.to }}
        />
      </div>

      {/* Hero Section */}
      <HeroSection
        theme={{ primary: "indigo", secondary: "violet" }}
        content={{
          tag: {
            text: t("automated_copy_trading_platform"),
            icon: Sparkles,
          },
          heading: {
            text: t("copy_the_best"),
            highlightedText: t("trade_like_a_pro"),
            highlightPosition: "after",
            size: "lg",
          },
          subtitle: {
            text: `${t("automatically_replicate_the_strategies_of_verified")} ${t("real_time_execution_transparent_performance_and")}`,
            size: "md",
          },
          actions: [
            {
              text: t("start_copying_now"),
              href: "/copy-trading/leader",
              variant: "primary",
              icon: ArrowRight,
              iconPosition: "right",
            },
            {
              text: t("become_a_leader"),
              href: "/copy-trading/dashboard",
              variant: "outline",
              icon: Trophy,
              iconPosition: "left",
            },
          ],
          stats:
            heroStatsItems.length > 0
              ? {
                  items: heroStatsItems,
                  layout: "row",
                  style: "badges",
                }
              : undefined,
        }}
        layout={{
          contentPosition: "full",
          contentAlignment: "center",
          minHeight: "screen",
          maxWidth: "5xl",
          verticalPadding: "lg",
        }}
        background={{
          variant: "gradient",
          orbs: [
            {
              position: "top-right",
              size: "xl",
              color: "indigo",
              blur: 100,
              opacity: 30,
              animate: true,
              animationDelay: 0,
            },
            {
              position: "bottom-left",
              size: "lg",
              color: "violet",
              blur: 80,
              opacity: 35,
              animate: true,
              animationDelay: 1.5,
            },
            {
              position: "top-left",
              size: "md",
              color: "violet",
              blur: 60,
              opacity: 20,
              animate: true,
              animationDelay: 0.5,
            },
            {
              position: "bottom-right",
              size: "lg",
              color: "indigo",
              blur: 90,
              opacity: 25,
              animate: true,
              animationDelay: 2,
            },
          ],
          particles: {
            enabled: true,
            count: 20,
            style: "circles",
            minSize: 2,
            maxSize: 6,
            minDuration: 15,
            maxDuration: 30,
            direction: "up",
          },
          gridPattern: {
            enabled: true,
            opacity: 0.02,
            size: 60,
          },
          bottomFade: true,
        }}
        scrollIndicator={{
          enabled: true,
          style: "mouse",
          text: "Scroll to explore",
        }}
        animation={{
          enabled: true,
          staggerChildren: 0.1,
          delayChildren: 0.2,
        }}
        statsLoading={isLoading}
        className="pt-16"
      />

      {/* Trust Bar */}
      <TrustBar
        items={[
          {
            icon: Shield,
            label: "SSL Secured",
            description: "Bank-level encryption",
          },
          {
            icon: Lock,
            label: "Bank-Level Security",
            description: "Protected funds",
          },
          {
            icon: Globe,
            label: "24/7 Trading",
            description: "Always available",
          },
          {
            icon: Clock,
            label: "Instant Execution",
            description: "Millisecond trades",
          },
          {
            icon: CheckCircle,
            label: "Verified Leaders",
            description: "Proven track records",
          },
        ]}
        theme={{ primary: "indigo", secondary: "violet" }}
        variant="default"
        title={t("why_trust_us")}
      />

      {/* How It Works Section */}
      <ProcessSection
        header={{
          tag: {
            text: t("simple_powerful"),
            icon: Zap,
          },
          title: tExt("how_it_works"),
          subtitle: t("start_copy_trading_in_minutes_with"),
          alignment: "center",
        }}
        steps={howItWorksSteps}
        layout={{
          variant: "grid",
          showNumbers: true,
          showConnectors: true,
          connectorStyle: "line",
          cardStyle: "bordered",
          iconStyle: "filled",
          iconSize: "lg",
          gap: "lg",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "indigo", secondary: "violet" }}
        showCTA={{
          enabled: true,
          text: t("start_copying_now"),
          href: "/copy-trading/leader",
        }}
      />

      {/* Featured Leader Section - NEW */}
      <FeaturedLeaderSection
        leader={landingData?.featuredLeader || null}
        isLoading={isLoading}
      />

      {/* Trading Styles Section - NEW */}
      <TradingStylesSection
        byTradingStyle={landingData?.byTradingStyle || {}}
        isLoading={isLoading}
      />

      {/* Top Leaders Section */}
      <section className="py-24 relative">
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12"
          >
            <div>
              <Badge
                variant="outline"
                className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20"
              >
                <Flame className="w-4 h-4 text-amber-500 mr-2" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {tExt("top_performers")}
                </span>
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                  {t("best_performing_leaders")}
                </span>
              </h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
                {t("discover_our_top_rated_traders_with")}
              </p>
            </div>
            <Link href="/copy-trading/leader">
              <Button
                variant="outline"
                className="rounded-xl group border-2 border-indigo-600/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 dark:hover:bg-indigo-600/10 font-semibold transition-all duration-300"
              >
                {tCommon("view_all_leaders")}
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 animate-pulse"
                />
              ))}
            </div>
          ) : topLeaders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topLeaders.slice(0, 6).map((leader, index) => (
                <LeaderCard
                  key={leader.id || `leader-${index}`}
                  leader={leader}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <Card className="p-16">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {t("no_leaders_available")}
                </h3>
                <p className="text-zinc-500 mb-6">
                  {t("be_the_first_to_become_a_leader_and_start_earning")}
                </p>
                <Link href="/copy-trading/become-leader">
                  <Button className="rounded-xl">{t("become_a_leader")}</Button>
                </Link>
              </div>
            </Card>
          )}

          {topLeaders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex justify-center mt-12"
            >
              <Link href="/copy-trading/leader">
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-xl font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                  }}
                >
                  {t("explore_all_leaders")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Live Activity Feed - NEW */}
      <LiveActivityFeed
        recentTrades={landingData?.recentTrades || []}
        isLoading={isLoading}
      />

      {/* Features Section */}
      <FeaturesSection
        header={{
          tag: {
            text: tCommon("why_choose_us"),
            icon: Award,
          },
          title: `${t("trading_made")} ${t("simple_profitable")}`,
          titleHighlight: t("simple_profitable"),
          subtitle:
            "Our platform provides everything you need to succeed in copy trading with advanced tools and transparent performance metrics.",
          alignment: "center",
        }}
        features={features}
        layout={{
          variant: "grid",
          columns: 4,
          gap: "lg",
          iconPosition: "top",
          iconStyle: "filled",
          cardStyle: "bordered",
          hoverEffect: "glow",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "indigo", secondary: "violet" }}
      />

      {/* CTA Section */}
      <CTASection
        content={{
          tag: {
            text: "Start Copy Trading",
            icon: Sparkles,
          },
          title: `${t("ready_to_start")} ${t("copy_trading")}`,
          titleHighlight: t("copy_trading"),
          subtitle: t("join_thousands_of_traders_who_are"),
          trustItems: [
            { icon: Shield, text: "Bank-Level Security" },
            { icon: Headphones, text: "24/7 Support" },
            { icon: Zap, text: "Instant Execution" },
            { icon: Clock, text: "Real-Time Copying" },
          ],
          cards: [
            {
              variant: "primary",
              icon: Copy,
              title: t("start_copying"),
              description: t("follow_top_traders_and_automatically_copy_their_trades"),
              buttonText: t("find_leaders"),
              href: "/copy-trading/leader",
            },
            {
              variant: "secondary",
              icon: Trophy,
              title: t("become_a_leader"),
              description: t("share_your_strategies_and_earn_from_your_followers"),
              buttonText: t("apply_now"),
              href: "/copy-trading/dashboard",
            },
          ],
        }}
        layout={{
          variant: "cards",
          actionStyle: "cards",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "indigo", secondary: "violet" }}
        className="pb-24"
      />
    </div>
  );
}
