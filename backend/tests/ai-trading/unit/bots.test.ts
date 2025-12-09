/**
 * AI Market Maker Bot Personalities Unit Tests
 *
 * Tests for Scalper, Swing, MarketMaker, Accumulator, and Distributor bot behaviors
 */

// Types for bot configuration
interface BotConfig {
  personality: "SCALPER" | "SWING" | "ACCUMULATOR" | "DISTRIBUTOR" | "MARKET_MAKER";
  riskTolerance: number;
  tradeFrequency: "HIGH" | "MEDIUM" | "LOW";
  avgOrderSize: number;
  orderSizeVariance: number;
  preferredSpread: number;
}

interface MarketConditions {
  currentPrice: number;
  targetPrice: number;
  volatility: number;
  trend: "UP" | "DOWN" | "SIDEWAYS";
  volume24h: number;
}

interface TradeDecision {
  shouldTrade: boolean;
  side?: "BUY" | "SELL";
  amount?: number;
  price?: number;
  urgency?: "HIGH" | "MEDIUM" | "LOW";
}

// Bot decision-making simulation functions
function simulateScalperDecision(
  config: BotConfig,
  market: MarketConditions
): TradeDecision {
  // Scalpers trade frequently with small profits
  const tradeProbability = 0.7;
  if (Math.random() > tradeProbability) {
    return { shouldTrade: false };
  }

  // Scalpers are indifferent to direction, focus on spread capture
  const side = Math.random() > 0.5 ? "BUY" : "SELL";
  const spreadOffset = config.preferredSpread * market.currentPrice;
  const price =
    side === "BUY"
      ? market.currentPrice - spreadOffset / 2
      : market.currentPrice + spreadOffset / 2;

  return {
    shouldTrade: true,
    side,
    amount: config.avgOrderSize * (1 + (Math.random() - 0.5) * config.orderSizeVariance),
    price,
    urgency: "HIGH",
  };
}

function simulateSwingDecision(
  config: BotConfig,
  market: MarketConditions
): TradeDecision {
  // Swing traders wait for good opportunities
  const tradeProbability = 0.3;
  if (Math.random() > tradeProbability) {
    return { shouldTrade: false };
  }

  // Swing traders follow trends
  let side: "BUY" | "SELL";
  if (market.trend === "UP") {
    side = "BUY";
  } else if (market.trend === "DOWN") {
    side = "SELL";
  } else {
    // Sideways - trade toward target
    side = market.currentPrice < market.targetPrice ? "BUY" : "SELL";
  }

  return {
    shouldTrade: true,
    side,
    amount:
      config.avgOrderSize * 2 * (1 + (Math.random() - 0.5) * config.orderSizeVariance),
    price:
      side === "BUY"
        ? market.currentPrice * 0.998 // Below market
        : market.currentPrice * 1.002, // Above market
    urgency: "LOW",
  };
}

function simulateAccumulatorDecision(
  config: BotConfig,
  market: MarketConditions
): TradeDecision {
  // Accumulators only buy
  const tradeProbability = 0.4;
  if (Math.random() > tradeProbability) {
    return { shouldTrade: false };
  }

  // More aggressive when price is below target
  const discount = (market.targetPrice - market.currentPrice) / market.targetPrice;
  const sizeMultiplier = discount > 0 ? 1 + discount * 2 : 0.5;

  return {
    shouldTrade: true,
    side: "BUY",
    amount:
      config.avgOrderSize *
      sizeMultiplier *
      (1 + (Math.random() - 0.5) * config.orderSizeVariance),
    price: market.currentPrice * 0.999, // Slightly below market
    urgency: discount > 0.05 ? "HIGH" : "MEDIUM",
  };
}

function simulateDistributorDecision(
  config: BotConfig,
  market: MarketConditions
): TradeDecision {
  // Distributors only sell
  const tradeProbability = 0.4;
  if (Math.random() > tradeProbability) {
    return { shouldTrade: false };
  }

  // More aggressive when price is above target
  const premium = (market.currentPrice - market.targetPrice) / market.targetPrice;
  const sizeMultiplier = premium > 0 ? 1 + premium * 2 : 0.5;

  return {
    shouldTrade: true,
    side: "SELL",
    amount:
      config.avgOrderSize *
      sizeMultiplier *
      (1 + (Math.random() - 0.5) * config.orderSizeVariance),
    price: market.currentPrice * 1.001, // Slightly above market
    urgency: premium > 0.05 ? "HIGH" : "MEDIUM",
  };
}

