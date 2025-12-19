"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ShoppingBag,
  Shield,
  Truck,
  Sparkles,
  Zap,
  Package,
  Award,
  CreditCard,
  Globe,
  Headphones,
  Clock,
  Lock,
  Star,
  Users,
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { $fetch } from "@/lib/api";
import TrendingProductsSection from "./components/landing/trending-products-section";
import CategoriesSection from "./components/landing/categories-section";
import ActiveDealsSection from "./components/landing/active-deals-section";
import BestSellersSection from "./components/landing/best-sellers-section";
import RecentReviewsSection from "./components/landing/recent-reviews-section";
import {
  FeaturesSection,
  HeroSection,
  TrustBar,
  CTASection,
} from "@/components/sections";
import {
  InteractivePattern,
  FloatingShapes,
} from "@/components/sections/shared";

interface ClientProps {
  children?: React.ReactNode;
}

interface LandingData {
  stats: {
    products: number;
    categories: number;
    orders: number;
    totalRevenue: number;
    avgRating: number;
    totalReviews: number;
    customersServed: number;
    digitalProducts: number;
    physicalProducts: number;
  };
  featuredProducts: any[];
  bestSellers: any[];
  newArrivals: any[];
  topRated: any[];
  activeDeals: any[];
  categoriesWithStats: any[];
  recentReviews: any[];
}

