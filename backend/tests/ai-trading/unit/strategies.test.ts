/**
 * AI Market Maker Strategies Unit Tests
 *
 * Tests for GradualDrift, Oscillation, and SupportResistance price movement strategies
 */

describe("Price Movement Strategies", () => {
  /**
   * GradualDrift Strategy
   *
   * Slowly moves price toward target over time with small random variations
   */
  describe("GradualDrift Strategy", () => {
    // Helper function to simulate gradual drift
    function calculateGradualDrift(
      currentPrice: number,
      targetPrice: number,
      driftRate: number = 0.001,
      volatility: number = 0.0005
    ): number {
      const direction = targetPrice > currentPrice ? 1 : -1;
      const baseMovement = Math.abs(targetPrice - currentPrice) * driftRate * direction;
      const randomVariation = (Math.random() - 0.5) * 2 * currentPrice * volatility;
      return currentPrice + baseMovement + randomVariation;
    }

    test("should move price toward target over iterations", () => {
      let currentPrice = 100;
      const targetPrice = 110;

      // Run 100 iterations
      for (let i = 0; i < 100; i++) {
        currentPrice = calculateGradualDrift(currentPrice, targetPrice, 0.01, 0);
      }

      // Price should have moved significantly toward target
      expect(currentPrice).toBeGreaterThan(100);
      expect(currentPrice).toBeLessThan(110);
    });

    test("should converge to target price eventually", () => {
      let currentPrice = 100;
      const targetPrice = 105;

      // Run many iterations
      for (let i = 0; i < 1000; i++) {
        currentPrice = calculateGradualDrift(currentPrice, targetPrice, 0.01, 0);
      }

      // Should be very close to target
      expect(Math.abs(currentPrice - targetPrice)).toBeLessThan(0.5);
    });

    test("should handle downward drift", () => {
      let currentPrice = 100;
      const targetPrice = 90;

      for (let i = 0; i < 100; i++) {
        currentPrice = calculateGradualDrift(currentPrice, targetPrice, 0.01, 0);
      }

      expect(currentPrice).toBeLessThan(100);
      expect(currentPrice).toBeGreaterThan(90);
    });

    test("should add volatility variation", () => {
      const prices: number[] = [];
      let currentPrice = 100;
      const targetPrice = 100; // Same as current to isolate volatility effect

      for (let i = 0; i < 100; i++) {
        currentPrice = calculateGradualDrift(currentPrice, targetPrice, 0, 0.01);
        prices.push(currentPrice);
      }

      // Calculate standard deviation to verify volatility
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance =
        prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);

      // Should have some variation
      expect(stdDev).toBeGreaterThan(0);
    });

    test("should respect drift rate parameter", () => {
      let slowDrift = 100;
      let fastDrift = 100;
      const targetPrice = 110;

      for (let i = 0; i < 50; i++) {
        slowDrift = calculateGradualDrift(slowDrift, targetPrice, 0.001, 0);
        fastDrift = calculateGradualDrift(fastDrift, targetPrice, 0.01, 0);
      }

      // Fast drift should be closer to target
      expect(Math.abs(fastDrift - targetPrice)).toBeLessThan(
        Math.abs(slowDrift - targetPrice)
      );
    });
  });

  /**
   * Oscillation Strategy
   *
   * Creates wave-like price movements around a center price
   */
  describe("Oscillation Strategy", () => {
    // Helper function to calculate oscillating price
    function calculateOscillation(
      centerPrice: number,
      amplitude: number,
      frequency: number,
      time: number,
      noise: number = 0
    ): number {
      const oscillation = amplitude * Math.sin(frequency * time);
      const randomNoise = (Math.random() - 0.5) * 2 * noise;
      return centerPrice + oscillation + randomNoise;
    }

    test("should oscillate around center price", () => {
      const centerPrice = 100;
      const amplitude = 5;
      const frequency = 0.1;

      const prices: number[] = [];
      for (let t = 0; t < 100; t++) {
        prices.push(calculateOscillation(centerPrice, amplitude, frequency, t, 0));
      }

      // Average should be close to center
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      expect(Math.abs(avgPrice - centerPrice)).toBeLessThan(1);
    });

    test("should respect amplitude bounds", () => {
      const centerPrice = 100;
      const amplitude = 5;
      const frequency = 0.1;

      for (let t = 0; t < 100; t++) {
        const price = calculateOscillation(centerPrice, amplitude, frequency, t, 0);
        expect(price).toBeGreaterThanOrEqual(centerPrice - amplitude);
        expect(price).toBeLessThanOrEqual(centerPrice + amplitude);
      }
    });

    test("should complete full cycles", () => {
      const centerPrice = 100;
      const amplitude = 5;
      const frequency = Math.PI / 10; // Complete cycle every 20 time units

      // Track peaks and troughs
      let peaks = 0;
      let troughs = 0;
      let lastPrice = centerPrice;
      let direction = 0; // 1 for up, -1 for down

      for (let t = 0; t < 100; t++) {
        const price = calculateOscillation(centerPrice, amplitude, frequency, t, 0);
        const newDirection = price > lastPrice ? 1 : price < lastPrice ? -1 : direction;

        if (direction === 1 && newDirection === -1) peaks++;
        if (direction === -1 && newDirection === 1) troughs++;

        direction = newDirection;
        lastPrice = price;
      }

      // Should have multiple peaks and troughs
      expect(peaks).toBeGreaterThan(2);
      expect(troughs).toBeGreaterThan(2);
    });

    test("should add random noise when specified", () => {
      const centerPrice = 100;
      const amplitude = 0; // No oscillation to isolate noise
      const prices: number[] = [];

      for (let t = 0; t < 100; t++) {
        prices.push(calculateOscillation(centerPrice, amplitude, 0, t, 2));
      }

      // Prices should vary due to noise
      const uniquePrices = new Set(prices.map((p) => Math.round(p * 100)));
      expect(uniquePrices.size).toBeGreaterThan(1);
    });

    test("higher frequency should oscillate faster", () => {
      const centerPrice = 100;
      const amplitude = 5;
      const lowFreq = 0.05;
      const highFreq = 0.2;

      let lowFreqCrossings = 0;
      let highFreqCrossings = 0;
      let lastLowAbove = false;
      let lastHighAbove = false;

      for (let t = 0; t < 100; t++) {
        const lowPrice = calculateOscillation(
          centerPrice,
          amplitude,
          lowFreq,
          t,
          0
        );
        const highPrice = calculateOscillation(
          centerPrice,
          amplitude,
          highFreq,
          t,
          0
        );

        const lowAbove = lowPrice > centerPrice;
        const highAbove = highPrice > centerPrice;

        if (lastLowAbove !== lowAbove) lowFreqCrossings++;
        if (lastHighAbove !== highAbove) highFreqCrossings++;

        lastLowAbove = lowAbove;
        lastHighAbove = highAbove;
      }

      // High frequency should cross center more often
      expect(highFreqCrossings).toBeGreaterThan(lowFreqCrossings);
    });
  });

  /**
   * SupportResistance Strategy
   *
   * Bounces price between support and resistance levels
   */
  describe("SupportResistance Strategy", () => {
    // Helper function to simulate support/resistance behavior
    function calculateSupportResistance(
      currentPrice: number,
      supportLevel: number,
      resistanceLevel: number,
      momentum: number = 0,
      bounceStrength: number = 0.3
    ): { price: number; newMomentum: number } {
      let newMomentum = momentum;

      // Apply random walk with momentum
      const randomWalk = (Math.random() - 0.5) * 2 * 0.5;
      let newPrice = currentPrice + newMomentum + randomWalk;

      // Check for resistance (price ceiling)
      if (newPrice >= resistanceLevel) {
        newPrice = resistanceLevel - Math.random() * bounceStrength;
        newMomentum = -Math.abs(newMomentum) * bounceStrength; // Bounce down
      }

      // Check for support (price floor)
      if (newPrice <= supportLevel) {
        newPrice = supportLevel + Math.random() * bounceStrength;
        newMomentum = Math.abs(newMomentum) * bounceStrength; // Bounce up
      }

      return { price: newPrice, newMomentum };
    }

    test("should stay within support and resistance bounds", () => {
      const supportLevel = 90;
      const resistanceLevel = 110;
      let currentPrice = 100;
      let momentum = 0;

      for (let i = 0; i < 500; i++) {
        const result = calculateSupportResistance(
          currentPrice,
          supportLevel,
          resistanceLevel,
          momentum
        );
        currentPrice = result.price;
        momentum = result.newMomentum;

        expect(currentPrice).toBeGreaterThanOrEqual(supportLevel);
        expect(currentPrice).toBeLessThanOrEqual(resistanceLevel);
      }
    });

    test("should bounce off support level", () => {
      const supportLevel = 90;
      const resistanceLevel = 110;
      let currentPrice = 91; // Near support
      let momentum = -1; // Moving down

      const result = calculateSupportResistance(
        currentPrice,
        supportLevel,
        resistanceLevel,
        momentum
      );

      // Price should stay at or above support
      expect(result.price).toBeGreaterThanOrEqual(supportLevel);
    });

    test("should bounce off resistance level", () => {
      const supportLevel = 90;
      const resistanceLevel = 110;
      let currentPrice = 109; // Near resistance
      let momentum = 1; // Moving up

      const result = calculateSupportResistance(
        currentPrice,
        supportLevel,
        resistanceLevel,
        momentum
      );

      // Price should stay at or below resistance
      expect(result.price).toBeLessThanOrEqual(resistanceLevel);
    });

    test("should reverse momentum on bounce", () => {
      const supportLevel = 90;
      const resistanceLevel = 110;

      // Test resistance bounce
      let result = calculateSupportResistance(109, supportLevel, resistanceLevel, 2);
      expect(result.newMomentum).toBeLessThanOrEqual(0); // Should be negative or zero

      // Test support bounce
      result = calculateSupportResistance(91, supportLevel, resistanceLevel, -2);
      expect(result.newMomentum).toBeGreaterThanOrEqual(0); // Should be positive or zero
    });

    test("should handle narrow price ranges", () => {
      const supportLevel = 99;
      const resistanceLevel = 101;
      let currentPrice = 100;
      let momentum = 0;

      for (let i = 0; i < 100; i++) {
        const result = calculateSupportResistance(
          currentPrice,
          supportLevel,
          resistanceLevel,
          momentum,
          0.1
        );
        currentPrice = result.price;
        momentum = result.newMomentum;

        expect(currentPrice).toBeGreaterThanOrEqual(supportLevel);
        expect(currentPrice).toBeLessThanOrEqual(resistanceLevel);
      }
    });
  });

  /**
   * Combined Strategy Tests
   */
  describe("Combined Strategies", () => {
    test("should allow strategy switching", () => {
      let currentPrice = 100;
      let strategy: "drift" | "oscillation" | "support_resistance" = "drift";
      const targetPrice = 105;

      // Start with drift
      for (let i = 0; i < 20; i++) {
        if (strategy === "drift") {
          const direction = targetPrice > currentPrice ? 1 : -1;
          currentPrice += direction * 0.1;
        }
      }
      expect(currentPrice).toBeGreaterThan(100);

      // Switch to oscillation
      strategy = "oscillation";
      const centerPrice = currentPrice;
      for (let i = 0; i < 20; i++) {
        currentPrice = centerPrice + 2 * Math.sin(i * 0.3);
      }

      // Price should have oscillated
      expect(Math.abs(currentPrice - centerPrice)).toBeLessThanOrEqual(2);
    });

    test("should generate realistic price sequences", () => {
      const prices: number[] = [100];
      let price = 100;

      for (let i = 1; i < 1000; i++) {
        // Random walk with mean reversion
        const meanReversionForce = (100 - price) * 0.01;
        const randomWalk = (Math.random() - 0.5) * 0.5;
        price += meanReversionForce + randomWalk;
        prices.push(price);
      }

      // Check for realistic distribution
      const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

      // Average return should be near zero for mean-reverting process
      expect(Math.abs(avgReturn)).toBeLessThan(0.01);
    });
  });
});

