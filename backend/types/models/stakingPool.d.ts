interface stakingPoolAttributes {
  id: string;
  name: string;
  token: string;
  symbol: string;
  icon?: string;
  description: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  walletChain?: string;
  apr: number;
  lockPeriod: number;
  minStake: number;
  maxStake: number | null;
  availableToStake: number;
  earlyWithdrawalFee: number;
  adminFeePercentage: number;
  status: "ACTIVE" | "INACTIVE" | "COMING_SOON";
  isPromoted: boolean;
  order: number;
  earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
  autoCompound: boolean;
  externalPoolUrl: string;
  profitSource: string;
  fundAllocation: string;
  risks: string;
  rewards: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type stakingPoolPk = "id";
type stakingPoolId = stakingPoolAttributes[stakingPoolPk];

interface stakingPoolCreationAttributes {
  id?: string;
  name: string;
  token: string;
  symbol: string;
  icon?: string;
  description: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  apr: number;
  lockPeriod: number;
  minStake: number;
  maxStake: number | null;
  totalStaked: number;
  availableToStake: number;
  earlyWithdrawalFee: number;
  adminFeePercentage: number;
  status: "ACTIVE" | "INACTIVE" | "COMING_SOON";
  isPromoted: boolean;
  order: number;
  earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
  autoCompound: boolean;
  externalPoolUrl: string;
  profitSource: string;
  fundAllocation: string;
  risks: string;
  rewards: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
