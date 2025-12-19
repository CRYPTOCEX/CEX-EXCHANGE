"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Shield,
  TrendingUp,
  Lock,
  FileCheck,
  Wallet,
  BarChart3,
  Sparkles,
  Search,
  CreditCard,
  Rocket,
  Users,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Flame,
  CheckCircle,
  Headphones,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import ProjectCard, {
  FeaturedProject,
} from "@/app/[locale]/(ext)/ico/components/landing/ProjectCard";
import UpcomingOfferingsSection from "./components/landing/upcoming-offerings-section";
import SuccessStoriesSection from "./components/landing/success-stories-section";
import BlockchainDiversitySection from "./components/landing/blockchain-diversity-section";

interface IcoStats {
  projectsLaunched: number;
  totalRaised: number;
  totalInvestors: number;
  successRate?: number;
  activeOfferings?: number;
  raisedGrowth?: number;
  investorsGrowth?: number;
  successfulOfferings?: number;
  totalOfferings?: number;
}

interface UpcomingOffering {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  description: string;
  targetAmount: number;
  startDate: string;
  daysUntilStart: number;
  blockchain: string;
  tokenType: string;
}

interface SuccessStory {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  targetAmount: number;
  totalRaised: number;
  fundedPercentage: number;
  participants: number;
  completedAt: string;
  daysToComplete: number;
  blockchain: string;
}

interface BlockchainItem {
  name: string;
  value: string;
  offeringCount: number;
}

interface TokenTypeItem {
  name: string;
  value: string;
  offeringCount: number;
}

interface LandingData {
  stats: IcoStats;
  featured: FeaturedProject[];
  upcoming: UpcomingOffering[];
  successStories: SuccessStory[];
  diversity: {
    blockchains: BlockchainItem[];
    tokenTypes: TokenTypeItem[];
  };
  launchPlans: any[];
}

