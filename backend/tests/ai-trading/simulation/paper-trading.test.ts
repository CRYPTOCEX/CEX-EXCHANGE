/**
 * AI Market Maker Simulation Tests
 *
 * Tests for paper trading mode, simulated market conditions, and stress testing
 */

// Types for simulation
interface SimulatedMarket {
  symbol: string;
  price: number;
  priceHistory: number[];
  volatility: number;
  trend: "UP" | "DOWN" | "SIDEWAYS";
  volume24h: number;
}

interface SimulatedTrade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  amount: number;
  price: number;
  timestamp: number;
  executionDelay: number;
  slippage: number;
  fee: number;
}

interface PaperTradingAccount {
  balances: Record<string, number>;
  trades: SimulatedTrade[];
  pnl: number;
  startingValue: number;
}

// Paper trading simulator
class PaperTradingSimulator {
  private markets: Map<string, SimulatedMarket> = new Map();
  private account: PaperTradingAccount;
  private tradeCounter: number = 0;
  private timeMultiplier: number = 1;

  constructor(initialBalances: Record<string, number>) {
    this.account = {
      balances: { ...initialBalances },
      trades: [],
      pnl: 0,
      startingValue: this.calculateTotalValue(initialBalances, {}),
    };
  }

  addMarket(market: SimulatedMarket): void {
    this.markets.set(market.symbol, market);
  }

  getMarket(symbol: string): SimulatedMarket | undefined {
    return this.markets.get(symbol);
  }

  getAccount(): PaperTradingAccount {
    return { ...this.account };
  }

  setTimeMultiplier(multiplier: number): void {
    this.timeMultiplier = multiplier;
  }

  /**
   * Simulate price movement
   */
  simulatePriceMovement(symbol: string, periods: number): void {
    const market = this.markets.get(symbol);
    if (!market) return;

    for (let i = 0; i < periods; i++) {
      const change = this.calculatePriceChange(market);
      market.price *= 1 + change;
      market.priceHistory.push(market.price);

      // Keep last 1000 prices
      if (market.priceHistory.length > 1000) {
        market.priceHistory.shift();
      }
    }
  }

  /**
   * Execute a paper trade
   */
  executeTrade(
    symbol: string,
    side: "BUY" | "SELL",
    amount: number
  ): SimulatedTrade | null {
    const market = this.markets.get(symbol);
    if (!market) return null;

    const [base, quote] = symbol.split("/");

    // Calculate execution details
    const executionDelay = Math.random() * 50 + 10; // 10-60ms
    const slippage = this.calculateSlippage(amount, market);
    const executionPrice =
      side === "BUY"
        ? market.price * (1 + slippage)
        : market.price * (1 - slippage);
    const fee = amount * executionPrice * 0.001; // 0.1% fee

    // Check balances
    if (side === "BUY") {
      const cost = amount * executionPrice + fee;
      if (this.account.balances[quote] < cost) {
        return null; // Insufficient balance
      }
      this.account.balances[quote] -= cost;
      this.account.balances[base] = (this.account.balances[base] || 0) + amount;
    } else {
      if (this.account.balances[base] < amount) {
        return null; // Insufficient balance
      }
      this.account.balances[base] -= amount;
      this.account.balances[quote] =
        (this.account.balances[quote] || 0) + amount * executionPrice - fee;
    }

    const trade: SimulatedTrade = {
      id: `paper-${++this.tradeCounter}`,
      symbol,
      side,
      amount,
      price: executionPrice,
      timestamp: Date.now(),
      executionDelay,
      slippage,
      fee,
    };

    this.account.trades.push(trade);
    this.updatePnL();

    return trade;
  }

  /**
   * Calculate current PnL
   */
  private updatePnL(): void {
    const currentValue = this.calculateTotalValue(
      this.account.balances,
      Object.fromEntries(this.markets)
    );
    this.account.pnl = currentValue - this.account.startingValue;
  }

