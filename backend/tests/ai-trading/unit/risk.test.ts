/**
 * AI Market Maker Risk Management Unit Tests
 *
 * Tests for volatility detection, loss protection, and circuit breakers
 */

// Types for risk management
interface PoolState {
  id: string;
  marketMakerId: string;
  baseBalance: number;
  quoteBalance: number;
  initialBaseBalance: number;
  initialQuoteBalance: number;
  totalValueLocked: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

interface RiskConfig {
  volatilityThreshold: number;
  maxDailyLossPercent: number;
  circuitBreakerThreshold: number;
  minLiquidity: number;
}

interface PriceHistory {
  price: number;
  timestamp: number;
}

// Risk calculation functions
function calculateVolatility(priceHistory: PriceHistory[]): number {
  if (priceHistory.length < 2) return 0;

  // Calculate returns
  const returns: number[] = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const ret =
      (priceHistory[i].price - priceHistory[i - 1].price) / priceHistory[i - 1].price;
    returns.push(ret);
  }

  // Calculate standard deviation of returns
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize (assuming hourly data, ~8760 hours per year)
  const annualizedVol = stdDev * Math.sqrt(8760) * 100;
  return annualizedVol;
}

function calculateDailyLossPercent(
  pool: PoolState,
  currentPrice: number
): number {
  const initialValue =
    pool.initialBaseBalance * currentPrice + pool.initialQuoteBalance;
  const currentValue = pool.baseBalance * currentPrice + pool.quoteBalance;
  const lossPercent = ((initialValue - currentValue) / initialValue) * 100;
  return Math.max(0, lossPercent); // Only return positive loss values
}

function shouldTriggerCircuitBreaker(
  priceChange: number,
  threshold: number
): boolean {
  return Math.abs(priceChange) >= threshold;
}

function calculateTvl(
  baseBalance: number,
  quoteBalance: number,
  price: number
): number {
  return baseBalance * price + quoteBalance;
}

function checkPoolHealth(pool: PoolState, price: number): {
  isHealthy: boolean;
  warnings: string[];
  balanceRatio: number;
} {
  const warnings: string[] = [];
  const tvl = calculateTvl(pool.baseBalance, pool.quoteBalance, price);
  const baseValue = pool.baseBalance * price;
  const balanceRatio = tvl > 0 ? baseValue / tvl : 0;

  if (tvl < 100) {
    warnings.push("TVL below minimum threshold");
  }

  if (balanceRatio < 0.1 || balanceRatio > 0.9) {
    warnings.push("Pool severely imbalanced");
  } else if (balanceRatio < 0.2 || balanceRatio > 0.8) {
    warnings.push("Pool imbalanced");
  }

  if (pool.realizedPnL < -tvl * 0.1) {
    warnings.push("Significant realized losses");
  }

  return {
    isHealthy: warnings.length === 0,
    warnings,
    balanceRatio,
  };
}

describe("Volatility Detection", () => {
  describe("Volatility Calculation", () => {
    test("should return 0 for insufficient data", () => {
      expect(calculateVolatility([])).toBe(0);
      expect(calculateVolatility([{ price: 100, timestamp: 0 }])).toBe(0);
    });

    test("should return 0 for constant prices", () => {
      const history: PriceHistory[] = [
        { price: 100, timestamp: 0 },
        { price: 100, timestamp: 1 },
        { price: 100, timestamp: 2 },
        { price: 100, timestamp: 3 },
        { price: 100, timestamp: 4 },
      ];

      expect(calculateVolatility(history)).toBe(0);
    });

    test("should calculate higher volatility for larger price swings", () => {
      const lowVolHistory: PriceHistory[] = [
        { price: 100, timestamp: 0 },
        { price: 100.5, timestamp: 1 },
        { price: 100.2, timestamp: 2 },
        { price: 100.7, timestamp: 3 },
        { price: 100.4, timestamp: 4 },
      ];

      const highVolHistory: PriceHistory[] = [
        { price: 100, timestamp: 0 },
        { price: 105, timestamp: 1 },
        { price: 95, timestamp: 2 },
        { price: 110, timestamp: 3 },
        { price: 90, timestamp: 4 },
      ];

      const lowVol = calculateVolatility(lowVolHistory);
      const highVol = calculateVolatility(highVolHistory);

      expect(highVol).toBeGreaterThan(lowVol);
    });

    test("should handle realistic price movements", () => {
      // Simulate typical crypto volatility (1-2% hourly moves)
      const history: PriceHistory[] = [];
      let price = 100;

      for (let i = 0; i < 24; i++) {
        history.push({ price, timestamp: i });
        price *= 1 + (Math.random() - 0.5) * 0.04; // +/- 2% change
      }

      const volatility = calculateVolatility(history);
      // Annualized volatility should be in reasonable range for crypto
      expect(volatility).toBeGreaterThan(10);
      expect(volatility).toBeLessThan(500);
    });
  });

  describe("Volatility Threshold Checks", () => {
    test("should detect when volatility exceeds threshold", () => {
      const config: RiskConfig = {
        volatilityThreshold: 5,
        maxDailyLossPercent: 2,
        circuitBreakerThreshold: 10,
        minLiquidity: 100,
      };

      const lowVolHistory: PriceHistory[] = [
        { price: 100, timestamp: 0 },
        { price: 100.1, timestamp: 1 },
        { price: 100.2, timestamp: 2 },
      ];

      const highVolHistory: PriceHistory[] = [
        { price: 100, timestamp: 0 },
        { price: 110, timestamp: 1 },
        { price: 90, timestamp: 2 },
      ];

      const lowVol = calculateVolatility(lowVolHistory);
      const highVol = calculateVolatility(highVolHistory);

      expect(lowVol < config.volatilityThreshold).toBe(true);
      expect(highVol > config.volatilityThreshold).toBe(true);
    });
  });
});

