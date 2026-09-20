/// <reference path="./models.d.ts" />

// Extended types with relations
interface StakingDuration extends stakingDurationAttributes {
  pool?: StakingPool;
}

/**
 * Advertised ranges across a pool's ACTIVE tiers, computed server-side so every
 * surface quotes the same numbers. Null when the pool publishes no tiers — its
 * own `apr` / `lockPeriod` are then the whole story.
 */
interface StakingDurationSummary {
  count: number;
  aprMin: number;
  aprMax: number;
  lockPeriodMin: number;
  lockPeriodMax: number;
}

interface StakingPool extends stakingPoolAttributes {
  positions?: StakingPosition[];
  adminEarnings?: StakingAdminEarning[];
  performances?: StakingExternalPoolPerformance[];
  /**
   * The pool's duration tiers. Present on the pool detail and list endpoints,
   * where it holds ACTIVE tiers only; the ADMIN pool endpoints return every
   * status so a retired tier can be seen and reactivated.
   */
  durations?: StakingDuration[];
  durationSummary?: StakingDurationSummary | null;
  activeDurationCount?: number;
  totalStaked?: number;
}

interface StakingPosition extends stakingPositionAttributes {
  pool?: StakingPool;
  /** The tier this position was opened against, when it had one. */
  duration?: StakingDuration | null;
  earningHistory?: EarningRecord[];
  earningsToDate?: number;
  lastEarningDate?: string | null;
  earnings?: {
    total: number;
    unclaimed: number;
  };
  timeRemaining?: number | null;
}

interface EarningRecord extends stakingEarningRecordAttributes {
  position?: StakingPosition;
}

interface StakingAdminEarning extends stakingAdminEarningAttributes {
  pool?: StakingPool;
}

type EarningsData = {
  totals: {
    totalUserEarnings: number;
    totalAdminEarnings: number;
    totalEarnings: number;
  };
  earningsByPool: Array<{
    poolId: string;
    poolName: string;
    totalUserEarnings: number;
    totalAdminEarnings: number;
    totalEarnings: number;
  }>;
  history: Array<{
    id: string;
    poolId: string;
    pool?: StakingPool;
    createdAt: string;
    userEarnings: number;
    adminEarnings: number;
    numberOfPositions: number;
  }>;
};

interface StakingExternalPoolPerformance
  extends stakingExternalPoolPerformanceAttributes {
  pool?: StakingPool;
}

/**
 * The payload of `/api/admin/staking/analytic`.
 *
 * EVERY FIGURE TYPED `number` HERE IS USD. A staking book holds one
 * denomination per pool, so the endpoint groups by the pool's asset, prices
 * each denomination and only then sums — `totalStaked` used to be a bare
 * SUM(amount) that added 0.5 BTC to 12,000 NGN. Native per-asset amounts
 * survive in `stakedByAsset` / `adminEarningsByPool`, which carry exactly one
 * currency per row.
 *
 * WHILE `unpriced` IS NON-EMPTY EVERY TOTAL IS A LOWER BOUND: those
 * denominations have no USD rate and their amounts are omitted rather than
 * counted as zero, and the UI is expected to say so.
 *
 * Every percentage is nullable, and null is NOT zero — it means the
 * denominator was empty, which is "we cannot say" rather than "flat".
 */
interface stakingAnalyticsAttributes {
  /** Legacy backend aliases; rewards are not currency-normalized. */
  totalUsers?: number;
  totalRewardsDistributed?: number;
  /** The unit of every priced figure below. Always "USD". */
  currency: string;
  /** Denominations with no USD rate. Non-empty ⇒ every total is a lower bound. */
  unpriced: string[];

  /** USD value of ACTIVE principal. */
  totalStaked: number;
  /** The native amounts behind `totalStaked`, one denomination per row. */
  stakedByAsset: Array<{
    symbol: string;
    amount: number;
    positions: number;
    /** Null when this asset has no USD rate. */
    usd: number | null;
  }>;

  /** Everyone who has ever opened a position. */
  totalStakers: number;
  /** Holders of an ACTIVE position — the population `totalStaked` measures. */
  activeStakers: number;

  totalPools: number;
  activePoolsCount: number;
  averageAPR: number;

  /**
   * New principal per day over the last 30 days, in USD at TODAY's rates —
   * the platform stores no historical rate.
   */
  stakingOverTime: Array<{
    date: string;
    amount: number;
  }>;

  stakedChangePercent: number | null;
  usersChangePercent: number | null;
  rewardsChangePercent: number | null;
  periodComparison: {
    periodDays: number;
    currentPeriodStart: string;
    previousPeriodStart: string;
    newStaked: StakingAnalyticsChange;
    newPositions: StakingAnalyticsChange;
    newStakers: StakingAnalyticsChange;
    rewardsCredited: StakingAnalyticsChange;
  };

  /** Rewards BOOKED to stakers, net of the platform fee. USD. */
  rewardsCredited: StakingAnalyticsBookedTotal;
  /**
   * Platform fees BOOKED. USD. `claimed` is a bookkeeping acknowledgement, not
   * a payment — the admin wallet was credited when the row was written.
   */
  adminEarnings: StakingAnalyticsBookedTotal;
  adminEarningsByPool: Array<{
    poolId: string;
    currency: string;
    total: number;
    claimed: number;
    unclaimed: number;
    usd: number | null;
  }>;

  /**
   * Rewards credited as a percentage of the principal that earned them.
   * Cumulative, NOT annualised. Null when there is no such principal.
   */
  cumulativeReturnPercent: number | null;
  retentionRate: number | null;
  earlyWithdrawalRate: number | null;

  poolPerformance: Record<
    string,
    {
      /** The pool's asset — `profit` is denominated in it. */
      symbol: string;
      apr: number;
      profit: number;
      efficiency: number;
    }
  >;
}

/** A booked total with the claimed/unclaimed split that gives it its meaning. */
interface StakingAnalyticsBookedTotal {
  total: number;
  claimed: number;
  unclaimed: number;
}

interface StakingAnalyticsChange {
  current: number;
  previous: number;
  change: number;
  /** Null when the previous window was empty — growth from zero has no percentage. */
  changePercent: number | null;
}
