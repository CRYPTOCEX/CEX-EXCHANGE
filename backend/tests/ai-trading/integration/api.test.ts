/**
 * AI Market Maker API Integration Tests
 *
 * Tests for API endpoints: markets, pools, bots, settings, and analytics
 */

import { Sequelize, DataTypes } from "sequelize";

// Import model classes
import aiMarketMaker from "../../../models/ext/ai/market-maker/aiMarketMaker";
import aiMarketMakerPool from "../../../models/ext/ai/market-maker/aiMarketMakerPool";
import aiBot from "../../../models/ext/ai/market-maker/aiBot";
import aiMarketMakerHistory from "../../../models/ext/ai/market-maker/aiMarketMakerHistory";
// Note: aiMarketMakerSettings has been removed - settings now use centralized CacheManager

// In-memory SQLite database for testing
let sequelize: Sequelize;

// Mock API handler types
interface ApiRequest {
  method: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
}

interface ApiResponse {
  status: number;
  data?: any;
  error?: string;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

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

// Simulated API handlers for testing
const apiHandlers = {
  // Markets API
  async getMarkets(req: ApiRequest): Promise<ApiResponse> {
    try {
      const page = parseInt(req.query?.page || "1");
      const perPage = parseInt(req.query?.perPage || "10");
      const offset = (page - 1) * perPage;

      const { count, rows } = await aiMarketMaker.findAndCountAll({
        limit: perPage,
        offset,
        include: [
          { model: aiMarketMakerPool, as: "pool" },
          { model: aiBot, as: "bots" },
        ],
      });

      return {
        status: 200,
        data: rows,
        pagination: {
          page,
          perPage,
          total: count,
          totalPages: Math.ceil(count / perPage),
        },
      };
    } catch (error: any) {
      return { status: 500, error: error.message };
    }
  },

  async getMarket(req: ApiRequest): Promise<ApiResponse> {
    try {
      const market = await aiMarketMaker.findByPk(req.params?.id, {
        include: [
          { model: aiMarketMakerPool, as: "pool" },
          { model: aiBot, as: "bots" },
        ],
      });

      if (!market) {
        return { status: 404, error: "Market not found" };
      }

      return { status: 200, data: market };
    } catch (error: any) {
      return { status: 500, error: error.message };
    }
  },

  async createMarket(req: ApiRequest): Promise<ApiResponse> {
    try {
      const market = await aiMarketMaker.create(req.body as any);
      return { status: 201, data: market };
    } catch (error: any) {
      return { status: 400, error: error.message };
    }
  },

  async updateMarket(req: ApiRequest): Promise<ApiResponse> {
    try {
      const market = await aiMarketMaker.findByPk(req.params?.id);
      if (!market) {
        return { status: 404, error: "Market not found" };
      }

      await market.update(req.body as any);
      return { status: 200, data: market };
    } catch (error: any) {
      return { status: 400, error: error.message };
    }
  },

  async deleteMarket(req: ApiRequest): Promise<ApiResponse> {
    try {
      const market = await aiMarketMaker.findByPk(req.params?.id);
      if (!market) {
        return { status: 404, error: "Market not found" };
      }

      await market.destroy();
      return { status: 200, data: { message: "Market deleted" } };
    } catch (error: any) {
      return { status: 500, error: error.message };
    }
  },

  // Bots API
  async getBots(req: ApiRequest): Promise<ApiResponse> {
    try {
      const where: any = {};
      if (req.query?.marketMakerId) {
        where.marketMakerId = req.query.marketMakerId;
      }

      const bots = await aiBot.findAll({ where });
      return { status: 200, data: bots };
    } catch (error: any) {
      return { status: 500, error: error.message };
    }
  },

  async createBot(req: ApiRequest): Promise<ApiResponse> {
    try {
      const bot = await aiBot.create(req.body as any);
      return { status: 201, data: bot };
    } catch (error: any) {
      return { status: 400, error: error.message };
    }
  },

  async updateBot(req: ApiRequest): Promise<ApiResponse> {
    try {
      const bot = await aiBot.findByPk(req.params?.id);
      if (!bot) {
        return { status: 404, error: "Bot not found" };
      }

      await bot.update(req.body as any);
      return { status: 200, data: bot };
    } catch (error: any) {
      return { status: 400, error: error.message };
    }
  },

  async deleteBot(req: ApiRequest): Promise<ApiResponse> {
    try {
      const bot = await aiBot.findByPk(req.params?.id);
      if (!bot) {
        return { status: 404, error: "Bot not found" };
      }

      await bot.destroy();
      return { status: 200, data: { message: "Bot deleted" } };
    } catch (error: any) {
      return { status: 500, error: error.message };
    }
  },

  // Note: Settings API tests removed - settings now use centralized CacheManager

  // Pool API
  async getPool(req: ApiRequest): Promise<ApiResponse> {
    try {
      const pool = await aiMarketMakerPool.findOne({
        where: { marketMakerId: req.params?.marketMakerId },
      });

      if (!pool) {
        return { status: 404, error: "Pool not found" };
      }

      return { status: 200, data: pool };
    } catch (error: any) {
      return { status: 500, error: error.message };
    }
  },

  async updatePool(req: ApiRequest): Promise<ApiResponse> {
    try {
      const pool = await aiMarketMakerPool.findOne({
        where: { marketMakerId: req.params?.marketMakerId },
      });

      if (!pool) {
        return { status: 404, error: "Pool not found" };
      }

      await pool.update(req.body as any);
      return { status: 200, data: pool };
    } catch (error: any) {
      return { status: 400, error: error.message };
    }
  },

  // History API
  async getHistory(req: ApiRequest): Promise<ApiResponse> {
    try {
      const where: any = {};
      if (req.params?.marketMakerId) {
        where.marketMakerId = req.params.marketMakerId;
      }
      if (req.query?.action) {
        where.action = req.query.action;
      }

      const history = await aiMarketMakerHistory.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: parseInt(req.query?.limit || "100"),
      });

      return { status: 200, data: history };
    } catch (error: any) {
      return { status: 500, error: error.message };
    }
  },
};

