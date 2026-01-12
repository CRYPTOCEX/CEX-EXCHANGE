/**
 * Binary Trading Analytics Utilities
 *
 * Functions for calculating trading statistics and performance metrics.
 */

import type { CompletedOrder } from "@/store/trade/use-binary-store";
import type { TradingStats, SymbolStats, TimeOfDayStats, DayOfWeekStats } from "@/types/binary-trading";

// ============================================================================
// CORE STATISTICS CALCULATIONS
// ============================================================================

/**
 * Calculate comprehensive trading statistics from completed orders
 */
export function calculateTradingStats(orders: CompletedOrder[]): TradingStats {
  if (orders.length === 0) {
    return getEmptyStats();
  }

  // Filter out cancelled orders for main statistics
  const validOrders = orders.filter(o => o.status === "WIN" || o.status === "LOSS");

  const wins = validOrders.filter(o => o.status === "WIN");
  const losses = validOrders.filter(o => o.status === "LOSS");
  const draws = orders.filter(o => o.status !== "WIN" && o.status !== "LOSS");

  const totalTrades = validOrders.length;
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  // Calculate P/L
  const totalPnL = validOrders.reduce((sum, o) => {
    const profit = o.profit || 0;
    return sum + (o.status === "WIN" ? profit : -Math.abs(profit));
  }, 0);

  // Average amounts
  const avgWinAmount = winCount > 0
    ? wins.reduce((sum, o) => sum + (o.profit || 0), 0) / winCount
    : 0;
  const avgLossAmount = lossCount > 0
    ? losses.reduce((sum, o) => sum + Math.abs(o.profit || o.amount), 0) / lossCount
    : 0;

  // Best/worst trades
  const profits = validOrders.map(o => {
    const profit = o.profit || 0;
    return o.status === "WIN" ? profit : -Math.abs(profit);
  });
  const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
  const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;

  // Calculate streaks
  const { currentStreak, isWinningStreak, longestWinStreak, longestLossStreak } =
    calculateStreaks(validOrders);

  // Profit factor
  const grossProfit = wins.reduce((sum, o) => sum + (o.profit || 0), 0);
  const grossLoss = losses.reduce((sum, o) => sum + Math.abs(o.profit || o.amount), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Average trade duration
  const avgTradeDuration = calculateAvgDuration(validOrders);

  return {
    totalTrades,
    wins: winCount,
    losses: lossCount,
    draws: draws.length,
    winRate,
    totalPnL,
    avgWinAmount,
    avgLossAmount,
    bestTrade,
    worstTrade,
    currentStreak,
    isWinningStreak,
    longestWinStreak,
    longestLossStreak,
    profitFactor,
    avgTradeDuration,
  };
}

/**
 * Get empty stats object
 */
function getEmptyStats(): TradingStats {
  return {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    totalPnL: 0,
    avgWinAmount: 0,
    avgLossAmount: 0,
    bestTrade: 0,
    worstTrade: 0,
    currentStreak: 0,
    isWinningStreak: false,
    longestWinStreak: 0,
    longestLossStreak: 0,
    profitFactor: 0,
    avgTradeDuration: 0,
  };
}

// ============================================================================
// STREAK CALCULATIONS
// ============================================================================

interface StreakResult {
  currentStreak: number;
  isWinningStreak: boolean;
  longestWinStreak: number;
  longestLossStreak: number;
}

/**
 * Calculate win/loss streaks from orders (ordered by time)
 */
export function calculateStreaks(orders: CompletedOrder[]): StreakResult {
  if (orders.length === 0) {
    return {
      currentStreak: 0,
      isWinningStreak: false,
      longestWinStreak: 0,
      longestLossStreak: 0,
    };
  }

  // Sort by expiry time (most recent first)
  const sortedOrders = [...orders].sort(
    (a, b) => b.expiryTime.getTime() - a.expiryTime.getTime()
  );

  let currentStreak = 0;
  let isWinningStreak = false;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  let winStreak = 0;
  let lossStreak = 0;

  // Calculate current streak from most recent trades
  let foundCurrentStreak = false;
  for (const order of sortedOrders) {
    if (order.status === "WIN") {
      if (!foundCurrentStreak) {
        currentStreak++;
        isWinningStreak = true;
      } else if (!isWinningStreak) {
        break;
      } else {
        currentStreak++;
      }
      winStreak++;
      lossStreak = 0;
    } else if (order.status === "LOSS") {
      if (!foundCurrentStreak) {
        currentStreak++;
        isWinningStreak = false;
        foundCurrentStreak = true;
      } else if (isWinningStreak) {
        break;
      } else {
        currentStreak++;
      }
      lossStreak++;
      winStreak = 0;
    }

    if (!foundCurrentStreak && order.status !== "WIN" && order.status !== "LOSS") {
      continue;
    }
    foundCurrentStreak = true;

    longestWinStreak = Math.max(longestWinStreak, winStreak);
    longestLossStreak = Math.max(longestLossStreak, lossStreak);
  }

  // Recalculate longest streaks from full history
  const { maxWin, maxLoss } = calculateLongestStreaks(sortedOrders);

  return {
    currentStreak,
    isWinningStreak,
    longestWinStreak: Math.max(longestWinStreak, maxWin),
    longestLossStreak: Math.max(longestLossStreak, maxLoss),
  };
}

function calculateLongestStreaks(orders: CompletedOrder[]): { maxWin: number; maxLoss: number } {
  let maxWin = 0;
  let maxLoss = 0;
  let currentWin = 0;
  let currentLoss = 0;

  // Sort by entry time (oldest first)
  const sortedOrders = [...orders].sort(
    (a, b) => a.entryTime.getTime() - b.entryTime.getTime()
  );

  for (const order of sortedOrders) {
    if (order.status === "WIN") {
      currentWin++;
      currentLoss = 0;
      maxWin = Math.max(maxWin, currentWin);
    } else if (order.status === "LOSS") {
      currentLoss++;
      currentWin = 0;
      maxLoss = Math.max(maxLoss, currentLoss);
    }
  }

  return { maxWin, maxLoss };
}

// ============================================================================
// SYMBOL STATISTICS
// ============================================================================

/**
 * Calculate statistics grouped by symbol
 */
export function calculateStatsBySymbol(orders: CompletedOrder[]): SymbolStats[] {
  const symbolMap = new Map<string, CompletedOrder[]>();

  // Group orders by symbol
  for (const order of orders) {
    const symbol = order.symbol;
    if (!symbolMap.has(symbol)) {
      symbolMap.set(symbol, []);
    }
    symbolMap.get(symbol)!.push(order);
  }

  // Calculate stats for each symbol
  const result: SymbolStats[] = [];
  for (const [symbol, symbolOrders] of symbolMap) {
    const stats = calculateTradingStats(symbolOrders);
    result.push({ ...stats, symbol });
  }

  // Sort by total P/L descending
  result.sort((a, b) => b.totalPnL - a.totalPnL);

  return result;
}

// ============================================================================
// TIME-BASED STATISTICS
// ============================================================================

/**
 * Calculate statistics by hour of day
 */
export function calculateStatsByHour(orders: CompletedOrder[]): TimeOfDayStats[] {
  const hourMap = new Map<number, CompletedOrder[]>();

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    hourMap.set(h, []);
  }

  // Group orders by hour
  for (const order of orders) {
    const hour = order.entryTime.getHours();
    hourMap.get(hour)!.push(order);
  }

  // Calculate stats for each hour
  const result: TimeOfDayStats[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourOrders = hourMap.get(hour)!;
    const validOrders = hourOrders.filter(o => o.status === "WIN" || o.status === "LOSS");
    const wins = validOrders.filter(o => o.status === "WIN").length;
    const trades = validOrders.length;
    const winRate = trades > 0 ? (wins / trades) * 100 : 0;
    const avgPnL = validOrders.length > 0
      ? validOrders.reduce((sum, o) => {
          const profit = o.profit || 0;
          return sum + (o.status === "WIN" ? profit : -Math.abs(profit));
        }, 0) / validOrders.length
      : 0;

    result.push({
      hour,
      trades,
      wins,
      winRate,
      avgPnL,
    });
  }

  return result;
}

