import { logger } from "@b/utils/console";
import type { MarketMakerEngine } from "./MarketMakerEngine";
import type { MarketMakerConfig } from "./MarketInstance";
import {
  insertBotOrder,
  updateBotOrder,
  getOpenBotOrders,
  cancelBotOrder,
  placeRealOrder,
  cancelRealOrder,
  getRealLiquidityOrdersBySymbol,
  AiBotOrder,
  RealLiquidityOrder,
} from "../scylla/queries";

// Order types
export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type OrderPurpose = "PRICE_PUSH" | "LIQUIDITY" | "SPREAD_MAINTENANCE" | "VOLATILITY";

// Order creation parameters
export interface CreateOrderParams {
  botId: string;
  side: OrderSide;
  type: OrderType;
  price: bigint;
  amount: bigint;
  purpose: OrderPurpose;
  isRealLiquidity?: boolean;
}

// Open order tracking
interface TrackedOrder {
  orderId: string;
  botId: string;
  side: OrderSide;
  price: bigint;
  amount: bigint;
  filledAmount: bigint;
  isRealLiquidity: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// Order expiration times in milliseconds
const AI_ORDER_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes for AI-only orders (should match quickly)
const REAL_ORDER_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour for real liquidity orders (need time to match with users)

/**
 * OrderManager - Manages orders for a single market
 *
 * Handles:
 * - Creating AI-only orders (in ai_bot_orders table)
 * - Creating real liquidity orders (in ecosystem orders table)
 * - Tracking open orders
 * - Canceling and expiring orders
 * - Order matching (for AI-to-AI trades)
 */
export class OrderManager {
  private config: MarketMakerConfig;
  private engine: MarketMakerEngine;

  // Open orders tracking (both AI and real)
  private openOrders: Map<string, TrackedOrder> = new Map();

  // Statistics
  private ordersCreated: number = 0;
  private ordersCanceled: number = 0;
  private ordersFilled: number = 0;

  constructor(config: MarketMakerConfig, engine: MarketMakerEngine) {
    this.config = config;
    this.engine = engine;
  }

  /**
   * Initialize - load existing open REAL LIQUIDITY orders only
   * AI-to-AI trades no longer create persistent orders, so we skip loading AI-only orders
   */
  public async initialize(): Promise<void> {
    try {
      // Only load real liquidity open orders (if realLiquidityPercent > 0)
      // AI-only orders are no longer created for AI-to-AI trades
      if (this.config.realLiquidityPercent > 0) {
        const realOrders = await getRealLiquidityOrdersBySymbol(this.config.symbol, "OPEN");
        for (const order of realOrders) {
          this.trackOrder({
            orderId: order.ecosystemOrderId,
            botId: order.aiBotOrderId,
            side: order.side,
            price: order.price,
            amount: order.amount,
            filledAmount: BigInt(0),
            isRealLiquidity: true,
            createdAt: order.createdAt,
            expiresAt: new Date(order.createdAt.getTime() + REAL_ORDER_EXPIRATION_MS),
          });
        }
      }

      logger.info("AI_MM",
        `OrderManager initialized with ${this.openOrders.size} real liquidity orders for ${this.config.symbol}`
      );
    } catch (error) {
      logger.error("AI_MM", "OrderManager initialization error", error);
      throw error;
    }
  }

  /**
   * Create a new order
   */
  public async createOrder(params: CreateOrderParams): Promise<string | null> {
    try {
      if (params.isRealLiquidity) {
        return this.createRealOrder(params);
      } else {
        return this.createAiOrder(params);
      }
    } catch (error) {
      logger.error("AI_MM", "Order creation error", error);
      return null;
    }
  }

  /**
   * Create an AI-only order
   */
  private async createAiOrder(params: CreateOrderParams): Promise<string | null> {
    const orderId = await insertBotOrder({
      marketId: this.config.marketId,
      botId: params.botId,
      side: params.side,
      type: params.type,
      price: params.price,
      amount: params.amount,
      filledAmount: BigInt(0),
      status: "OPEN",
      purpose: params.purpose,
    });

    // Track locally with shorter expiration for AI orders
    const now = new Date();
    this.trackOrder({
      orderId,
      botId: params.botId,
      side: params.side,
      price: params.price,
      amount: params.amount,
      filledAmount: BigInt(0),
      isRealLiquidity: false,
      createdAt: now,
      expiresAt: new Date(now.getTime() + AI_ORDER_EXPIRATION_MS), // Use shorter expiration for AI orders
    });

    this.ordersCreated++;
    return orderId;
  }

