import { messageBroker } from "@b/handler/Websocket";
import { models } from "@b/db";
import { getRecentBotTrades } from "../utils/scylla/queries";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "WebSocket connection for AI Market Maker market real-time updates",
  operationId: "connectAiMarketMakerMarketWebSocket",
  tags: ["Admin", "AI Market Maker", "Market"],
  description:
    "Establishes a WebSocket connection for real-time updates on AI Market Maker markets. Event-driven architecture - sends initial data on subscription, then pushes updates only when events occur (trades, orders, status changes, bot activities). Supports subscribing/unsubscribing to specific market makers with automatic cleanup on disconnect.",
  requiresAuth: true,
  permission: "view.ai.market-maker.market",
};

// Track active subscriptions for AI market maker updates
// This is EVENT-DRIVEN - no polling. Updates are sent only when:
// 1. Client first subscribes (initial data)
// 2. Something happens (trade, order, status change, etc.) via broadcastAiMarketMakerEvent
class AiMarketMakerDataHandler {
  private static instance: AiMarketMakerDataHandler;
  private activeSubscriptions: Map<string, Set<string>> = new Map(); // marketMakerId -> Set<clientId>

  private constructor() {}

  public static getInstance(): AiMarketMakerDataHandler {
    if (!AiMarketMakerDataHandler.instance) {
      AiMarketMakerDataHandler.instance = new AiMarketMakerDataHandler();
    }
    return AiMarketMakerDataHandler.instance;
  }

  /**
   * Fetch and send initial AI market maker data to a client
   * This is called only once when client subscribes
   * Each query is wrapped in try-catch for graceful error handling
   */
  private async sendInitialData(marketMakerId: string): Promise<void> {
    // Initialize data object with defaults for graceful degradation
    let makerData: any = null;
    let symbol: string | null = null;
    let recentTrades: any[] = [];
    let recentHistory: any[] = [];
    const errors: string[] = [];

    // 1. Fetch market maker with all relations (critical - without this we can't continue)
    try {
      const marketMaker = await models.aiMarketMaker.findByPk(marketMakerId, {
        include: [
          { model: models.aiMarketMakerPool, as: "pool" },
          { model: models.aiBot, as: "bots" },
          { model: models.ecosystemMarket, as: "market" },
        ],
      });

      if (!marketMaker) {
        logger.warn("AI_MM_WS", `Market maker ${marketMakerId} not found`);
        return;
      }

      makerData = marketMaker.get({ plain: true }) as any;
      symbol = makerData.market ? `${makerData.market.currency}/${makerData.market.pair}` : null;
    } catch (error) {
      logger.error("AI_MM_WS", `Failed to fetch market maker ${marketMakerId}`, error);
      errors.push("Failed to load market maker data");
      return; // Cannot continue without market maker data
    }

    // 2. Get recent trades from ScyllaDB (non-critical - continue on failure)
    if (symbol) {
      try {
        recentTrades = await getRecentBotTrades(makerData.marketId, 20);
      } catch (error) {
        logger.error("AI_MM_WS", `Failed to fetch recent trades for ${marketMakerId}`, error);
        errors.push("Failed to load recent trades");
        // Continue with empty trades array
      }
    }

    // 3. Get recent history from MySQL (non-critical - continue on failure)
    try {
      recentHistory = await models.aiMarketMakerHistory.findAll({
        where: { marketMakerId },
        order: [["createdAt", "DESC"]],
        limit: 20,
      });
    } catch (error) {
      logger.error("AI_MM_WS", `Failed to fetch history for ${marketMakerId}`, error);
      errors.push("Failed to load activity history");
      // Continue with empty history array
    }

    // Build the initial data payload
    const broadcastData = {
      stream: "ai-market-maker-data",
      data: {
        id: makerData.id,
        status: makerData.status,
        targetPrice: makerData.targetPrice,
        priceRangeLow: makerData.priceRangeLow,
        priceRangeHigh: makerData.priceRangeHigh,
        aggressionLevel: makerData.aggressionLevel,
        realLiquidityPercent: makerData.realLiquidityPercent,
        maxDailyVolume: makerData.maxDailyVolume,
        currentDailyVolume: makerData.currentDailyVolume,
        volatilityThreshold: makerData.volatilityThreshold,
        pauseOnHighVolatility: makerData.pauseOnHighVolatility,
        market: makerData.market ? {
          id: makerData.market.id,
          currency: makerData.market.currency,
          pair: makerData.market.pair,
          symbol,
        } : null,
        pool: makerData.pool ? {
          id: makerData.pool.id,
          baseCurrencyBalance: makerData.pool.baseCurrencyBalance,
          quoteCurrencyBalance: makerData.pool.quoteCurrencyBalance,
          totalValueLocked: makerData.pool.totalValueLocked,
          realizedPnL: makerData.pool.realizedPnL,
          unrealizedPnL: makerData.pool.unrealizedPnL,
        } : null,
        bots: (makerData.bots || []).map((bot: any) => ({
          id: bot.id,
          name: bot.name,
          personality: bot.personality,
          botType: bot.personality, // Alias for frontend compatibility
          status: bot.status,
          dailyTradeCount: bot.dailyTradeCount,
          maxDailyTrades: bot.maxDailyTrades,
          lastTradeAt: bot.lastTradeAt,
          avgOrderSize: bot.avgOrderSize,
          riskTolerance: bot.riskTolerance,
          // Performance tracking fields
          totalVolume: bot.totalVolume,
          realTradesExecuted: bot.realTradesExecuted,
          profitableTrades: bot.profitableTrades,
          totalRealizedPnL: bot.totalRealizedPnL,
          currentPosition: bot.currentPosition,
          avgEntryPrice: bot.avgEntryPrice,
        })),
        recentTrades: recentTrades.map((trade: any) => ({
          id: trade.id,
          price: trade.price,
          amount: trade.amount,
          buyBotId: trade.buyBotId,
          sellBotId: trade.sellBotId,
          createdAt: trade.createdAt,
        })),
        recentActivity: recentHistory.map((h: any) => ({
          id: h.id,
          action: h.action,
          details: h.details,
          priceAtAction: h.priceAtAction,
          poolValueAtAction: h.poolValueAtAction,
          createdAt: h.createdAt,
        })),
        // Include any errors that occurred during data fetching
        errors: errors.length > 0 ? errors : undefined,
      },
    };

    // Broadcast initial data to all subscribed clients
    // Note: path must match the actual WebSocket route
    messageBroker.broadcastToSubscribedClients(
      `/api/admin/ai/market-maker/market`,
      { marketMakerId },
      broadcastData
    );
  }