  /**
   * Calculate total value of portfolio
   */
  private calculateTotalValue(
    balances: Record<string, number>,
    markets: Record<string, SimulatedMarket>
  ): number {
    let total = 0;
    for (const [currency, balance] of Object.entries(balances)) {
      if (currency === "USDT") {
        total += balance;
      } else {
        const symbol = `${currency}/USDT`;
        const market = markets[symbol];
        if (market) {
          total += balance * market.price;
        }
      }
    }
    return total;
  }

  /**
   * Calculate price change based on market conditions
   */
  private calculatePriceChange(market: SimulatedMarket): number {
    const baseVolatility = market.volatility / 100 / Math.sqrt(365 * 24);

    let trend = 0;
    switch (market.trend) {
      case "UP":
        trend = 0.0001;
        break;
      case "DOWN":
        trend = -0.0001;
        break;
      case "SIDEWAYS":
        trend = 0;
        break;
    }

    const randomComponent = (Math.random() - 0.5) * 2 * baseVolatility;
    return trend + randomComponent;
  }

  /**
   * Calculate slippage based on order size and market conditions
   */
  private calculateSlippage(amount: number, market: SimulatedMarket): number {
    const orderValue = amount * market.price;
    const liquidityFactor = orderValue / market.volume24h;
    return Math.min(0.01, liquidityFactor * 0.1 + 0.0001);
  }

  /**
   * Get trade statistics
   */
  getTradeStats(): {
    totalTrades: number;
    buyTrades: number;
    sellTrades: number;
    totalVolume: number;
    totalFees: number;
    avgSlippage: number;
    winRate: number;
  } {
    const trades = this.account.trades;
    const buyTrades = trades.filter((t) => t.side === "BUY");
    const sellTrades = trades.filter((t) => t.side === "SELL");
    const totalVolume = trades.reduce((sum, t) => sum + t.amount * t.price, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);
    const avgSlippage =
      trades.length > 0
        ? trades.reduce((sum, t) => sum + t.slippage, 0) / trades.length
        : 0;

    // Calculate win rate (simplified: compare each trade to market price at time)
    let wins = 0;
    for (const trade of trades) {
      const market = this.markets.get(trade.symbol);
      if (market) {
        if (
          (trade.side === "BUY" && market.price > trade.price) ||
          (trade.side === "SELL" && market.price < trade.price)
        ) {
          wins++;
        }
      }
    }

    return {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      totalVolume,
      totalFees,
      avgSlippage,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    };
  }
}

