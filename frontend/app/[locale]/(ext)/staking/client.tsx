"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Users,
  Lock,
  RefreshCw,
  Wallet,
  Target,
  Gift,
  Coins,
  Award,
  CheckCircle,
  Headphones,
  Layers,
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import {
  StakingErrorBoundary,
  StakingError,
} from "@/app/[locale]/(ext)/staking/components/staking-error-boundary";
import {
  FeaturesSection,
  ProcessSection,
  StatsSection,
  HeroSection,
  TrustBar,
  CTASection,
} from "@/components/sections";
import {
  InteractivePattern,
  FloatingShapes,
} from "@/components/sections/shared";
import FeaturedPoolsSection from "./components/landing/featured-pools-section";
import PoolVarietySection from "./components/landing/PoolVarietySection";
import LiveActivitySection from "./components/landing/LiveActivitySection";
import CalculatorPreviewSection from "./components/landing/CalculatorPreviewSection";

interface FeaturedPool {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  description: string;
  apr: number;
  lockPeriod: number;
  minStake: number;
  maxStake: number | null;
  availableToStake: number;
  totalStaked: number;
  capacity: number;
  earningFrequency: string;
  autoCompound: boolean;
  totalStakers: number;
  walletType: string;
}

interface HighAprPool {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  apr: number;
  lockPeriod: number;
  earningFrequency: string;
}

interface FlexiblePool {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  apr: number;
  lockPeriod: number;
  earlyWithdrawalFee: number;
}

interface UpcomingPool {
  id: string;
  name: string;
  symbol: string;
  icon: string | null;
  description: string;
  apr: number;
  lockPeriod: number;
}

interface TokenStat {
  token: string;
  symbol: string;
  icon: string | null;
  poolCount: number;
  avgApr: number;
  highestApr: number;
}

interface ActivityItem {
  type: "STAKE" | "CLAIM" | "WITHDRAW";
  amount: number;
  symbol: string;
  poolName: string;
  timeAgo: string;
}

interface LandingData {
  stats: {
    totalStaked: number;
    activeUsers: number;
    totalPools: number;
    activePools: number;
    avgApr: number;
    highestApr: number;
    lowestApr: number;
    totalRewards: number;
    totalClaimed: number;
    unclaimedRewards: number;
    stakedGrowth: number;
    usersGrowth: number;
    rewardsGrowth: number;
    avgLockPeriod: number;
    avgStakeAmount: number;
    completionRate: number;
  };
  featuredPools: FeaturedPool[];
  highestAprPools: HighAprPool[];
  flexiblePools: FlexiblePool[];
  upcomingPools: UpcomingPool[];
  tokenStats: TokenStat[];
  recentActivity: ActivityItem[];
  performance: {
    last7DaysRewards: number;
    last30DaysRewards: number;
    avgDailyRewards: number;
    peakApr: number;
    peakAprDate: string | null;
  };
  earningFrequencies: Array<{
    frequency: string;
    poolCount: number;
    avgApr: number;
  }>;
  calculatorPreview: {
    samplePool: {
      name: string;
      symbol: string;
      apr: number;
    };
    examples: Array<{
      amount: number;
      dailyReward: number;
      monthlyReward: number;
      yearlyReward: number;
    }>;
  } | null;
}