  /**
   * Add a subscription for a market maker
   */
  public async addSubscription(marketMakerId: string, clientId: string): Promise<void> {
    if (!marketMakerId) {
      logger.warn("AI_MM_WS", "No marketMakerId provided in subscription request");
      return;
    }

    // Validate market maker exists
    const marketMaker = await models.aiMarketMaker.findByPk(marketMakerId);
    if (!marketMaker) {
      logger.warn("AI_MM_WS", `Market maker ${marketMakerId} not found`);
      return;
    }

    // Add to subscriptions
    if (!this.activeSubscriptions.has(marketMakerId)) {
      this.activeSubscriptions.set(marketMakerId, new Set());
    }
    this.activeSubscriptions.get(marketMakerId)!.add(clientId);

    // Send initial data to the newly subscribed client
    await this.sendInitialData(marketMakerId);

    logger.info("AI_MM_WS", `Client ${clientId} subscribed to market maker ${marketMakerId}`);
  }

  /**
   * Remove a subscription
   */
  public removeSubscription(marketMakerId: string, clientId: string): void {
    if (this.activeSubscriptions.has(marketMakerId)) {
      this.activeSubscriptions.get(marketMakerId)!.delete(clientId);

      // If no more clients for this market maker, clean up
      if (this.activeSubscriptions.get(marketMakerId)!.size === 0) {
        this.activeSubscriptions.delete(marketMakerId);
      }

      logger.info("AI_MM_WS", `Client ${clientId} unsubscribed from market maker ${marketMakerId}`);
    }
  }

