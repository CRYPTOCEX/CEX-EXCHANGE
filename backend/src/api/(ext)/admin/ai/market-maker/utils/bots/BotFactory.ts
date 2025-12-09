import { BaseBot, BotConfig, BotPersonality } from "./BaseBot";
import { ScalperBot } from "./personalities/ScalperBot";
import { SwingBot } from "./personalities/SwingBot";
import { AccumulatorBot } from "./personalities/AccumulatorBot";
import { DistributorBot } from "./personalities/DistributorBot";
import { MarketMakerBot } from "./personalities/MarketMakerBot";

/**
 * Configuration for market bot setup
 */
export interface MarketBotConfig {
  marketId: string;
  symbol: string;
  baseBalance: number;
  quoteBalance: number;
  avgOrderSize: number;
  personalities?: BotPersonality[];
  customBotConfigs?: Partial<BotConfig>[];
}

/**
 * Default bot distribution for a market
 */
const DEFAULT_BOT_DISTRIBUTION: BotPersonality[] = [
  "SCALPER",
  "SCALPER",
  "SWING",
  "ACCUMULATOR",
  "DISTRIBUTOR",
  "MARKET_MAKER",
];

/**
 * BotFactory - Creates and configures bot instances
 *
 * Handles:
 * - Creating individual bots
 * - Creating bot groups for markets
 * - Distributing resources among bots
 */
export class BotFactory {
  private static instance: BotFactory;
  private botCounter: number = 0;

  private constructor() {}

  public static getInstance(): BotFactory {
    if (!BotFactory.instance) {
      BotFactory.instance = new BotFactory();
    }
    return BotFactory.instance;
  }

  /**
   * Create a single bot by personality type
   */
  public createBot(config: BotConfig): BaseBot {
    switch (config.personality) {
      case "SCALPER":
        return new ScalperBot(config);
      case "SWING":
        return new SwingBot(config);
      case "ACCUMULATOR":
        return new AccumulatorBot(config);
      case "DISTRIBUTOR":
        return new DistributorBot(config);
      case "MARKET_MAKER":
        return new MarketMakerBot(config);
      default:
        throw new Error(`Unknown bot personality: ${config.personality}`);
    }
  }

  /**
   * Create multiple bots for a market
   */
  public createBotsForMarket(marketConfig: MarketBotConfig): BaseBot[] {
    const personalities =
      marketConfig.personalities || DEFAULT_BOT_DISTRIBUTION;
    const bots: BaseBot[] = [];

    // Calculate balance distribution based on personality
    const balanceDistribution = this.calculateBalanceDistribution(personalities);

    for (let i = 0; i < personalities.length; i++) {
      const personality = personalities[i];
      const distribution = balanceDistribution[personality];

      // Get custom config if provided
      const customConfig = marketConfig.customBotConfigs?.[i] || {};

      const botConfig: BotConfig = {
        id: this.generateBotId(marketConfig.marketId, personality),
        name: `${personality}-${marketConfig.symbol}-${i + 1}`,
        marketMakerId: marketConfig.marketId,
        personality,
        riskTolerance: this.getDefaultRiskTolerance(personality),
        tradeFrequency: this.getDefaultFrequency(personality),
        avgOrderSize: marketConfig.avgOrderSize * distribution.sizeMultiplier,
        orderSizeVariance: 0.2,
        preferredSpread: this.getDefaultSpread(personality),
        maxDailyTrades: this.getDefaultMaxDailyTrades(personality),
        ...customConfig,
      };

      const bot = this.createBot(botConfig);
      bots.push(bot);
    }

    return bots;
  }

  /**
   * Create a balanced set of bots (equal buy/sell pressure)
   */
  public createBalancedBotSet(marketConfig: MarketBotConfig): BaseBot[] {
    // Create balanced distribution: 2 buyers, 2 sellers, 2 neutral
    const balancedPersonalities: BotPersonality[] = [
      "ACCUMULATOR", // Buyer
      "SWING", // Can be buyer or seller
      "MARKET_MAKER", // Neutral
      "MARKET_MAKER", // Neutral
      "SWING", // Can be buyer or seller
      "DISTRIBUTOR", // Seller
    ];

    return this.createBotsForMarket({
      ...marketConfig,
      personalities: balancedPersonalities,
    });
  }

