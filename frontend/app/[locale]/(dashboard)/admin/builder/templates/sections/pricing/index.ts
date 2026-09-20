import { pricingThreeTierClassic } from "./three-tier-classic";
import { pricingFourTierComparison } from "./four-tier-comparison";
import { pricingToggleMonthlyYearly } from "./toggle-monthly-yearly";
import { pricingUsageSlider } from "./usage-slider";
import { pricingEnterpriseContact } from "./enterprise-contact";
import { pricingFeatureMatrix } from "./feature-matrix";
import { pricingGlassCards } from "./glass-cards";
import { pricingPopularHighlight } from "./popular-highlight";
import { pricingSimpleTwoTier } from "./simple-two-tier";
import { pricingCryptoPricing } from "./crypto-pricing";

export const pricingTemplates = [
  pricingThreeTierClassic,
  pricingFourTierComparison,
  pricingToggleMonthlyYearly,
  pricingUsageSlider,
  pricingEnterpriseContact,
  pricingFeatureMatrix,
  pricingGlassCards,
  pricingPopularHighlight,
  pricingSimpleTwoTier,
  pricingCryptoPricing,
] as const;

export {
  pricingThreeTierClassic,
  pricingFourTierComparison,
  pricingToggleMonthlyYearly,
  pricingUsageSlider,
  pricingEnterpriseContact,
  pricingFeatureMatrix,
  pricingGlassCards,
  pricingPopularHighlight,
  pricingSimpleTwoTier,
  pricingCryptoPricing,
};
