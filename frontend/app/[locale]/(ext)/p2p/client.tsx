"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  Globe,
  Coins,
  Search,
  CheckSquare,
  Star,
  ChevronRight,
  Sparkles,
  Award,
  Headphones,
  Clock,
  CheckCircle,
  Lock,
} from "lucide-react";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useConfigStore } from "@/store/config";
import { MaintenanceBanner } from "./components/maintenance-banner";
import { PlatformDisabledBanner } from "./components/platform-disabled-banner";
import { FeatureRestrictedBanner } from "./components/feature-restricted-banner";
import { getBooleanSetting } from "@/utils/formatters";
import { siteName } from "@/lib/siteInfo";
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
import { $fetch } from "@/lib/api";
import TopCryptosSection from "./components/landing/top-cryptos-section";
import FeaturedOffersSection from "./components/landing/featured-offers-section";
import TopTradersSection from "./components/landing/top-traders-section";
import LiveActivitySection from "./components/landing/live-activity-section";

interface LandingData {
  stats: {
    totalTrades: number;
    completedTrades: number;
    totalVolume: number;
    averageTradeSize: number;
    successRate: number;
    uniqueTraders: number;
    activeOffers: number;
    countriesServed: number;
    volumeGrowth: number;
  };
  topCryptos: Array<{
    currency: string;
    totalVolume: number;
    tradeCount: number;
    avgPrice: number;
  }>;
  featuredOffers: {
    buy: any[];
    sell: any[];
  };
  topTraders: any[];
  popularPaymentMethods: any[];
  recentActivity: any[];
  trustMetrics: {
    avgEscrowReleaseTime: number;
    disputeRate: number;
    disputeResolutionRate: number;
    satisfactionRate: number;
  };
}

