/**
 * AI Market Maker Engine Integration Tests
 *
 * Tests for the trading engine workflow: market processing, bot coordination, and trade execution
 */

// Types for engine simulation
interface MarketMakerState {
  id: string;
  marketId: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  targetPrice: number;
  realLiquidityPercent: number;
  maxDailyVolume: number;
  currentDailyVolume: number;
  volatilityThreshold: number;
  pauseOnHighVolatility: boolean;
}

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

interface BotState {
  id: string;
  marketMakerId: string;
  name: string;
  personality: "SCALPER" | "SWING" | "ACCUMULATOR" | "DISTRIBUTOR" | "MARKET_MAKER";
  status: "ACTIVE" | "PAUSED" | "COOLDOWN";
  dailyTradeCount: number;
  maxDailyTrades: number;
  lastTradeAt: number | null;
  avgOrderSize: number;
  tradeFrequency: "HIGH" | "MEDIUM" | "LOW";
}

interface SettingsState {
  tradingEnabled: boolean;
  globalPauseEnabled: boolean;
  maintenanceMode: boolean;
  minLiquidity: number;
  maxDailyLossPercent: number;
}

interface TradeRecord {
  marketMakerId: string;
  botId: string;
  side: "BUY" | "SELL";
  amount: number;
  price: number;
  isRealOrder: boolean;
  timestamp: number;
}

// Engine simulation class
class TradingEngineSimulator {
  private markets: Map<string, MarketMakerState> = new Map();
  private pools: Map<string, PoolState> = new Map();
  private bots: Map<string, BotState> = new Map();
  private settings: SettingsState;
  private trades: TradeRecord[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.settings = {
      tradingEnabled: true,
      globalPauseEnabled: false,
      maintenanceMode: false,
      minLiquidity: 100,
      maxDailyLossPercent: 5,
    };
  }

  addMarket(market: MarketMakerState): void {
    this.markets.set(market.id, market);
  }

  addPool(pool: PoolState): void {
    this.pools.set(pool.marketMakerId, pool);
  }

  addBot(bot: BotState): void {
    this.bots.set(bot.id, bot);
  }

  updateSettings(updates: Partial<SettingsState>): void {
    this.settings = { ...this.settings, ...updates };
  }

  getMarket(id: string): MarketMakerState | undefined {
    return this.markets.get(id);
  }

  getPool(marketMakerId: string): PoolState | undefined {
    return this.pools.get(marketMakerId);
  }

  getBot(id: string): BotState | undefined {
    return this.bots.get(id);
  }

  getTrades(): TradeRecord[] {
    return [...this.trades];
  }

  getTradesForMarket(marketMakerId: string): TradeRecord[] {
    return this.trades.filter((t) => t.marketMakerId === marketMakerId);
  }

  clearTrades(): void {
    this.trades = [];
  }

