/**
 * AI Market Maker Models Unit Tests
 *
 * Tests for aiMarketMaker, aiMarketMakerPool, aiBot, and aiMarketMakerHistory models
 * Note: aiMarketMakerSettings has been removed - settings now use centralized CacheManager
 */

import { Sequelize, DataTypes } from "sequelize";

// Import model classes
import aiMarketMaker from "../../../models/ext/ai/market-maker/aiMarketMaker";
import aiMarketMakerPool from "../../../models/ext/ai/market-maker/aiMarketMakerPool";
import aiBot from "../../../models/ext/ai/market-maker/aiBot";
import aiMarketMakerHistory from "../../../models/ext/ai/market-maker/aiMarketMakerHistory";

// In-memory SQLite database for testing
let sequelize: Sequelize;

beforeAll(async () => {
  sequelize = new Sequelize("sqlite::memory:", {
    logging: false,
    define: {
      timestamps: true,
    },
  });

  // Initialize models
  aiMarketMaker.initModel(sequelize);
  aiMarketMakerPool.initModel(sequelize);
  aiBot.initModel(sequelize);
  aiMarketMakerHistory.initModel(sequelize);

  // Set up associations
  const models = {
    aiMarketMaker,
    aiMarketMakerPool,
    aiBot,
    aiMarketMakerHistory,
    // Mock ecosystemMarket for testing
    ecosystemMarket: sequelize.define("ecosystemMarket", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      symbol: DataTypes.STRING,
    }),
  };

  aiMarketMaker.associate(models);
  aiMarketMakerPool.associate(models);
  aiBot.associate(models);
  aiMarketMakerHistory.associate(models);

  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  // Clean up tables before each test
  await aiMarketMakerHistory.destroy({ where: {}, truncate: true });
  await aiBot.destroy({ where: {}, truncate: true });
  await aiMarketMakerPool.destroy({ where: {}, truncate: true });
  await aiMarketMaker.destroy({ where: {}, truncate: true });
});

describe("aiMarketMaker Model", () => {
  describe("CRUD Operations", () => {
    test("should create a market maker with default values", async () => {
      const marketMaker = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174000",
      });

      expect(marketMaker.id).toBeDefined();
      expect(marketMaker.status).toBe("STOPPED");
      expect(marketMaker.targetPrice).toBe(0);
      expect(marketMaker.aggressionLevel).toBe("CONSERVATIVE");
      expect(marketMaker.pauseOnHighVolatility).toBe(true);
      expect(marketMaker.realLiquidityPercent).toBe(0);
    });

    test("should create a market maker with custom values", async () => {
      const marketMaker = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174001",
        status: "ACTIVE",
        targetPrice: 100.5,
        priceRangeLow: 90,
        priceRangeHigh: 110,
        aggressionLevel: "AGGRESSIVE",
        maxDailyVolume: 10000,
        volatilityThreshold: 7.5,
        pauseOnHighVolatility: false,
        realLiquidityPercent: 50,
      });

      expect(marketMaker.status).toBe("ACTIVE");
      expect(marketMaker.targetPrice).toBe(100.5);
      expect(marketMaker.priceRangeLow).toBe(90);
      expect(marketMaker.priceRangeHigh).toBe(110);
      expect(marketMaker.aggressionLevel).toBe("AGGRESSIVE");
      expect(marketMaker.maxDailyVolume).toBe(10000);
      expect(marketMaker.realLiquidityPercent).toBe(50);
    });

    test("should update a market maker", async () => {
      const marketMaker = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174002",
      });

      await marketMaker.update({
        status: "ACTIVE",
        targetPrice: 200,
      });

      expect(marketMaker.status).toBe("ACTIVE");
      expect(marketMaker.targetPrice).toBe(200);
    });

    test("should delete a market maker", async () => {
      const marketMaker = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174003",
      });

      await marketMaker.destroy();

      const found = await aiMarketMaker.findByPk(marketMaker.id);
      expect(found).toBeNull();
    });
  });

  describe("Validations", () => {
    test("should reject invalid status", async () => {
      await expect(
        aiMarketMaker.create({
          marketId: "123e4567-e89b-12d3-a456-426614174004",
          status: "INVALID" as any,
        })
      ).rejects.toThrow();
    });

    test("should reject negative realLiquidityPercent", async () => {
      await expect(
        aiMarketMaker.create({
          marketId: "123e4567-e89b-12d3-a456-426614174005",
          realLiquidityPercent: -10 as any,
        })
      ).rejects.toThrow();
    });

    test("should reject realLiquidityPercent over 100", async () => {
      await expect(
        aiMarketMaker.create({
          marketId: "123e4567-e89b-12d3-a456-426614174006",
          realLiquidityPercent: 150 as any,
        })
      ).rejects.toThrow();
    });

    test("should reject invalid aggressionLevel", async () => {
      await expect(
        aiMarketMaker.create({
          marketId: "123e4567-e89b-12d3-a456-426614174007",
          aggressionLevel: "INVALID" as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("Status Transitions", () => {
    test("should transition from STOPPED to ACTIVE", async () => {
      const marketMaker = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174008",
        status: "STOPPED",
      });

      await marketMaker.update({ status: "ACTIVE" });
      expect(marketMaker.status).toBe("ACTIVE");
    });

    test("should transition from ACTIVE to PAUSED", async () => {
      const marketMaker = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174009",
        status: "ACTIVE",
      });

      await marketMaker.update({ status: "PAUSED" });
      expect(marketMaker.status).toBe("PAUSED");
    });

    test("should transition from PAUSED to ACTIVE", async () => {
      const marketMaker = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174010",
        status: "PAUSED",
      });

      await marketMaker.update({ status: "ACTIVE" });
      expect(marketMaker.status).toBe("ACTIVE");
    });
  });
});

