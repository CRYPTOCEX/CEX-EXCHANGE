import { messageBroker } from "@b/handler/Websocket";
import { models } from "@b/db";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";

export const metadata = {
  requiresAuth: true,
};

// Track active subscriptions for P2P trade updates
// This is EVENT-DRIVEN - no polling. Updates are sent only when:
// 1. Client first subscribes (initial data)
// 2. Something happens (message, status change, etc.) via broadcastP2PTradeEvent
class P2PTradeDataHandler {
  private static instance: P2PTradeDataHandler;
  private activeSubscriptions: Map<string, Set<string>> = new Map(); // tradeId -> Set<clientId>

  private constructor() {}

  public static getInstance(): P2PTradeDataHandler {
    if (!P2PTradeDataHandler.instance) {
      P2PTradeDataHandler.instance = new P2PTradeDataHandler();
    }
    return P2PTradeDataHandler.instance;
  }

  /**
   * Get counterparty stats for a user
   */
  private async getCounterpartyStats(userId: string) {
    const totalTrades = await models.p2pTrade.count({
      where: {
        [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
        status: { [Op.in]: ["COMPLETED", "DISPUTE_RESOLVED", "CANCELLED", "EXPIRED"] },
      },
    });

    const completedTrades = await models.p2pTrade.count({
      where: {
        [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
        status: "COMPLETED",
      },
    });

    const completionRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 100;

    return { completedTrades, completionRate };
  }

  /**
   * Fetch and send initial trade data to a client
   * This is called only once when client subscribes
   */
  private async sendInitialData(tradeId: string, userId: string, isAdmin = false): Promise<void> {
    try {
      // Fetch trade with all relations
      const whereClause = isAdmin
        ? { id: tradeId }
        : { id: tradeId, [Op.or]: [{ buyerId: userId }, { sellerId: userId }] };

      const trade = await models.p2pTrade.findOne({
        where: whereClause,
        include: [
          { association: "buyer", attributes: ["id", "firstName", "lastName", "email", "avatar"] },
          { association: "seller", attributes: ["id", "firstName", "lastName", "email", "avatar"] },
          { association: "dispute" },
          {
            association: "paymentMethodDetails",
            attributes: ["id", "name", "icon", "processingTime", "instructions"],
            required: false
          },
          {
            association: "offer",
            attributes: ["id", "currency", "priceCurrency", "walletType", "type", "tradeSettings"],
            required: false
          },
        ],
      });

      if (!trade) {
        logger.warn("P2P_WS", `Trade ${tradeId} not found or user ${userId} not authorized`);
        return;
      }

      const tradeData = trade.toJSON() as any;

      // Get counterparty stats
      if (tradeData.buyer) {
        tradeData.buyer.name = `${tradeData.buyer.firstName || ''} ${tradeData.buyer.lastName || ''}`.trim();
        const buyerStats = await this.getCounterpartyStats(tradeData.buyer.id);
        tradeData.buyer.completedTrades = buyerStats.completedTrades;
        tradeData.buyer.completionRate = buyerStats.completionRate;
      }
      if (tradeData.seller) {
        tradeData.seller.name = `${tradeData.seller.firstName || ''} ${tradeData.seller.lastName || ''}`.trim();
        const sellerStats = await this.getCounterpartyStats(tradeData.seller.id);
        tradeData.seller.completedTrades = sellerStats.completedTrades;
        tradeData.seller.completionRate = sellerStats.completionRate;
      }

      // Add payment window from offer settings or platform default
      const { CacheManager } = await import("@b/utils/cache");
      const cacheManager = CacheManager.getInstance();
      const defaultPaymentWindow = await cacheManager.getSetting("p2pDefaultPaymentWindow") || 240;
      tradeData.paymentWindow = tradeData.offer?.tradeSettings?.autoCancel ||
        tradeData.offer?.tradeSettings?.paymentWindow ||
        defaultPaymentWindow;

      // Parse timeline if it's a string
      let timeline = tradeData.timeline || [];
      if (typeof timeline === 'string') {
        try {
          timeline = JSON.parse(timeline);
        } catch (e) {
          logger.error("P2P_WS", `Failed to parse timeline JSON: ${e}`);
          timeline = [];
        }
      }
      tradeData.timeline = timeline;

      // Filter messages from timeline
      const messages = Array.isArray(timeline)
        ? timeline
            .filter((entry: any) => entry.event === "MESSAGE")
            .map((entry: any) => ({
              id: entry.id || entry.createdAt,
              message: entry.message,
              senderId: entry.senderId,
              senderName: entry.senderName || "User",
              isAdminMessage: entry.isAdminMessage || false,
              createdAt: entry.createdAt,
            }))
        : [];

      // Broadcast initial data
      messageBroker.broadcastToSubscribedClients(
        `/api/p2p/trade/${tradeId}`,
        { tradeId, userId },
        {
          stream: "p2p-trade-data",
          data: {
            ...tradeData,
            messages,
          },
        }
      );
    } catch (error) {
      logger.error("P2P_WS", `Error sending initial data for trade ${tradeId}: ${error}`);
    }
  }

  /**
   * Check if user is an admin with P2P access
   */
  private async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await models.user.findByPk(userId, {
        include: [
          {
            model: models.role,
            as: "role",
            include: [
              {
                model: models.permission,
                as: "permissions",
                through: { attributes: [] },
              },
            ],
          },
        ],
      });

      if (!user || !user.role) return false;

      const permissions = (user.role as any).permissions || [];
      const hasAdminAccess = permissions.some(
        (p: any) =>
          p.name === "view.p2p.trade" ||
          p.name === "edit.p2p.trade" ||
          p.name === "view.p2p.dispute" ||
          p.name === "edit.p2p.dispute" ||
          p.name === "Access P2P Trade Management" ||
          p.name === "Access P2P Dispute Management"
      );

      return hasAdminAccess;
    } catch (error) {
      logger.error("P2P_WS", `Error checking admin status: ${error}`);
      return false;
    }
  }