/**
 * Calculate statistics by day of week
 */
export function calculateStatsByDay(orders: CompletedOrder[]): DayOfWeekStats[] {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayMap = new Map<number, CompletedOrder[]>();

  // Initialize all days
  for (let d = 0; d < 7; d++) {
    dayMap.set(d, []);
  }

  // Group orders by day of week
  for (const order of orders) {
    const day = order.entryTime.getDay();
    dayMap.get(day)!.push(order);
  }

  // Calculate stats for each day
  const result: DayOfWeekStats[] = [];
  for (let day = 0; day < 7; day++) {
    const dayOrders = dayMap.get(day)!;
    const validOrders = dayOrders.filter(o => o.status === "WIN" || o.status === "LOSS");
    const wins = validOrders.filter(o => o.status === "WIN").length;
    const trades = validOrders.length;
    const winRate = trades > 0 ? (wins / trades) * 100 : 0;
    const avgPnL = validOrders.length > 0
      ? validOrders.reduce((sum, o) => {
          const profit = o.profit || 0;
          return sum + (o.status === "WIN" ? profit : -Math.abs(profit));
        }, 0) / validOrders.length
      : 0;

    result.push({
      day,
      dayName: dayNames[day],
      trades,
      wins,
      winRate,
      avgPnL,
    });
  }

  return result;
}

// ============================================================================
// EQUITY CURVE
// ============================================================================

export interface EquityPoint {
  time: Date;
  balance: number;
  trade: CompletedOrder | null;
  drawdown: number;
  drawdownPercent: number;
}

/**
 * Calculate equity curve data points
 */
