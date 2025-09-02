"use client";
import { useForexStore } from "@/store/forex/user";
import { HeroSection } from "./components//hero-section";
import { FeaturesSection } from "./components//features-section";
import { FeaturedPlansSection } from "./components//featured-plans-section";
import { HowItWorksSection } from "./components//how-it-works-section";
import { CTASection } from "./components//cta-section";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";

export default function ForexClient() {
  // 1. Call all hooks first!
  const { plans } = useForexStore();
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  // 2. Check feature/kyc
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasViewForex = hasKyc() && canAccessFeature("view_forex");

  if (kycEnabled && !hasViewForex) {
    return <KycRequiredNotice feature="view_forex" />;
  }

  // 3. Normal rendering
  const trendingPlans = plans.filter((plan) => plan.trending);

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