  /**
   * Add a subscription for a trade
   */
  public async addSubscription(tradeId: string, userId: string, isAdminSubscription = false): Promise<void> {
    if (!tradeId || !userId) {
      logger.warn("P2P_WS", "No tradeId or userId provided in subscription request");
      return;
    }

    // Check if user is admin
    const isAdmin = isAdminSubscription || await this.isAdmin(userId);

    // Validate user has access to this trade
    let trade;
    if (isAdmin) {
      // Admin can access any trade
      trade = await models.p2pTrade.findByPk(tradeId, {
        attributes: ['id'],
      });
    } else {
      // Regular user must be buyer or seller
      trade = await models.p2pTrade.findOne({
        where: {
          id: tradeId,
          [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
        },
        attributes: ['id'],
      });
    }

    if (!trade) {
      logger.warn("P2P_WS", `Trade ${tradeId} not found or user ${userId} not authorized`);
      return;
    }

    // Add to subscriptions
    if (!this.activeSubscriptions.has(tradeId)) {
      this.activeSubscriptions.set(tradeId, new Set());
    }
    this.activeSubscriptions.get(tradeId)!.add(userId);

    // Send initial data to the newly subscribed client
    await this.sendInitialData(tradeId, userId, isAdmin);

    logger.info("P2P_WS", `${isAdmin ? 'Admin' : 'User'} ${userId} subscribed to trade ${tradeId}`);
  }

  /**
   * Remove a subscription
   */
  public removeSubscription(tradeId: string, userId: string): void {
    if (this.activeSubscriptions.has(tradeId)) {
      this.activeSubscriptions.get(tradeId)!.delete(userId);

      // If no more clients for this trade, clean up
      if (this.activeSubscriptions.get(tradeId)!.size === 0) {
        this.activeSubscriptions.delete(tradeId);
      }

      logger.debug("P2P_WS", `User ${userId} unsubscribed from trade ${tradeId}`);
    }
  }

  /**
   * Broadcast an event to all clients subscribed to a trade
   * This is called from trade actions (confirm, release, cancel, dispute, message)
   */
  public broadcastEvent(tradeId: string, event: {
    type: "TRADE_UPDATE" | "MESSAGE" | "STATUS_CHANGE" | "DISPUTE" | "ERROR";
    data: any;
  }): void {
    const subscriptions = this.activeSubscriptions.get(tradeId);
    if (!subscriptions || subscriptions.size === 0) {
      return;
    }

    // Broadcast to all subscribed clients
    for (const userId of subscriptions) {
      messageBroker.broadcastToSubscribedClients(
        `/api/p2p/trade/${tradeId}`,
        { tradeId, userId },
        {
          stream: "p2p-trade-event",
          data: {
            tradeId,
            timestamp: new Date().toISOString(),
            ...event,
          },
        }
      );
    }
  }

  /**
   * Check if there are any subscribers for a trade
   */
  public hasSubscribers(tradeId: string): boolean {
    const subscriptions = this.activeSubscriptions.get(tradeId);
    return subscriptions ? subscriptions.size > 0 : false;
  }

  /**
   * Remove all subscriptions for a specific client (called on disconnect)
   */
  public removeClientFromAllSubscriptions(clientId: string): void {
    const tradesToCleanup: string[] = [];

    for (const [tradeId, clients] of this.activeSubscriptions) {
      if (clients.has(clientId)) {
        clients.delete(clientId);

        if (clients.size === 0) {
          tradesToCleanup.push(tradeId);
        }
      }
    }

    for (const tradeId of tradesToCleanup) {
      this.activeSubscriptions.delete(tradeId);
    }

    if (tradesToCleanup.length > 0) {
      logger.debug("P2P_WS", `Cleaned up subscriptions for disconnected client ${clientId}`);
    }
  }
}

// Export the handler instance for external use
export const p2pTradeHandler = P2PTradeDataHandler.getInstance();

// Export helper function to broadcast events from trade actions
export function broadcastP2PTradeEvent(
  tradeId: string,
  event: {
    type: "TRADE_UPDATE" | "MESSAGE" | "STATUS_CHANGE" | "DISPUTE" | "ERROR";
    data: any;
  }
): void {
  p2pTradeHandler.broadcastEvent(tradeId, event);
}

// WebSocket message handler
export default async (data: Handler, message: any) => {
  // Parse the incoming message if it's a string
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const { action, payload } = message;
  const { tradeId, isAdmin } = payload || {};
  const userId = data.user?.id;

  if (!userId) {
    logger.error("P2P_WS", "No user ID found - authentication required");
    return;
  }

  if (!tradeId) {
    logger.error("P2P_WS", "No tradeId in payload");
    return;
  }

  const handler = P2PTradeDataHandler.getInstance();

  if (action === "SUBSCRIBE") {
    // Pass isAdmin flag - will be verified against actual permissions
    await handler.addSubscription(tradeId, userId, isAdmin === true);
  } else if (action === "UNSUBSCRIBE") {
    handler.removeSubscription(tradeId, userId);
  }
};

// Handle client disconnect
export const onClose = (ws: any, route: string, clientId: string) => {
  const handler = P2PTradeDataHandler.getInstance();
  handler.removeClientFromAllSubscriptions(clientId);
};