describe("Loss Protection", () => {
  describe("Daily Loss Calculation", () => {
    test("should calculate zero loss when profitable", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 100,
        quoteBalance: 5000,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 10000,
        realizedPnL: 100,
        unrealizedPnL: 50,
      };

      const lossPercent = calculateDailyLossPercent(pool, 50);
      expect(lossPercent).toBe(0);
    });

    test("should calculate loss percent correctly", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 90, // Lost 10 base
        quoteBalance: 4500, // Lost 500 quote
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 9000,
        realizedPnL: -600,
        unrealizedPnL: 0,
      };

      const price = 50;
      // Initial value: 100 * 50 + 5000 = 10000
      // Current value: 90 * 50 + 4500 = 9000
      // Loss: 10% of initial value

      const lossPercent = calculateDailyLossPercent(pool, price);
      expect(lossPercent).toBeCloseTo(10, 1);
    });

    test("should handle edge case of zero initial value", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 0,
        quoteBalance: 0,
        initialBaseBalance: 0,
        initialQuoteBalance: 0,
        totalValueLocked: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };

      // Should not throw, return 0
      const lossPercent = calculateDailyLossPercent(pool, 100);
      expect(isNaN(lossPercent)).toBe(false);
    });
  });

  describe("Loss Limit Triggers", () => {
    test("should trigger pause when daily loss exceeds limit", () => {
      const config: RiskConfig = {
        volatilityThreshold: 5,
        maxDailyLossPercent: 2,
        circuitBreakerThreshold: 10,
        minLiquidity: 100,
      };

      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 95,
        quoteBalance: 4750,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 9500,
        realizedPnL: -300,
        unrealizedPnL: 0,
      };

      const lossPercent = calculateDailyLossPercent(pool, 50);
      const shouldPause = lossPercent > config.maxDailyLossPercent;

      expect(shouldPause).toBe(true);
    });

    test("should not trigger pause when loss is within limit", () => {
      const config: RiskConfig = {
        volatilityThreshold: 5,
        maxDailyLossPercent: 5,
        circuitBreakerThreshold: 10,
        minLiquidity: 100,
      };

      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 99,
        quoteBalance: 4950,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 9900,
        realizedPnL: -50,
        unrealizedPnL: 0,
      };

      const lossPercent = calculateDailyLossPercent(pool, 50);
      const shouldPause = lossPercent > config.maxDailyLossPercent;

      expect(shouldPause).toBe(false);
    });
  });
});