  /**
   * Broadcast an event to all clients subscribed to a market maker
   * This is called from the AI market maker engine when events occur (trades, orders, status changes, etc.)
   */
  public broadcastEvent(marketMakerId: string, event: {
    type: "TRADE" | "ORDER" | "STATUS_CHANGE" | "BOT_UPDATE" | "POOL_UPDATE" | "BOT_ACTIVITY" | "ERROR";
    data: any;
  }): void {
    const subscriptions = this.activeSubscriptions.get(marketMakerId);
    if (!subscriptions || subscriptions.size === 0) {
      if (process.env.NODE_ENV === "development" && event.type === "TRADE") {
        logger.debug("AI_MM_WS", `No subscribers for market ${marketMakerId}, skipping ${event.type} broadcast`);
      }
      return;
    }

    if (process.env.NODE_ENV === "development") {
      logger.debug("AI_MM_WS", `Broadcasting ${event.type} to ${subscriptions.size} subscribers for market ${marketMakerId}`);
    }

    // Note: path must match the actual WebSocket route
    messageBroker.broadcastToSubscribedClients(
      `/api/admin/ai/market-maker/market`,
      { marketMakerId },
      {
        stream: "ai-market-maker-event",
        data: {
          marketMakerId,
          timestamp: new Date().toISOString(),
          ...event,
        },
      }
    );
  }

  /**
   * Check if there are any subscribers for a market maker
   */
  public hasSubscribers(marketMakerId: string): boolean {
    const subscriptions = this.activeSubscriptions.get(marketMakerId);
    return subscriptions ? subscriptions.size > 0 : false;
  }

  /**
   * Clean up all subscriptions
   */
  public stop(): void {
    this.activeSubscriptions.clear();
  }

  /**
   * Remove all subscriptions for a specific client (called on disconnect)
   * This iterates through all market makers and removes the client from each
   */
  public removeClientFromAllSubscriptions(clientId: string): void {
    const marketMakersToCleanup: string[] = [];

    // Find all market makers this client is subscribed to
    for (const [marketMakerId, clients] of this.activeSubscriptions) {
      if (clients.has(clientId)) {
        clients.delete(clientId);

        // Mark for cleanup if no more subscribers
        if (clients.size === 0) {
          marketMakersToCleanup.push(marketMakerId);
        }
      }
    }

    // Clean up empty subscription sets
    for (const marketMakerId of marketMakersToCleanup) {
      this.activeSubscriptions.delete(marketMakerId);
    }

    if (marketMakersToCleanup.length > 0) {
      logger.info("AI_MM_WS", `Cleaned up subscriptions for disconnected client ${clientId}`);
    }
  }
}

// Export the handler instance for external use
export const aiMarketMakerHandler = AiMarketMakerDataHandler.getInstance();

// Export helper function to broadcast events from the AI market maker engine
export function broadcastAiMarketMakerEvent(
  marketMakerId: string,
  event: {
    type: "TRADE" | "ORDER" | "STATUS_CHANGE" | "BOT_UPDATE" | "POOL_UPDATE" | "BOT_ACTIVITY" | "ERROR";
    data: any;
  }
): void {
  aiMarketMakerHandler.broadcastEvent(marketMakerId, event);
}

/**
 * Broadcast bot activity event - used to show what bots are doing in real-time
 */
export function broadcastBotActivity(
  marketMakerId: string,
  activity: {
    botId: string;
    botName: string;
    action: "AI_TRADE" | "REAL_ORDER_PLACED" | "ORDER_CANCELLED" | "ANALYZING" | "WAITING" | "COOLDOWN";
    details: {
      side?: "BUY" | "SELL";
      price?: number;
      amount?: number;
      counterpartyBotId?: string;
      counterpartyBotName?: string;
      reason?: string;
    };
  }
): void {
  aiMarketMakerHandler.broadcastEvent(marketMakerId, {
    type: "BOT_ACTIVITY",
    data: activity,
  });
}

// WebSocket message handler
export default async (data: Handler, message: any) => {
  // Parse the incoming message if it's a string
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const { action, payload } = message;
  const { marketMakerId } = payload || {};
  const clientId = data.user?.id;

  if (!clientId) {
    logger.error("AI_MM_WS", "No client ID found");
    return;
  }

  if (!marketMakerId) {
    logger.error("AI_MM_WS", "No marketMakerId in payload");
    return;
  }

  const handler = AiMarketMakerDataHandler.getInstance();

  if (action === "SUBSCRIBE") {
    await handler.addSubscription(marketMakerId, clientId);
  } else if (action === "UNSUBSCRIBE") {
    handler.removeSubscription(marketMakerId, clientId);
  }
};

// Handle client disconnect
export const onClose = (ws: any, route: string, clientId: string) => {
  // Clean up all subscriptions for this client
  const handler = AiMarketMakerDataHandler.getInstance();
  handler.removeClientFromAllSubscriptions(clientId);
};