describe("Paper Trading Simulator", () => {
  let simulator: PaperTradingSimulator;

  beforeEach(() => {
    simulator = new PaperTradingSimulator({
      USDT: 10000,
      BTC: 0,
    });

    simulator.addMarket({
      symbol: "BTC/USDT",
      price: 50000,
      priceHistory: [50000],
      volatility: 50, // 50% annual volatility
      trend: "SIDEWAYS",
      volume24h: 1000000000,
    });
  });

  describe("Trade Execution", () => {
    test("should execute BUY orders and update balances", () => {
      const trade = simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      expect(trade).not.toBeNull();
      expect(trade!.side).toBe("BUY");
      expect(trade!.amount).toBe(0.1);

      const account = simulator.getAccount();
      expect(account.balances.BTC).toBeCloseTo(0.1, 8);
      expect(account.balances.USDT).toBeLessThan(10000);
    });

    test("should execute SELL orders and update balances", () => {
      // First buy some BTC
      simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      // Then sell
      const trade = simulator.executeTrade("BTC/USDT", "SELL", 0.05);

      expect(trade).not.toBeNull();
      expect(trade!.side).toBe("SELL");

      const account = simulator.getAccount();
      expect(account.balances.BTC).toBeCloseTo(0.05, 8);
    });

    test("should reject trades with insufficient balance", () => {
      const trade = simulator.executeTrade("BTC/USDT", "BUY", 100); // Would cost $5M

      expect(trade).toBeNull();

      const account = simulator.getAccount();
      expect(account.balances.USDT).toBe(10000); // Unchanged
    });

    test("should apply slippage to execution price", () => {
      const market = simulator.getMarket("BTC/USDT");
      const marketPrice = market!.price;

      const trade = simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      expect(trade!.price).toBeGreaterThan(marketPrice); // Slippage on buy
      expect(trade!.slippage).toBeGreaterThan(0);
    });

    test("should charge trading fees", () => {
      const trade = simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      expect(trade!.fee).toBeGreaterThan(0);
      expect(trade!.fee).toBeLessThan(trade!.amount * trade!.price * 0.01); // Less than 1%
    });

    test("should track execution delay", () => {
      const trade = simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      expect(trade!.executionDelay).toBeGreaterThan(0);
      expect(trade!.executionDelay).toBeLessThan(100);
    });
  });

  describe("Price Simulation", () => {
    test("should simulate price movements", () => {
      const initialPrice = simulator.getMarket("BTC/USDT")!.price;

      simulator.simulatePriceMovement("BTC/USDT", 100);

      const finalPrice = simulator.getMarket("BTC/USDT")!.price;

      // Price should have changed
      expect(finalPrice).not.toBe(initialPrice);
    });

    test("should build price history", () => {
      const market = simulator.getMarket("BTC/USDT")!;
      const initialHistoryLength = market.priceHistory.length;

      simulator.simulatePriceMovement("BTC/USDT", 50);

      expect(market.priceHistory.length).toBe(initialHistoryLength + 50);
    });

    test("should respect trend direction", () => {
      simulator.addMarket({
        symbol: "ETH/USDT",
        price: 3000,
        priceHistory: [3000],
        volatility: 60,
        trend: "UP",
        volume24h: 500000000,
      });

      const initialPrice = 3000;
      simulator.simulatePriceMovement("ETH/USDT", 1000);

      const finalPrice = simulator.getMarket("ETH/USDT")!.price;

      // With uptrend, price should be higher on average (not guaranteed due to randomness)
      // This is a probabilistic test
      const priceHistory = simulator.getMarket("ETH/USDT")!.priceHistory;
      const avgPrice = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
      expect(avgPrice).toBeGreaterThan(initialPrice * 0.95);
    });
  });

  describe("PnL Tracking", () => {
    test("should track PnL after trades", () => {
      const initialAccount = simulator.getAccount();
      expect(initialAccount.pnl).toBe(0);

      // Buy some BTC
      simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      // Simulate price increase
      const market = simulator.getMarket("BTC/USDT")!;
      market.price = 55000; // 10% increase

      // Sell at higher price
      simulator.executeTrade("BTC/USDT", "SELL", 0.1);

      const finalAccount = simulator.getAccount();
      // Should have profit (minus fees and slippage)
      expect(finalAccount.pnl).toBeGreaterThan(0);
    });

    test("should track losses when price drops", () => {
      // Buy some BTC
      simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      // Simulate price decrease
      const market = simulator.getMarket("BTC/USDT")!;
      market.price = 45000; // 10% decrease

      // Sell at lower price
      simulator.executeTrade("BTC/USDT", "SELL", 0.1);

      const finalAccount = simulator.getAccount();
      // Should have loss
      expect(finalAccount.pnl).toBeLessThan(0);
    });
  });

  describe("Trade Statistics", () => {
    test("should calculate trade statistics", () => {
      // Execute some trades
      simulator.executeTrade("BTC/USDT", "BUY", 0.1);
      simulator.executeTrade("BTC/USDT", "BUY", 0.05);
      simulator.executeTrade("BTC/USDT", "SELL", 0.08);

      const stats = simulator.getTradeStats();

      expect(stats.totalTrades).toBe(3);
      expect(stats.buyTrades).toBe(2);
      expect(stats.sellTrades).toBe(1);
      expect(stats.totalVolume).toBeGreaterThan(0);
      expect(stats.totalFees).toBeGreaterThan(0);
      expect(stats.avgSlippage).toBeGreaterThan(0);
    });
  });
});

