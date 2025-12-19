"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  LineChart,
  BarChart3,
  Lock,
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Shield,
  CheckCircle,
  Headphones,
  Zap,
  Clock,
} from "lucide-react";
import { useForexStore } from "@/store/forex/user";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
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
import { $fetch } from "@/lib/api";
import { FeaturedPlansSection } from "./components/featured-plans-section";
import RecentCompletionsSection from "./components/landing/recent-completions-section";
import TopPlanSpotlightSection from "./components/landing/top-plan-spotlight-section";
import PerformanceHistorySection from "./components/landing/performance-history-section";

interface PlatformStats {
  activeInvestors: number;
  totalInvested: number;
  averageReturn: number;
  totalProfit: number;
  winRate: number;
  completedInvestments: number;
  activeInvestments: number;
}

interface LandingData {
  stats: PlatformStats;
  featuredPlans: any[];
  topPerformingPlan: any | null;
  performanceHistory: any[];
  signals: any[];
  recentCompletions: any[];
  durationOptions: {
    shortest: string;
    longest: string;
    mostPopular: string;
  };
}

export default function ForexClient() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { plans } = useForexStore();
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  const [stats, setStats] = useState<PlatformStats>({
    activeInvestors: 0,
    totalInvested: 0,
    averageReturn: 0,
    totalProfit: 0,
    winRate: 0,
    completedInvestments: 0,
    activeInvestments: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [isLoadingLanding, setIsLoadingLanding] = useState(true);
  const fetchInitiatedRef = useRef(false);

  // Theme colors - emerald/teal for forex
  const gradient = { from: "#10b981", to: "#14b8a6" };

  // Fetch landing data (includes stats)
  useEffect(() => {
    // Prevent duplicate calls during React Strict Mode double-mounting
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    let isMounted = true;

    $fetch({
      url: "/api/forex/landing",
      silent: true,
    })
      .then((res) => {
        if (isMounted && res.data) {
          setLandingData(res.data);
          setStats({
            activeInvestors: res.data.stats?.activeInvestors || 0,
            totalInvested: res.data.stats?.totalInvested || 0,
            averageReturn: res.data.stats?.averageReturn || 0,
            totalProfit: res.data.stats?.totalProfit || 0,
            winRate: res.data.stats?.winRate || 0,
            completedInvestments: res.data.stats?.completedInvestments || 0,
            activeInvestments: res.data.stats?.activeInvestments || 0,
          });
        }
        if (isMounted) {
          setStatsLoading(false);
          setIsLoadingLanding(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatsLoading(false);
          setIsLoadingLanding(false);
        }
      });

    return () => {
      isMounted = false;
      // Reset ref on cleanup to allow re-fetching on next mount
      fetchInitiatedRef.current = false;
    };
  }, []);

  // Check KYC
  const kycEnabled =
    settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasViewForex = hasKyc() && canAccessFeature("view_forex");

  if (kycEnabled && !hasViewForex) {
    return <KycRequiredNotice feature="view_forex" />;
  }

  // Get trending plans
  const trendingPlans = plans.filter((plan) => plan.trending);

  // Format number helper
  const formatNumber = (num: number) => {
    if (num >= 1000000000)
      return { value: num / 1000000000, suffix: "B+", decimals: 1 };
    if (num >= 1000000)
      return { value: num / 1000000, suffix: "M+", decimals: 1 };
    if (num >= 1000) return { value: num / 1000, suffix: "K+", decimals: 1 };
    return { value: num, suffix: "+", decimals: 0 };
  };

  const showStats =
    stats.activeInvestors > 0 ||
    stats.totalInvested > 0 ||
    stats.averageReturn > 0;

  // Hero stats items - enhanced with win rate
  const heroStatsItems = showStats
    ? [
        {
          icon: Users,
          value: stats.activeInvestors,
          label: "Active Investors",
          suffix: "+",
        },
        {
          icon: DollarSign,
          value: formatNumber(stats.totalInvested).value,
          label: "Total Invested",
          prefix: "$",
          suffix: formatNumber(stats.totalInvested).suffix,
          decimals: formatNumber(stats.totalInvested).decimals,
        },
        stats.winRate > 0
          ? {
              icon: CheckCircle,
              value: stats.winRate,
              label: "Win Rate",
              suffix: "%",
              decimals: 0,
            }
          : {
              icon: TrendingUp,
              value: stats.averageReturn,
              label: "Avg. Return",
              suffix: "%",
              decimals: 1,
            },
      ]
    : [];

  // How It Works steps
  const howItWorksSteps = [
    {
      id: "create",
      icon: Users,
      number: 1,
      title: "Create Account",
      description:
        "Complete our secure verification process to access our investment platform.",
      features: ["Quick KYC", "Secure login", "2FA enabled"],
    },
    {
      id: "select",
      icon: Award,
      number: 2,
      title: "Select Plan",
      description:
        "Choose from our range of institutional-grade investment plans tailored to your goals.",
      features: ["Multiple options", "Flexible terms", "Clear returns"],
    },
    {
      id: "fund",
      icon: DollarSign,
      number: 3,
      title: "Fund Account",
      description:
        "Deposit funds securely via bank transfer, cryptocurrency, or other supported methods.",
      features: ["Instant deposits", "Multiple methods", "No hidden fees"],
    },
    {
      id: "earn",
      icon: TrendingUp,
      number: 4,
      title: "Earn Returns",
      description:
        "Track your investments in real-time and watch your returns grow consistently.",
      features: ["Real-time tracking", "Auto compounding", "Easy withdrawals"],
    },
  ];

  // Features
  const features = [
    {
      id: "algorithms",
      icon: LineChart,
      title: "Advanced Algorithms",
      description:
        "Proprietary trading algorithms with machine learning capabilities for optimal market execution.",
      highlights: [
        "AI-powered market analysis",
        "Risk-adjusted strategies",
        "Real-time optimization",
      ],
    },
    {
      id: "signals",
      icon: BarChart3,
      title: "Professional Signals",
      description:
        "Institutional-grade MT5 signals backed by quantitative analysis and expert traders.",
      highlights: [
        "99.7% signal accuracy",
        "24/7 automated execution",
        "Custom risk parameters",
      ],
    },
    {
      id: "security",
      icon: Lock,
      title: "Enterprise Security",
      description:
        "Bank-level security protocols with segregated accounts and comprehensive insurance.",
      highlights: [
        "256-bit encryption",
        "Segregated client funds",
        "Regular security audits",
      ],
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
        theme={{ primary: "emerald", secondary: "teal" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "emerald", secondary: "teal" }}
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
        theme={{ primary: "emerald", secondary: "teal" }}
        content={{
          tag: {
            text: t("professional_forex_investment_platform"),
            icon: Sparkles,
          },
          heading: {
            text: t("smart_forex"),
            highlightedText: "Investments",
            highlightPosition: "after",
            size: "lg",
          },
          subtitle: {
            text: t("access_institutional_grade_forex_trading_with"),
            size: "md",
          },
          actions: [
            {
              text: t("start_investing"),
              href: "/forex/plan",
              variant: "primary",
              icon: ArrowRight,
              iconPosition: "right",
            },
            {
              text: tCommon("view_dashboard"),
              href: "/forex/dashboard",
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
              color: "emerald",
              blur: 100,
              opacity: 30,
              animate: true,
              animationDelay: 0,
            },
            {
              position: "bottom-left",
              size: "lg",
              color: "teal",
              blur: 80,
              opacity: 35,
              animate: true,
              animationDelay: 1.5,
            },
            {
              position: "top-left",
              size: "md",
              color: "teal",
              blur: 60,
              opacity: 20,
              animate: true,
              animationDelay: 0.5,
            },
            {
              position: "bottom-right",
              size: "lg",
              color: "emerald",
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
        statsLoading={statsLoading}
        className="pt-16"
      />

      {/* Trust Bar */}
      <TrustBar
        items={[
          {
            icon: Shield,
            label: "Bank-Level Security",
            description: "256-bit encryption",
          },
          {
            icon: CheckCircle,
            label: stats.winRate > 0 ? `${stats.winRate}% Win Rate` : "99.7% Signal Accuracy",
            description: stats.winRate > 0 ? "Verified performance" : "Verified performance",
          },
          {
            icon: BarChart3,
            label: "99.99% Uptime",
            description: "Always available",
          },
          {
            icon: Lock,
            label: "100% Funds Protection",
            description: "Segregated accounts",
          },
        ]}
        theme={{ primary: "emerald", secondary: "teal" }}
        variant="default"
        title="Why Trust Us"
      />

      {/* Top Plan Spotlight Section - NEW */}
      <TopPlanSpotlightSection
        plan={landingData?.topPerformingPlan || null}
        isLoading={isLoadingLanding}
      />

      {/* Recent Completions Section - NEW */}
      <RecentCompletionsSection
        completions={landingData?.recentCompletions || []}
        isLoading={isLoadingLanding}
      />

      {/* Performance History Section - NEW */}
      <PerformanceHistorySection
        history={landingData?.performanceHistory || []}
        isLoading={isLoadingLanding}
      />

      {/* Features Section */}
      <FeaturesSection
        header={{
          tag: {
            text: tCommon("why_choose_us"),
            icon: Award,
          },
          title: "Institutional-Grade Trading Technology",
          titleHighlight: t("trading_technology"),
          subtitle: t("advanced_algorithmic_strategies_combined_with_deep"),
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
        theme={{ primary: "emerald", secondary: "teal" }}
      />

      {/* Featured Plans Section - Forex-specific */}
      <FeaturedPlansSection trendingPlans={trendingPlans} />

      {/* How It Works Section */}
      <ProcessSection
        header={{
          tag: {
            text: tExt("getting_started"),
            icon: Sparkles,
          },
          title: `${tExt("simple_4_step")} ${t("investment_process")}`,
          subtitle: t("our_streamlined_onboarding_process_gets_you"),
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
        theme={{ primary: "emerald", secondary: "teal" }}
        showCTA={{
          enabled: true,
          text: t("get_started_now"),
          href: "/forex/plan",
        }}
      />

      {/* CTA Section */}
      <CTASection
        content={{
          tag: {
            text: "Start Your Journey",
            icon: Sparkles,
          },
          title: t("ready_to_maximize_your_returns"),
          titleHighlight: "Returns",
          subtitle: t("join_thousands_of_successful_investors_using"),
          trustItems: [
            { icon: Shield, text: "Enterprise Security" },
            { icon: Headphones, text: "24/7 Expert Support" },
            { icon: Zap, text: "Instant Withdrawals" },
            { icon: Clock, text: "Real-Time Analytics" },
          ],
          cards: [
            {
              variant: "primary",
              icon: TrendingUp,
              title: t("start_investing"),
              description: t("browse_our_investment_plans_and_start_growing_your_portfolio"),
              buttonText: t("view_plans"),
              href: "/forex/plan",
            },
            {
              variant: "secondary",
              icon: BarChart3,
              title: tCommon("view_dashboard"),
              description: t("track_your_investments_and_monitor_performance_in_real_time"),
              buttonText: tCommon("go_to_dashboard"),
              href: "/forex/dashboard",
            },
          ],
        }}
        layout={{
          variant: "cards",
          actionStyle: "cards",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "emerald", secondary: "teal" }}
        className="pb-24"
      />
    </div>
  );
}
