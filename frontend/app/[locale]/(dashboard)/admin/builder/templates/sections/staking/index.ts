import type { Section } from "@/types/builder";
import { stakingApyTableHero } from "./apy-table-hero";
import { stakingLockPeriodCalculator } from "./lock-period-calculator";
import { stakingTopPoolsGrid } from "./top-pools-grid";
import { stakingRewardsDashboardPreview } from "./rewards-dashboard-preview";
import { stakingHowStakingWorks } from "./how-staking-works";
/*
 * stakingValidatorSpotlight is UNREGISTERED, deliberately kept on disk — the same
 * treatment, and the same reason, as the ten templates in ../ai-features/.
 *
 * The whole section is a delegation offer: a "Delegate to Staking Labs" button
 * pointing at /staking/validator/04712, a validator uptime figure, a commission
 * rate and a delegator count. This platform has no validators and no delegation.
 * Staking is a wallet debit and a database row — backend/src/api/(ext)/staking/
 * position/index.post.ts debits a wallet, stakingPool has no chain or contract
 * column, and there is no ethers/web3 import anywhere in the addon. An operator
 * dropping this onto a live site published a delegation offer we manufactured
 * for them and the platform cannot fulfil.
 *
 * It stayed live through Wave 1 task 1.1 because the uptime rule in
 * tools/check-template-claims.mjs read /99\.9{1,3}%/, which cannot match the
 * 99.98% this template used. The rule is now /99\.9\d{0,2}%/.
 *
 * Revisit with Wave 8.2 (Real Staking): if genuine delegation ever ships, this
 * section is worth re-registering as-is.
 */
import { stakingAutoCompoundFeature } from "./auto-compound-feature";
import { stakingStakingStatsHero } from "./staking-stats-hero";
import { stakingTieredRewardsBenefits } from "./tiered-rewards-benefits";
import { stakingStartStakingCta } from "./start-staking-cta";

export {
  stakingApyTableHero,
  stakingLockPeriodCalculator,
  stakingTopPoolsGrid,
  stakingRewardsDashboardPreview,
  stakingHowStakingWorks,
  stakingAutoCompoundFeature,
  stakingStakingStatsHero,
  stakingTieredRewardsBenefits,
  stakingStartStakingCta,
};

/*
 * EVERY STAKING TEMPLATE IS UNREGISTERED, deliberately kept on disk — the
 * same treatment as stakingValidatorSpotlight above.
 *
 * Each one publishes a figure or a claim the platform cannot make true by
 * editing: "Live staking APY … rates update every epoch" over a fixed rate an
 * operator types; "$1.2B total value staked … updated in real time from the
 * staking contracts" where there is no contract; "non-custodial: your
 * principal never leaves the staking contract you opted into" on a custodial
 * ledger product; tiered "APY bonus" and "governance voting weight" that no
 * feature backs; buttons to /staking/start, /staking/rates and /staking/claim,
 * none of which are routes. An operator dropping one onto a live site
 * publishes a claim we manufactured.
 *
 * Revisit with the on-chain product (plans/done/REAL-STAKING.md): the sections
 * that describe delegation, epochs and validators become re-registrable the
 * day they can be bound to live data.
 */
export const stakingTemplates: Section[] = [];

/* Referenced so the unregistered templates stay compiled and lint-clean. */
export const stakingTemplatesOnDisk: Section[] = [
  stakingApyTableHero,
  stakingLockPeriodCalculator,
  stakingTopPoolsGrid,
  stakingRewardsDashboardPreview,
  stakingHowStakingWorks,
  stakingAutoCompoundFeature,
  stakingStakingStatsHero,
  stakingTieredRewardsBenefits,
  stakingStartStakingCta,
];