function simulateMarketMakerDecision(
  config: BotConfig,
  market: MarketConditions
): TradeDecision {
  // Market makers provide liquidity on both sides
  const tradeProbability = 0.5;
  if (Math.random() > tradeProbability) {
    return { shouldTrade: false };
  }

  // Balance positions - if we've been buying, sell more and vice versa
  const side = Math.random() > 0.5 ? "BUY" : "SELL";
  const spreadOffset = config.preferredSpread * market.currentPrice;

  return {
    shouldTrade: true,
    side,
    amount: config.avgOrderSize * (1 + (Math.random() - 0.5) * config.orderSizeVariance),
    price:
      side === "BUY"
        ? market.currentPrice - spreadOffset
        : market.currentPrice + spreadOffset,
    urgency: "MEDIUM",
  };
}

describe("Scalper Bot", () => {
  const scalperConfig: BotConfig = {
    personality: "SCALPER",
    riskTolerance: 0.3,
    tradeFrequency: "HIGH",
    avgOrderSize: 0.5,
    orderSizeVariance: 0.2,
    preferredSpread: 0.001,
  };

  const marketConditions: MarketConditions = {
    currentPrice: 100,
    targetPrice: 100,
    volatility: 2,
    trend: "SIDEWAYS",
    volume24h: 100000,
  };

  test("should have high trade frequency", () => {
    let trades = 0;
    for (let i = 0; i < 100; i++) {
      const decision = simulateScalperDecision(scalperConfig, marketConditions);
      if (decision.shouldTrade) trades++;
    }
    // Should trade roughly 70% of the time
    expect(trades).toBeGreaterThan(50);
  });

  test("should make small, frequent trades", () => {
    const decisions: TradeDecision[] = [];
    for (let i = 0; i < 100; i++) {
      const decision = simulateScalperDecision(scalperConfig, marketConditions);
      if (decision.shouldTrade) {
        decisions.push(decision);
      }
    }

    // Check order sizes are relatively small
    const avgSize =
      decisions.reduce((sum, d) => sum + (d.amount || 0), 0) / decisions.length;
    expect(avgSize).toBeLessThan(1); // Smaller than avgOrderSize * 2
  });

  test("should trade both BUY and SELL directions", () => {
    let buys = 0;
    let sells = 0;
    for (let i = 0; i < 100; i++) {
      const decision = simulateScalperDecision(scalperConfig, marketConditions);
      if (decision.shouldTrade) {
        if (decision.side === "BUY") buys++;
        if (decision.side === "SELL") sells++;
      }
    }
    // Should have a mix of both
    expect(buys).toBeGreaterThan(10);
    expect(sells).toBeGreaterThan(10);
  });

  test("should have HIGH urgency", () => {
    const decision = simulateScalperDecision(scalperConfig, marketConditions);
    if (decision.shouldTrade) {
      expect(decision.urgency).toBe("HIGH");
    }
  });
});

