// Advanced Calculations - Sharpe ratio, drawdown, volatility, and other analytics
import { models, sequelize } from "@b/db";
import { Op, fn, col, literal } from "sequelize";
import { logger } from "@b/utils/console";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TradeData {
  profit: number;
  profitPercent: number;
  cost: number;
  createdAt: Date;
  closedAt?: Date;
}

interface PerformanceMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  volatility: number;
  avgReturn: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

interface DrawdownData {
  peak: number;
  trough: number;
  drawdown: number;
  drawdownPercent: number;
  startDate: Date;
  endDate?: Date;
  recovered: boolean;
}

// ============================================================================
// SHARPE RATIO
// ============================================================================

/**
 * Calculate Sharpe Ratio
 * Sharpe Ratio = (Average Return - Risk-Free Rate) / Standard Deviation
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02 // 2% annual risk-free rate
): number {
  if (returns.length < 2) return 0;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = calculateStdDev(returns);

  if (stdDev === 0) return 0;

  // Annualize if needed (assuming daily returns)
  const annualizedReturn = avgReturn * 252; // Trading days in a year
  const annualizedStdDev = stdDev * Math.sqrt(252);

  return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}

/**
 * Calculate Sortino Ratio
 * Like Sharpe but only considers downside volatility
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  if (returns.length < 2) return 0;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // Calculate downside deviation (only negative returns)
  const negativeReturns = returns.filter((r) => r < 0);
  if (negativeReturns.length === 0) return avgReturn > 0 ? Infinity : 0;

  const downsideDeviation = calculateStdDev(negativeReturns);
  if (downsideDeviation === 0) return 0;

  // Annualize
  const annualizedReturn = avgReturn * 252;
  const annualizedDownsideDev = downsideDeviation * Math.sqrt(252);

  return (annualizedReturn - riskFreeRate) / annualizedDownsideDev;
}

// ============================================================================
// DRAWDOWN CALCULATIONS
// ============================================================================

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(equityCurve: number[]): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  drawdownHistory: DrawdownData[];
} {
  if (equityCurve.length < 2) {
    return { maxDrawdown: 0, maxDrawdownPercent: 0, drawdownHistory: [] };
  }

  let peak = equityCurve[0];
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  const drawdownHistory: DrawdownData[] = [];
  let currentDrawdown: DrawdownData | null = null;

  for (let i = 1; i < equityCurve.length; i++) {
    const value = equityCurve[i];

    if (value > peak) {
      // New peak - close any current drawdown
      if (currentDrawdown) {
        currentDrawdown.recovered = true;
        currentDrawdown.endDate = new Date();
        drawdownHistory.push(currentDrawdown);
        currentDrawdown = null;
      }
      peak = value;
    } else {
      // In drawdown
      const drawdown = peak - value;
      const drawdownPercent = (drawdown / peak) * 100;

      if (!currentDrawdown) {
        currentDrawdown = {
          peak,
          trough: value,
          drawdown,
          drawdownPercent,
          startDate: new Date(),
          recovered: false,
        };
      } else {
        if (value < currentDrawdown.trough) {
          currentDrawdown.trough = value;
          currentDrawdown.drawdown = peak - value;
          currentDrawdown.drawdownPercent = (currentDrawdown.drawdown / peak) * 100;
        }
      }

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }
  }

  // Add any ongoing drawdown
  if (currentDrawdown) {
    drawdownHistory.push(currentDrawdown);
  }

  return { maxDrawdown, maxDrawdownPercent, drawdownHistory };
}

/**
 * Calculate current drawdown from peak
 */
export function calculateCurrentDrawdown(equityCurve: number[]): {
  currentDrawdown: number;
  currentDrawdownPercent: number;
  peakValue: number;
} {
  if (equityCurve.length === 0) {
    return { currentDrawdown: 0, currentDrawdownPercent: 0, peakValue: 0 };
  }

  const peakValue = Math.max(...equityCurve);
  const currentValue = equityCurve[equityCurve.length - 1];
  const currentDrawdown = Math.max(0, peakValue - currentValue);
  const currentDrawdownPercent =
    peakValue > 0 ? (currentDrawdown / peakValue) * 100 : 0;

  return { currentDrawdown, currentDrawdownPercent, peakValue };
}