describe("aiMarketMakerPool Model", () => {
  let marketMakerId: string;

  beforeEach(async () => {
    const marketMaker = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174020",
    });
    marketMakerId = marketMaker.id;
  });

  describe("CRUD Operations", () => {
    test("should create a pool with default values", async () => {
      const pool = await aiMarketMakerPool.create({
        marketMakerId,
      });

      expect(pool.id).toBeDefined();
      expect(pool.baseCurrencyBalance).toBe(0);
      expect(pool.quoteCurrencyBalance).toBe(0);
      expect(pool.totalValueLocked).toBe(0);
      expect(pool.unrealizedPnL).toBe(0);
      expect(pool.realizedPnL).toBe(0);
    });

    test("should create a pool with custom values", async () => {
      const pool = await aiMarketMakerPool.create({
        marketMakerId,
        baseCurrencyBalance: 100,
        quoteCurrencyBalance: 5000,
        initialBaseBalance: 100,
        initialQuoteBalance: 5000,
        totalValueLocked: 10000,
      });

      expect(pool.baseCurrencyBalance).toBe(100);
      expect(pool.quoteCurrencyBalance).toBe(5000);
      expect(pool.totalValueLocked).toBe(10000);
    });

    test("should update pool balances", async () => {
      const pool = await aiMarketMakerPool.create({
        marketMakerId,
        baseCurrencyBalance: 100,
        quoteCurrencyBalance: 5000,
      });

      await pool.update({
        baseCurrencyBalance: 95,
        quoteCurrencyBalance: 5250,
        realizedPnL: 50,
      });

      expect(pool.baseCurrencyBalance).toBe(95);
      expect(pool.quoteCurrencyBalance).toBe(5250);
      expect(pool.realizedPnL).toBe(50);
    });
  });

  describe("PnL Tracking", () => {
    test("should track realized PnL", async () => {
      const pool = await aiMarketMakerPool.create({
        marketMakerId,
        realizedPnL: 0,
      });

      // Simulate profit
      await pool.update({ realizedPnL: 100 });
      expect(pool.realizedPnL).toBe(100);

      // Simulate loss
      await pool.update({ realizedPnL: -50 });
      expect(pool.realizedPnL).toBe(-50);
    });

    test("should track unrealized PnL", async () => {
      const pool = await aiMarketMakerPool.create({
        marketMakerId,
        unrealizedPnL: 0,
      });

      await pool.update({ unrealizedPnL: 250 });
      expect(pool.unrealizedPnL).toBe(250);
    });
  });
});