  /**
   * Run a single engine cycle
   */
  async runEngineCycle(): Promise<{
    processed: number;
    trades: number;
    skipped: string[];
  }> {
    if (this.isProcessing) {
      return { processed: 0, trades: 0, skipped: ["Engine already processing"] };
    }

    this.isProcessing = true;
    const skipped: string[] = [];
    let tradesExecuted = 0;

    try {
      // Check global settings
      if (!this.settings.tradingEnabled) {
        skipped.push("Trading disabled globally");
        return { processed: 0, trades: 0, skipped };
      }

      if (this.settings.globalPauseEnabled) {
        skipped.push("Global pause enabled");
        return { processed: 0, trades: 0, skipped };
      }

      if (this.settings.maintenanceMode) {
        skipped.push("Maintenance mode");
        return { processed: 0, trades: 0, skipped };
      }

      // Process each active market
      let processed = 0;
      for (const [marketId, market] of this.markets) {
        if (market.status !== "ACTIVE") {
          skipped.push(`Market ${marketId}: not active`);
          continue;
        }

        const pool = this.pools.get(marketId);
        if (!pool || pool.totalValueLocked < this.settings.minLiquidity) {
          skipped.push(`Market ${marketId}: insufficient liquidity`);
          continue;
        }

        if (market.currentDailyVolume >= market.maxDailyVolume) {
          skipped.push(`Market ${marketId}: daily volume limit reached`);
          continue;
        }

        // Process bots for this market
        const marketBots = Array.from(this.bots.values()).filter(
          (b) => b.marketMakerId === marketId && b.status === "ACTIVE"
        );

        for (const bot of marketBots) {
          const tradeResult = await this.processBotTrade(bot, market, pool);
          if (tradeResult) {
            tradesExecuted++;
          }
        }

        processed++;
      }

      return { processed, trades: tradesExecuted, skipped };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single bot's trading decision
   */
  private async processBotTrade(
    bot: BotState,
    market: MarketMakerState,
    pool: PoolState
  ): Promise<boolean> {
    // Check daily limit
    if (bot.dailyTradeCount >= bot.maxDailyTrades) {
      return false;
    }

    // Check timing
    const now = Date.now();
    if (bot.lastTradeAt) {
      const minInterval = this.getMinInterval(bot.tradeFrequency);
      if (now - bot.lastTradeAt < minInterval) {
        return false;
      }
    }

    // Random trade decision
    const tradeProbability = this.getTradeProbability(bot.personality);
    if (Math.random() > tradeProbability) {
      return false;
    }

    // Determine trade parameters
    const side = this.determineSide(bot.personality, market.targetPrice);
    const amount = bot.avgOrderSize * (0.8 + Math.random() * 0.4);
    const price = market.targetPrice * (side === "BUY" ? 0.999 : 1.001);
    const isRealOrder = Math.random() * 100 < market.realLiquidityPercent;

    // Record trade
    const trade: TradeRecord = {
      marketMakerId: market.id,
      botId: bot.id,
      side,
      amount,
      price,
      isRealOrder,
      timestamp: now,
    };
    this.trades.push(trade);

    // Update bot state
    const botUpdate = this.bots.get(bot.id);
    if (botUpdate) {
      botUpdate.dailyTradeCount++;
      botUpdate.lastTradeAt = now;
    }

    // Update market volume
    const marketUpdate = this.markets.get(market.id);
    if (marketUpdate) {
      marketUpdate.currentDailyVolume += amount * price;
    }

    // Update pool balances
    const poolUpdate = this.pools.get(pool.marketMakerId);
    if (poolUpdate) {
      if (side === "BUY") {
        poolUpdate.baseBalance += amount;
        poolUpdate.quoteBalance -= amount * price;
      } else {
        poolUpdate.baseBalance -= amount;
        poolUpdate.quoteBalance += amount * price;
      }
    }

    return true;
  }

  private getMinInterval(frequency: BotState["tradeFrequency"]): number {
    switch (frequency) {
      case "HIGH":
        return 5000;
      case "MEDIUM":
        return 15000;
      case "LOW":
        return 60000;
    }
  }

  private getTradeProbability(personality: BotState["personality"]): number {
    switch (personality) {
      case "SCALPER":
        return 0.7;
      case "SWING":
        return 0.3;
      case "MARKET_MAKER":
        return 0.5;
      case "ACCUMULATOR":
      case "DISTRIBUTOR":
        return 0.4;
    }
  }

  private determineSide(
    personality: BotState["personality"],
    targetPrice: number
  ): "BUY" | "SELL" {
    switch (personality) {
      case "ACCUMULATOR":
        return "BUY";
      case "DISTRIBUTOR":
        return "SELL";
      default:
        return Math.random() > 0.5 ? "BUY" : "SELL";
    }
  }

  /**
   * Simulate daily reset
   */
  dailyReset(): void {
    for (const [, market] of this.markets) {
      market.currentDailyVolume = 0;
    }

    for (const [, bot] of this.bots) {
      bot.dailyTradeCount = 0;
    }
  }

  /**
   * Pause market due to volatility
   */
  pauseMarketForVolatility(marketId: string): void {
    const market = this.markets.get(marketId);
    if (market && market.pauseOnHighVolatility) {
      market.status = "PAUSED";
    }
  }
}

describe("Trading Engine Core", () => {
  let engine: TradingEngineSimulator;

  beforeEach(() => {
    engine = new TradingEngineSimulator();
  });

  describe("Engine Initialization", () => {
    test("should start with trading enabled", async () => {
      const result = await engine.runEngineCycle();
      expect(result.skipped).not.toContain("Trading disabled globally");
    });

    test("should handle empty market list", async () => {
      const result = await engine.runEngineCycle();
      expect(result.processed).toBe(0);
      expect(result.trades).toBe(0);
    });
  });

  describe("Global Controls", () => {
    test("should skip processing when trading is disabled", async () => {
      engine.updateSettings({ tradingEnabled: false });

      const result = await engine.runEngineCycle();
      expect(result.skipped).toContain("Trading disabled globally");
      expect(result.processed).toBe(0);
    });

    test("should skip processing when globally paused", async () => {
      engine.updateSettings({ globalPauseEnabled: true });

      const result = await engine.runEngineCycle();
      expect(result.skipped).toContain("Global pause enabled");
    });

    test("should skip processing in maintenance mode", async () => {
      engine.updateSettings({ maintenanceMode: true });

      const result = await engine.runEngineCycle();
      expect(result.skipped).toContain("Maintenance mode");
    });
  });

  describe("Market Processing", () => {
    beforeEach(() => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 50,
        maxDailyVolume: 10000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      engine.addPool({
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 100,
        quoteBalance: 5000,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      });
    });

    test("should skip inactive markets", async () => {
      engine.addMarket({
        id: "market-2",
        marketId: "m-2",
        status: "STOPPED",
        targetPrice: 100,
        realLiquidityPercent: 50,
        maxDailyVolume: 10000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      const result = await engine.runEngineCycle();
      expect(result.skipped).toContain("Market market-2: not active");
    });

    test("should skip markets with insufficient liquidity", async () => {
      engine.addMarket({
        id: "market-3",
        marketId: "m-3",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 50,
        maxDailyVolume: 10000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      engine.addPool({
        id: "pool-3",
        marketMakerId: "market-3",
        baseBalance: 0.5,
        quoteBalance: 10, // TVL = $60, below $100 minimum
        initialBaseBalance: 0.5,
        initialQuoteBalance: 10,
        totalValueLocked: 60,
        realizedPnL: 0,
        unrealizedPnL: 0,
      });

      const result = await engine.runEngineCycle();
      expect(result.skipped).toContain("Market market-3: insufficient liquidity");
    });

    test("should skip markets that reached daily volume limit", async () => {
      const market = engine.getMarket("market-1");
      if (market) {
        market.currentDailyVolume = 10000;
      }

      const result = await engine.runEngineCycle();
      expect(result.skipped).toContain("Market market-1: daily volume limit reached");
    });

    test("should process active markets", async () => {
      engine.addBot({
        id: "bot-1",
        marketMakerId: "market-1",
        name: "Test Bot",
        personality: "SCALPER",
        status: "ACTIVE",
        dailyTradeCount: 0,
        maxDailyTrades: 100,
        lastTradeAt: null,
        avgOrderSize: 1,
        tradeFrequency: "HIGH",
      });

      const result = await engine.runEngineCycle();
      expect(result.processed).toBe(1);
    });
  });

  describe("Bot Trading", () => {
    beforeEach(() => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 0, // AI-only mode
        maxDailyVolume: 100000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      engine.addPool({
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 1000,
        quoteBalance: 50000,
        initialBaseBalance: 1000,
        initialQuoteBalance: 50000,
        totalValueLocked: 100000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      });
    });

    test("should respect bot daily trade limits", async () => {
      engine.addBot({
        id: "bot-1",
        marketMakerId: "market-1",
        name: "Limited Bot",
        personality: "SCALPER",
        status: "ACTIVE",
        dailyTradeCount: 100,
        maxDailyTrades: 100,
        lastTradeAt: null,
        avgOrderSize: 1,
        tradeFrequency: "HIGH",
      });

      const result = await engine.runEngineCycle();
      expect(result.trades).toBe(0);
    });

    test("should increment trade count after successful trade", async () => {
      engine.addBot({
        id: "bot-1",
        marketMakerId: "market-1",
        name: "Test Bot",
        personality: "SCALPER",
        status: "ACTIVE",
        dailyTradeCount: 0,
        maxDailyTrades: 100,
        lastTradeAt: null,
        avgOrderSize: 1,
        tradeFrequency: "HIGH",
      });

      // Run multiple cycles
      for (let i = 0; i < 10; i++) {
        await engine.runEngineCycle();
      }

      const bot = engine.getBot("bot-1");
      const trades = engine.getTrades();

      // Trade count should match executed trades
      expect(bot?.dailyTradeCount).toBe(trades.length);
    });

    test("ACCUMULATOR should only execute BUY orders", async () => {
      engine.addBot({
        id: "bot-acc",
        marketMakerId: "market-1",
        name: "Accumulator Bot",
        personality: "ACCUMULATOR",
        status: "ACTIVE",
        dailyTradeCount: 0,
        maxDailyTrades: 100,
        lastTradeAt: null,
        avgOrderSize: 1,
        tradeFrequency: "HIGH",
      });

      // Run many cycles
      for (let i = 0; i < 50; i++) {
        await engine.runEngineCycle();
      }

      const trades = engine.getTrades();
      const buyTrades = trades.filter((t) => t.side === "BUY");

      // All trades should be buys
      expect(buyTrades.length).toBe(trades.length);
    });

    test("DISTRIBUTOR should only execute SELL orders", async () => {
      engine.addBot({
        id: "bot-dist",
        marketMakerId: "market-1",
        name: "Distributor Bot",
        personality: "DISTRIBUTOR",
        status: "ACTIVE",
        dailyTradeCount: 0,
        maxDailyTrades: 100,
        lastTradeAt: null,
        avgOrderSize: 1,
        tradeFrequency: "HIGH",
      });

      for (let i = 0; i < 50; i++) {
        await engine.runEngineCycle();
      }

      const trades = engine.getTrades();
      const sellTrades = trades.filter((t) => t.side === "SELL");

      expect(sellTrades.length).toBe(trades.length);
    });

    test("should update pool balances after trades", async () => {
      engine.addBot({
        id: "bot-1",
        marketMakerId: "market-1",
        name: "Test Bot",
        personality: "ACCUMULATOR",
        status: "ACTIVE",
        dailyTradeCount: 0,
        maxDailyTrades: 100,
        lastTradeAt: null,
        avgOrderSize: 10,
        tradeFrequency: "HIGH",
      });

      const initialPool = { ...engine.getPool("market-1") };

      for (let i = 0; i < 10; i++) {
        await engine.runEngineCycle();
      }

      const updatedPool = engine.getPool("market-1");
      const trades = engine.getTrades();

      if (trades.length > 0) {
        // For accumulator (BUY only), base should increase, quote should decrease
        expect(updatedPool!.baseBalance).toBeGreaterThan(initialPool.baseBalance!);
        expect(updatedPool!.quoteBalance).toBeLessThan(initialPool.quoteBalance!);
      }
    });
  });

  describe("Real vs AI Orders", () => {
    beforeEach(() => {
      engine.addBot({
        id: "bot-1",
        marketMakerId: "market-1",
        name: "Test Bot",
        personality: "SCALPER",
        status: "ACTIVE",
        dailyTradeCount: 0,
        maxDailyTrades: 1000,
        lastTradeAt: null,
        avgOrderSize: 1,
        tradeFrequency: "HIGH",
      });

      engine.addPool({
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 1000,
        quoteBalance: 50000,
        initialBaseBalance: 1000,
        initialQuoteBalance: 50000,
        totalValueLocked: 100000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      });
    });

    test("should respect realLiquidityPercent = 0 (AI-only)", async () => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 0, // All AI-only
        maxDailyVolume: 100000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      for (let i = 0; i < 100; i++) {
        await engine.runEngineCycle();
      }

      const trades = engine.getTrades();
      const realOrders = trades.filter((t) => t.isRealOrder);

      expect(realOrders.length).toBe(0);
    });

    test("should respect realLiquidityPercent = 100 (all real)", async () => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 100, // All real
        maxDailyVolume: 100000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      for (let i = 0; i < 100; i++) {
        await engine.runEngineCycle();
      }

      const trades = engine.getTrades();
      const realOrders = trades.filter((t) => t.isRealOrder);

      expect(realOrders.length).toBe(trades.length);
    });

    test("should roughly respect hybrid realLiquidityPercent", async () => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 50, // 50/50 split
        maxDailyVolume: 100000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      for (let i = 0; i < 200; i++) {
        await engine.runEngineCycle();
      }

      const trades = engine.getTrades();
      const realOrders = trades.filter((t) => t.isRealOrder);
      const realPercent = (realOrders.length / trades.length) * 100;

      // Should be roughly 50% (+/- 20% for randomness)
      expect(realPercent).toBeGreaterThan(30);
      expect(realPercent).toBeLessThan(70);
    });
  });

  describe("Daily Reset", () => {
    beforeEach(() => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 0,
        maxDailyVolume: 10000,
        currentDailyVolume: 5000,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      engine.addPool({
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 100,
        quoteBalance: 5000,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      });

      engine.addBot({
        id: "bot-1",
        marketMakerId: "market-1",
        name: "Test Bot",
        personality: "SCALPER",
        status: "ACTIVE",
        dailyTradeCount: 50,
        maxDailyTrades: 100,
        lastTradeAt: Date.now(),
        avgOrderSize: 1,
        tradeFrequency: "HIGH",
      });
    });

    test("should reset market daily volume", () => {
      expect(engine.getMarket("market-1")?.currentDailyVolume).toBe(5000);

      engine.dailyReset();

      expect(engine.getMarket("market-1")?.currentDailyVolume).toBe(0);
    });

    test("should reset bot daily trade counts", () => {
      expect(engine.getBot("bot-1")?.dailyTradeCount).toBe(50);

      engine.dailyReset();

      expect(engine.getBot("bot-1")?.dailyTradeCount).toBe(0);
    });
  });

  describe("Volatility Pause", () => {
    test("should pause market when volatility is high", () => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 0,
        maxDailyVolume: 10000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      expect(engine.getMarket("market-1")?.status).toBe("ACTIVE");

      engine.pauseMarketForVolatility("market-1");

      expect(engine.getMarket("market-1")?.status).toBe("PAUSED");
    });

    test("should not pause if pauseOnHighVolatility is false", () => {
      engine.addMarket({
        id: "market-2",
        marketId: "m-2",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 0,
        maxDailyVolume: 10000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: false,
      });

      engine.pauseMarketForVolatility("market-2");

      expect(engine.getMarket("market-2")?.status).toBe("ACTIVE");
    });
  });