  /**
   * Create aggressive bot set (more activity)
   */
  public createAggressiveBotSet(marketConfig: MarketBotConfig): BaseBot[] {
    const aggressivePersonalities: BotPersonality[] = [
      "SCALPER",
      "SCALPER",
      "SCALPER",
      "MARKET_MAKER",
      "MARKET_MAKER",
      "SWING",
    ];

    return this.createBotsForMarket({
      ...marketConfig,
      personalities: aggressivePersonalities,
    });
  }

  /**
   * Create conservative bot set (less activity)
   */
  public createConservativeBotSet(marketConfig: MarketBotConfig): BaseBot[] {
    const conservativePersonalities: BotPersonality[] = [
      "SWING",
      "SWING",
      "ACCUMULATOR",
      "DISTRIBUTOR",
    ];

    return this.createBotsForMarket({
      ...marketConfig,
      personalities: conservativePersonalities,
    });
  }

  /**
   * Create single bot with specific configuration
   */
  public createSingleBot(
    marketId: string,
    symbol: string,
    personality: BotPersonality,
    baseBalance: number,
    quoteBalance: number,
    avgOrderSize: number
  ): BaseBot {
    const config: BotConfig = {
      id: this.generateBotId(marketId, personality),
      name: `${personality}-${symbol}`,
      marketMakerId: marketId,
      personality,
      riskTolerance: this.getDefaultRiskTolerance(personality),
      tradeFrequency: this.getDefaultFrequency(personality),
      avgOrderSize,
      orderSizeVariance: 0.2,
      preferredSpread: this.getDefaultSpread(personality),
      maxDailyTrades: this.getDefaultMaxDailyTrades(personality),
    };

    return this.createBot(config);
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Generate unique bot ID
   */
  private generateBotId(marketId: string, personality: BotPersonality): string {
    this.botCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.botCounter.toString(36).padStart(4, "0");
    const personalityCode = personality.substring(0, 3).toUpperCase();
    return `${marketId}-${personalityCode}-${timestamp}-${counter}`;
  }

  /**
   * Get default trade frequency for personality
   */
  private getDefaultFrequency(
    personality: BotPersonality
  ): "HIGH" | "MEDIUM" | "LOW" {
    switch (personality) {
      case "SCALPER":
      case "MARKET_MAKER":
        return "HIGH";
      case "SWING":
        return "MEDIUM";
      case "ACCUMULATOR":
      case "DISTRIBUTOR":
        return "LOW";
      default:
        return "MEDIUM";
    }
  }

  /**
   * Get default risk tolerance for personality
   */
  private getDefaultRiskTolerance(personality: BotPersonality): number {
    switch (personality) {
      case "SCALPER":
        return 0.3; // Low risk
      case "SWING":
        return 0.5; // Medium risk
      case "ACCUMULATOR":
        return 0.4;
      case "DISTRIBUTOR":
        return 0.4;
      case "MARKET_MAKER":
        return 0.6; // Higher tolerance for spread making
      default:
        return 0.5;
    }
  }

  /**
   * Get default spread preference for personality
   */
  private getDefaultSpread(personality: BotPersonality): number {
    switch (personality) {
      case "SCALPER":
        return 0.001; // 0.1% tight spread
      case "SWING":
        return 0.005; // 0.5% wider spread
      case "ACCUMULATOR":
        return 0.003;
      case "DISTRIBUTOR":
        return 0.003;
      case "MARKET_MAKER":
        return 0.002; // 0.2% spread
      default:
        return 0.003;
    }
  }

  /**
   * Get default max daily trades for personality
   */
  private getDefaultMaxDailyTrades(personality: BotPersonality): number {
    switch (personality) {
      case "SCALPER":
        return 200; // High frequency
      case "SWING":
        return 20; // Low frequency
      case "ACCUMULATOR":
        return 30;
      case "DISTRIBUTOR":
        return 30;
      case "MARKET_MAKER":
        return 100;
      default:
        return 50;
    }
  }

  /**
   * Calculate balance distribution based on personalities
   */
  private calculateBalanceDistribution(
    personalities: BotPersonality[]
  ): Record<BotPersonality, { basePercent: number; quotePercent: number; sizeMultiplier: number }> {
    // Count each personality type
    const counts: Record<BotPersonality, number> = {
      SCALPER: 0,
      SWING: 0,
      ACCUMULATOR: 0,
      DISTRIBUTOR: 0,
      MARKET_MAKER: 0,
    };

    for (const p of personalities) {
      counts[p]++;
    }

    const total = personalities.length;

    // Base distribution weights (how much each type should get)
    const weights: Record<BotPersonality, { base: number; quote: number; size: number }> = {
      SCALPER: { base: 0.1, quote: 0.1, size: 0.5 }, // Small allocations
      SWING: { base: 0.2, quote: 0.2, size: 1.0 }, // Medium allocations
      ACCUMULATOR: { base: 0.15, quote: 0.25, size: 0.8 }, // More quote for buying
      DISTRIBUTOR: { base: 0.25, quote: 0.15, size: 0.8 }, // More base for selling
      MARKET_MAKER: { base: 0.2, quote: 0.2, size: 0.6 }, // Balanced
    };

    // Calculate total weight
    let totalBaseWeight = 0;
    let totalQuoteWeight = 0;

    for (const p of personalities) {
      totalBaseWeight += weights[p].base;
      totalQuoteWeight += weights[p].quote;
    }

    // Normalize to percentages
    const distribution: Record<
      BotPersonality,
      { basePercent: number; quotePercent: number; sizeMultiplier: number }
    > = {
      SCALPER: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.5 },
      SWING: { basePercent: 0, quotePercent: 0, sizeMultiplier: 1.0 },
      ACCUMULATOR: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.8 },
      DISTRIBUTOR: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.8 },
      MARKET_MAKER: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.6 },
    };

    for (const p of Object.keys(weights) as BotPersonality[]) {
      if (counts[p] > 0) {
        // Divide by count to split among multiple bots of same type
        distribution[p] = {
          basePercent: weights[p].base / totalBaseWeight / counts[p],
          quotePercent: weights[p].quote / totalQuoteWeight / counts[p],
          sizeMultiplier: weights[p].size,
        };
      }
    }

    return distribution;
  }

  /**
   * Get recommended bot count based on trading volume
   */
  public getRecommendedBotCount(dailyVolume: number): number {
    if (dailyVolume < 10000) {
      return 3; // Low volume: fewer bots
    } else if (dailyVolume < 100000) {
      return 5; // Medium volume
    } else if (dailyVolume < 1000000) {
      return 8; // High volume
    } else {
      return 12; // Very high volume
    }
  }

  /**
   * Get recommended personalities for market type
   */
  public getRecommendedPersonalities(
    marketType: "STABLE" | "VOLATILE" | "TRENDING"
  ): BotPersonality[] {
    switch (marketType) {
      case "STABLE":
        // Stable markets: more market makers, fewer swing traders
        return [
          "MARKET_MAKER",
          "MARKET_MAKER",
          "SCALPER",
          "ACCUMULATOR",
          "DISTRIBUTOR",
        ];
      case "VOLATILE":
        // Volatile markets: more scalpers, fewer accumulators
        return [
          "SCALPER",
          "SCALPER",
          "SCALPER",
          "MARKET_MAKER",
          "SWING",
        ];
      case "TRENDING":
        // Trending markets: swing traders and directional bots
        return [
          "SWING",
          "SWING",
          "ACCUMULATOR",
          "DISTRIBUTOR",
          "SCALPER",
        ];
      default:
        return DEFAULT_BOT_DISTRIBUTION;
    }
  }
}

export default BotFactory;
