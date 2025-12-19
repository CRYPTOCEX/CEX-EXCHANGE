import { BaseBot, MarketContext, TradeDecision } from "./BaseBot";
import { BotManager } from "./BotManager";
import { logger, logInfo } from "@b/utils/console";

/**
 * Coordination rule types
 */
export type CoordinationRule =
  | "ANTI_COLLISION" // Prevent bots from trading against each other
  | "PRICE_COORDINATION" // Coordinate price levels
  | "VOLUME_BALANCING" // Balance buy/sell volume
  | "SPREAD_MAINTENANCE"; // Maintain minimum spread

/**
 * Coordination result
 */
export interface CoordinationResult {
  approved: boolean;
  adjustedDecision?: TradeDecision;
  reason?: string;
}

/**
 * Market pressure tracking
 */
interface MarketPressure {
  buyVolume: bigint;
  sellVolume: bigint;
  netPressure: number; // -1 to 1 (negative = sell pressure)
  lastUpdate: number;
}

/**
 * BotCoordinator - Coordinates multiple bots to act as a cohesive unit
 *
 * Handles:
 * - Preventing bot conflicts (trading against each other)
 * - Coordinating price movements
 * - Balancing market pressure
 * - Maintaining spread requirements
 */
export class BotCoordinator {
  private static instance: BotCoordinator;
  private botManager: BotManager;

  // Active rules per market
  private marketRules: Map<string, Set<CoordinationRule>> = new Map();

  // Recent trade tracking for coordination
  private recentTrades: Map<
    string,
    Array<{ botId: string; side: "BUY" | "SELL"; price: bigint; amount: bigint; timestamp: number }>
  > = new Map();

  // Market pressure tracking
  private marketPressure: Map<string, MarketPressure> = new Map();

  // Configuration
  private readonly antiCollisionWindowMs = 5000; // 5 second window
  private readonly maxPressureImbalance = 0.3; // 30% max imbalance
  private readonly recentTradeRetentionMs = 60000; // Keep 1 minute of trades

  private constructor() {
    this.botManager = BotManager.getInstance();
  }

  public static getInstance(): BotCoordinator {
    if (!BotCoordinator.instance) {
      BotCoordinator.instance = new BotCoordinator();
    }
    return BotCoordinator.instance;
  }

  /**
   * Set coordination rules for a market
   */
  public setMarketRules(marketId: string, rules: CoordinationRule[]): void {
    this.marketRules.set(marketId, new Set(rules));
    logInfo("bot-coordinator", `Set rules for market ${marketId}: ${rules.join(", ")}`);
  }

  /**
   * Get active rules for a market
   */
  public getMarketRules(marketId: string): CoordinationRule[] {
    return Array.from(this.marketRules.get(marketId) || []);
  }

  /**
   * Enable default coordination rules for a market
   */
  public enableDefaultRules(marketId: string): void {
    this.setMarketRules(marketId, [
      "ANTI_COLLISION",
      "VOLUME_BALANCING",
      "SPREAD_MAINTENANCE",
    ]);
  }

  /**
   * Coordinate a trade decision
   * Returns adjusted decision if needed, or rejection if trade should be blocked
   */
  public coordinateTrade(
    marketId: string,
    botId: string,
    decision: TradeDecision,
    context: MarketContext
  ): CoordinationResult {
    const rules = this.marketRules.get(marketId);
    if (!rules || rules.size === 0 || !decision.shouldTrade) {
      return { approved: true };
    }

    // Apply each rule
    for (const rule of rules) {
      const result = this.applyRule(rule, marketId, botId, decision, context);
      if (!result.approved) {
        return result;
      }
      // Use adjusted decision for subsequent rules
      if (result.adjustedDecision) {
        decision = result.adjustedDecision;
      }
    }

    return { approved: true, adjustedDecision: decision };
  }

  /**
   * Record a completed trade for coordination tracking
   */
  public recordTrade(
    marketId: string,
    botId: string,
    side: "BUY" | "SELL",
    price: bigint,
    amount: bigint
  ): void {
    // Initialize if needed
    if (!this.recentTrades.has(marketId)) {
      this.recentTrades.set(marketId, []);
    }

    const trades = this.recentTrades.get(marketId)!;

    // Add new trade
    trades.push({
      botId,
      side,
      price,
      amount,
      timestamp: Date.now(),
    });

    // Update market pressure
    this.updateMarketPressure(marketId, side, amount);

    // Clean old trades
    this.cleanOldTrades(marketId);
  }

  /**
   * Get current market pressure
   */
  public getMarketPressure(marketId: string): MarketPressure | undefined {
    return this.marketPressure.get(marketId);
  }