  describe("Concurrent Processing Prevention", () => {
    test("should prevent overlapping engine cycles", async () => {
      engine.addMarket({
        id: "market-1",
        marketId: "m-1",
        status: "ACTIVE",
        targetPrice: 100,
        realLiquidityPercent: 0,
        maxDailyVolume: 10000,
        currentDailyVolume: 0,
        volatilityThreshold: 5,
        pauseOnHighVolatility: true,
      });

      engine.addPool({
        id: "pool-1",
        marketMakerId: "market-1",
        baseBalance: 100,
        quoteBalance: 5000,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 10000,
        realizedPnL: 0,
        unrealizedPnL: 0,
      });

      // Start two cycles concurrently
      const [result1, result2] = await Promise.all([
        engine.runEngineCycle(),
        engine.runEngineCycle(),
      ]);

      // One should succeed, one should be skipped
      const skipMessages = [...result1.skipped, ...result2.skipped];
      expect(skipMessages.some((m) => m.includes("already processing"))).toBe(true);
    });
  });
});

describe("Multi-Bot Coordination", () => {
  let engine: TradingEngineSimulator;

  beforeEach(() => {
    engine = new TradingEngineSimulator();

    engine.addMarket({
      id: "market-1",
      marketId: "m-1",
      status: "ACTIVE",
      targetPrice: 100,
      realLiquidityPercent: 0,
      maxDailyVolume: 1000000,
      currentDailyVolume: 0,
      volatilityThreshold: 5,
      pauseOnHighVolatility: true,
    });

    engine.addPool({
      id: "pool-1",
      marketMakerId: "market-1",
      baseBalance: 10000,
      quoteBalance: 500000,
      initialBaseBalance: 10000,
      initialQuoteBalance: 500000,
      totalValueLocked: 1000000,
      realizedPnL: 0,
      unrealizedPnL: 0,
    });
  });

  test("should coordinate multiple bot personalities", async () => {
    // Add different personality bots
    engine.addBot({
      id: "scalper",
      marketMakerId: "market-1",
      name: "Scalper",
      personality: "SCALPER",
      status: "ACTIVE",
      dailyTradeCount: 0,
      maxDailyTrades: 500,
      lastTradeAt: null,
      avgOrderSize: 1,
      tradeFrequency: "HIGH",
    });

    engine.addBot({
      id: "accumulator",
      marketMakerId: "market-1",
      name: "Accumulator",
      personality: "ACCUMULATOR",
      status: "ACTIVE",
      dailyTradeCount: 0,
      maxDailyTrades: 100,
      lastTradeAt: null,
      avgOrderSize: 5,
      tradeFrequency: "MEDIUM",
    });

    engine.addBot({
      id: "distributor",
      marketMakerId: "market-1",
      name: "Distributor",
      personality: "DISTRIBUTOR",
      status: "ACTIVE",
      dailyTradeCount: 0,
      maxDailyTrades: 100,
      lastTradeAt: null,
      avgOrderSize: 5,
      tradeFrequency: "MEDIUM",
    });

    // Run cycles
    for (let i = 0; i < 100; i++) {
      await engine.runEngineCycle();
    }

    const trades = engine.getTrades();

    // Should have trades from different bots
    const scalperTrades = trades.filter((t) => t.botId === "scalper");
    const accumulatorTrades = trades.filter((t) => t.botId === "accumulator");
    const distributorTrades = trades.filter((t) => t.botId === "distributor");

    // Scalper should have more trades due to high frequency
    expect(scalperTrades.length).toBeGreaterThan(accumulatorTrades.length);

    // Accumulator should only have buys
    expect(accumulatorTrades.every((t) => t.side === "BUY")).toBe(true);

    // Distributor should only have sells
    expect(distributorTrades.every((t) => t.side === "SELL")).toBe(true);
  });

  test("should maintain pool balance with balanced bots", async () => {
    // Add equal accumulator and distributor
    engine.addBot({
      id: "accumulator",
      marketMakerId: "market-1",
      name: "Accumulator",
      personality: "ACCUMULATOR",
      status: "ACTIVE",
      dailyTradeCount: 0,
      maxDailyTrades: 100,
      lastTradeAt: null,
      avgOrderSize: 10,
      tradeFrequency: "HIGH",
    });

    engine.addBot({
      id: "distributor",
      marketMakerId: "market-1",
      name: "Distributor",
      personality: "DISTRIBUTOR",
      status: "ACTIVE",
      dailyTradeCount: 0,
      maxDailyTrades: 100,
      lastTradeAt: null,
      avgOrderSize: 10,
      tradeFrequency: "HIGH",
    });

    const initialPool = { ...engine.getPool("market-1") };

    for (let i = 0; i < 200; i++) {
      await engine.runEngineCycle();
    }

    const finalPool = engine.getPool("market-1");
    const trades = engine.getTrades();

    const totalBuys = trades
      .filter((t) => t.side === "BUY")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalSells = trades
      .filter((t) => t.side === "SELL")
      .reduce((sum, t) => sum + t.amount, 0);

    // Balance changes should reflect trade activity
    const expectedBaseChange = totalBuys - totalSells;
    const actualBaseChange = finalPool!.baseBalance - initialPool.baseBalance!;

    expect(actualBaseChange).toBeCloseTo(expectedBaseChange, 2);
  });
});