// ============================================================================
// VOLATILITY
// ============================================================================

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate volatility (annualized standard deviation of returns)
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const stdDev = calculateStdDev(returns);
  // Annualize (assuming daily returns)
  return stdDev * Math.sqrt(252);
}

/**
 * Calculate rolling volatility
 */
export function calculateRollingVolatility(
  returns: number[],
  windowSize: number = 20
): number[] {
  const result: number[] = [];

  for (let i = windowSize - 1; i < returns.length; i++) {
    const window = returns.slice(i - windowSize + 1, i + 1);
    result.push(calculateVolatility(window));
  }

  return result;
}

// ============================================================================
// PROFIT FACTOR & EXPECTANCY
// ============================================================================

/**
 * Calculate profit factor
 * Profit Factor = Gross Profit / Gross Loss
 */
export function calculateProfitFactor(profits: number[]): number {
  const grossProfit = profits.filter((p) => p > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(
    profits.filter((p) => p < 0).reduce((a, b) => a + b, 0)
  );

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

/**
 * Calculate expectancy
 * Expectancy = (Win Rate * Average Win) - (Loss Rate * Average Loss)
 */
export function calculateExpectancy(profits: number[]): number {
  if (profits.length === 0) return 0;

  const wins = profits.filter((p) => p > 0);
  const losses = profits.filter((p) => p < 0);

  const winRate = wins.length / profits.length;
  const lossRate = losses.length / profits.length;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length)
      : 0;

  return winRate * avgWin - lossRate * avgLoss;
}

// ============================================================================
// COMPREHENSIVE METRICS
// ============================================================================

/**
 * Calculate all performance metrics for a leader/follower
 */
export async function calculatePerformanceMetrics(
  entityType: "leader" | "follower",
  entityId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PerformanceMetrics> {
  const whereClause: any = {
    status: "CLOSED",
    profit: { [Op.ne]: null },
  };

  if (entityType === "leader") {
    whereClause.leaderId = entityId;
    whereClause.isLeaderTrade = true;
  } else {
    whereClause.followerId = entityId;
  }

  if (startDate) {
    whereClause.closedAt = { ...whereClause.closedAt, [Op.gte]: startDate };
  }
  if (endDate) {
    whereClause.closedAt = { ...whereClause.closedAt, [Op.lte]: endDate };
  }

  const trades = await models.copyTradingTrade.findAll({
    where: whereClause,
    order: [["closedAt", "ASC"]],
    raw: true,
  });

  if (trades.length === 0) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      volatility: 0,
      avgReturn: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
  }

  const tradesData = trades as TradeData[];

  // Extract profits and returns
  const profits = tradesData.map((t) => t.profit || 0);
  const returns = tradesData.map((t) => (t.profitPercent || 0) / 100);

  // Build equity curve
  let equity = 10000; // Start with arbitrary 10k
  const equityCurve = [equity];
  for (const profit of profits) {
    equity += profit;
    equityCurve.push(equity);
  }

  // Calculate metrics
  const wins = profits.filter((p) => p > 0);
  const losses = profits.filter((p) => p < 0);

  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length)
      : 0;

  const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdown(equityCurve);

  return {
    sharpeRatio: calculateSharpeRatio(returns),
    sortinoRatio: calculateSortinoRatio(returns),
    maxDrawdown,
    maxDrawdownPercent,
    volatility: calculateVolatility(returns),
    avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
    winRate: (wins.length / profits.length) * 100,
    profitFactor: calculateProfitFactor(profits),
    avgWin,
    avgLoss,
    expectancy: calculateExpectancy(profits),
    totalTrades: profits.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
  };
}

// ============================================================================
// TIME-BASED ANALYTICS
// ============================================================================

/**
 * Calculate daily returns for a period
 */