  /**
   * Get recommended trade side based on market pressure
   */
  public getRecommendedSide(marketId: string): "BUY" | "SELL" | null {
    const pressure = this.marketPressure.get(marketId);
    if (!pressure) return null;

    // Recommend opposite of current pressure to balance
    if (pressure.netPressure > this.maxPressureImbalance) {
      return "SELL"; // Too much buy pressure, recommend selling
    } else if (pressure.netPressure < -this.maxPressureImbalance) {
      return "BUY"; // Too much sell pressure, recommend buying
    }

    return null; // Balanced
  }

  /**
   * Check if a side is allowed based on pressure limits
   */
  public isSideAllowed(marketId: string, side: "BUY" | "SELL"): boolean {
    const pressure = this.marketPressure.get(marketId);
    if (!pressure) return true;

    // Block trades that would increase imbalance beyond threshold
    if (side === "BUY" && pressure.netPressure > this.maxPressureImbalance * 1.5) {
      return false;
    }
    if (side === "SELL" && pressure.netPressure < -this.maxPressureImbalance * 1.5) {
      return false;
    }

    return true;
  }

  /**
   * Get coordination statistics for a market
   */
  public getCoordinationStats(marketId: string): {
    activeRules: CoordinationRule[];
    recentTradeCount: number;
    pressure: MarketPressure | null;
    recommendations: string[];
  } {
    const rules = this.getMarketRules(marketId);
    const trades = this.recentTrades.get(marketId) || [];
    const pressure = this.marketPressure.get(marketId) || null;
    const recommendations: string[] = [];

    if (pressure) {
      if (pressure.netPressure > this.maxPressureImbalance) {
        recommendations.push("High buy pressure - prioritize sell orders");
      } else if (pressure.netPressure < -this.maxPressureImbalance) {
        recommendations.push("High sell pressure - prioritize buy orders");
      } else {
        recommendations.push("Market pressure balanced");
      }
    }

    return {
      activeRules: rules,
      recentTradeCount: trades.length,
      pressure,
      recommendations,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Apply a specific coordination rule
   */
  private applyRule(
    rule: CoordinationRule,
    marketId: string,
    botId: string,
    decision: TradeDecision,
    context: MarketContext
  ): CoordinationResult {
    switch (rule) {
      case "ANTI_COLLISION":
        return this.applyAntiCollision(marketId, botId, decision);
      case "PRICE_COORDINATION":
        return this.applyPriceCoordination(marketId, decision, context);
      case "VOLUME_BALANCING":
        return this.applyVolumeBalancing(marketId, decision);
      case "SPREAD_MAINTENANCE":
        return this.applySpreadMaintenance(marketId, decision, context);
      default:
        return { approved: true };
    }
  }

  /**
   * Anti-collision rule: Prevent bots from trading against each other's recent orders
   */
  private applyAntiCollision(
    marketId: string,
    botId: string,
    decision: TradeDecision
  ): CoordinationResult {
    const trades = this.recentTrades.get(marketId) || [];
    const now = Date.now();

    // Check recent trades from other bots
    const recentOpposite = trades.filter(
      (t) =>
        t.botId !== botId &&
        t.side !== decision.side &&
        now - t.timestamp < this.antiCollisionWindowMs
    );

    if (recentOpposite.length > 0) {
      // Check if our trade would match against recent opposite trade
      const wouldCollide = recentOpposite.some((t) => {
        if (decision.side === "BUY") {
          return decision.price! >= t.price;
        } else {
          return decision.price! <= t.price;
        }
      });

      if (wouldCollide) {
        return {
          approved: false,
          reason: "Would collide with recent bot trade",
        };
      }
    }

    return { approved: true };
  }

  /**
   * Price coordination rule: Ensure bots don't push price too aggressively
   */
  private applyPriceCoordination(
    marketId: string,
    decision: TradeDecision,
    context: MarketContext
  ): CoordinationResult {
    if (!decision.price) return { approved: true };

    const currentPrice = Number(context.currentPrice) / 1e18;
    const decisionPrice = Number(decision.price) / 1e18;
    const priceDiff = Math.abs((decisionPrice - currentPrice) / currentPrice);

    // Block trades more than 1% away from current price
    if (priceDiff > 0.01) {
      // Adjust price to be within bounds
      const maxMove = currentPrice * 0.01;
      let adjustedPrice: bigint;

      if (decision.side === "BUY") {
        adjustedPrice = BigInt(Math.floor((currentPrice - maxMove) * 1e18));
      } else {
        adjustedPrice = BigInt(Math.floor((currentPrice + maxMove) * 1e18));
      }

      return {
        approved: true,
        adjustedDecision: {
          ...decision,
          price: adjustedPrice,
        },
        reason: "Price adjusted to stay within coordination bounds",
      };
    }

    return { approved: true };
  }

  /**
   * Volume balancing rule: Limit trades that would increase pressure imbalance
   */
  private applyVolumeBalancing(
    marketId: string,
    decision: TradeDecision
  ): CoordinationResult {
    const pressure = this.marketPressure.get(marketId);
    if (!pressure) return { approved: true };

    // Check if this trade would make imbalance worse
    const wouldWorsen =
      (decision.side === "BUY" && pressure.netPressure > this.maxPressureImbalance) ||
      (decision.side === "SELL" && pressure.netPressure < -this.maxPressureImbalance);

    if (wouldWorsen) {
      // Reduce order size instead of blocking
      const reducedAmount = decision.amount
        ? BigInt(Math.floor(Number(decision.amount) * 0.5))
        : undefined;

      return {
        approved: true,
        adjustedDecision: {
          ...decision,
          amount: reducedAmount,
        },
        reason: "Order size reduced for volume balancing",
      };
    }

    return { approved: true };
  }

  /**
   * Spread maintenance rule: Ensure minimum spread is maintained
   */
  private applySpreadMaintenance(
    marketId: string,
    decision: TradeDecision,
    context: MarketContext
  ): CoordinationResult {
    if (!decision.price) return { approved: true };

    const minSpreadBps = 10; // 0.1% minimum spread

    const bestBid = context.orderbook?.bestBid || BigInt(0);
    const bestAsk = context.orderbook?.bestAsk || BigInt(0);

    if (bestBid === BigInt(0) || bestAsk === BigInt(0)) {
      return { approved: true };
    }

    const bidNum = Number(bestBid);
    const askNum = Number(bestAsk);
    const decisionPriceNum = Number(decision.price);

    // Check if trade would violate minimum spread
    if (decision.side === "BUY") {
      // Buy should not exceed (ask - minSpread)
      const maxBid = askNum * (1 - minSpreadBps / 10000);
      if (decisionPriceNum > maxBid) {
        return {
          approved: true,
          adjustedDecision: {
            ...decision,
            price: BigInt(Math.floor(maxBid)),
          },
          reason: "Bid adjusted to maintain minimum spread",
        };
      }
    } else {
      // Sell should not go below (bid + minSpread)
      const minAsk = bidNum * (1 + minSpreadBps / 10000);
      if (decisionPriceNum < minAsk) {
        return {
          approved: true,
          adjustedDecision: {
            ...decision,
            price: BigInt(Math.floor(minAsk)),
          },
          reason: "Ask adjusted to maintain minimum spread",
        };
      }
    }

    return { approved: true };
  }

  /**
   * Update market pressure tracking
   */
  private updateMarketPressure(
    marketId: string,
    side: "BUY" | "SELL",
    amount: bigint
  ): void {
    let pressure = this.marketPressure.get(marketId);

    if (!pressure) {
      pressure = {
        buyVolume: BigInt(0),
        sellVolume: BigInt(0),
        netPressure: 0,
        lastUpdate: Date.now(),
      };
    }

    if (side === "BUY") {
      pressure.buyVolume += amount;
    } else {
      pressure.sellVolume += amount;
    }

    // Calculate net pressure (-1 to 1)
    const total = Number(pressure.buyVolume) + Number(pressure.sellVolume);
    if (total > 0) {
      pressure.netPressure =
        (Number(pressure.buyVolume) - Number(pressure.sellVolume)) / total;
    }

    pressure.lastUpdate = Date.now();
    this.marketPressure.set(marketId, pressure);
  }

  /**
   * Clean old trades from tracking
   */
  private cleanOldTrades(marketId: string): void {
    const trades = this.recentTrades.get(marketId);
    if (!trades) return;

    const cutoff = Date.now() - this.recentTradeRetentionMs;
    const filtered = trades.filter((t) => t.timestamp > cutoff);

    this.recentTrades.set(marketId, filtered);
  }

  /**
   * Reset market pressure (e.g., at start of new period)
   */
  public resetMarketPressure(marketId: string): void {
    this.marketPressure.set(marketId, {
      buyVolume: BigInt(0),
      sellVolume: BigInt(0),
      netPressure: 0,
      lastUpdate: Date.now(),
    });
  }

  /**
   * Clear all coordination data for a market
   */
  public clearMarket(marketId: string): void {
    this.marketRules.delete(marketId);
    this.recentTrades.delete(marketId);
    this.marketPressure.delete(marketId);
  }
}

export default BotCoordinator;