describe("aiBot Model", () => {
  let marketMakerId: string;

  beforeEach(async () => {
    const marketMaker = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174030",
    });
    marketMakerId = marketMaker.id;
  });

  describe("CRUD Operations", () => {
    test("should create a bot with default values", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Test Bot",
      });

      expect(bot.id).toBeDefined();
      expect(bot.name).toBe("Test Bot");
      expect(bot.personality).toBe("SCALPER");
      expect(bot.riskTolerance).toBe(0.5);
      expect(bot.tradeFrequency).toBe("MEDIUM");
      expect(bot.status).toBe("PAUSED");
      expect(bot.dailyTradeCount).toBe(0);
      expect(bot.maxDailyTrades).toBe(100);
    });

    test("should create bots with different personalities", async () => {
      const personalities = [
        "SCALPER",
        "SWING",
        "ACCUMULATOR",
        "DISTRIBUTOR",
        "MARKET_MAKER",
      ] as const;

      for (const personality of personalities) {
        const bot = await aiBot.create({
          marketMakerId,
          name: `${personality} Bot`,
          personality,
        });

        expect(bot.personality).toBe(personality);
      }
    });

    test("should update bot configuration", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Test Bot",
      });

      await bot.update({
        riskTolerance: 0.8,
        tradeFrequency: "HIGH",
        avgOrderSize: 1.5,
        preferredSpread: 0.002,
      });

      expect(bot.riskTolerance).toBe(0.8);
      expect(bot.tradeFrequency).toBe("HIGH");
      expect(bot.avgOrderSize).toBe(1.5);
      expect(bot.preferredSpread).toBe(0.002);
    });
  });

  describe("Personality Types", () => {
    test("SCALPER should have HIGH trade frequency by default when set", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Scalper Bot",
        personality: "SCALPER",
        tradeFrequency: "HIGH",
      });

      expect(bot.personality).toBe("SCALPER");
      expect(bot.tradeFrequency).toBe("HIGH");
    });

    test("SWING should have LOW trade frequency typically", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Swing Bot",
        personality: "SWING",
        tradeFrequency: "LOW",
      });

      expect(bot.personality).toBe("SWING");
      expect(bot.tradeFrequency).toBe("LOW");
    });

    test("MARKET_MAKER should work for both BUY and SELL", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Market Maker Bot",
        personality: "MARKET_MAKER",
      });

      expect(bot.personality).toBe("MARKET_MAKER");
    });
  });

  describe("Trade Counting", () => {
    test("should track daily trade count", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Test Bot",
        maxDailyTrades: 50,
      });

      // Simulate trades
      await bot.update({ dailyTradeCount: 10 });
      expect(bot.dailyTradeCount).toBe(10);

      await bot.update({ dailyTradeCount: 50 });
      expect(bot.dailyTradeCount).toBe(50);
    });

    test("should reset daily trade count", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Test Bot",
        dailyTradeCount: 100,
      });

      await bot.update({ dailyTradeCount: 0 });
      expect(bot.dailyTradeCount).toBe(0);
    });
  });

  describe("Validations", () => {
    test("should reject invalid personality", async () => {
      await expect(
        aiBot.create({
          marketMakerId,
          name: "Test Bot",
          personality: "INVALID" as any,
        })
      ).rejects.toThrow();
    });

    test("should reject riskTolerance below minimum", async () => {
      await expect(
        aiBot.create({
          marketMakerId,
          name: "Test Bot",
          riskTolerance: 0.05 as any,
        })
      ).rejects.toThrow();
    });

    test("should reject riskTolerance above maximum", async () => {
      await expect(
        aiBot.create({
          marketMakerId,
          name: "Test Bot",
          riskTolerance: 1.5 as any,
        })
      ).rejects.toThrow();
    });

    test("should reject invalid trade frequency", async () => {
      await expect(
        aiBot.create({
          marketMakerId,
          name: "Test Bot",
          tradeFrequency: "INVALID" as any,
        })
      ).rejects.toThrow();
    });
  });
});

// Note: aiMarketMakerSettings Model tests removed - settings now use centralized CacheManager

