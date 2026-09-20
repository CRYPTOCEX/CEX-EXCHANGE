import { p2pMarketplaceHero } from "./marketplace-hero";
import { p2pPaymentMethodsGrid } from "./payment-methods-grid";
import { p2pTopMerchantsLeaderboard } from "./top-merchants-leaderboard";
import { p2pEscrowSecuritySteps } from "./escrow-security-steps";
import { p2pTradeFlowWalkthrough } from "./trade-flow-walkthrough";
import { p2pRegionCoverageMap } from "./region-coverage-map";
import { p2pDisputeResolutionFeature } from "./dispute-resolution-feature";
import { p2pStatsBar } from "./p2p-stats-bar";
import { p2pBecomeAMerchantCta } from "./become-a-merchant-cta";
import { p2pPopularPairsTable } from "./popular-pairs-table";

export const p2pTemplates = [
  p2pMarketplaceHero,
  p2pPaymentMethodsGrid,
  p2pTopMerchantsLeaderboard,
  p2pEscrowSecuritySteps,
  p2pTradeFlowWalkthrough,
  p2pRegionCoverageMap,
  p2pDisputeResolutionFeature,
  p2pStatsBar,
  p2pBecomeAMerchantCta,
  p2pPopularPairsTable,
] as const;

export {
  p2pMarketplaceHero,
  p2pPaymentMethodsGrid,
  p2pTopMerchantsLeaderboard,
  p2pEscrowSecuritySteps,
  p2pTradeFlowWalkthrough,
  p2pRegionCoverageMap,
  p2pDisputeResolutionFeature,
  p2pStatsBar,
  p2pBecomeAMerchantCta,
  p2pPopularPairsTable,
};
