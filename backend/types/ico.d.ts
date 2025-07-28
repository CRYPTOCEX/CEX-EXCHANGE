interface PerformanceDataPoint {
  date: string;
  value: number;
}

interface PerformanceMetrics {
  initialValue: number;
  currentValue: number;
  absoluteChange: number;
  percentageChange: number;
  bestDay: {
    date: string;
    change: number;
  };
  worstDay: {
    date: string;
    change: number;
  };
  volatility: number;
  sharpeRatio: number;
  marketComparison: {
    btc: number;
    eth: number;
    index: number;
  };
  allocation: {
    byToken: Array<{
      name: string;
      percentage: number;
    }>;
    byStatus: Array<{
      name: string;
      percentage: number;
    }>;
  };
}
