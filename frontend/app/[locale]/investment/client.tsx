"use client";
import { useEffect } from "react";
import { useInvestmentStore } from "@/store/investment/user";
import { HeroSection } from "./components/hero-section";
import { FeaturesSection } from "./components/features-section";
import { FeaturedPlansSection } from "./components/featured-plans-section";
import { HowItWorksSection } from "./components/how-it-works-section";
import { CTASection } from "./components/cta-section";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";

export default function InvestmentClient() {
  // 1. Call all hooks first!
  const { plans, fetchPlans, fetchStats, hasFetchedPlans } = useInvestmentStore();
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  // Fetch data on component mount
  useEffect(() => {
    if (!hasFetchedPlans) {
      fetchPlans();
    }
    fetchStats();
  }, [hasFetchedPlans]);

  // 2. Check feature/kyc
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasViewInvestment = hasKyc() && canAccessFeature("view_investment");

  if (kycEnabled && !hasViewInvestment) {
    return <KycRequiredNotice feature="view_investment" />;
  }

  // 3. Normal rendering - ensure plans is an array
  const safePlans = Array.isArray(plans) ? plans : [];
  const trendingPlans = safePlans.filter((plan) => plan.trending);

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <FeaturedPlansSection trendingPlans={trendingPlans} />
      <HowItWorksSection />
      <CTASection />
    </div>
  );
}