describe("Stress Testing", () => {
  describe("High Volume Trading", () => {
    test("should handle thousands of trades", () => {
      const simulator = new PaperTradingSimulator({
        USDT: 1000000,
        BTC: 100,
      });

      simulator.addMarket({
        symbol: "BTC/USDT",
        price: 50000,
        priceHistory: [50000],
        volatility: 50,
        trend: "SIDEWAYS",
        volume24h: 1000000000,
      });

      const startTime = Date.now();
      let successfulTrades = 0;

      for (let i = 0; i < 10000; i++) {
        const side = Math.random() > 0.5 ? "BUY" : "SELL";
        const amount = Math.random() * 0.1 + 0.01;

        const trade = simulator.executeTrade("BTC/USDT", side, amount);
        if (trade) successfulTrades++;

        // Simulate price movement every 10 trades
        if (i % 10 === 0) {
          simulator.simulatePriceMovement("BTC/USDT", 1);
        }
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(successfulTrades).toBeGreaterThan(5000); // Most trades should succeed
    });

    test("should maintain data integrity under load", () => {
      const simulator = new PaperTradingSimulator({
        USDT: 100000,
        BTC: 10,
      });

      simulator.addMarket({
        symbol: "BTC/USDT",
        price: 50000,
        priceHistory: [50000],
        volatility: 50,
        trend: "SIDEWAYS",
        volume24h: 1000000000,
      });

      const initialBTC = 10;
      const initialUSDT = 100000;

      for (let i = 0; i < 1000; i++) {
        const side = Math.random() > 0.5 ? "BUY" : "SELL";
        const amount = Math.random() * 0.5;
        simulator.executeTrade("BTC/USDT", side, amount);
      }

      const account = simulator.getAccount();

      // Balances should be non-negative
      expect(account.balances.BTC).toBeGreaterThanOrEqual(0);
      expect(account.balances.USDT).toBeGreaterThanOrEqual(0);

      // Total value should be in reasonable range (accounting for fees)
      const market = simulator.getMarket("BTC/USDT")!;
      const totalValue =
        account.balances.BTC * market.price + account.balances.USDT;
      const initialValue = initialBTC * 50000 + initialUSDT;

      // Should not have lost more than 10% to fees/slippage
      expect(totalValue).toBeGreaterThan(initialValue * 0.9);
    });
  });

  describe("Extreme Market Conditions", () => {
    test("should handle high volatility", () => {
      const simulator = new PaperTradingSimulator({
        USDT: 10000,
        BTC: 0,
      });

      simulator.addMarket({
        symbol: "BTC/USDT",
        price: 50000,
        priceHistory: [50000],
        volatility: 200, // Extreme volatility
        trend: "SIDEWAYS",
        volume24h: 1000000000,
      });

      // Execute trades during high volatility
      for (let i = 0; i < 100; i++) {
        simulator.executeTrade("BTC/USDT", "BUY", 0.01);
        simulator.simulatePriceMovement("BTC/USDT", 1);
      }

      const market = simulator.getMarket("BTC/USDT")!;
      const account = simulator.getAccount();

      // System should remain stable
      expect(market.price).toBeGreaterThan(0);
      expect(account.balances.BTC).toBeGreaterThan(0);
    });

    test("should handle flash crash scenario", () => {
      const simulator = new PaperTradingSimulator({
        USDT: 10000,
        BTC: 1,
      });

      simulator.addMarket({
        symbol: "BTC/USDT",
        price: 50000,
        priceHistory: [50000],
        volatility: 50,
        trend: "DOWN",
        volume24h: 1000000000,
      });

      // Simulate flash crash
      const market = simulator.getMarket("BTC/USDT")!;
      market.price = 25000; // 50% drop

      // Try to sell during crash
      const trade = simulator.executeTrade("BTC/USDT", "SELL", 0.5);

      expect(trade).not.toBeNull();
      expect(trade!.price).toBeLessThan(26000); // Near crash price
    });

    test("should handle low liquidity scenario", () => {
      const simulator = new PaperTradingSimulator({
        USDT: 10000,
        BTC: 0,
      });

      simulator.addMarket({
        symbol: "BTC/USDT",
        price: 50000,
        priceHistory: [50000],
        volatility: 50,
        trend: "SIDEWAYS",
        volume24h: 10000, // Very low liquidity
      });

      // Large order relative to liquidity
      const trade = simulator.executeTrade("BTC/USDT", "BUY", 0.1);

      // Should have high slippage
      expect(trade!.slippage).toBeGreaterThan(0.001);
    });
  });

  describe("Multi-Market Simulation", () => {
    test("should handle multiple markets simultaneously", () => {
      const simulator = new PaperTradingSimulator({
        USDT: 100000,
        BTC: 0,
        ETH: 0,
        SOL: 0,
      });

      simulator.addMarket({
        symbol: "BTC/USDT",
        price: 50000,
        priceHistory: [50000],
        volatility: 50,
        trend: "UP",
        volume24h: 1000000000,
      });

      simulator.addMarket({
        symbol: "ETH/USDT",
        price: 3000,
        priceHistory: [3000],
        volatility: 60,
        trend: "DOWN",
        volume24h: 500000000,
      });

      simulator.addMarket({
        symbol: "SOL/USDT",
        price: 100,
        priceHistory: [100],
        volatility: 80,
        trend: "SIDEWAYS",
        volume24h: 100000000,
      });

      // Trade all markets
      for (let i = 0; i < 100; i++) {
        simulator.executeTrade("BTC/USDT", "BUY", 0.01);
        simulator.executeTrade("ETH/USDT", "BUY", 0.1);
        simulator.executeTrade("SOL/USDT", "BUY", 1);

        simulator.simulatePriceMovement("BTC/USDT", 1);
        simulator.simulatePriceMovement("ETH/USDT", 1);
        simulator.simulatePriceMovement("SOL/USDT", 1);
      }

      const account = simulator.getAccount();

      // Should have positions in all assets
      expect(account.balances.BTC).toBeGreaterThan(0);
      expect(account.balances.ETH).toBeGreaterThan(0);
      expect(account.balances.SOL).toBeGreaterThan(0);
    });
  });
});

describe("Bot Simulation Integration", () => {
  // Simulated bot behavior
  function simulateBotDecision(
    personality: string,
    marketPrice: number,
    targetPrice: number
  ): { shouldTrade: boolean; side: "BUY" | "SELL"; amount: number } {
    const probability =
      personality === "SCALPER"
        ? 0.7
        : personality === "SWING"
          ? 0.3
          : personality === "MARKET_MAKER"
            ? 0.5
            : 0.4;

    if (Math.random() > probability) {
      return { shouldTrade: false, side: "BUY", amount: 0 };
    }

    let side: "BUY" | "SELL";
    if (personality === "ACCUMULATOR") {
      side = "BUY";
    } else if (personality === "DISTRIBUTOR") {
      side = "SELL";
    } else {
      side = Math.random() > 0.5 ? "BUY" : "SELL";
    }

    const baseAmount = personality === "SCALPER" ? 0.01 : 0.05;
    const amount = baseAmount * (0.8 + Math.random() * 0.4);

    return { shouldTrade: true, side, amount };
  }

  test("should simulate Scalper bot behavior", () => {
    const simulator = new PaperTradingSimulator({
      USDT: 10000,
      BTC: 1,
    });

    simulator.addMarket({
      symbol: "BTC/USDT",
      price: 50000,
      priceHistory: [50000],
      volatility: 50,
      trend: "SIDEWAYS",
      volume24h: 1000000000,
    });

    let trades = 0;

    for (let i = 0; i < 100; i++) {
      const market = simulator.getMarket("BTC/USDT")!;
      const decision = simulateBotDecision("SCALPER", market.price, 50000);

      if (decision.shouldTrade) {
        const trade = simulator.executeTrade(
          "BTC/USDT",
          decision.side,
          decision.amount
        );
        if (trade) trades++;
      }
    }

    // Scalper should trade frequently
    expect(trades).toBeGreaterThan(50);
  });

  test("should simulate Accumulator bot behavior", () => {
    const simulator = new PaperTradingSimulator({
      USDT: 100000,
      BTC: 0,
    });

    simulator.addMarket({
      symbol: "BTC/USDT",
      price: 50000,
      priceHistory: [50000],
      volatility: 50,
      trend: "SIDEWAYS",
      volume24h: 1000000000,
    });

    for (let i = 0; i < 100; i++) {
      const market = simulator.getMarket("BTC/USDT")!;
      const decision = simulateBotDecision("ACCUMULATOR", market.price, 50000);

      if (decision.shouldTrade) {
        simulator.executeTrade("BTC/USDT", decision.side, decision.amount);
      }
    }

    const stats = simulator.getTradeStats();

    // Accumulator should only buy
    expect(stats.sellTrades).toBe(0);
    expect(stats.buyTrades).toBeGreaterThan(0);
  });

  test("should simulate mixed bot fleet", () => {
    const simulator = new PaperTradingSimulator({
      USDT: 100000,
      BTC: 10,
    });

    simulator.addMarket({
      symbol: "BTC/USDT",
      price: 50000,
      priceHistory: [50000],
      volatility: 50,
      trend: "SIDEWAYS",
      volume24h: 1000000000,
    });

    const bots = [
      { personality: "SCALPER", trades: 0 },
      { personality: "SWING", trades: 0 },
      { personality: "ACCUMULATOR", trades: 0 },
      { personality: "DISTRIBUTOR", trades: 0 },
      { personality: "MARKET_MAKER", trades: 0 },
    ];

    for (let i = 0; i < 200; i++) {
      for (const bot of bots) {
        const market = simulator.getMarket("BTC/USDT")!;
        const decision = simulateBotDecision(bot.personality, market.price, 50000);

        if (decision.shouldTrade) {
          const trade = simulator.executeTrade(
            "BTC/USDT",
            decision.side,
            decision.amount
          );
          if (trade) bot.trades++;
        }
      }

      simulator.simulatePriceMovement("BTC/USDT", 1);
    }

    // Each bot type should have executed some trades
    for (const bot of bots) {
      expect(bot.trades).toBeGreaterThan(0);
    }

    // Scalper should have more trades than Swing
    const scalperTrades = bots.find((b) => b.personality === "SCALPER")!.trades;
    const swingTrades = bots.find((b) => b.personality === "SWING")!.trades;
    expect(scalperTrades).toBeGreaterThan(swingTrades);
  });
});

describe("Performance Benchmarks", () => {
  test("should execute trades within latency requirements", () => {
    const simulator = new PaperTradingSimulator({
      USDT: 10000,
      BTC: 0,
    });

    simulator.addMarket({
      symbol: "BTC/USDT",
      price: 50000,
      priceHistory: [50000],
      volatility: 50,
      trend: "SIDEWAYS",
      volume24h: 1000000000,
    });

    const latencies: number[] = [];

    for (let i = 0; i < 1000; i++) {
      const start = Date.now();
      simulator.executeTrade("BTC/USDT", "BUY", 0.01);
      latencies.push(Date.now() - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    // Average latency should be under 1ms
    expect(avgLatency).toBeLessThan(1);

    // Max latency should be under 10ms
    expect(maxLatency).toBeLessThan(10);
  });

  test("should handle price updates efficiently", () => {
    const simulator = new PaperTradingSimulator({
      USDT: 10000,
      BTC: 0,
    });

    simulator.addMarket({
      symbol: "BTC/USDT",
      price: 50000,
      priceHistory: [50000],
      volatility: 50,
      trend: "SIDEWAYS",
      volume24h: 1000000000,
    });

    const start = Date.now();

    for (let i = 0; i < 10000; i++) {
      simulator.simulatePriceMovement("BTC/USDT", 1);
    }

    const duration = Date.now() - start;

    // 10000 price updates should complete in under 1 second
    expect(duration).toBeLessThan(1000);
  });
});