describe("Circuit Breaker", () => {
  describe("Price Change Detection", () => {
    test("should trigger on large upward moves", () => {
      const priceChange = 15; // 15% increase
      const threshold = 10;

      expect(shouldTriggerCircuitBreaker(priceChange, threshold)).toBe(true);
    });

    test("should trigger on large downward moves", () => {
      const priceChange = -12; // 12% decrease
      const threshold = 10;

      expect(shouldTriggerCircuitBreaker(priceChange, threshold)).toBe(true);
    });

    test("should not trigger on normal price moves", () => {
      const priceChange = 5; // 5% change
      const threshold = 10;

      expect(shouldTriggerCircuitBreaker(priceChange, threshold)).toBe(false);
    });

    test("should trigger at exact threshold", () => {
      const priceChange = 10;
      const threshold = 10;

      expect(shouldTriggerCircuitBreaker(priceChange, threshold)).toBe(true);
    });
  });

  describe("Circuit Breaker Cooldown", () => {
    function simulateCircuitBreaker(
      currentTime: number,
      lastTriggerTime: number,
      cooldownPeriod: number
    ): { canTrade: boolean; remainingCooldown: number } {
      const elapsed = currentTime - lastTriggerTime;
      const remaining = Math.max(0, cooldownPeriod - elapsed);

      return {
        canTrade: elapsed >= cooldownPeriod,
        remainingCooldown: remaining,
      };
    }

    test("should enforce cooldown period", () => {
      const cooldownPeriod = 300000; // 5 minutes
      const lastTrigger = 0;

      // During cooldown
      let result = simulateCircuitBreaker(150000, lastTrigger, cooldownPeriod);
      expect(result.canTrade).toBe(false);
      expect(result.remainingCooldown).toBe(150000);

      // After cooldown
      result = simulateCircuitBreaker(350000, lastTrigger, cooldownPeriod);
      expect(result.canTrade).toBe(true);
      expect(result.remainingCooldown).toBe(0);
    });

    test("should allow trading immediately if no trigger", () => {
      const cooldownPeriod = 300000;
      const lastTrigger = -1000000; // Long ago

      const result = simulateCircuitBreaker(0, lastTrigger, cooldownPeriod);
      expect(result.canTrade).toBe(true);
    });
  });
});

describe("Pool Health Monitoring", () => {
  describe("TVL Calculations", () => {
    test("should calculate TVL correctly", () => {
      const tvl = calculateTvl(100, 5000, 50);
      expect(tvl).toBe(10000); // 100 * 50 + 5000
    });

    test("should handle zero balances", () => {
      const tvl = calculateTvl(0, 0, 100);
      expect(tvl).toBe(0);
    });

    test("should handle zero price", () => {
      const tvl = calculateTvl(100, 5000, 0);
      expect(tvl).toBe(5000); // Only quote balance counts
    });
  });

  describe("Balance Ratio Health", () => {
    test("should detect severely imbalanced pool (too much base)", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 1000, // $50,000 worth
        quoteBalance: 100, // $100
        initialBaseBalance: 1000,
        initialQuoteBalance: 100,
        totalValueLocked: 50100,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };

      const health = checkPoolHealth(pool, 50);
      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain("Pool severely imbalanced");
      expect(health.balanceRatio).toBeGreaterThan(0.9);
    });

    test("should detect severely imbalanced pool (too much quote)", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 2, // $100 worth
        quoteBalance: 9900, // $9,900
        initialBaseBalance: 2,
        initialQuoteBalance: 9900,
        totalValueLocked: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };

      const health = checkPoolHealth(pool, 50);
      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain("Pool severely imbalanced");
      expect(health.balanceRatio).toBeLessThan(0.1);
    });

    test("should detect moderately imbalanced pool", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 160, // $8,000 worth
        quoteBalance: 2000, // $2,000
        initialBaseBalance: 160,
        initialQuoteBalance: 2000,
        totalValueLocked: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };

      const health = checkPoolHealth(pool, 50);
      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain("Pool imbalanced");
      expect(health.balanceRatio).toBeGreaterThan(0.7);
    });

    test("should pass health check for balanced pool", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 100, // $5,000 worth
        quoteBalance: 5000, // $5,000
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };

      const health = checkPoolHealth(pool, 50);
      expect(health.isHealthy).toBe(true);
      expect(health.warnings).toHaveLength(0);
      expect(health.balanceRatio).toBeCloseTo(0.5, 1);
    });
  });

  describe("Minimum Liquidity Checks", () => {
    test("should detect insufficient liquidity", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 1,
        quoteBalance: 10,
        initialBaseBalance: 1,
        initialQuoteBalance: 10,
        totalValueLocked: 60,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };

      const health = checkPoolHealth(pool, 50);
      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain("TVL below minimum threshold");
    });

    test("should pass with sufficient liquidity", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 100,
        quoteBalance: 5000,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };

      const health = checkPoolHealth(pool, 50);
      expect(health.warnings).not.toContain("TVL below minimum threshold");
    });
  });

  describe("PnL Health Checks", () => {
    test("should detect significant realized losses", () => {
      const pool: PoolState = {
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 80,
        quoteBalance: 4000,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 8000,
        realizedPnL: -1500, // -15% of TVL
        unrealizedPnL: 0,
      };

      const health = checkPoolHealth(pool, 50);
      expect(health.isHealthy).toBe(false);
      expect(health.warnings).toContain("Significant realized losses");
    });
  });
});

