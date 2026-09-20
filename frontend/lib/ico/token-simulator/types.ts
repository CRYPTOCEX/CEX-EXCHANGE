export interface TokenDistribution {
  name: string;
  value: number;
  color: string;
}

export interface VestingSchedule {
  id: string;
  name: string;
  allocation: number;
  initialUnlock: number;
  cliffMonths: number;
  vestingMonths: number;
  color: string;
}

export interface MarketProjection {
  month: number;
  price: number;
  marketCap: number;
  volume: number;
  circulatingSupply: number;
  percentReleased: number;
}

export interface VestingReleaseData {
  month: number;
  totalReleased: number;
  circulatingSupply: number;
  percentReleased: number;
  [key: string]: number; // For dynamic category names
}

export interface SimulatorState {
  totalSupply: number;
  initialPrice: number;
  distribution: TokenDistribution[];
  vestingSchedules: VestingSchedule[];
  growthRate: number;
  volatility: number;
  projectionMonths: number;
}

export interface ProjectionHighlight {
  label: string;
  value: string | number;
  subValue?: string;
  isPositive?: boolean;
}
