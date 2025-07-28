import type {
  VestingSchedule,
  VestingReleaseData,
  MarketProjection,
  SimulatorState,
} from "./types";

// Calculate vesting release schedule
export function calculateVestingReleaseData(
  vestingSchedules: VestingSchedule[],
  totalSupply: number,
  projectionMonths: number
): VestingReleaseData[] {
  const months = Array.from({ length: projectionMonths + 1 }, (_, i) => i);

  return months.map((month) => {
    const monthData: any = { month };
    let totalReleased = 0;

    vestingSchedules.forEach((schedule) => {
      const { name, allocation, initialUnlock, cliffMonths, vestingMonths } =
        schedule;
      const tokensForCategory = (allocation / 100) * totalSupply;

      let released = 0;
      if (month === 0) {
        // TGE (Token Generation Event)
        released = (initialUnlock / 100) * tokensForCategory;
      } else if (month < cliffMonths) {
        // During cliff period, only initial unlock is released
        released = (initialUnlock / 100) * tokensForCategory;
      } else if (month >= cliffMonths && month <= cliffMonths + vestingMonths) {
        // Linear vesting after cliff
        const vestedPercentage =
          initialUnlock +
          ((100 - initialUnlock) * (month - cliffMonths)) / vestingMonths;
        released = (vestedPercentage / 100) * tokensForCategory;
      } else {
        // After vesting period, all tokens are released
        released = tokensForCategory;
      }

      monthData[name] = released;
      totalReleased += released;
    });

    monthData.totalReleased = totalReleased;
    monthData.circulatingSupply = totalReleased;
    monthData.percentReleased = (totalReleased / totalSupply) * 100;

    return monthData;
  });
}

// Calculate market projections
export function calculateMarketProjections(
  vestingReleaseData: VestingReleaseData[],
  initialPrice: number,
  growthRate: number,
  volatility: number
): MarketProjection[] {
  const baseGrowthRate = growthRate / 100; // Convert to decimal
  const baseVolatility = volatility / 100; // Convert to decimal
  const result: MarketProjection[] = [];

  // Set a seed for deterministic random numbers
  let seed = 1;
  const seededRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  vestingReleaseData.forEach((data, index) => {
    // Random factor for volatility (-0.5 to 0.5) * volatility
    const randomFactor = (seededRandom() * 2 - 1) * baseVolatility;

    // Growth formula with diminishing returns as more tokens are released
    const circulationFactor = Math.max(0.5, 1 - data.percentReleased / 200); // Diminishing effect as circulation increases
    const monthlyGrowth = baseGrowthRate * circulationFactor + randomFactor;

    // Calculate price based on previous month with a floor at initial price / 2
    const prevPrice =
      index === 0 ? initialPrice : result[index - 1]?.price || initialPrice;
    const price = Math.max(initialPrice * 0.5, prevPrice * (1 + monthlyGrowth));

    // Calculate market cap and trading volume
    const marketCap = price * data.circulatingSupply;
    const volume = marketCap * (0.05 + seededRandom() * 0.1); // 5-15% of market cap

    result.push({
      month: data.month,
      price,
      marketCap,
      volume,
      circulatingSupply: data.circulatingSupply,
      percentReleased: data.percentReleased,
    });
  });

  return result;
}

// Calculate all data needed for the simulator
export function calculateSimulatorData(state: SimulatorState) {
  const {
    vestingSchedules,
    totalSupply,
    projectionMonths,
    initialPrice,
    growthRate,
    volatility,
  } = state;

  const vestingReleaseData = calculateVestingReleaseData(
    vestingSchedules,
    totalSupply,
    projectionMonths
  );

  const marketProjections = calculateMarketProjections(
    vestingReleaseData,
    initialPrice,
    growthRate,
    volatility
  );

  return {
    vestingReleaseData,
    marketProjections,
    initialMarketCap: totalSupply * initialPrice,
  };
}