export function calculateEquityCurve(
  orders: CompletedOrder[],
  startingBalance: number
): EquityPoint[] {
  if (orders.length === 0) {
    return [{
      time: new Date(),
      balance: startingBalance,
      trade: null,
      drawdown: 0,
      drawdownPercent: 0,
    }];
  }

  // Sort by expiry time (oldest first)
  const sortedOrders = [...orders].sort(
    (a, b) => a.expiryTime.getTime() - b.expiryTime.getTime()
  );

  const result: EquityPoint[] = [];
  let balance = startingBalance;
  let peakBalance = startingBalance;

  // Add starting point
  result.push({
    time: sortedOrders[0].entryTime,
    balance: startingBalance,
    trade: null,
    drawdown: 0,
    drawdownPercent: 0,
  });

  // Add point for each trade
  for (const order of sortedOrders) {
    const profit = order.profit || 0;
    const pnl = order.status === "WIN" ? profit : -Math.abs(profit);
    balance += pnl;
    peakBalance = Math.max(peakBalance, balance);

    const drawdown = peakBalance - balance;
    const drawdownPercent = peakBalance > 0 ? (drawdown / peakBalance) * 100 : 0;

    result.push({
      time: order.expiryTime,
      balance,
      trade: order,
      drawdown,
      drawdownPercent,
    });
  }

  return result;
}

// ============================================================================
// ADVANCED METRICS
// ============================================================================

/**
 * Calculate Sharpe Ratio (simplified version using trade returns)
 */
export function calculateSharpeRatio(
  orders: CompletedOrder[],
  riskFreeRate: number = 0
): number {
  const validOrders = orders.filter(o => o.status === "WIN" || o.status === "LOSS");
  if (validOrders.length < 2) return 0;

  // Calculate returns for each trade
  const returns = validOrders.map(o => {
    const profit = o.profit || 0;
    const pnl = o.status === "WIN" ? profit : -Math.abs(profit);
    return pnl / o.amount;
  });

  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return meanReturn > riskFreeRate ? Infinity : 0;

  // Sharpe Ratio = (Mean Return - Risk Free Rate) / Std Dev
  return (meanReturn - riskFreeRate) / stdDev;
}

/**
 * Calculate Sortino Ratio (only considers downside volatility)
 */
export function calculateSortinoRatio(
  orders: CompletedOrder[],
  riskFreeRate: number = 0
): number {
  const validOrders = orders.filter(o => o.status === "WIN" || o.status === "LOSS");
  if (validOrders.length < 2) return 0;

  // Calculate returns for each trade
  const returns = validOrders.map(o => {
    const profit = o.profit || 0;
    const pnl = o.status === "WIN" ? profit : -Math.abs(profit);
    return pnl / o.amount;
  });

  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate downside deviation (only negative returns)
  const negativeReturns = returns.filter(r => r < 0);
  if (negativeReturns.length === 0) return meanReturn > 0 ? Infinity : 0;

  const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length;
  const downsideDev = Math.sqrt(downsideVariance);

  if (downsideDev === 0) return meanReturn > riskFreeRate ? Infinity : 0;

  return (meanReturn - riskFreeRate) / downsideDev;
}

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(
  orders: CompletedOrder[],
  startingBalance: number
): { maxDrawdown: number; maxDrawdownPercent: number } {
  const equityCurve = calculateEquityCurve(orders, startingBalance);

  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  for (const point of equityCurve) {
    if (point.drawdown > maxDrawdown) {
      maxDrawdown = point.drawdown;
      maxDrawdownPercent = point.drawdownPercent;
    }
  }

  return { maxDrawdown, maxDrawdownPercent };
}

/**
 * Calculate Recovery Factor
 * Recovery Factor = Net Profit / Max Drawdown
 */
export function calculateRecoveryFactor(
  orders: CompletedOrder[],
  startingBalance: number
): number {
  const stats = calculateTradingStats(orders);
  const { maxDrawdown } = calculateMaxDrawdown(orders, startingBalance);

  if (maxDrawdown === 0) return stats.totalPnL > 0 ? Infinity : 0;

  return stats.totalPnL / maxDrawdown;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate average trade duration in seconds
 */
function calculateAvgDuration(orders: CompletedOrder[]): number {
  if (orders.length === 0) return 0;

  const totalDuration = orders.reduce((sum, o) => {
    const duration = (o.expiryTime.getTime() - o.entryTime.getTime()) / 1000;
    return sum + duration;
  }, 0);

  return totalDuration / orders.length;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

/**
 * Format percentage with specified decimal places
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = "USDT"): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} ${currency}`;
}

/**
 * Get performance color based on value
 */
export function getPerformanceColor(value: number): string {
  if (value > 0) return "text-green-500";
  if (value < 0) return "text-red-500";
  return "text-zinc-400";
}

/**
 * Get win rate color based on percentage
 */
export function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return "text-green-500";
  if (winRate >= 50) return "text-yellow-500";
  if (winRate >= 40) return "text-orange-500";
  return "text-red-500";
}
