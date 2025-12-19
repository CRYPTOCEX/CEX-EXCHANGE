"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  Zap,
  Globe,
  Code,
  CreditCard,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Users,
  DollarSign,
  Wallet,
  Key,
  Webhook,
  BarChart3,
  ChevronRight,
  Award,
  Headphones,
  Clock,
  Lock,
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
import SupportedCurrenciesSection from "./components/landing/supported-currencies-section";
import FeeCalculatorSection from "./components/landing/fee-calculator-section";
import LiveActivitySection from "./components/landing/live-activity-section";

interface GatewayStats {
  totalMerchants: number;
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  avgProcessingTime?: number;
  currenciesSupported?: number;
  uptime?: number;
}

interface LandingData {
  stats: GatewayStats;
  supportedPayments: {
    fiat: string[];
    crypto: string[];
    walletTypes: string[];
  };
  feeStructure: {
    type: string;
    percentage: number;
    fixed: number;
    example: {
      amount: number;
      fee: number;
      netAmount: number;
    };
  };
  payoutOptions: any[];
  recentActivity: any[];
  integrations: any[];
}

export default function GatewayLandingClient() {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [isLoadingLanding, setIsLoadingLanding] = useState(true);
  const fetchInitiatedRef = useRef(false);

  // Fetch landing data (includes stats)
  useEffect(() => {
    // Prevent duplicate calls during React Strict Mode double-mounting
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    let isMounted = true;

    const fetchLanding = async () => {
      try {
        const response = await $fetch({
          url: "/api/gateway/landing",
          method: "GET",
          silent: true,
        });
        if (isMounted && response.data) {
          setLandingData(response.data);
          setStats(response.data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch gateway landing data:", error);
      } finally {
        if (isMounted) {
          setIsLoadingStats(false);
          setIsLoadingLanding(false);
        }
      }
    };

    fetchLanding();

    return () => {
      isMounted = false;
      // Reset ref on cleanup to allow re-fetching on next mount
      fetchInitiatedRef.current = false;
    };
  }, []);

  // Theme colors - indigo/cyan for Gateway
  const gradient = { from: "#6366f1", to: "#06b6d4" };

  // Check if we have meaningful stats
  const showStats =
    stats &&
    (stats.totalMerchants > 0 ||
      stats.totalTransactions > 0 ||
      stats.totalVolume > 0);

  // Hero stats items
  const heroStatsItems = showStats
    ? [
        {
          icon: Users,
          value: stats.totalMerchants,
          label: "Merchants",
          suffix: "+",
        },
        {
          icon: BarChart3,
          value: stats.totalTransactions,
          label: "Transactions",
          suffix: "+",
        },
        {
          icon: CheckCircle,
          value: stats.successRate || 99.9,
          label: "Success Rate",
          suffix: "%",
          decimals: 1,
        },
      ]
    : [];

  // Stats items for StatsSection
  const statsItems = showStats
    ? [
        {
          icon: Users,
          value: stats.totalMerchants,
          label: "Merchants",
          suffix: "+",
        },
        {
          icon: BarChart3,
          value: stats.totalTransactions,
          label: "Transactions",
          suffix: "+",
        },
        {
          icon: DollarSign,
          value: stats.totalVolume / 1000000,
          label: "Volume Processed",
          prefix: "$",
          suffix: "M+",
          decimals: 1,
        },
        {
          icon: CheckCircle,
          value: stats.successRate || 99.9,
          label: "Success Rate",
          suffix: "%",
          decimals: 1,
        },
      ]
    : [];

  // How It Works steps
  const howItWorksSteps = [
    {
      id: "api-keys",
      icon: Key,
      number: 1,
      title: "Get API Keys",
      description:
        "Register as a merchant and generate your API keys instantly. No waiting, no approval process.",
      features: [
        "Instant generation",
        "No approval needed",
        "Multiple environments",
      ],
    },
    {
      id: "integrate",
      icon: Code,
      number: 2,
      title: "Integrate",
      description:
        "Use our SDKs or RESTful APIs to integrate payments into your application in minutes.",
      features: [
        "Multiple SDKs",
        "RESTful APIs",
        "Sandbox testing",
      ],
    },
    {
      id: "webhooks",
      icon: Webhook,
      number: 3,
      title: "Configure Webhooks",
      description:
        "Set up webhooks to receive real-time notifications about payment events.",
      features: [
        "Real-time events",
        "Custom endpoints",
        "Retry logic",
      ],
    },
    {
      id: "accept",
      icon: CreditCard,
      number: 4,
      title: "Start Accepting",
      description:
        "Go live and start accepting payments. Monitor everything from your dashboard.",
      features: [
        "Go live instantly",
        "Real-time dashboard",
        "Analytics & reports",
      ],
    },
  ];

  // Features
  const features = [
    {
      id: "secure",
      icon: Shield,
      title: "Secure & Compliant",
      description:
        "Bank-level security with PCI DSS compliance. Your transactions are protected with end-to-end encryption.",
      highlights: [
        "PCI DSS compliant",
        "End-to-end encryption",
        "Fraud protection",
      ],
    },
    {
      id: "fast",
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Process payments in milliseconds with our optimized infrastructure. Real-time transaction updates.",
      highlights: [
        "Millisecond processing",
        "Real-time updates",
        "Auto-scaling",
      ],
    },
    {
      id: "global",
      icon: Globe,
      title: "Global Reach",
      description:
        "Accept payments from anywhere in the world. Support for multiple cryptocurrencies and currencies.",
      highlights: [
        "200+ countries",
        "Multi-currency",
        "Local payment methods",
      ],
    },
    {
      id: "developer",
      icon: Code,
      title: "Developer Friendly",
      description:
        "Simple RESTful APIs, comprehensive documentation, and SDKs for all major platforms.",
      highlights: [
        "RESTful APIs",
        "Multiple SDKs",
        "Detailed docs",
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
        theme={{ primary: "indigo", secondary: "cyan" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "indigo", secondary: "cyan" }}
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
        theme={{ primary: "indigo", secondary: "cyan" }}
        content={{
          tag: {
            text: t("next_gen_payment_gateway"),
            icon: Sparkles,
          },
          heading: {
            text: t("accept_payments"),
            highlightedText: t("anywhere_anytime"),
            highlightPosition: "after",
            size: "lg",
          },
          subtitle: {
            text: `${t("power_your_business_with_our_secure")} ${t("start_accepting_crypto_payments_in_minutes")}`,
            size: "md",
          },
          actions: [
            {
              text: user ? "Go to Dashboard" : "Start Now - It's Free",
              href: user ? "/gateway/dashboard" : "/gateway/register",
              variant: "primary",
              icon: ArrowRight,
              iconPosition: "right",
            },
            {
              text: t("view_documentation"),
              href: "/gateway/docs",
              variant: "outline",
              icon: Code,
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
              color: "cyan",
              blur: 80,
              opacity: 35,
              animate: true,
              animationDelay: 1.5,
            },
            {
              position: "top-left",
              size: "md",
              color: "cyan",
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
        statsLoading={isLoadingStats}
        className="pt-16"
      />

      {/* Trust Bar */}
      <TrustBar
        items={[
          {
            icon: CheckCircle,
            label: t("instant_setup"),
            description: "No approval needed",
          },
          {
            icon: Shield,
            label: t("no_hidden_fees"),
            description: "Transparent pricing",
          },
          {
            icon: Headphones,
            label: tExt("n_24_7_support"),
            description: "Always available",
          },
          {
            icon: Lock,
            label: stats?.uptime ? `${stats.uptime}% Uptime` : "PCI Compliant",
            description: stats?.uptime ? "Guaranteed availability" : "Bank-level security",
          },
        ]}
        theme={{ primary: "indigo", secondary: "cyan" }}
        variant="default"
        title="Why Choose Us"
      />

      {/* Supported Currencies Section - NEW */}
      <SupportedCurrenciesSection
        payments={landingData?.supportedPayments || { fiat: [], crypto: [], walletTypes: [] }}
        isLoading={isLoadingLanding}
      />

      {/* Fee Calculator Section - NEW */}
      <FeeCalculatorSection
        feeStructure={landingData?.feeStructure || { type: "BOTH", percentage: 2.9, fixed: 0.3, example: { amount: 100, fee: 3.2, netAmount: 96.8 } }}
        isLoading={isLoadingLanding}
      />

      {/* Live Activity Section - NEW */}
      <LiveActivitySection
        activity={landingData?.recentActivity || []}
        isLoading={isLoadingLanding}
      />

      {/* Stats Section */}
      {showStats && (
        <StatsSection
          header={{
            tag: {
              text: "Platform Statistics",
              icon: Award,
            },
            title: "Trusted by Businesses",
            titleHighlight: "Worldwide",
            subtitle:
              "Join thousands of merchants already using our payment gateway for secure transactions.",
            alignment: "center",
          }}
          stats={statsItems}
          layout={{
            variant: "grid",
            columns: 4,
            gap: "lg",
            cardStyle: "bordered",
            animateNumbers: true,
          }}
          background={{ variant: "transparent" }}
          theme={{ primary: "indigo", secondary: "cyan" }}
          loading={isLoadingStats}
        />
      )}

      {/* Features Section */}
      <FeaturesSection
        header={{
          tag: {
            text: tCommon("why_choose_us"),
            icon: Shield,
          },
          title: t("built_for_modern_businesses"),
          subtitle: t("everything_you_need_to_accept_payments"),
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
        theme={{ primary: "indigo", secondary: "cyan" }}
      />

      {/* How It Works Section */}
      <ProcessSection
        header={{
          tag: {
            text: t("simple_integration"),
            icon: Zap,
          },
          title: t("get_started_in_4_steps"),
          subtitle: t("from_signup_to_accepting_payments_in_minutes"),
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
        theme={{ primary: "indigo", secondary: "cyan" }}
        showCTA={{
          enabled: true,
          text: user ? "Go to Dashboard" : "Start Now",
          href: user ? "/gateway/dashboard" : "/gateway/register",
        }}
      />

      {/* CTA Section */}
      <CTASection
        content={{
          tag: {
            text: t("start_today"),
            icon: CreditCard,
          },
          title: t("ready_to_get_started"),
          titleHighlight: "Started",
          subtitle: `${t("join_thousands_of_businesses_already_using")} ${t("simple_pricing_powerful_features_and_world")}`,
          trustItems: [
            { icon: Shield, text: "Low Transaction Fees" },
            { icon: Wallet, text: "No Setup Costs" },
            { icon: Zap, text: "Instant Payouts" },
            { icon: Clock, text: "24/7 Support" },
          ],
          cards: [
            {
              variant: "primary",
              icon: Key,
              title: user ? "View Dashboard" : "Create Account",
              description: t("start_accepting_crypto_payments_in_minutes"),
              buttonText: user ? tCommon("go_to_dashboard") : tCommon("get_started"),
              href: user ? "/gateway/dashboard" : "/gateway/register",
            },
            {
              variant: "secondary",
              icon: Code,
              title: t("read_documentation"),
              description: t("explore_our_api_docs_and_integration_guides"),
              buttonText: tCommon("view_docs"),
              href: "/gateway/docs",
            },
          ],
        }}
        layout={{
          variant: "cards",
          actionStyle: "cards",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "indigo", secondary: "cyan" }}
        className="pb-24"
      />
    </div>
  );
}