describe("Risk-based Trading Adjustments", () => {
  function calculateRiskAdjustedSize(
    baseSize: number,
    volatility: number,
    volatilityThreshold: number,
    currentLoss: number,
    maxLoss: number
  ): number {
    // Reduce size as volatility increases
    const volRatio = Math.min(volatility / volatilityThreshold, 2);
    const volAdjustment = Math.max(0.3, 1 - volRatio * 0.3);

    // Reduce size as losses approach limit
    const lossRatio = Math.min(currentLoss / maxLoss, 1);
    const lossAdjustment = Math.max(0.2, 1 - lossRatio * 0.5);

    return baseSize * volAdjustment * lossAdjustment;
  }

  test("should reduce order size during high volatility", () => {
    const baseSize = 1;
    const volatilityThreshold = 5;

    const normalVolSize = calculateRiskAdjustedSize(baseSize, 3, volatilityThreshold, 0, 5);
    const highVolSize = calculateRiskAdjustedSize(baseSize, 10, volatilityThreshold, 0, 5);

    expect(highVolSize).toBeLessThan(normalVolSize);
  });

  test("should reduce order size as losses increase", () => {
    const baseSize = 1;

    const noLossSize = calculateRiskAdjustedSize(baseSize, 3, 5, 0, 5);
    const someLossSize = calculateRiskAdjustedSize(baseSize, 3, 5, 2, 5);
    const nearLimitSize = calculateRiskAdjustedSize(baseSize, 3, 5, 4, 5);

    expect(someLossSize).toBeLessThan(noLossSize);
    expect(nearLimitSize).toBeLessThan(someLossSize);
  });

  test("should maintain minimum order size", () => {
    const baseSize = 1;

    // Extreme conditions
    const minSize = calculateRiskAdjustedSize(baseSize, 100, 5, 4.9, 5);

    // Should not go below minimum
    expect(minSize).toBeGreaterThan(0);
    expect(minSize).toBeLessThan(baseSize);
  });
});

describe("Emergency Stop", () => {
  interface EmergencyCondition {
    type: "VOLATILITY" | "LOSS" | "LIQUIDITY" | "EXTERNAL";
    severity: "WARNING" | "CRITICAL";
    value?: number;
    threshold?: number;
  }

  function evaluateEmergencyStop(
    conditions: EmergencyCondition[]
  ): { shouldStop: boolean; reason: string | null } {
    const criticalConditions = conditions.filter((c) => c.severity === "CRITICAL");

    if (criticalConditions.length > 0) {
      return {
        shouldStop: true,
        reason: criticalConditions.map((c) => c.type).join(", "),
      };
    }

    // Multiple warnings also trigger stop
    const warnings = conditions.filter((c) => c.severity === "WARNING");
    if (warnings.length >= 3) {
      return {
        shouldStop: true,
        reason: "Multiple warning conditions",
      };
    }

    return { shouldStop: false, reason: null };
  }

  test("should trigger emergency stop on critical condition", () => {
    const conditions: EmergencyCondition[] = [
      { type: "VOLATILITY", severity: "CRITICAL", value: 50, threshold: 10 },
    ];

    const result = evaluateEmergencyStop(conditions);
    expect(result.shouldStop).toBe(true);
    expect(result.reason).toContain("VOLATILITY");
  });

  test("should trigger emergency stop on multiple warnings", () => {
    const conditions: EmergencyCondition[] = [
      { type: "VOLATILITY", severity: "WARNING" },
      { type: "LOSS", severity: "WARNING" },
      { type: "LIQUIDITY", severity: "WARNING" },
    ];

    const result = evaluateEmergencyStop(conditions);
    expect(result.shouldStop).toBe(true);
    expect(result.reason).toBe("Multiple warning conditions");
  });

  test("should not trigger on isolated warnings", () => {
    const conditions: EmergencyCondition[] = [
      { type: "VOLATILITY", severity: "WARNING" },
    ];

    const result = evaluateEmergencyStop(conditions);
    expect(result.shouldStop).toBe(false);
    expect(result.reason).toBeNull();
  });

  test("should not trigger when no conditions", () => {
    const conditions: EmergencyCondition[] = [];

    const result = evaluateEmergencyStop(conditions);
    expect(result.shouldStop).toBe(false);
  });
});