export default function StakingLanding() {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls during React Strict Mode double-mounting
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    let isMounted = true;

    const fetchLandingData = async () => {
      try {
        const response = await $fetch({
          url: "/api/staking/landing",
          method: "GET",
          silent: true,
        });
        if (isMounted && response.data) {
          setLandingData(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch staking landing data:", err);
        if (isMounted) {
          setError("Failed to load staking data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLandingData();

    return () => {
      isMounted = false;
      // Reset ref on cleanup to allow re-fetching on next mount
      fetchInitiatedRef.current = false;
    };
  }, []);

  // KYC/feature gating logic
  const kycEnabled =
    settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasStakingAccess = hasKyc() && canAccessFeature("view_staking");

  if (kycEnabled && !hasStakingAccess) {
    return <KycRequiredNotice feature="view_staking" />;
  }

  // Theme colors - violet/indigo for staking
  const gradient = { from: "#8b5cf6", to: "#6366f1" };

  // Format number helper
  const formatNumber = (num: number) => {
    if (num >= 1000000000)
      return { value: num / 1000000000, suffix: "B+", decimals: 1 };
    if (num >= 1000000)
      return { value: num / 1000000, suffix: "M+", decimals: 1 };
    if (num >= 1000) return { value: num / 1000, suffix: "K+", decimals: 1 };
    return { value: num, suffix: "+", decimals: 0 };
  };

  const stats = landingData?.stats;
  const showStats = stats && (stats.totalStaked > 0 || stats.activeUsers > 0);

  // Hero stats items
  const heroStatsItems = showStats
    ? [
        {
          icon: TrendingUp,
          value: formatNumber(stats.totalStaked).value,
          label: "Total Staked",
          prefix: "$",
          suffix: formatNumber(stats.totalStaked).suffix,
          decimals: formatNumber(stats.totalStaked).decimals,
        },
        {
          icon: Users,
          value: formatNumber(stats.activeUsers).value,
          label: "Active Users",
          suffix: formatNumber(stats.activeUsers).suffix,
          decimals: formatNumber(stats.activeUsers).decimals,
        },
        {
          icon: Zap,
          value: stats.highestApr || stats.avgApr,
          label: "Up to APR",
          suffix: "%",
          decimals: 1,
        },
      ]
    : [];

  // Stats section data (enhanced with new stats)
  const statsData = showStats
    ? [
        {
          id: "staked",
          icon: Coins,
          value: formatNumber(stats.totalStaked).value,
          prefix: "$",
          suffix: formatNumber(stats.totalStaked).suffix,
          decimals: formatNumber(stats.totalStaked).decimals,
          label: "Total Value Staked",
          description: "Assets securely staked on our platform",
        },
        {
          id: "users",
          icon: Users,
          value: formatNumber(stats.activeUsers).value,
          suffix: formatNumber(stats.activeUsers).suffix,
          decimals: formatNumber(stats.activeUsers).decimals,
          label: "Active Stakers",
          description: "Users earning passive income",
        },
        {
          id: "pools",
          icon: Layers,
          value: stats.activePools,
          suffix: "",
          decimals: 0,
          label: "Active Pools",
          description: "Diverse staking opportunities",
        },
        {
          id: "rewards",
          icon: Award,
          value: formatNumber(stats.totalRewards).value,
          prefix: "$",
          suffix: formatNumber(stats.totalRewards).suffix,
          decimals: formatNumber(stats.totalRewards).decimals,
          label: "Rewards Distributed",
          description: "Total rewards paid to stakers",
        },
      ]
    : [];

  // How It Works steps
  const howItWorksSteps = [
    {
      id: "choose",
      icon: Target,
      number: 1,
      title: "Choose a Pool",
      description:
        "Browse our curated selection of high-yield staking pools with competitive APRs and flexible lock periods.",
      features: ["Curated pools", "High APRs", "Flexible terms"],
    },
    {
      id: "stake",
      icon: Wallet,
      number: 2,
      title: "Stake Your Assets",
      description:
        "Securely deposit your crypto assets with enterprise-grade security and multi-signature protection.",
      features: ["Instant deposits", "Multi-sig security", "No hidden fees"],
    },
    {
      id: "earn",
      icon: TrendingUp,
      number: 3,
      title: "Earn Rewards",
      description:
        "Watch your rewards accumulate automatically with real-time tracking and transparent calculations.",
      features: ["Auto-compounding", "Real-time tracking", "Daily rewards"],
    },
    {
      id: "claim",
      icon: Gift,
      number: 4,
      title: "Claim Anytime",
      description:
        "Withdraw your staked assets and rewards with flexible options and instant processing.",
      features: ["Instant withdrawals", "No penalties", "24/7 access"],
    },
  ];

  // Features
  const features = [
    {
      id: "security",
      icon: Shield,
      title: "Bank-Grade Security",
      description:
        "Multi-signature wallets, cold storage, and 24/7 monitoring protect your assets at all times.",
      highlights: ["Multi-sig Protection", "Cold Storage", "Insurance Coverage"],
    },
    {
      id: "returns",
      icon: TrendingUp,
      title: "Maximum Returns",
      description:
        "Optimized staking strategies ensure you earn the highest possible rewards on your assets.",
      highlights: ["Auto-compounding", "No Hidden Fees", "Competitive APRs"],
    },
    {
      id: "speed",
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Instant staking, real-time rewards tracking, and rapid withdrawals when you need them.",
      highlights: ["Instant Deposits", "Real-time Tracking", "Fast Withdrawals"],
    },
  ];

  // Transform featured pools to match the existing FeaturedPoolsSection interface
  const featuredPools = landingData?.featuredPools?.map((pool) => ({
    ...pool,
    isPromoted: true,
  })) || [];

  return (
    <StakingErrorBoundary>
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
          theme={{ primary: "violet", secondary: "indigo" }}
        />

        {/* Floating geometric shapes */}
        <FloatingShapes
          theme={{ primary: "violet", secondary: "indigo" }}
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
          theme={{ primary: "violet", secondary: "indigo" }}
          content={{
            tag: {
              text: `${t("earn_up_to")} ${isLoading ? "..." : stats ? `${stats.highestApr || stats.avgApr}%` : "25%"} APR`,
              icon: Sparkles,
            },
            heading: {
              text: `${t("maximize")} ${tExt("your")}`,
              highlightedText: t("crypto_returns"),
              highlightPosition: "after",
              size: "lg",
            },
            subtitle: {
              text: `${t("stake_your_tokens_industry_leading_rewards")}. ${t("join_the_future_staking_platform")}.`,
              size: "md",
            },
            actions: [
              {
                text: t("start_staking_now"),
                href: "/staking/pool",
                variant: "primary",
                icon: ArrowRight,
                iconPosition: "right",
              },
              {
                text: tCommon("learn_more"),
                href: "/staking/guide",
                variant: "outline",
                icon: ChevronRight,
                iconPosition: "right",
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
                color: "violet",
                blur: 100,
                opacity: 30,
                animate: true,
                animationDelay: 0,
              },
              {
                position: "bottom-left",
                size: "lg",
                color: "indigo",
                blur: 80,
                opacity: 35,
                animate: true,
                animationDelay: 1.5,
              },
              {
                position: "top-left",
                size: "md",
                color: "indigo",
                blur: 60,
                opacity: 20,
                animate: true,
                animationDelay: 0.5,
              },
              {
                position: "bottom-right",
                size: "lg",
                color: "violet",
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
              label: "Bank-Grade Security",
              description: "Multi-sig protected",
            },
            {
              icon: Lock,
              label: "Audited Contracts",
              description: "Security verified",
            },
            {
              icon: RefreshCw,
              label: "Auto-Compounding",
              description: "Maximize returns",
            },
            {
              icon: Wallet,
              label: "Multi-Token Support",
              description: "Stake any asset",
            },
          ]}
          theme={{ primary: "violet", secondary: "indigo" }}
          variant="default"
          title="Why Trust Us"
        />

        {/* How It Works Section */}
        <ProcessSection
          header={{
            tag: {
              text: tExt("how_it_works"),
              icon: Sparkles,
            },
            title: t("start_earning_in_4_simple_steps"),
            subtitle: t("our_streamlined_staking_institutional_grade_securi"),
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
          theme={{ primary: "violet", secondary: "indigo" }}
        />

        {/* Featured Pools Section */}
        {error ? (
          <section className="py-24">
            <div className="container mx-auto">
              <StakingError error={new Error(error)} />
            </div>
          </section>
        ) : (
          <FeaturedPoolsSection pools={featuredPools} isLoading={isLoading} />
        )}

        {/* Pool Variety Section - NEW */}
        <PoolVarietySection
          highestAprPools={landingData?.highestAprPools || []}
          flexiblePools={landingData?.flexiblePools || []}
          upcomingPools={landingData?.upcomingPools || []}
          isLoading={isLoading}
        />

        {/* Stats Section */}
        {showStats && (
          <StatsSection
            header={{
              tag: {
                text: tExt("platform_statistics"),
                icon: Sparkles,
              },
              title: t("our_numbers_speak_for_themselves"),
              subtitle: t("join_thousands_of_stakers_earning_passive_income"),
              alignment: "center",
            }}
            stats={statsData}
            layout={{
              variant: "grid",
              columns: 4,
              gap: "lg",
              showIcon: true,
              showDescription: true,
            }}
            background={{ variant: "transparent" }}
            theme={{ primary: "violet", secondary: "indigo" }}
          />
        )}

        {/* Calculator Preview Section - NEW */}
        <CalculatorPreviewSection
          calculatorPreview={landingData?.calculatorPreview || null}
          isLoading={isLoading}
        />

        {/* Live Activity Section - NEW */}
        <LiveActivitySection
          activities={landingData?.recentActivity || []}
          isLoading={isLoading}
        />

        {/* Features Section */}
        <FeaturesSection
          header={{
            tag: {
              text: tCommon("why_choose_us"),
              icon: Sparkles,
            },
            title: t("the_future_of_staking_is_here"),
            subtitle: t("industry_leading_security_competitive_returns_and"),
            alignment: "center",
          }}
          features={features}
          layout={{
            variant: "grid",
            columns: 3,
            gap: "lg",
            iconPosition: "top",
            iconStyle: "filled",
            cardStyle: "bordered",
            hoverEffect: "glow",
          }}
          background={{ variant: "transparent" }}
          theme={{ primary: "violet", secondary: "indigo" }}
        />

        {/* CTA Section */}
        <CTASection
          content={{
            tag: {
              text: "Start Earning Today",
              icon: Sparkles,
            },
            title: tExt("ready_to_start_earning"),
            titleHighlight: "Earning",
            subtitle: t("join_thousands_of_staking_platform"),
            trustItems: [
              { icon: CheckCircle, text: "No hidden fees" },
              { icon: Zap, text: "Instant withdrawals" },
              { icon: Headphones, text: "24/7 support" },
              { icon: Shield, text: "Secure & audited" },
            ],
            cards: [
              {
                variant: "primary",
                icon: Coins,
                title: t("start_staking_now"),
                description: t("browse_staking_pools_and_start_earning_rewards_today"),
                buttonText: t("view_pools"),
                href: "/staking/pool",
              },
              {
                variant: "secondary",
                icon: Gift,
                title: tCommon("learn_more"),
                description: t("learn_how_staking_works_and_maximize_your_earnings"),
                buttonText: t("read_guide"),
                href: "/staking/guide",
              },
            ],
          }}
          layout={{
            variant: "cards",
            actionStyle: "cards",
          }}
          background={{ variant: "transparent" }}
          theme={{ primary: "violet", secondary: "indigo" }}
          className="pb-24"
        />
      </div>
    </StakingErrorBoundary>
  );
}