describe("aiMarketMakerHistory Model", () => {
  let marketMakerId: string;

  beforeEach(async () => {
    const marketMaker = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174040",
    });
    marketMakerId = marketMaker.id;
  });

  describe("CRUD Operations", () => {
    test("should create a history entry", async () => {
      const history = await aiMarketMakerHistory.create({
        marketMakerId,
        action: "TRADE",
        priceAtAction: 100,
        poolValueAtAction: 10000,
        details: {
          side: "BUY",
          amount: 1.5,
          price: 100,
        },
      });

      expect(history.id).toBeDefined();
      expect(history.action).toBe("TRADE");
      expect(history.priceAtAction).toBe(100);
      expect(history.details).toEqual({
        side: "BUY",
        amount: 1.5,
        price: 100,
      });
    });

    test("should create history for all action types", async () => {
      const actions = [
        "TRADE",
        "PAUSE",
        "RESUME",
        "REBALANCE",
        "TARGET_CHANGE",
        "DEPOSIT",
        "WITHDRAW",
        "START",
        "STOP",
        "CONFIG_CHANGE",
        "EMERGENCY_STOP",
        "AUTO_PAUSE",
      ] as const;

      for (const action of actions) {
        const history = await aiMarketMakerHistory.create({
          marketMakerId,
          action,
          priceAtAction: 100,
          poolValueAtAction: 10000,
        });

        expect(history.action).toBe(action);
      }
    });
  });

  describe("Trade History", () => {
    test("should record BUY trades", async () => {
      const history = await aiMarketMakerHistory.create({
        marketMakerId,
        action: "TRADE",
        priceAtAction: 100,
        poolValueAtAction: 10000,
        details: {
          botId: "bot-123",
          botName: "Scalper 1",
          side: "BUY",
          amount: 2.5,
          price: 100,
        },
      });

      expect(history.details?.side).toBe("BUY");
      expect(history.details?.amount).toBe(2.5);
    });

    test("should record SELL trades", async () => {
      const history = await aiMarketMakerHistory.create({
        marketMakerId,
        action: "TRADE",
        priceAtAction: 105,
        poolValueAtAction: 10500,
        details: {
          botId: "bot-123",
          botName: "Scalper 1",
          side: "SELL",
          amount: 2.5,
          price: 105,
        },
      });

      expect(history.details?.side).toBe("SELL");
      expect(history.details?.amount).toBe(2.5);
    });
  });

  describe("Auto-pause History", () => {
    test("should record auto-pause for volatility", async () => {
      const history = await aiMarketMakerHistory.create({
        marketMakerId,
        action: "AUTO_PAUSE",
        priceAtAction: 100,
        poolValueAtAction: 10000,
        details: {
          reason: "HIGH_VOLATILITY",
          volatility: 15.5,
          triggeredBy: "SYSTEM",
        },
      });

      expect(history.action).toBe("AUTO_PAUSE");
      expect(history.details?.reason).toBe("HIGH_VOLATILITY");
      expect(history.details?.volatility).toBe(15.5);
    });

    test("should record auto-pause for daily loss limit", async () => {
      const history = await aiMarketMakerHistory.create({
        marketMakerId,
        action: "AUTO_PAUSE",
        priceAtAction: 95,
        poolValueAtAction: 9500,
        details: {
          reason: "DAILY_LOSS_LIMIT",
          triggeredBy: "SYSTEM",
        },
      });

      expect(history.details?.reason).toBe("DAILY_LOSS_LIMIT");
    });
  });
});

describe("Model Associations", () => {
  test("aiMarketMaker should have one pool", async () => {
    const marketMaker = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174050",
    });

    const pool = await aiMarketMakerPool.create({
      marketMakerId: marketMaker.id,
      baseCurrencyBalance: 100,
      quoteCurrencyBalance: 5000,
    });

    const foundMarketMaker = await aiMarketMaker.findByPk(marketMaker.id, {
      include: [{ model: aiMarketMakerPool, as: "pool" }],
    });

    expect(foundMarketMaker?.pool).toBeDefined();
    expect(foundMarketMaker?.pool?.id).toBe(pool.id);
  });

  test("aiMarketMaker should have many bots", async () => {
    const marketMaker = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174051",
    });

    await aiBot.create({
      marketMakerId: marketMaker.id,
      name: "Bot 1",
    });

    await aiBot.create({
      marketMakerId: marketMaker.id,
      name: "Bot 2",
    });

    const foundMarketMaker = await aiMarketMaker.findByPk(marketMaker.id, {
      include: [{ model: aiBot, as: "bots" }],
    });

    expect(foundMarketMaker?.bots).toHaveLength(2);
  });

  test("aiMarketMaker should have many history entries", async () => {
    const marketMaker = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174052",
    });

    await aiMarketMakerHistory.create({
      marketMakerId: marketMaker.id,
      action: "START",
      priceAtAction: 100,
      poolValueAtAction: 10000,
    });

    await aiMarketMakerHistory.create({
      marketMakerId: marketMaker.id,
      action: "TRADE",
      priceAtAction: 101,
      poolValueAtAction: 10100,
    });

    const foundMarketMaker = await aiMarketMaker.findByPk(marketMaker.id, {
      include: [{ model: aiMarketMakerHistory, as: "history" }],
    });

    expect(foundMarketMaker?.history).toHaveLength(2);
  });
});