export default function P2PLandingClient() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const {
    stats,
    isLoadingP2PStats,
    p2pStatsError,
    fetchMarketHighlights,
    fetchP2PStats,
    fetchTopCryptos,
  } = useP2PStore();

  useEffect(() => {
    fetchMarketHighlights();
    fetchP2PStats();
    fetchTopCryptos();
  }, [fetchMarketHighlights, fetchP2PStats, fetchTopCryptos]);

  const { settings } = useConfigStore();

  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [isLoadingLanding, setIsLoadingLanding] = useState(true);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    if (settings) {
      setIsSettingsLoaded(true);
    }
  }, [settings]);

  useEffect(() => {
    // Prevent duplicate calls during React Strict Mode double-mounting
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    let isMounted = true;

    const fetchLandingData = async () => {
      try {
        const response = await $fetch<LandingData>({
          url: "/api/p2p/landing",
          method: "GET",
          silent: true,
        });
        if (response.data && isMounted) {
          setLandingData(response.data);
        }
      } catch (error) {
        console.error("Error fetching P2P landing data:", error);
      } finally {
        if (isMounted) {
          setIsLoadingLanding(false);
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

  if (!isSettingsLoaded) {
    return null;
  }

  const platformSettings = {
    enabled:
      settings?.p2pEnabled !== undefined
        ? getBooleanSetting(settings.p2pEnabled)
        : true,
    maintenanceMode:
      settings?.p2pMaintenanceMode !== undefined
        ? getBooleanSetting(settings.p2pMaintenanceMode)
        : false,
    allowNewOffers:
      settings?.p2pAllowNewOffers !== undefined
        ? getBooleanSetting(settings.p2pAllowNewOffers)
        : true,
    allowGuestBrowsing:
      settings?.p2pAllowGuestBrowsing !== undefined
        ? getBooleanSetting(settings.p2pAllowGuestBrowsing)
        : true,
  };

  // Theme colors - blue/violet for P2P
  const gradient = { from: "#3b82f6", to: "#8b5cf6" };

  // Features
  const features = [
    {
      id: "escrow",
      icon: Shield,
      title: t("secure_escrow_protection"),
      description: t("our_military_grade_escrow_fully_protected"),
      highlights: [
        "Military-grade encryption",
        "Automatic fund protection",
        "Instant release on confirmation",
      ],
    },
    {
      id: "global",
      icon: Globe,
      title: t("global_community"),
      description: t("join_our_thriving_traders_across"),
      highlights: [
        "200+ countries supported",
        "Multiple payment methods",
        "Local currency support",
      ],
    },
    {
      id: "fees",
      icon: Coins,
      title: t("minimal_fees"),
      description: t("enjoy_the_lowest_fees_in_the_industry_at_just"),
      highlights: [
        "Industry-lowest rates",
        "No hidden charges",
        "Volume-based discounts",
      ],
    },
  ];

  // How It Works steps
  const howItWorksSteps = [
    {
      id: "browse",
      icon: Search,
      number: 1,
      title: tCommon("browse_offers"),
      description: t("find_the_best_filtering_system"),
      features: [
        t("filter_by_payment_method_price_and_location"),
        t("compare_trader_ratings_and_reviews"),
        t("real_time_price_updates_and_market_data"),
      ],
    },
    {
      id: "select",
      icon: CheckSquare,
      number: 2,
      title: t("select_an_offer"),
      description: t("choose_an_offer_verified_traders"),
      features: [
        t("view_trader_reputation_and_transaction_history"),
        t("instant_chat_communication_with_seller"),
        t("transparent_pricing_and_terms"),
      ],
    },
    {
      id: "complete",
      icon: Shield,
      number: 3,
      title: t("complete_the_trade"),
      description: t("our_escrow_system_secure_transactions"),
      features: [
        t("real_time_chat_with_your_trading_partner"),
        t("automatic_escrow_protection_for_all_funds"),
        t("n_24_7_dispute_resolution_support"),
      ],
    },
    {
      id: "rate",
      icon: Star,
      number: 4,
      title: t("rate_your_experience"),
      description: t("share_your_trading_platform_benefits"),
      features: [
        t("build_your_reputation_score_and_credibility"),
        t("unlock_premium_benefits_and_lower_fees"),
        t("help_the_community_grow_and_thrive"),
      ],
    },
  ];

  // Stats items
  const showStats =
    stats &&
    Object.keys(stats).length > 0 &&
    !isNaN(stats.totalVolume) &&
    !isNaN(stats.totalOffers) &&
    !isNaN(stats.countries) &&
    !isNaN(stats.successRate);

  const statsItems = showStats
    ? [
        {
          icon: Coins,
          value: stats.totalVolume / 1000000,
          label: tCommon("trading_volume"),
          prefix: "$",
          suffix: "M+",
          decimals: 0,
        },
        {
          icon: Search,
          value: stats.totalOffers / 1000,
          label: tCommon("active_offers"),
          suffix: "K+",
          decimals: 0,
        },
        {
          icon: Globe,
          value: stats.countries,
          label: tCommon("countries"),
          suffix: "+",
          decimals: 0,
        },
        {
          icon: CheckCircle,
          value: stats.successRate,
          label: tCommon("success_rate"),
          suffix: "%",
          decimals: 0,
        },
      ]
    : [];

  // Hero stats for badges
  const heroStatsItems = showStats
    ? [
        {
          icon: Users,
          value: stats.totalOffers / 1000,
          label: "Active Offers",
          suffix: "K+",
          decimals: 0,
        },
        {
          icon: Globe,
          value: stats.countries,
          label: "Countries",
          suffix: "+",
          decimals: 0,
        },
        {
          icon: CheckCircle,
          value: stats.successRate,
          label: "Success Rate",
          suffix: "%",
          decimals: 0,
        },
      ]
    : [];

  return (
    <div className="flex flex-col overflow-hidden relative">
      {/* Status Banners */}
      <div className="container mx-auto relative z-50">
        {platformSettings.maintenanceMode && <MaintenanceBanner />}
        {platformSettings.enabled === false && <PlatformDisabledBanner />}
        {platformSettings.allowGuestBrowsing === false && (
          <FeatureRestrictedBanner />
        )}
      </div>

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
        theme={{ primary: "blue", secondary: "violet" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "blue", secondary: "violet" }}
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
        theme={{ primary: "blue", secondary: "violet" }}
        content={{
          tag: {
            text: `${t("secure_escrow")} • ${t("fast_trades")} • ${t("trusted_community")}`,
            icon: Sparkles,
          },
          heading: {
            text: t("trade_crypto"),
            highlightedText: t("peer_to_peer"),
            highlightPosition: "after",
            size: "lg",
            additionalText: t("with_confidence"),
          },
          subtitle: {
            text: t("secure_fast_and_escrow_protection"),
            size: "md",
          },
          actions: [
            {
              text: tCommon("start_trading"),
              href: "/p2p/offer",
              variant: "primary",
              icon: ArrowRight,
              iconPosition: "right",
            },
            {
              text: tCommon("learn_more"),
              href: "/p2p/guide",
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
        statsLoading={isLoadingP2PStats}
        className="pt-16"
      />

      {/* Trust Bar */}
      <TrustBar
        items={[
          {
            icon: Shield,
            label: t("secure_escrow"),
            description: "Military-grade protection",
          },
          {
            icon: Zap,
            label: t("fast_trades"),
            description: "Instant settlements",
          },
          {
            icon: Users,
            label: t("trusted_community"),
            description: "Verified traders",
          },
          {
            icon: Lock,
            label: "100% Funds Protection",
            description: "Escrow guarantee",
          },
        ]}
        theme={{ primary: "blue", secondary: "violet" }}
        variant="default"
        title="Why Trust Us"
      />

      {/* Top Cryptocurrencies Section */}
      <TopCryptosSection
        cryptos={landingData?.topCryptos || []}
        isLoading={isLoadingLanding}
      />

      {/* Featured Offers Section */}
      <FeaturedOffersSection
        buyOffers={landingData?.featuredOffers?.buy || []}
        sellOffers={landingData?.featuredOffers?.sell || []}
        isLoading={isLoadingLanding}
      />

      {/* Top Traders Section */}
      <TopTradersSection
        traders={landingData?.topTraders || []}
        isLoading={isLoadingLanding}
      />

      {/* Live Activity Section */}
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
            title: "Trusted by Traders Worldwide",
            titleHighlight: "Worldwide",
            subtitle:
              "Join our growing community of successful P2P traders across the globe.",
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
          theme={{ primary: "blue", secondary: "violet" }}
          loading={isLoadingP2PStats}
        />
      )}

      {/* Features Section */}
      <FeaturesSection
        header={{
          tag: {
            text: `${tCommon("why_choose_us")} ${siteName}`,
            icon: Award,
          },
          title: t("trusted_platform_for"),
          titleHighlight: t("secure_p2p_trading"),
          subtitle: t("our_platform_offers_traders_worldwide"),
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
        theme={{ primary: "blue", secondary: "violet" }}
      />

      {/* How It Works Section */}
      <ProcessSection
        header={{
          tag: {
            text: tCommon("simple_process"),
            icon: Sparkles,
          },
          title: `${tExt("simple_4_step")} ${t("trading_process")}`,
          subtitle: t("our_streamlined_process_and_fast"),
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
        theme={{ primary: "blue", secondary: "violet" }}
        showCTA={{
          enabled:
            platformSettings.enabled && !platformSettings.maintenanceMode,
          text: t("start_trading_now"),
          href: "/p2p/offer",
        }}
      />

      {/* CTA Section */}
      <CTASection
        content={{
          tag: {
            text: "Start Trading Today",
            icon: Sparkles,
          },
          title: t("ready_to_start_trading"),
          titleHighlight: "Trading",
          subtitle: t("join_thousands_of_our_platform"),
          trustItems: [
            { icon: Shield, text: "Bank-level Security" },
            { icon: Headphones, text: "24/7 Support" },
            { icon: Zap, text: "Instant Trades" },
            { icon: Clock, text: "Global Access" },
          ],
          cards: [
            {
              variant: "primary",
              icon: Search,
              title: tCommon("browse_offers"),
              description: t("find_the_best_deals_from_verified_traders_worldwide"),
              buttonText: t("view_offers"),
              href: "/p2p/offer",
            },
            ...(platformSettings.allowNewOffers &&
            platformSettings.enabled &&
            !platformSettings.maintenanceMode
              ? [
                  {
                    variant: "secondary" as const,
                    icon: Coins,
                    title: tCommon("create_offer"),
                    description: t("list_your_own_offer_and_start_trading_with_others"),
                    buttonText: t("create_now"),
                    href: "/p2p/offer/create",
                  },
                ]
              : []),
          ],
        }}
        layout={{
          variant: "cards",
          actionStyle: "cards",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "blue", secondary: "violet" }}
        className="pb-24"
      />
    </div>
  );
}