  /**
   * Create a real liquidity order (in ecosystem)
   * Uses pool liquidity - no user wallets needed
   */
  private async createRealOrder(params: CreateOrderParams): Promise<string | null> {
    // First create AI order to track
    const aiOrderId = await insertBotOrder({
      marketId: this.config.marketId,
      botId: params.botId,
      side: params.side,
      type: params.type,
      price: params.price,
      amount: params.amount,
      filledAmount: BigInt(0),
      status: "OPEN",
      purpose: params.purpose,
    });

    // Then place in ecosystem with marketMakerId/botId for pool-based matching
    const ecosystemOrder = await placeRealOrder(
      this.config.symbol,
      params.side,
      params.price,
      params.amount,
      aiOrderId,
      this.config.id,    // Pass market maker ID (config.id) for pool identification
      params.botId       // Pass bot ID for tracking
    );

    // Track locally with longer expiration for real liquidity orders
    const now = new Date();
    this.trackOrder({
      orderId: ecosystemOrder.id,
      botId: params.botId,
      side: params.side,
      price: params.price,
      amount: params.amount,
      filledAmount: BigInt(0),
      isRealLiquidity: true,
      createdAt: now,
      expiresAt: new Date(now.getTime() + REAL_ORDER_EXPIRATION_MS), // Use longer expiration for real orders
    });

    this.ordersCreated++;
    return ecosystemOrder.id;
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const order = this.openOrders.get(orderId);
      if (!order) {
        return false;
      }

      if (order.isRealLiquidity) {
        // Cancel in ecosystem - use botId as the userId (matches how order was created)
        await cancelRealOrder(
          orderId,
          order.botId,
          order.createdAt.toISOString(),
          this.config.symbol,
          order.price,
          order.side,
          order.amount - order.filledAmount
        );
      } else {
        // Cancel AI order
        await cancelBotOrder(this.config.marketId, orderId, order.createdAt);
      }

      this.openOrders.delete(orderId);
      this.ordersCanceled++;
      return true;
    } catch (error) {
      logger.error("AI_MM", "Order cancellation error", error);
      return false;
    }
  }

  /**
   * Cancel all open orders
   */
  public async cancelAllOrders(): Promise<void> {
    const orderIds = Array.from(this.openOrders.keys());
    await Promise.all(orderIds.map((id) => this.cancelOrder(id)));
    this.openOrders.clear();
  }

  /**
   * Cleanup expired orders
   */
  public async cleanupExpiredOrders(): Promise<void> {
    const now = new Date();
    const expiredOrders: string[] = [];

    for (const [orderId, order] of this.openOrders) {
      if (order.expiresAt <= now) {
        expiredOrders.push(orderId);
      }
    }

    for (const orderId of expiredOrders) {
      await this.cancelOrder(orderId);
    }

    if (expiredOrders.length > 0) {
      logger.info("AI_MM",
        `Cleaned up ${expiredOrders.length} expired orders for ${this.config.symbol}`
      );
    }
  }

  /**
   * Update order fill
   */
  public async updateOrderFill(
    orderId: string,
    filledAmount: bigint,
    status: "PARTIAL" | "FILLED"
  ): Promise<void> {
    const order = this.openOrders.get(orderId);
    if (!order) {
      return;
    }

    // Update in database
    if (!order.isRealLiquidity) {
      await updateBotOrder(this.config.marketId, orderId, order.createdAt, {
        filledAmount,
        status,
      });
    }

    // Update tracking
    order.filledAmount = filledAmount;

    if (status === "FILLED") {
      this.openOrders.delete(orderId);
      this.ordersFilled++;
    }
  }

  /**
   * Find matching orders for AI-to-AI trades
   */
  public findMatchingOrders(
    side: OrderSide,
    price: bigint,
    maxAmount: bigint
  ): TrackedOrder[] {
    const oppositeSide = side === "BUY" ? "SELL" : "BUY";
    const matches: TrackedOrder[] = [];
    let remainingAmount = maxAmount;

    for (const [, order] of this.openOrders) {
      // Only match AI-only orders
      if (order.isRealLiquidity) {
        continue;
      }

      // Must be opposite side
      if (order.side !== oppositeSide) {
        continue;
      }

      // Price must match (for BUY: sell price <= buy price, for SELL: buy price >= sell price)
      if (side === "BUY" && order.price > price) {
        continue;
      }
      if (side === "SELL" && order.price < price) {
        continue;
      }

      // Check available amount
      const available = order.amount - order.filledAmount;
      if (available <= BigInt(0)) {
        continue;
      }

      matches.push(order);
      remainingAmount -= available;

      if (remainingAmount <= BigInt(0)) {
        break;
      }
    }

    return matches;
  }

  /**
   * Get open order count
   */
  public getOpenOrderCount(): number {
    return this.openOrders.size;
  }

  /**
   * Get open buy/sell counts
   */
  public getOrderCounts(): { buys: number; sells: number } {
    let buys = 0;
    let sells = 0;

    for (const [, order] of this.openOrders) {
      if (order.side === "BUY") {
        buys++;
      } else {
        sells++;
      }
    }

    return { buys, sells };
  }

  /**
   * Get statistics
   */
  public getStats(): {
    openOrders: number;
    ordersCreated: number;
    ordersCanceled: number;
    ordersFilled: number;
  } {
    return {
      openOrders: this.openOrders.size,
      ordersCreated: this.ordersCreated,
      ordersCanceled: this.ordersCanceled,
      ordersFilled: this.ordersFilled,
    };
  }

  /**
   * Track an order locally
   */
  private trackOrder(order: TrackedOrder): void {
    this.openOrders.set(order.orderId, order);
  }

  /**
   * Get open orders
   */
  public getOpenOrders(): TrackedOrder[] {
    return Array.from(this.openOrders.values());
  }
}

export default OrderManager;