export default function IcoLanding() {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const [stats, setStats] = useState<IcoStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [projects, setProjects] = useState<FeaturedProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [isLoadingLanding, setIsLoadingLanding] = useState(true);

  const featuredSectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    offset: ["start end", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  // Theme colors
  const gradient = { from: "#14b8a6", to: "#06b6d4" };

  const gradientColors = [
    { from: "#14b8a6", to: "#10b981" },
    { from: "#06b6d4", to: "#0ea5e9" },
    { from: "#8b5cf6", to: "#a855f7" },
    { from: "#f59e0b", to: "#f97316" },
  ];

  // Floating orbs for featured projects section
  const featuredOrbs = [
    {
      size: 300,
      color: gradient.from,
      delay: 0,
      duration: 12,
      x: "5%",
      y: "10%",
    },
    {
      size: 200,
      color: gradient.to,
      delay: 3,
      duration: 15,
      x: "85%",
      y: "60%",
    },
    { size: 150, color: "#8b5cf6", delay: 6, duration: 18, x: "70%", y: "80%" },
  ];

  const trustItems = [
    { icon: Shield, text: "SEC Compliant" },
    { icon: CheckCircle, text: "KYC Verified" },
    { icon: Headphones, text: "24/7 Support" },
    { icon: Lock, text: "Secure Platform" },
  ];

  // Fetch landing data (consolidated endpoint)
  useEffect(() => {
    let isMounted = true;
    setStatsLoading(true);
    setProjectsLoading(true);
    setIsLoadingLanding(true);

    $fetch<LandingData>({
      url: "/api/ico/landing",
      silent: true,
    })
      .then((res) => {
        if (isMounted && res.data) {
          setLandingData(res.data);
          // Set stats from landing data
          setStats({
            projectsLaunched: res.data.stats.successfulOfferings || res.data.stats.totalOfferings || 0,
            totalRaised: res.data.stats.totalRaised || 0,
            totalInvestors: res.data.stats.totalInvestors || 0,
            successRate: res.data.stats.successRate,
            activeOfferings: res.data.stats.activeOfferings,
            raisedGrowth: res.data.stats.raisedGrowth,
            investorsGrowth: res.data.stats.investorsGrowth,
          });
          // Set featured projects from landing data
          if (res.data.featured && Array.isArray(res.data.featured)) {
            setProjects(res.data.featured);
          } else {
            setProjects([]);
          }
          setProjectsError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setProjectsError(err?.message || "Failed to load landing data.");
          // Fallback to stats endpoint
          fetch("/api/ico/stats")
            .then((res) => res.json())
            .then((data) => {
              if (isMounted) setStats(data);
            })
            .catch(() => {
              if (isMounted) setStats(null);
            });
        }
      })
      .finally(() => {
        if (isMounted) {
          setStatsLoading(false);
          setProjectsLoading(false);
          setIsLoadingLanding(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const kycEnabled =
    settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("view_ico");

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="view_ico" />;
  }

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
    stats &&
    stats.totalInvestors > 0 &&
    stats.totalRaised > 0 &&
    stats.projectsLaunched > 0;

  // Hero stats items
  const heroStatsItems = showStats
    ? [
        {
          icon: Rocket,
          value: stats!.projectsLaunched,
          label: t("projects"),
          suffix: "+",
        },
        {
          icon: Users,
          value: formatNumber(stats!.totalInvestors).value,
          label: t("investors"),
          suffix: formatNumber(stats!.totalInvestors).suffix,
          decimals: stats.totalInvestors >= 1000 ? 1 : 0,
        },
        {
          icon: TrendingUp,
          value: formatNumber(stats!.totalRaised).value,
          label: tExt("total_raised"),
          prefix: "$",
          suffix: formatNumber(stats!.totalRaised).suffix,
          decimals: 1,
        },
      ]
    : [];

  // Stats section data
  const statsData = showStats
    ? [
        {
          id: "projects",
          icon: Rocket,
          value: stats!.projectsLaunched,
          suffix: "+",
          decimals: 0,
          label: "Projects Launched",
          description: "Successfully funded token offerings on our platform",
        },
        {
          id: "investors",
          icon: Users,
          value: formatNumber(stats!.totalInvestors).value,
          suffix: formatNumber(stats!.totalInvestors).suffix,
          decimals: formatNumber(stats!.totalInvestors).decimals,
          label: "Active Investors",
          description: "Trusted investors actively participating in offerings",
        },
        {
          id: "raised",
          icon: DollarSign,
          value: formatNumber(stats!.totalRaised).value,
          prefix: "$",
          suffix: formatNumber(stats!.totalRaised).suffix,
          decimals: formatNumber(stats!.totalRaised).decimals,
          label: "Total Raised",
          description: "Funds successfully raised through our platform",
        },
      ]
    : [];

  // How It Works steps
  const howItWorksSteps = [
    {
      id: "discover",
      icon: Search,
      number: 1,
      title: "Discover Projects",
      description:
        "Browse through our curated selection of verified token offerings. Filter by category, ROI potential, and funding stage.",
      features: ["Curated Selection", "Detailed Analytics", "Risk Assessment"],
    },
    {
      id: "invest",
      icon: CreditCard,
      number: 2,
      title: "Invest Securely",
      description:
        "Complete KYC verification and invest with confidence. Our secure platform supports multiple payment methods.",
      features: [
        "Multi-currency Support",
        "Secure Transactions",
        "Instant Confirmation",
      ],
    },
    {
      id: "track",
      icon: BarChart3,
      number: 3,
      title: "Track Performance",
      description:
        "Monitor your investments in real-time. Get detailed analytics, price alerts, and portfolio insights.",
      features: ["Real-time Updates", "Price Alerts", "Portfolio Dashboard"],
    },
    {
      id: "claim",
      icon: Rocket,
      number: 4,
      title: "Claim & Trade",
      description:
        "Receive your tokens directly to your wallet. Trade on supported exchanges or hold for long-term gains.",
      features: [
        "Direct Wallet Transfer",
        "Vesting Dashboard",
        "Trading Support",
      ],
    },
  ];

  // Features
  const features = [
    {
      id: "regulated",
      icon: Shield,
      title: "Fully Regulated Platform",
      description:
        "We operate under strict regulatory compliance, ensuring all token offerings meet legal requirements and investor protection standards.",
      highlights: [
        "KYC/AML Compliant",
        "SEC Guidelines",
        "Investor Protection",
      ],
    },
    {
      id: "verified",
      icon: FileCheck,
      title: "Verified Projects Only",
      description:
        "Every project undergoes rigorous due diligence. We verify team credentials, audit smart contracts, and assess project viability.",
      highlights: [
        "Smart Contract Audits",
        "Team Verification",
        "Business Review",
      ],
    },
    {
      id: "roi",
      icon: TrendingUp,
      title: "Maximum ROI Potential",
      description:
        "Access exclusive early-stage investment opportunities in promising blockchain projects before they hit public markets.",
      highlights: [
        "Early Access Deals",
        "Vesting Options",
        "Bonus Allocations",
      ],
    },
    {
      id: "security",
      icon: Lock,
      title: "Bank-Grade Security",
      description:
        "Enterprise-level protection for your assets with multi-layer security protocols and cold storage solutions.",
      highlights: ["Multi-layer Security", "Cold Storage", "24/7 Monitoring"],
    },
    {
      id: "wallet",
      icon: Wallet,
      title: "Multi-Wallet Support",
      description:
        "Connect any wallet seamlessly. We support all major wallets including MetaMask, WalletConnect, and more.",
      highlights: ["MetaMask", "WalletConnect", "Hardware Wallets"],
    },
    {
      id: "analytics",
      icon: BarChart3,
      title: "Real-time Analytics",
      description:
        "Track your portfolio performance instantly with comprehensive dashboards and detailed insights.",
      highlights: ["Live Tracking", "Portfolio Dashboard", "Price Alerts"],
    },
  ];

  // Stats loading skeleton
  const renderStatsLoadingSkeleton = () => (
    <section className="py-24 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 animate-pulse" />
          <div className="h-12 w-96 max-w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-72 max-w-full bg-zinc-200 dark:bg-zinc-800/50 rounded mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-zinc-200 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col overflow-hidden relative">
      {/* Interactive pattern background - moves with scroll */}
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
        theme={{ primary: "teal", secondary: "cyan" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "teal", secondary: "cyan" }}
        count={8}
        interactive={true}
      />

      {/* Unified continuous background for all sections */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient */}
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
        {/* Large ambient orbs for continuity */}
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
        theme={{ primary: "teal", secondary: "cyan" }}
        content={{
          tag: {
            text: t("the_1_regulated_ito_platform"),
            icon: Sparkles,
          },
          heading: {
            text: t("the_future_of"),
            highlightedText: t("token_offerings"),
            highlightPosition: "after",
            size: "lg",
          },
          subtitle: {
            text: `${t("discover_invest_and_ito_platform")} ${t("secure_transparent_and_regulated")}`,
            size: "md",
          },
          actions: [
            {
              text: t("explore_offerings"),
              href: "/ico/offer",
              variant: "primary",
              icon: ArrowRight,
              iconPosition: "right",
            },
            {
              text: t("launch_your_token"),
              href: "/ico/creator/launch",
              variant: "outline",
              icon: Rocket,
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
              color: "teal",
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
              color: "teal",
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
        className="pt-8"
      />

      {/* Trust Bar - Social proof transition */}
      <TrustBar
        items={[
          {
            icon: Shield,
            label: "Regulated Platform",
            description: "Compliant operations",
          },
          {
            icon: Lock,
            label: "Bank-Grade Security",
            description: "256-bit encryption",
          },
          {
            icon: CheckCircle,
            label: "KYC Verified",
            description: "Identity verified",
          },
          {
            icon: Headphones,
            label: "24/7 Support",
            description: "Always available",
          },
        ]}
        theme={{ primary: "teal", secondary: "cyan" }}
        variant="default"
        title="Why Trust Us"
      />

      {/* Upcoming Offerings Section - NEW */}
      <UpcomingOfferingsSection
        offerings={landingData?.upcoming || []}
        isLoading={isLoadingLanding}
      />

      {/* Success Stories Section - NEW */}
      <SuccessStoriesSection
        stories={landingData?.successStories || []}
        isLoading={isLoadingLanding}
      />

      {/* Blockchain Diversity Section - NEW */}
      <BlockchainDiversitySection
        blockchains={landingData?.diversity?.blockchains || []}
        tokenTypes={landingData?.diversity?.tokenTypes || []}
        isLoading={isLoadingLanding}
      />

      {/* Stats Section */}
      {statsLoading ? (
        renderStatsLoadingSkeleton()
      ) : showStats ? (
        <StatsSection
          header={{
            tag: {
              text: tExt("platform_statistics"),
              icon: Sparkles,
            },
            title: t("our_platform_in_numbers"),
            subtitle: t("join_the_growing_community_of_investors"),
            alignment: "center",
          }}
          stats={statsData}
          layout={{
            variant: "grid",
            columns: 3,
            gap: "lg",
            showIcon: true,
            showDescription: true,
          }}
          background={{ variant: "transparent" }}
          theme={{ primary: "teal", secondary: "cyan" }}
        />
      ) : null}

      {/* Featured Projects Section */}
      <section
        ref={featuredSectionRef}
        className="py-24 relative overflow-hidden"
      >
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ y: backgroundY }}
        >
          {/* Grid pattern with theme color */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(${gradient.from}20 1px, transparent 1px),
                linear-gradient(90deg, ${gradient.from}20 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />

          {/* Floating orbs */}
          {featuredOrbs.map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: orb.size,
                height: orb.size,
                background: `radial-gradient(circle at 30% 30%, ${orb.color}40, ${orb.color}10, transparent)`,
                left: orb.x,
                top: orb.y,
                filter: `blur(${orb.size / 3}px)`,
              }}
              animate={{
                x: [0, 30, -20, 0],
                y: [0, -40, 20, 0],
                scale: [1, 1.1, 0.9, 1],
                opacity: [0.3, 0.5, 0.3, 0.3],
              }}
              transition={{
                duration: orb.duration,
                delay: orb.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16"
          >
            <div>
              {/* Tag */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{
                  background: `linear-gradient(135deg, #f59e0b15, #f9731605)`,
                  border: `1px solid #f59e0b30`,
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Trending Now
                </span>
              </motion.div>

              {/* Title */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                <span className="text-zinc-900 dark:text-white">Featured </span>
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                  }}
                >
                  Projects
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
                Discover our handpicked selection of innovative token offerings
                with the highest potential
              </p>

              {/* Decorative element */}
              <motion.div
                className="flex items-center gap-2 mt-6"
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div
                  className="h-px w-12"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${gradient.from})`,
                  }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                  }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div
                  className="h-px w-12"
                  style={{
                    background: `linear-gradient(90deg, ${gradient.to}, transparent)`,
                  }}
                />
              </motion.div>
            </div>

            <Link href="/ico/offer">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="rounded-xl group border-2 border-zinc-300 dark:border-zinc-700 hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-500/5 transition-all duration-300"
                >
                  View All Projects
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Projects - Dynamic Layout Based on Count */}
          {projectsLoading ? (
            // Loading skeleton
            <div className="space-y-6">
              {/* Featured skeleton */}
              <div className="h-80 rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
              {/* Grid skeleton */}
              <div className="grid gap-6 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="h-72 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </motion.div>
                ))}
              </div>
            </div>
          ) : projectsError ? (
            // Error state
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-16 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, #ef444415, #dc262615)`,
                    }}
                  >
                    <Flame className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                    Unable to Load Projects
                  </h3>
                  <p className="text-zinc-500 mb-6">{projectsError}</p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="rounded-xl"
                  >
                    Try Again
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : projects.length === 0 ? (
            // Premium Empty State
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900">
                {/* Background decoration */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${gradient.from}, transparent 70%)`,
                  }}
                />
                <div className="absolute top-0 left-0 w-full h-full">
                  <div
                    className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl opacity-10"
                    style={{ background: gradient.from }}
                  />
                  <div
                    className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-10"
                    style={{ background: gradient.to }}
                  />
                </div>

                <div className="relative z-10 py-20 px-8">
                  <div className="max-w-2xl mx-auto text-center">
                    {/* Animated icon */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        delay: 0.2,
                        stiffness: 200,
                      }}
                      className="mb-8"
                    >
                      <div className="relative inline-block">
                        <div
                          className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
                          style={{
                            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                          }}
                        />
                        <div
                          className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                            boxShadow: `0 20px 40px -10px ${gradient.from}50`,
                          }}
                        >
                          <Rocket className="h-12 w-12 text-white" />
                        </div>
                      </div>
                    </motion.div>

                    {/* Content */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                        Be the First to{" "}
                        <span
                          className="bg-clip-text text-transparent"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                          }}
                        >
                          Launch
                        </span>
                      </h3>
                      <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-lg mx-auto leading-relaxed">
                        Our platform is ready for innovative projects. Launch
                        your token offering and connect with investors
                        worldwide.
                      </p>
                    </motion.div>

                    {/* Feature highlights */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto"
                    >
                      {[
                        { icon: Shield, label: "Verified Projects" },
                        { icon: Users, label: "Global Community" },
                        { icon: TrendingUp, label: "Growth Potential" },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                        >
                          <item.icon
                            className="w-5 h-5"
                            style={{ color: gradient.from }}
                          />
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                      <Link href="/ico/creator/launch">
                        <Button
                          size="lg"
                          className="h-14 px-8 rounded-2xl font-semibold text-white w-full sm:w-auto"
                          style={{
                            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                            boxShadow: `0 10px 30px -10px ${gradient.from}60`,
                          }}
                        >
                          <Rocket className="mr-2 w-5 h-5" />
                          Launch Your Token
                        </Button>
                      </Link>
                      <Link href="/ico/offer">
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-14 px-8 rounded-2xl font-semibold border-2 w-full sm:w-auto"
                        >
                          Browse All Projects
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : projects.length === 1 ? (
            // Single project - Featured layout
            <div className="space-y-8">
              <ProjectCard
                project={projects[0]}
                index={0}
                gradient={gradientColors[0]}
                variant="featured"
              />
            </div>
          ) : projects.length === 2 ? (
            // Two projects - Side by side featured
            <div className="grid gap-8 md:grid-cols-2">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  gradient={gradientColors[index % gradientColors.length]}
                />
              ))}
            </div>
          ) : projects.length === 3 ? (
            // Three projects - 1 featured + 2 below
            <div className="space-y-8">
              <ProjectCard
                project={projects[0]}
                index={0}
                gradient={gradientColors[0]}
                variant="featured"
              />
              <div className="grid gap-6 md:grid-cols-2">
                {projects.slice(1).map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index + 1}
                    gradient={
                      gradientColors[(index + 1) % gradientColors.length]
                    }
                  />
                ))}
              </div>
            </div>
          ) : projects.length <= 6 ? (
            // 4-6 projects - 1 featured + grid of rest
            <div className="space-y-8">
              <ProjectCard
                project={projects[0]}
                index={0}
                gradient={gradientColors[0]}
                variant="featured"
              />
              <div className="grid gap-6 md:grid-cols-3">
                {projects.slice(1).map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index + 1}
                    gradient={
                      gradientColors[(index + 1) % gradientColors.length]
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            // 7+ projects - 1 featured + grid + compact list
            <div className="space-y-8">
              <ProjectCard
                project={projects[0]}
                index={0}
                gradient={gradientColors[0]}
                variant="featured"
              />
              <div className="grid gap-6 md:grid-cols-3">
                {projects.slice(1, 4).map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index + 1}
                    gradient={
                      gradientColors[(index + 1) % gradientColors.length]
                    }
                  />
                ))}
              </div>
              {projects.length > 4 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.slice(4).map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={index + 4}
                      gradient={
                        gradientColors[(index + 4) % gradientColors.length]
                      }
                      variant="compact"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom CTA */}
          {projects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex justify-center mt-16"
            >
              <Link href="/ico/offer">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="h-14 px-10 rounded-2xl font-semibold text-white transition-all duration-300 group"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      boxShadow: `0 15px 40px -15px ${gradient.from}60`,
                    }}
                  >
                    <span className="flex items-center">
                      Explore All Projects
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          )}

          {/* Bottom decoration */}
          <motion.div
            className="flex justify-center mt-12 gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === 2 ? "" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
                style={
                  i === 2
                    ? {
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      }
                    : {}
                }
                animate={
                  i === 2 ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] } : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <ProcessSection
        header={{
          tag: {
            text: tCommon("simple_process"),
            icon: Sparkles,
          },
          title: tExt("how_it_works"),
          subtitle: t("get_started_with_simple_steps"),
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
        theme={{ primary: "teal", secondary: "cyan" }}
      />

      {/* Features Section */}
      <FeaturesSection
        header={{
          tag: {
            text: tCommon("why_choose_us"),
            icon: Sparkles,
          },
          title: `${t("the_trusted_platform_for")} ${t("token_investments")}`,
          titleHighlight: t("token_investments"),
          subtitle: t("industry_leading_security_verified_projects_and"),
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
        theme={{ primary: "teal", secondary: "cyan" }}
      />

      {/* CTA Section */}
      <CTASection
        content={{
          tag: {
            text: "Start Your Journey",
            icon: Sparkles,
          },
          title: t("ready_to_start_your"),
          titleHighlight: tCommon("investment_journey"),
          subtitle: `${t("join_thousands_of_investors_discovering_the")} ${t("start_investing_or_launch_your_own_token_today")}`,
          trustItems: trustItems,
          cards: [
            {
              variant: "primary",
              icon: TrendingUp,
              title: t("for_investors"),
              description: t("browse_verified_token_offerings_and_start"),
              buttonText: t("explore_offerings"),
              href: "/ico/offer",
            },
            {
              variant: "secondary",
              icon: Rocket,
              title: t("for_projects"),
              description: t("launch_your_token_and_raise_funds"),
              buttonText: t("launch_your_token"),
              href: "/ico/creator/launch",
              gradient: { from: "#8b5cf6", to: "#a855f7" },
            },
          ],
        }}
        layout={{
          variant: "cards",
          actionStyle: "cards",
        }}
        theme={{ primary: "teal", secondary: "violet" }}
      />
    </div>
  );
}
