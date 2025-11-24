/// <reference path="./models.d.ts" />

// Extended types with relations
interface StakingPool extends stakingPoolAttributes {
  positions?: StakingPosition[];
  adminEarnings?: StakingAdminEarning[];
  performances?: StakingExternalPoolPerformance[];
  totalStaked?: number;
}

interface StakingPosition extends stakingPositionAttributes {
  pool?: StakingPool;
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

// Analytics interface
interface stakingAnalyticsAttributes {
  totalStaked: number;
  totalUsers: number;
  totalPools: number;
  stakingByToken: Record<string, number>;
  stakingOverTime: Array<{
    date: string;
    amount: number;
  }>;
  stakedChangePercent: number;
  usersChangePercent: number;
  rewardsChangePercent: number;
  activePoolsCount: number;
  averageAPR: number;
  totalRewardsDistributed: number;
  retentionRate: number;
  earlyWithdrawalRate: number;
  totalAdminEarnings: number;
}