describe("Price Calculation Utilities", () => {
  describe("Spread Calculation", () => {
    function calculateSpread(
      midPrice: number,
      spreadPercent: number
    ): { bid: number; ask: number } {
      const halfSpread = midPrice * (spreadPercent / 2);
      return {
        bid: midPrice - halfSpread,
        ask: midPrice + halfSpread,
      };
    }

    test("should calculate correct bid and ask from mid price", () => {
      const { bid, ask } = calculateSpread(100, 0.01); // 1% spread

      expect(bid).toBeCloseTo(99.5, 4);
      expect(ask).toBeCloseTo(100.5, 4);
      expect(ask - bid).toBeCloseTo(1, 4);
    });

    test("should handle small spreads", () => {
      const { bid, ask } = calculateSpread(100, 0.001); // 0.1% spread

      expect(bid).toBeCloseTo(99.95, 4);
      expect(ask).toBeCloseTo(100.05, 4);
    });

    test("spread should be symmetric around mid price", () => {
      const midPrice = 100;
      const { bid, ask } = calculateSpread(midPrice, 0.02);

      expect((bid + ask) / 2).toBeCloseTo(midPrice, 4);
    });
  });

  describe("Slippage Calculation", () => {
    function calculateSlippage(
      orderSize: number,
      availableLiquidity: number,
      baseSlippage: number = 0.001
    ): number {
      const liquidityRatio = orderSize / availableLiquidity;
      return baseSlippage * (1 + liquidityRatio * 2);
    }

    test("should increase slippage for larger orders", () => {
      const smallOrderSlippage = calculateSlippage(100, 10000);
      const largeOrderSlippage = calculateSlippage(1000, 10000);

      expect(largeOrderSlippage).toBeGreaterThan(smallOrderSlippage);
    });

    test("should have minimal slippage for small orders", () => {
      const slippage = calculateSlippage(10, 10000);
      expect(slippage).toBeLessThan(0.002);
    });

    test("should have high slippage when liquidity is low", () => {
      const lowLiquiditySlippage = calculateSlippage(100, 100);
      const highLiquiditySlippage = calculateSlippage(100, 10000);

      expect(lowLiquiditySlippage).toBeGreaterThan(highLiquiditySlippage);
    });
  });

  describe("Price Impact Calculation", () => {
    function calculatePriceImpact(
      orderSize: number,
      currentPrice: number,
      totalLiquidity: number,
      side: "BUY" | "SELL"
    ): number {
      const impactFactor = orderSize / totalLiquidity;
      const impact = currentPrice * impactFactor * 0.1;
      return side === "BUY" ? impact : -impact;
    }

    test("should increase price for BUY orders", () => {
      const impact = calculatePriceImpact(100, 100, 10000, "BUY");
      expect(impact).toBeGreaterThan(0);
    });

    test("should decrease price for SELL orders", () => {
      const impact = calculatePriceImpact(100, 100, 10000, "SELL");
      expect(impact).toBeLessThan(0);
    });

    test("should have proportional impact to order size", () => {
      const smallImpact = Math.abs(calculatePriceImpact(100, 100, 10000, "BUY"));
      const largeImpact = Math.abs(calculatePriceImpact(500, 100, 10000, "BUY"));

      expect(largeImpact / smallImpact).toBeCloseTo(5, 1);
    });
  });
});
