"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Users,
  Sparkles,
  ChevronRight,
  Award,
  DollarSign,
  Share2,
  Zap,
  CheckCircle,
  Globe,
  Wallet,
  UserPlus,
  Headphones,
  Clock,
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
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
import RewardConditionsSection from "./components/RewardConditionsSection";
import TopAffiliatesSection from "./components/TopAffiliatesSection";
import LiveActivityFeed from "./components/LiveActivityFeed";

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

interface TopAffiliate {
  rank: number;
  avatar: string | null;
  displayName: string;
  totalEarnings: number;
  rewardCount: number;
  joinedAgo: string;
}

interface ActivityItem {
  type: "reward_earned";
  amount: number;
  conditionType: string;
  conditionName: string;
  currency: string;
  timeAgo: string;
}

interface LandingData {
  stats: {
    totalAffiliates: number;
    totalPaidOut: number;
    avgMonthlyEarnings: number;
    successRate: number;
    topEarning: number;
    avgReferrals: number;
  };
  conditions: Condition[];
  topAffiliates: TopAffiliate[];
  recentActivity: ActivityItem[];
  mlmSystem: string;
}

export default function AffiliateClient() {
  const t = useTranslations("ext_affiliate");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();
  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls during React Strict Mode double-mounting
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    let isMounted = true;

    const fetchLandingData = async () => {
      try {
        const response = await $fetch({
          url: "/api/affiliate/landing",
          method: "GET",
          silent: true,
        });
        if (isMounted && response.data) {
          setLandingData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch affiliate landing data:", error);
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

  // Theme colors - blue/amber for Affiliate
  const gradient = { from: "#3b82f6", to: "#f59e0b" };

  // Check if we have meaningful stats
  const stats = landingData?.stats;
  const showStats =
    stats &&
    (stats.totalAffiliates > 0 ||
      stats.totalPaidOut > 0 ||
      stats.avgMonthlyEarnings > 0);

  // Hero stats items
  const heroStatsItems = showStats
    ? [
        {
          icon: Users,
          value: stats.totalAffiliates,
          label: "Total Affiliates",
          suffix: "+",
        },
        {
          icon: DollarSign,
          value: stats.totalPaidOut,
          label: "Paid Out",
          prefix: "$",
          decimals: 0,
        },
        {
          icon: TrendingUp,
          value: stats.successRate || 0,
          label: "Success Rate",
          suffix: "%",
          decimals: 0,
        },
      ]
    : [];

  // Stats items for StatsSection
  const statsItems = showStats
    ? [
        {
          icon: Users,
          value: stats.totalAffiliates,
          label: "Total Affiliates",
          suffix: "+",
          description: "Active affiliate partners",
        },
        {
          icon: DollarSign,
          value: stats.totalPaidOut,
          label: "Total Paid Out",
          prefix: "$",
          decimals: 0,
          description: "Commissions distributed",
        },
        {
          icon: Wallet,
          value: stats.avgMonthlyEarnings,
          label: "Avg. Monthly Earnings",
          prefix: "$",
          decimals: 0,
          description: "Per active affiliate",
        },
        {
          icon: TrendingUp,
          value: stats.successRate || 0,
          label: "Success Rate",
          suffix: "%",
          decimals: 0,
          description: "Active referrals",
        },
      ]
    : [];

  // How It Works steps
  const howItWorksSteps = [
    {
      id: "signup",
      icon: UserPlus,
      number: 1,
      title: "Sign Up & Get Your Link",
      description:
        "Create your account and receive your unique referral link instantly. No approval process needed.",
      features: [
        "Instant link generation",
        "No approval required",
        "Custom tracking codes",
      ],
    },
    {
      id: "share",
      icon: Share2,
      number: 2,
      title: "Share Your Link",
      description:
        "Share your referral link through social media, email, or your website. Use our marketing materials.",
      features: [
        "Social media sharing",
        "Marketing materials",
        "Custom campaigns",
      ],
    },
    {
      id: "build",
      icon: Users,
      number: 3,
      title: "Build Your Network",
      description:
        "Watch your network grow as people sign up using your link. Track their activity in real-time.",
      features: ["Real-time tracking", "Network analytics", "Growth insights"],
    },
    {
      id: "earn",
      icon: Wallet,
      number: 4,
      title: "Earn Rewards",
      description:
        "Collect commissions automatically as your referrals trade. Withdraw anytime, no minimum threshold.",
      features: ["Automatic payouts", "No minimums", "Multiple currencies"],
    },
  ];

  // Features
  const features = [
    {
      id: "commissions",
      icon: DollarSign,
      title: "Generous Commissions",
      description:
        "Earn competitive commissions on every trade, deposit, and transaction made by your referrals.",
      highlights: [
        "Competitive rates",
        "Multiple revenue streams",
        "Transparent tracking",
      ],
    },
    {
      id: "passive",
      icon: TrendingUp,
      title: "Passive Income",
      description:
        "Generate recurring revenue from your network's activity. The more they trade, the more you earn.",
      highlights: [
        "Recurring revenue",
        "Lifetime commissions",
        "Compounding earnings",
      ],
    },
    {
      id: "network",
      icon: Users,
      title: "Multi-Level Network",
      description:
        "Build a network of affiliates and earn from multiple levels. Your success grows exponentially.",
      highlights: ["Multi-tier system", "Team building", "Exponential growth"],
    },
  ];

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
        theme={{ primary: "blue", secondary: "amber" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "blue", secondary: "amber" }}
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
        theme={{ primary: "blue", secondary: "amber" }}
        content={{
          tag: {
            text: t("premium_affiliate_program"),
            icon: Sparkles,
          },
          heading: {
            text: t("turn_your_network"),
            highlightedText: t("into_passive_income"),
            highlightPosition: "after",
            size: "lg",
          },
          subtitle: {
            text: `${t("join_our_elite_affiliate_program_and")} ${t("start_building_your_income_stream_today")}`,
            size: "md",
          },
          actions: [
            {
              text: user ? "Go to Dashboard" : "Start Earning Now",
              href: user ? "/affiliate/dashboard" : "/register",
              variant: "primary",
              icon: ArrowRight,
              iconPosition: "right",
            },
            {
              text: t("view_commission_rates"),
              href: "/affiliate/condition",
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
              color: "blue",
              blur: 100,
              opacity: 30,
              animate: true,
              animationDelay: 0,
            },
            {
              position: "bottom-left",
              size: "lg",
              color: "amber",
              blur: 80,
              opacity: 35,
              animate: true,
              animationDelay: 1.5,
            },
            {
              position: "top-left",
              size: "md",
              color: "amber",
              blur: 60,
              opacity: 20,
              animate: true,
              animationDelay: 0.5,
            },
            {
              position: "bottom-right",
              size: "lg",
              color: "blue",
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
            icon: CheckCircle,
            label: t("no_approval_required"),
            description: "Start instantly",
          },
          {
            icon: Zap,
            label: t("instant_payouts"),
            description: "No waiting period",
          },
          {
            icon: Users,
            label: t("multi_level_earnings"),
            description: "Build your team",
          },
          {
            icon: Shield,
            label: "100% Transparent",
            description: "Real-time tracking",
          },
        ]}
        theme={{ primary: "blue", secondary: "amber" }}
        variant="default"
        title="Why Join Us"
      />

      {/* Stats Section */}
      {showStats && (
        <StatsSection
          header={{
            tag: {
              text: "Platform Statistics",
              icon: Award,
            },
            title: "Trusted by Affiliates Worldwide",
            titleHighlight: "Worldwide",
            subtitle:
              "Join our growing community of successful affiliates earning passive income every day.",
            alignment: "center",
          }}
          stats={statsItems}
          layout={{
            variant: "grid",
            columns: 4,
            gap: "lg",
            cardStyle: "bordered",
            animateNumbers: true,
            showDescription: true,
          }}
          background={{ variant: "transparent" }}
          theme={{ primary: "blue", secondary: "amber" }}
          loading={isLoading}
        />
      )}

      {/* Dynamic Reward Conditions Section - Real data from API */}
      <RewardConditionsSection
        conditions={landingData?.conditions || []}
        isLoading={isLoading}
      />

      {/* Top Affiliates Section - Social proof */}
      <TopAffiliatesSection
        affiliates={landingData?.topAffiliates || []}
        isLoading={isLoading}
      />

      {/* Features Section */}
      <FeaturesSection
        header={{
          tag: {
            text: tCommon("why_choose_us"),
            icon: Award,
          },
          title: t("premium_benefits"),
          subtitle: t("join_thousands_of_successful_affiliates_earning"),
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
        theme={{ primary: "blue", secondary: "amber" }}
      />

      {/* How It Works Section */}
      <ProcessSection
        header={{
          tag: {
            text: tCommon("simple_process"),
            icon: Zap,
          },
          title: tExt("how_it_works"),
          subtitle: t("start_earning_in_four_simple_steps"),
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
        theme={{ primary: "blue", secondary: "amber" }}
        showCTA={{
          enabled: true,
          text: user ? "Go to Dashboard" : "Start Earning Now",
          href: user ? "/affiliate/dashboard" : "/register",
        }}
      />

      {/* Live Activity Feed - Real-time social proof */}
      <LiveActivityFeed
        activities={landingData?.recentActivity || []}
        isLoading={isLoading}
      />

      {/* CTA Section */}
      <CTASection
        content={{
          tag: {
            text: t("join_our_network"),
            icon: Globe,
          },
          title: tExt("ready_to_start_earning"),
          titleHighlight: "Earning",
          subtitle: `${t("join_our_affiliate_program_today_and")} ${t("no_approval_needed_instant_payouts_and")}`,
          trustItems: [
            { icon: Shield, text: "Secure Platform" },
            { icon: Headphones, text: "24/7 Support" },
            { icon: Zap, text: "Instant Payouts" },
            { icon: Clock, text: "Real-Time Tracking" },
          ],
          cards: [
            {
              variant: "primary",
              icon: UserPlus,
              title: user ? "View Dashboard" : "Get Started Free",
              description: t("start_earning_commissions_by_referring_new_users"),
              buttonText: user ? tCommon("go_to_dashboard") : t("join_now"),
              href: user ? "/affiliate/dashboard" : "/register",
            },
            {
              variant: "secondary",
              icon: Users,
              title: t("explore_network"),
              description: t("see_your_referrals_and_track_your_earnings"),
              buttonText: t("view_network"),
              href: "/affiliate/network",
            },
          ],
        }}
        layout={{
          variant: "cards",
          actionStyle: "cards",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "blue", secondary: "amber" }}
        className="pb-24"
      />
    </div>
  );
}