export async function calculateDailyReturns(
  entityType: "leader" | "follower",
  entityId: string,
  days: number = 30
): Promise<{ date: string; return: number; trades: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const whereClause: any = {
    status: "CLOSED",
    closedAt: { [Op.gte]: startDate },
  };

  if (entityType === "leader") {
    whereClause.leaderId = entityId;
    whereClause.isLeaderTrade = true;
  } else {
    whereClause.followerId = entityId;
  }

  const trades = await models.copyTradingTrade.findAll({
    where: whereClause,
    attributes: [
      [fn("DATE", col("closedAt")), "date"],
      [fn("SUM", col("profit")), "totalProfit"],
      [fn("SUM", col("cost")), "totalCost"],
      [fn("COUNT", col("id")), "tradeCount"],
    ],
    group: [fn("DATE", col("closedAt"))],
    order: [[fn("DATE", col("closedAt")), "ASC"]],
    raw: true,
  });

  return (trades as any[]).map((t) => ({
    date: t.date,
    return: t.totalCost > 0 ? (t.totalProfit / t.totalCost) * 100 : 0,
    trades: parseInt(t.tradeCount),
  }));
}

/**
 * Calculate monthly performance
 */
export async function calculateMonthlyPerformance(
  entityType: "leader" | "follower",
  entityId: string,
  months: number = 12
): Promise<
  {
    month: string;
    profit: number;
    roi: number;
    trades: number;
    winRate: number;
  }[]
> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const whereClause: any = {
    status: "CLOSED",
    closedAt: { [Op.gte]: startDate },
  };

  if (entityType === "leader") {
    whereClause.leaderId = entityId;
    whereClause.isLeaderTrade = true;
  } else {
    whereClause.followerId = entityId;
  }

  const trades = await models.copyTradingTrade.findAll({
    where: whereClause,
    attributes: [
      [
        fn(
          "DATE_FORMAT",
          col("closedAt"),
          "%Y-%m"
        ),
        "month",
      ],
      [fn("SUM", col("profit")), "totalProfit"],
      [fn("SUM", col("cost")), "totalCost"],
      [fn("COUNT", col("id")), "tradeCount"],
      [
        fn(
          "SUM",
          literal("CASE WHEN profit > 0 THEN 1 ELSE 0 END")
        ),
        "winCount",
      ],
    ],
    group: [
      fn("DATE_FORMAT", col("closedAt"), "%Y-%m"),
    ],
    order: [
      [
        fn("DATE_FORMAT", col("closedAt"), "%Y-%m"),
        "ASC",
      ],
    ],
    raw: true,
  });

  return (trades as any[]).map((t) => ({
    month: t.month,
    profit: parseFloat(t.totalProfit) || 0,
    roi: t.totalCost > 0 ? (t.totalProfit / t.totalCost) * 100 : 0,
    trades: parseInt(t.tradeCount) || 0,
    winRate:
      t.tradeCount > 0 ? (parseInt(t.winCount) / parseInt(t.tradeCount)) * 100 : 0,
  }));
}

// ============================================================================
// COMPARISON METRICS
// ============================================================================

/**
 * Compare leader performance to benchmark (market average)
 */
export async function calculateAlpha(
  leaderId: string,
  benchmarkReturn: number = 0 // Market return for the period
): Promise<{ alpha: number; beta: number }> {
  const metrics = await calculatePerformanceMetrics("leader", leaderId);

  // Simplified alpha calculation
  // Alpha = Actual Return - (Risk-Free Rate + Beta * (Market Return - Risk-Free Rate))
  const riskFreeRate = 0.02; // 2% annual
  const actualReturn = metrics.avgReturn * 252; // Annualized

  // Beta would require correlation with market - simplified to 1 for now
  const beta = 1;
  const expectedReturn = riskFreeRate + beta * (benchmarkReturn - riskFreeRate);
  const alpha = actualReturn - expectedReturn;

  return { alpha, beta };
}

/**
 * Calculate risk-adjusted return (RAR)
 */
export function calculateRiskAdjustedReturn(
  totalReturn: number,
  volatility: number
): number {
  if (volatility === 0) return 0;
  return totalReturn / volatility;
}