describe("Swing Bot", () => {
  const swingConfig: BotConfig = {
    personality: "SWING",
    riskTolerance: 0.6,
    tradeFrequency: "LOW",
    avgOrderSize: 2,
    orderSizeVariance: 0.3,
    preferredSpread: 0.005,
  };

  test("should have low trade frequency", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 100,
      targetPrice: 100,
      volatility: 3,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    let trades = 0;
    for (let i = 0; i < 100; i++) {
      const decision = simulateSwingDecision(swingConfig, marketConditions);
      if (decision.shouldTrade) trades++;
    }
    // Should trade roughly 30% of the time
    expect(trades).toBeLessThan(50);
    expect(trades).toBeGreaterThan(10);
  });

  test("should follow upward trends", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 100,
      targetPrice: 100,
      volatility: 3,
      trend: "UP",
      volume24h: 100000,
    };

    let buys = 0;
    for (let i = 0; i < 100; i++) {
      const decision = simulateSwingDecision(swingConfig, marketConditions);
      if (decision.shouldTrade && decision.side === "BUY") buys++;
    }
    // Should primarily buy in uptrend
    expect(buys).toBeGreaterThan(20);
  });

  test("should follow downward trends", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 100,
      targetPrice: 100,
      volatility: 3,
      trend: "DOWN",
      volume24h: 100000,
    };

    let sells = 0;
    for (let i = 0; i < 100; i++) {
      const decision = simulateSwingDecision(swingConfig, marketConditions);
      if (decision.shouldTrade && decision.side === "SELL") sells++;
    }
    // Should primarily sell in downtrend
    expect(sells).toBeGreaterThan(20);
  });

  test("should make larger trades than scalper", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 100,
      targetPrice: 100,
      volatility: 3,
      trend: "UP",
      volume24h: 100000,
    };

    const decisions: TradeDecision[] = [];
    for (let i = 0; i < 100; i++) {
      const decision = simulateSwingDecision(swingConfig, marketConditions);
      if (decision.shouldTrade) {
        decisions.push(decision);
      }
    }

    const avgSize =
      decisions.reduce((sum, d) => sum + (d.amount || 0), 0) / decisions.length;
    expect(avgSize).toBeGreaterThan(2); // Larger average size
  });

  test("should have LOW urgency", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 100,
      targetPrice: 100,
      volatility: 3,
      trend: "UP",
      volume24h: 100000,
    };

    const decision = simulateSwingDecision(swingConfig, marketConditions);
    if (decision.shouldTrade) {
      expect(decision.urgency).toBe("LOW");
    }
  });
});

describe("Accumulator Bot", () => {
  const accumulatorConfig: BotConfig = {
    personality: "ACCUMULATOR",
    riskTolerance: 0.5,
    tradeFrequency: "MEDIUM",
    avgOrderSize: 1,
    orderSizeVariance: 0.3,
    preferredSpread: 0.002,
  };

  test("should only execute BUY orders", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 100,
      targetPrice: 110,
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    for (let i = 0; i < 100; i++) {
      const decision = simulateAccumulatorDecision(accumulatorConfig, marketConditions);
      if (decision.shouldTrade) {
        expect(decision.side).toBe("BUY");
      }
    }
  });

  test("should accumulate more aggressively when price is below target", () => {
    const belowTarget: MarketConditions = {
      currentPrice: 90,
      targetPrice: 100,
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    const atTarget: MarketConditions = {
      currentPrice: 100,
      targetPrice: 100,
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    const belowSizes: number[] = [];
    const atSizes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const belowDecision = simulateAccumulatorDecision(
        accumulatorConfig,
        belowTarget
      );
      const atDecision = simulateAccumulatorDecision(accumulatorConfig, atTarget);

      if (belowDecision.shouldTrade && belowDecision.amount) {
        belowSizes.push(belowDecision.amount);
      }
      if (atDecision.shouldTrade && atDecision.amount) {
        atSizes.push(atDecision.amount);
      }
    }

    const avgBelowSize = belowSizes.reduce((a, b) => a + b, 0) / belowSizes.length;
    const avgAtSize = atSizes.reduce((a, b) => a + b, 0) / atSizes.length;

    // Should buy more when price is below target
    expect(avgBelowSize).toBeGreaterThan(avgAtSize);
  });

  test("should have HIGH urgency when at significant discount", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 90,
      targetPrice: 100, // 10% discount
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    let highUrgency = 0;
    for (let i = 0; i < 100; i++) {
      const decision = simulateAccumulatorDecision(accumulatorConfig, marketConditions);
      if (decision.shouldTrade && decision.urgency === "HIGH") {
        highUrgency++;
      }
    }
    expect(highUrgency).toBeGreaterThan(20);
  });
});