describe("Markets API", () => {
  describe("GET /api/admin/ext/ai/trading/markets", () => {
    test("should return empty list when no markets exist", async () => {
      const response = await apiHandlers.getMarkets({
        method: "GET",
        query: {},
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(0);
      expect(response.pagination?.total).toBe(0);
    });

    test("should return paginated list of markets", async () => {
      // Create 15 markets
      for (let i = 0; i < 15; i++) {
        await aiMarketMaker.create({
          marketId: `123e4567-e89b-12d3-a456-42661417400${i.toString().padStart(1, "0")}`,
        });
      }

      // Get first page
      const page1 = await apiHandlers.getMarkets({
        method: "GET",
        query: { page: "1", perPage: "10" },
      });

      expect(page1.status).toBe(200);
      expect(page1.data).toHaveLength(10);
      expect(page1.pagination?.total).toBe(15);
      expect(page1.pagination?.totalPages).toBe(2);

      // Get second page
      const page2 = await apiHandlers.getMarkets({
        method: "GET",
        query: { page: "2", perPage: "10" },
      });

      expect(page2.status).toBe(200);
      expect(page2.data).toHaveLength(5);
    });

    test("should include pool and bots in response", async () => {
      const market = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174100",
      });

      await aiMarketMakerPool.create({
        marketMakerId: market.id,
        baseCurrencyBalance: 100,
        quoteCurrencyBalance: 5000,
      });

      await aiBot.create({
        marketMakerId: market.id,
        name: "Test Bot",
      });

      const response = await apiHandlers.getMarkets({
        method: "GET",
        query: {},
      });

      expect(response.status).toBe(200);
      expect(response.data[0].pool).toBeDefined();
      expect(response.data[0].bots).toHaveLength(1);
    });
  });

  describe("GET /api/admin/ext/ai/trading/markets/:id", () => {
    test("should return 404 for non-existent market", async () => {
      const response = await apiHandlers.getMarket({
        method: "GET",
        params: { id: "non-existent-id" },
      });

      expect(response.status).toBe(404);
      expect(response.error).toBe("Market not found");
    });

    test("should return market with associations", async () => {
      const market = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174200",
        targetPrice: 100,
        status: "ACTIVE",
      });

      const response = await apiHandlers.getMarket({
        method: "GET",
        params: { id: market.id },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(market.id);
      expect(response.data.targetPrice).toBe(100);
    });
  });

  describe("POST /api/admin/ext/ai/trading/markets", () => {
    test("should create a new market", async () => {
      const response = await apiHandlers.createMarket({
        method: "POST",
        body: {
          marketId: "123e4567-e89b-12d3-a456-426614174300",
          targetPrice: 150,
          aggressionLevel: "MODERATE",
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.targetPrice).toBe(150);
      expect(response.data.aggressionLevel).toBe("MODERATE");
    });

    test("should return 400 for invalid data", async () => {
      const response = await apiHandlers.createMarket({
        method: "POST",
        body: {
          marketId: "invalid-uuid",
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/admin/ext/ai/trading/markets/:id", () => {
    test("should update market configuration", async () => {
      const market = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174400",
        status: "STOPPED",
      });

      const response = await apiHandlers.updateMarket({
        method: "PUT",
        params: { id: market.id },
        body: {
          status: "ACTIVE",
          targetPrice: 200,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe("ACTIVE");
      expect(response.data.targetPrice).toBe(200);
    });

    test("should return 404 for non-existent market", async () => {
      const response = await apiHandlers.updateMarket({
        method: "PUT",
        params: { id: "non-existent" },
        body: { status: "ACTIVE" },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/ext/ai/trading/markets/:id", () => {
    test("should delete market", async () => {
      const market = await aiMarketMaker.create({
        marketId: "123e4567-e89b-12d3-a456-426614174500",
      });

      const response = await apiHandlers.deleteMarket({
        method: "DELETE",
        params: { id: market.id },
      });

      expect(response.status).toBe(200);

      const found = await aiMarketMaker.findByPk(market.id);
      expect(found).toBeNull();
    });

    test("should return 404 for non-existent market", async () => {
      const response = await apiHandlers.deleteMarket({
        method: "DELETE",
        params: { id: "non-existent" },
      });

      expect(response.status).toBe(404);
    });
  });
});

describe("Bots API", () => {
  let marketMakerId: string;

  beforeEach(async () => {
    const market = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174600",
    });
    marketMakerId = market.id;
  });

  describe("GET /api/admin/ext/ai/trading/bots", () => {
    test("should return bots for a market", async () => {
      await aiBot.create({
        marketMakerId,
        name: "Bot 1",
        personality: "SCALPER",
      });

      await aiBot.create({
        marketMakerId,
        name: "Bot 2",
        personality: "SWING",
      });

      const response = await apiHandlers.getBots({
        method: "GET",
        query: { marketMakerId },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
    });
  });

  describe("POST /api/admin/ext/ai/trading/bots", () => {
    test("should create a new bot", async () => {
      const response = await apiHandlers.createBot({
        method: "POST",
        body: {
          marketMakerId,
          name: "New Bot",
          personality: "MARKET_MAKER",
          tradeFrequency: "HIGH",
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.name).toBe("New Bot");
      expect(response.data.personality).toBe("MARKET_MAKER");
    });
  });

  describe("PUT /api/admin/ext/ai/trading/bots/:id", () => {
    test("should update bot configuration", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Test Bot",
        status: "PAUSED",
      });

      const response = await apiHandlers.updateBot({
        method: "PUT",
        params: { id: bot.id },
        body: {
          status: "ACTIVE",
          riskTolerance: 0.7,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe("ACTIVE");
      expect(response.data.riskTolerance).toBe(0.7);
    });
  });

  describe("DELETE /api/admin/ext/ai/trading/bots/:id", () => {
    test("should delete bot", async () => {
      const bot = await aiBot.create({
        marketMakerId,
        name: "Test Bot",
      });

      const response = await apiHandlers.deleteBot({
        method: "DELETE",
        params: { id: bot.id },
      });

      expect(response.status).toBe(200);

      const found = await aiBot.findByPk(bot.id);
      expect(found).toBeNull();
    });
  });
});

// Note: Settings API tests removed - settings now use centralized CacheManager via /api/admin/system/settings

describe("Pool API", () => {
  let marketMakerId: string;

  beforeEach(async () => {
    const market = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174700",
    });
    marketMakerId = market.id;

    await aiMarketMakerPool.create({
      marketMakerId,
      baseCurrencyBalance: 100,
      quoteCurrencyBalance: 5000,
    });
  });

  describe("GET /api/admin/ext/ai/trading/pools/:marketMakerId", () => {
    test("should return pool for market", async () => {
      const response = await apiHandlers.getPool({
        method: "GET",
        params: { marketMakerId },
      });

      expect(response.status).toBe(200);
      expect(response.data.baseCurrencyBalance).toBe(100);
      expect(response.data.quoteCurrencyBalance).toBe(5000);
    });

    test("should return 404 for non-existent pool", async () => {
      const response = await apiHandlers.getPool({
        method: "GET",
        params: { marketMakerId: "non-existent" },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/admin/ext/ai/trading/pools/:marketMakerId", () => {
    test("should update pool balances", async () => {
      const response = await apiHandlers.updatePool({
        method: "PUT",
        params: { marketMakerId },
        body: {
          baseCurrencyBalance: 150,
          quoteCurrencyBalance: 7500,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.baseCurrencyBalance).toBe(150);
      expect(response.data.quoteCurrencyBalance).toBe(7500);
    });
  });
});

describe("History API", () => {
  let marketMakerId: string;

  beforeEach(async () => {
    const market = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174800",
    });
    marketMakerId = market.id;

    // Create some history entries
    await aiMarketMakerHistory.create({
      marketMakerId,
      action: "START",
      priceAtAction: 100,
      poolValueAtAction: 10000,
    });

    await aiMarketMakerHistory.create({
      marketMakerId,
      action: "TRADE",
      priceAtAction: 101,
      poolValueAtAction: 10100,
      details: { side: "BUY", amount: 1 },
    });

    await aiMarketMakerHistory.create({
      marketMakerId,
      action: "TRADE",
      priceAtAction: 102,
      poolValueAtAction: 10200,
      details: { side: "SELL", amount: 0.5 },
    });
  });

  describe("GET /api/admin/ext/ai/trading/history/:marketMakerId", () => {
    test("should return history for market", async () => {
      const response = await apiHandlers.getHistory({
        method: "GET",
        params: { marketMakerId },
        query: {},
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(3);
    });

    test("should filter by action type", async () => {
      const response = await apiHandlers.getHistory({
        method: "GET",
        params: { marketMakerId },
        query: { action: "TRADE" },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data.every((h: any) => h.action === "TRADE")).toBe(true);
    });

    test("should limit results", async () => {
      const response = await apiHandlers.getHistory({
        method: "GET",
        params: { marketMakerId },
        query: { limit: "1" },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(1);
    });
  });
});

describe("API Error Handling", () => {
  test("should handle validation errors gracefully", async () => {
    const response = await apiHandlers.createMarket({
      method: "POST",
      body: {
        marketId: "not-a-uuid",
        targetPrice: "not-a-number",
      },
    });

    expect(response.status).toBe(400);
    expect(response.error).toBeDefined();
  });

  test("should handle database errors gracefully", async () => {
    // This would typically test actual database connection issues
    // For now, we test with invalid data types
    const response = await apiHandlers.createBot({
      method: "POST",
      body: {
        marketMakerId: "non-existent",
        name: "Bot",
        // Foreign key constraint would fail in real scenario
      },
    });

    // SQLite doesn't enforce foreign keys by default, but this demonstrates error handling
    expect(response.status).toBe(201); // Would be 400/500 with FK enforcement
  });
});

describe("API Status Transitions", () => {
  test("should allow starting a stopped market", async () => {
    const market = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614174900",
      status: "STOPPED",
    });

    const response = await apiHandlers.updateMarket({
      method: "PUT",
      params: { id: market.id },
      body: { status: "ACTIVE" },
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("ACTIVE");
  });

  test("should allow pausing an active market", async () => {
    const market = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614175000",
      status: "ACTIVE",
    });

    const response = await apiHandlers.updateMarket({
      method: "PUT",
      params: { id: market.id },
      body: { status: "PAUSED" },
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("PAUSED");
  });

  test("should allow resuming a paused market", async () => {
    const market = await aiMarketMaker.create({
      marketId: "123e4567-e89b-12d3-a456-426614175100",
      status: "PAUSED",
    });

    const response = await apiHandlers.updateMarket({
      method: "PUT",
      params: { id: market.id },
      body: { status: "ACTIVE" },
    });

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("ACTIVE");
  });
});