export default function Client({ children }: ClientProps) {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

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
          url: "/api/ecommerce/landing",
          method: "GET",
          silent: true,
        });

        if (isMounted && response.data) {
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

  // Gating: block unless user has KYC & view_ecommerce feature
  const kycEnabled =
    settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("view_ecommerce");

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="view_ecommerce" />;
  }

  const stats = landingData?.stats;

  // Theme colors - amber/emerald for Ecommerce
  const gradient = { from: "#f59e0b", to: "#10b981" };

  // Check if we have meaningful stats
  const showStats =
    stats &&
    (stats.products > 0 ||
      stats.categories > 0 ||
      stats.customersServed > 0 ||
      stats.avgRating > 0);

  // Hero stats items - enhanced with more metrics
  const heroStatsItems = showStats
    ? [
        {
          icon: Package,
          value: stats.products,
          label: "Products",
          suffix: "+",
        },
        {
          icon: Users,
          value: stats.customersServed,
          label: "Happy Customers",
          suffix: "+",
        },
        stats.avgRating > 0
          ? {
              icon: Star,
              value: stats.avgRating,
              label: "Avg Rating",
              suffix: "/5",
              decimals: 1,
            }
          : {
              icon: ShoppingBag,
              value: stats.categories,
              label: "Categories",
              suffix: "+",
            },
        {
          icon: Clock,
          value: 24,
          label: "Support",
          suffix: "/7",
        },
      ]
    : [];

  // Features
  const features = [
    {
      id: "secure",
      icon: Shield,
      title: t("secure_payments"),
      description: t("blockchain_powered_transactions_ensure_your_safety"),
      highlights: [
        "Multi-currency support",
        "Encrypted transactions",
        "Fraud protection",
      ],
    },
    {
      id: "delivery",
      icon: Zap,
      title: t("instant_delivery"),
      description: t("digital_products_delivered_instantly_to_your"),
      highlights: ["Instant download", "Email delivery", "Cloud access"],
    },
    {
      id: "shipping",
      icon: Truck,
      title: t("worldwide_shipping"),
      description: t("fast_reliable_shipping_for_physical_products"),
      highlights: ["Global delivery", "Package tracking", "Fast processing"],
    },
    {
      id: "crypto",
      icon: CreditCard,
      title: "Crypto Payments",
      description:
        "Pay with Bitcoin, Ethereum, and other major cryptocurrencies for seamless borderless transactions.",
      highlights: ["Bitcoin & Ethereum", "Instant conversion", "Low fees"],
    },
  ];

  // Get featured products for trending section
  const trendingProducts = landingData?.featuredProducts?.slice(0, 4) || [];

  // Get categories with stats
  const featuredCategories = landingData?.categoriesWithStats?.slice(0, 3) || [];

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
        theme={{ primary: "amber", secondary: "emerald" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "amber", secondary: "emerald" }}
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
        theme={{ primary: "amber", secondary: "emerald" }}
        content={{
          tag: {
            text: t("now_accepting_bitcoin_ethereum_more"),
            icon: Sparkles,
          },
          heading: {
            text: t("shop_smarter"),
            highlightedText: t("with_crypto"),
            highlightPosition: "after",
            size: "lg",
          },
          subtitle: {
            text: `${t("experience_seamless_shopping_with_cryptocurrency")} ${t("instant_secure_and_borderless")}`,
            size: "md",
          },
          actions: [
            {
              text: tCommon("browse_products"),
              href: "/ecommerce/product",
              variant: "primary",
              icon: ShoppingBag,
              iconPosition: "left",
            },
            {
              text: t("explore_categories"),
              href: "/ecommerce/category",
              variant: "outline",
              icon: ArrowRight,
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
              color: "amber",
              blur: 100,
              opacity: 30,
              animate: true,
              animationDelay: 0,
            },
            {
              position: "bottom-left",
              size: "lg",
              color: "emerald",
              blur: 80,
              opacity: 35,
              animate: true,
              animationDelay: 1.5,
            },
            {
              position: "top-left",
              size: "md",
              color: "emerald",
              blur: 60,
              opacity: 20,
              animate: true,
              animationDelay: 0.5,
            },
            {
              position: "bottom-right",
              size: "lg",
              color: "amber",
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
          text: t("scroll_to_explore"),
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
            label: t("secure_payments"),
            description: "Encrypted transactions",
          },
          {
            icon: Zap,
            label: t("instant_delivery"),
            description: "Digital products",
          },
          {
            icon: Globe,
            label: t("worldwide_shipping"),
            description: "Global delivery",
          },
          {
            icon: Lock,
            label: "100% Protected",
            description: "Buyer guarantee",
          },
        ]}
        theme={{ primary: "amber", secondary: "emerald" }}
        variant="default"
        title="Why Shop With Us"
      />

      {/* Active Deals Section - NEW */}
      <ActiveDealsSection
        deals={landingData?.activeDeals || []}
        isLoading={isLoading}
      />

      {/* Trending Products Section */}
      <TrendingProductsSection
        products={trendingProducts}
        isLoading={isLoading}
      />

      {/* Best Sellers Section - NEW */}
      <BestSellersSection
        products={landingData?.bestSellers || []}
        isLoading={isLoading}
      />

      {/* Features Section */}
      <FeaturesSection
        header={{
          tag: {
            text: tCommon("why_choose_us"),
            icon: Award,
          },
          title: "Premium Shopping",
          titleHighlight: "Experience",
          subtitle:
            "Discover why thousands of customers trust us for their crypto shopping needs.",
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
        theme={{ primary: "amber", secondary: "emerald" }}
      />

      {/* Categories Section */}
      <CategoriesSection
        categories={featuredCategories}
        isLoading={isLoading}
      />

      {/* Recent Reviews Section - NEW */}
      <RecentReviewsSection
        reviews={landingData?.recentReviews || []}
        isLoading={isLoading}
      />

      {/* CTA Section */}
      <CTASection
        content={{
          tag: {
            text: "Start Shopping Today",
            icon: Sparkles,
          },
          title: "Ready to Shop with",
          titleHighlight: "Crypto?",
          subtitle:
            "Join thousands of customers enjoying seamless cryptocurrency shopping with instant delivery and worldwide shipping.",
          trustItems: [
            { icon: Shield, text: "Secure Payments" },
            { icon: Headphones, text: "24/7 Support" },
            { icon: Zap, text: "Instant Delivery" },
            { icon: Clock, text: "Fast Shipping" },
          ],
          cards: [
            {
              variant: "primary",
              icon: ShoppingBag,
              title: tCommon("browse_products"),
              description: t("discover_amazing_products_and_pay_with_crypto"),
              buttonText: t("shop_now"),
              href: "/ecommerce/product",
            },
            {
              variant: "secondary",
              icon: Package,
              title: t("explore_categories"),
              description: t("find_products_by_category_and_discover_new_items"),
              buttonText: t("view_categories"),
              href: "/ecommerce/category",
            },
          ],
        }}
        layout={{
          variant: "cards",
          actionStyle: "cards",
        }}
        background={{ variant: "transparent" }}
        theme={{ primary: "amber", secondary: "emerald" }}
        className="pb-24"
      />
    </div>
  );
}