describe("Distributor Bot", () => {
  const distributorConfig: BotConfig = {
    personality: "DISTRIBUTOR",
    riskTolerance: 0.5,
    tradeFrequency: "MEDIUM",
    avgOrderSize: 1,
    orderSizeVariance: 0.3,
    preferredSpread: 0.002,
  };

  test("should only execute SELL orders", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 100,
      targetPrice: 90,
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    for (let i = 0; i < 100; i++) {
      const decision = simulateDistributorDecision(distributorConfig, marketConditions);
      if (decision.shouldTrade) {
        expect(decision.side).toBe("SELL");
      }
    }
  });

  test("should distribute more aggressively when price is above target", () => {
    const aboveTarget: MarketConditions = {
      currentPrice: 110,
      targetPrice: 100,
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    const atTarget: MarketConditions = {
      currentPrice: 100,
      targetPrice: 100,
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    const aboveSizes: number[] = [];
    const atSizes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const aboveDecision = simulateDistributorDecision(
        distributorConfig,
        aboveTarget
      );
      const atDecision = simulateDistributorDecision(distributorConfig, atTarget);

      if (aboveDecision.shouldTrade && aboveDecision.amount) {
        aboveSizes.push(aboveDecision.amount);
      }
      if (atDecision.shouldTrade && atDecision.amount) {
        atSizes.push(atDecision.amount);
      }
    }

    const avgAboveSize = aboveSizes.reduce((a, b) => a + b, 0) / aboveSizes.length;
    const avgAtSize = atSizes.reduce((a, b) => a + b, 0) / atSizes.length;

    // Should sell more when price is above target
    expect(avgAboveSize).toBeGreaterThan(avgAtSize);
  });

  test("should have HIGH urgency when at significant premium", () => {
    const marketConditions: MarketConditions = {
      currentPrice: 110,
      targetPrice: 100, // 10% premium
      volatility: 2,
      trend: "SIDEWAYS",
      volume24h: 100000,
    };

    let highUrgency = 0;
    for (let i = 0; i < 100; i++) {
      const decision = simulateDistributorDecision(distributorConfig, marketConditions);
      if (decision.shouldTrade && decision.urgency === "HIGH") {
        highUrgency++;
      }
    }
    expect(highUrgency).toBeGreaterThan(20);
  });
});

describe("Market Maker Bot", () => {
  const marketMakerConfig: BotConfig = {
    personality: "MARKET_MAKER",
    riskTolerance: 0.4,
    tradeFrequency: "MEDIUM",
    avgOrderSize: 1,
    orderSizeVariance: 0.2,
    preferredSpread: 0.002,
  };

  const marketConditions: MarketConditions = {
    currentPrice: 100,
    targetPrice: 100,
    volatility: 2,
    trend: "SIDEWAYS",
    volume24h: 100000,
  };

  test("should provide liquidity on both sides", () => {
    let buys = 0;
    let sells = 0;

    for (let i = 0; i < 100; i++) {
      const decision = simulateMarketMakerDecision(marketMakerConfig, marketConditions);
      if (decision.shouldTrade) {
        if (decision.side === "BUY") buys++;
        if (decision.side === "SELL") sells++;
      }
    }

    // Should have roughly balanced buys and sells
    expect(buys).toBeGreaterThan(10);
    expect(sells).toBeGreaterThan(10);
    expect(Math.abs(buys - sells)).toBeLessThan(30);
  });

  test("should quote with spread", () => {
    for (let i = 0; i < 20; i++) {
      const decision = simulateMarketMakerDecision(marketMakerConfig, marketConditions);
      if (decision.shouldTrade && decision.price) {
        if (decision.side === "BUY") {
          // Buy price should be below market
          expect(decision.price).toBeLessThan(marketConditions.currentPrice);
        } else {
          // Sell price should be above market
          expect(decision.price).toBeGreaterThan(marketConditions.currentPrice);
        }
      }
    }
  });

  test("should have consistent order sizes", () => {
    const sizes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const decision = simulateMarketMakerDecision(marketMakerConfig, marketConditions);
      if (decision.shouldTrade && decision.amount) {
        sizes.push(decision.amount);
      }
    }

    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance =
      sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
    const stdDev = Math.sqrt(variance);

    // Standard deviation should be relatively small
    expect(stdDev / avgSize).toBeLessThan(0.5);
  });

  test("should have MEDIUM urgency", () => {
    const decision = simulateMarketMakerDecision(marketMakerConfig, marketConditions);
    if (decision.shouldTrade) {
      expect(decision.urgency).toBe("MEDIUM");
    }
  });
});

