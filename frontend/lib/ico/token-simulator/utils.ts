import type { TokenDistribution, VestingSchedule } from "./types";

// Create CSV content from market projections
export function createCsvFromProjections(marketProjections: any[]) {
  let csv = "Month,Price,Market Cap,Circulating Supply,% Released\n";

  marketProjections.forEach((data) => {
    csv += `${data.month},${data.price.toFixed(4)},${data.marketCap.toFixed(2)},${data.circulatingSupply.toFixed(0)},${data.percentReleased.toFixed(2)}\n`;
  });

  return csv;
}

// Synchronize distribution and vesting schedules
export function syncDistributionWithVesting(
  distribution: TokenDistribution[],
  vestingSchedules: VestingSchedule[]
): VestingSchedule[] {
  return vestingSchedules.map((schedule) => {
    const matchingDistribution = distribution.find(
      (d) => d.name === schedule.name
    );
    if (matchingDistribution) {
      return {
        ...schedule,
        allocation: matchingDistribution.value,
      };
    }
    return schedule;
  });
}

// Get filtered data for charts (to avoid too many data points)
export function getFilteredChartData(
  data: any[],
  totalItems: number,
  maxPoints = 24
) {
  const interval = Math.max(1, Math.floor(totalItems / maxPoints));
  return data.filter(
    (_, i) => i % interval === 0 || i === 0 || i === totalItems - 1
  );
}