describe("Bot Human-like Behavior", () => {
  // Helper to add human-like variance
  function addHumanVariance(value: number, variance: number): number {
    return value * (1 + (Math.random() - 0.5) * 2 * variance);
  }

  // Helper to calculate variable delay
  function calculateHumanDelay(baseDelay: number): number {
    // Add randomness to timing
    const randomFactor = 0.5 + Math.random(); // 0.5x to 1.5x
    return Math.floor(baseDelay * randomFactor);
  }

  test("should vary order sizes within configured variance", () => {
    const baseSize = 1.0;
    const variance = 0.2;
    const sizes: number[] = [];

    for (let i = 0; i < 100; i++) {
      sizes.push(addHumanVariance(baseSize, variance));
    }

    const min = Math.min(...sizes);
    const max = Math.max(...sizes);

    // Should stay within variance bounds (roughly)
    expect(min).toBeGreaterThan(baseSize * 0.6);
    expect(max).toBeLessThan(baseSize * 1.4);
  });

  test("should vary trade timing", () => {
    const baseDelay = 1000;
    const delays: number[] = [];

    for (let i = 0; i < 100; i++) {
      delays.push(calculateHumanDelay(baseDelay));
    }

    const uniqueDelays = new Set(delays);
    // Should have many unique delay values
    expect(uniqueDelays.size).toBeGreaterThan(50);
  });

  test("should not trade at exactly regular intervals", () => {
    const tradeTimes: number[] = [];
    let currentTime = 0;

    for (let i = 0; i < 100; i++) {
      currentTime += calculateHumanDelay(1000);
      tradeTimes.push(currentTime);
    }

    // Calculate intervals
    const intervals = tradeTimes
      .slice(1)
      .map((t, i) => t - tradeTimes[i]);

    // All intervals should be different
    const uniqueIntervals = new Set(intervals);
    expect(uniqueIntervals.size).toBeGreaterThan(50);
  });

  test("should simulate fatigue patterns (fewer trades at certain times)", () => {
    // Simplified fatigue simulation
    function shouldTradeWithFatigue(
      baseProbability: number,
      tradeCount: number
    ): boolean {
      // Reduce probability as trade count increases (fatigue)
      const fatigueFactor = Math.max(0.5, 1 - tradeCount * 0.005);
      return Math.random() < baseProbability * fatigueFactor;
    }

    let earlyTrades = 0;
    let lateTrades = 0;

    // Simulate early trading (low trade count)
    for (let i = 0; i < 100; i++) {
      if (shouldTradeWithFatigue(0.5, 10)) earlyTrades++;
    }

    // Simulate late trading (high trade count)
    for (let i = 0; i < 100; i++) {
      if (shouldTradeWithFatigue(0.5, 100)) lateTrades++;
    }

    // Should trade less when fatigued
    expect(lateTrades).toBeLessThan(earlyTrades);
  });
});

describe("Bot Risk Management", () => {
  test("should respect daily trade limits", () => {
    const maxDailyTrades = 50;
    let dailyTradeCount = 0;
    let blockedTrades = 0;

    for (let i = 0; i < 100; i++) {
      if (dailyTradeCount < maxDailyTrades) {
        dailyTradeCount++;
      } else {
        blockedTrades++;
      }
    }

    expect(dailyTradeCount).toBe(50);
    expect(blockedTrades).toBe(50);
  });

  test("should pause when volatility is high", () => {
    function shouldTradeGivenVolatility(
      volatility: number,
      threshold: number
    ): boolean {
      return volatility < threshold;
    }

    // Normal volatility
    expect(shouldTradeGivenVolatility(2, 5)).toBe(true);

    // High volatility
    expect(shouldTradeGivenVolatility(8, 5)).toBe(false);
  });

  test("should reduce position size during high risk", () => {
    function adjustOrderSize(
      baseSize: number,
      riskLevel: "LOW" | "MEDIUM" | "HIGH"
    ): number {
      switch (riskLevel) {
        case "LOW":
          return baseSize;
        case "MEDIUM":
          return baseSize * 0.7;
        case "HIGH":
          return baseSize * 0.4;
      }
    }

    expect(adjustOrderSize(1, "LOW")).toBe(1);
    expect(adjustOrderSize(1, "MEDIUM")).toBe(0.7);
    expect(adjustOrderSize(1, "HIGH")).toBe(0.4);
  });
});
