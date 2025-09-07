import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { sendBinaryOrderEmail } from "@b/utils/emails";
import { createNotification } from "@b/utils/notifications";
import { messageBroker } from "@b/handler/Websocket";
import {
  ensureExchange,
  ensureNotBanned,
  getBinaryOrder,
  getBinaryOrdersByStatus,
  validateBinaryProfit,
} from "../utils";
import { broadcastLog } from "@b/utils/crons/broadcast";

// Dynamic profit margins per type
const binaryRiseFallProfit = validateBinaryProfit(
  process.env.NEXT_PUBLIC_BINARY_PROFIT
);
const binaryHigherLowerProfit = validateBinaryProfit(
  process.env.NEXT_PUBLIC_BINARY_HIGHER_LOWER_PROFIT
);
const binaryTouchNoTouchProfit = validateBinaryProfit(
  process.env.NEXT_PUBLIC_BINARY_TOUCH_NO_TOUCH_PROFIT
);
const binaryCallPutProfit = validateBinaryProfit(
  process.env.NEXT_PUBLIC_BINARY_CALL_PUT_PROFIT
);
const binaryTurboProfit = validateBinaryProfit(
  process.env.NEXT_PUBLIC_BINARY_TURBO_PROFIT
);

export class BinaryOrderService {
  private static orderIntervals = new Map<string, NodeJS.Timeout>();

  static async createOrder({
    userId,
    currency,
    pair,
    amount,
    side,
    type,
    durationType = "TIME",
    barrier,
    strikePrice,
    payoutPerPoint,
    closedAt,
    isDemo,
  }: {
    userId: string;
    currency: string;
    pair: string;
    amount: number;
    side: BinaryOrderSide;
    type: BinaryOrderType;
    durationType?: "TIME" | "TICKS";
    barrier?: number;
    strikePrice?: number;
    payoutPerPoint?: number;
    closedAt: string;
    isDemo: boolean;
  }) {
    validateCreateOrderInput({
      side,
      type,
      barrier,
      strikePrice,
      payoutPerPoint,
      durationType,
    });

    const market = (await models.exchangeMarket.findOne({
      where: { currency, pair },
    })) as exchangeMarketAttributes | null;

    if (!market || !market.metadata) {
      throw createError({ statusCode: 404, message: "Market data not found" });
    }

    const metadata =
      typeof market.metadata === "string"
        ? JSON.parse(market.metadata)
        : market.metadata;
    const minAmount = Number(metadata?.limits?.amount?.min || 0);
    const maxAmount = Number(metadata?.limits?.amount?.max || 0);

    if (amount < minAmount || amount > maxAmount) {
      throw createError({
        statusCode: 400,
        message: `Amount must be between ${minAmount} and ${maxAmount} ${currency}`,
      });
    }

    // Ensure closedAt is in the future
    const closeAtDate = new Date(closedAt);
    if (closeAtDate.getTime() <= Date.now()) {
      throw createError({
        statusCode: 400,
        message: "closedAt must be a future time",
      });
    }

    await ensureNotBanned();

    return await sequelize.transaction(async (t) => {
      let wallet;
      if (!isDemo) {
        wallet = await models.wallet.findOne({
          where: {
            userId: userId,
            currency: pair,
            type: "SPOT",
          },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!wallet) {
          throw createError({ statusCode: 404, message: "Wallet not found" });
        }

        const newBalance = wallet.balance - amount;
        if (newBalance < 0) {
          throw createError({
            statusCode: 400,
            message: "Insufficient balance",
          });
        }

        await models.wallet.update(
          { balance: newBalance },
          { where: { id: wallet.id }, transaction: t }
        );
      }

      const exchange = await ensureExchange();
      await ensureNotBanned();

      let ticker;
      try {
        ticker = await exchange.fetchTicker(`${currency}/${pair}`);
      } catch (err: any) {
        console.error(
          `Error fetching market data for ${currency}/${pair}:`,
          err
        );
        throw createError({
          statusCode: 500,
          message: "Error fetching market data from exchange",
        });
      }

      const price = ticker?.last;
      if (!price) {
        throw createError({
          statusCode: 500,
          message: "Error fetching ticker data (price unavailable)",
        });
      }

      const finalOrder = await models.binaryOrder.create(
        {
          userId: userId,
          symbol: `${currency}/${pair}`,
          type: type,
          side: side,
          status: "PENDING",
          price: price,
          profit: 0,
          amount: amount,
          isDemo: isDemo,
          closedAt: closeAtDate,
          barrier: ["HIGHER_LOWER", "TOUCH_NO_TOUCH", "TURBO"].includes(type)
            ? barrier
            : null,
          strikePrice: type === "CALL_PUT" ? strikePrice : null,
          payoutPerPoint:
            type === "CALL_PUT" || type === "TURBO" ? payoutPerPoint : null,
          durationType: type === "TURBO" ? durationType : "TIME",
        },
        { transaction: t }
      );

      if (!isDemo) {
        await models.transaction.create(
          {
            userId: userId,
            walletId: wallet!.id,
            type: "BINARY_ORDER",
            status: "PENDING",
            amount: amount,
            fee: 0,
            description: `Binary Position | Market: ${currency}/${pair} | Amount: ${amount} ${currency} | Price: ${price} | Side: ${side} | Expiration: ${closeAtDate.toLocaleString()} | Type: ${type} | DurationType: ${durationType}`,
            referenceId: finalOrder.id,
          },
          { transaction: t }
        );
      }

      this.scheduleOrderProcessing(finalOrder, userId);

      return finalOrder;
    });
  }

  static async processOrder(userId: string, orderId: string, symbol: string) {
    try {
      await ensureNotBanned();
      const exchange = await ensureExchange();

      const order = await getBinaryOrder(userId, orderId);
      if (!order) {
        console.error(`Order ${orderId} not found for user ${userId}.`);
        return;
      }

      const ticker = await exchange.fetchTicker(symbol);
      const closePrice = ticker?.last;
      if (closePrice == null) {
        console.error(`No close price found for ${symbol}. Order: ${orderId}`);
        return;
      }

      // Idempotency check
      if (order.status !== "PENDING") {
        console.error(
          `Order ${orderId} already processed with status ${order.status}. Skipping.`
        );
        return;
      }

      let touched = false;
      if (
        order.type === "TOUCH_NO_TOUCH" &&
        order.barrier != null &&
        order.createdAt
      ) {
        touched = await this.checkIfBarrierTouched(
          exchange,
          order.symbol,
          order.createdAt,
          order.closedAt,
          order.barrier
        );
      }

      let turboBreached = false;
      if (
        order.type === "TURBO" &&
        order.barrier != null &&
        (order.side === "UP" || order.side === "DOWN") &&
        order.createdAt
      ) {
        turboBreached = await this.checkTurboBarrierBreach(
          exchange,
          order.symbol,
          order.createdAt,
          order.closedAt,
          order.barrier,
          order.side as "UP" | "DOWN"
        );
      }

      const updateData = this.determineOrderStatus(
        order,
        closePrice,
        touched,
        turboBreached
      );

      await this.updateBinaryOrder(order.id, updateData);
      this.orderIntervals.delete(order.id);
    } catch (error) {
      console.error(`Error processing order ${orderId}:`, error);
    }
  }

  static async checkTurboBarrierBreach(
    exchange: any,
    symbol: string,
    start: Date,
    end: Date,
    barrier: number,
    side: "UP" | "DOWN"
  ): Promise<boolean> {
    const timeframe = "1m";
    const since = start.getTime();
    const until = end.getTime();
    let breached = false;
    let from = since;
    const limit = 1000;

    try {
      while (!breached && from < until) {
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, from, limit);

        if (!ohlcv || ohlcv.length === 0) {
          console.warn(
            `No OHLCV data for ${symbol} between ${new Date(from)} and ${new Date(
              until
            )}. Assuming no more data.`
          );
          break;
        }

        for (const candle of ohlcv) {
          const [timestamp, , high, low] = candle;
          if (side === "UP" && low < barrier) {
            breached = true;
            break;
          } else if (side === "DOWN" && high > barrier) {
            breached = true;
            break;
          }
          if (timestamp > until) {
            break;
          }
        }

        const lastCandleTime = ohlcv[ohlcv.length - 1][0];
        if (lastCandleTime <= from) {
          console.warn("No progress in OHLCV time. Stopping fetch loop.");
          break;
        }
        from = lastCandleTime + 60_000;
      }
    } catch (err) {
      console.error(`Error fetching OHLC data for TURBO check:`, err);
      breached = true;
    }

    return breached;
  }

  static async checkIfBarrierTouched(
    exchange: any,
    symbol: string,
    start: Date,
    end: Date,
    barrier: number
  ): Promise<boolean> {
    const timeframe = "1m";
    const since = start.getTime();
    const until = end.getTime();
    let touched = false;
    let from = since;
    const limit = 1000;

    try {
      while (!touched && from < until) {
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, from, limit);

        if (!ohlcv || ohlcv.length === 0) {
          console.warn(
            `No OHLCV data for ${symbol} between ${new Date(from)} and ${new Date(
              until
            )}.`
          );
          break;
        }

        for (const candle of ohlcv) {
          const [timestamp, , high, low] = candle;
          if (high >= barrier && low <= barrier) {
            touched = true;
            break;
          }
          if (timestamp > until) break;
        }

        const lastCandleTime = ohlcv[ohlcv.length - 1][0];
        if (lastCandleTime <= from) {
          console.warn("No progress in OHLCV time. Stopping fetch loop.");
          break;
        }

        from = lastCandleTime + 60_000;
      }
    } catch (err) {
      console.error(`Error fetching OHLC data for TOUCH_NO_TOUCH:`, err);
    }

    return touched;
  }

  static async cancelOrder(
    userId: string,
    orderId: string,
    percentage?: number
  ) {
    const order = await getBinaryOrder(userId, orderId);
    if (!order) {
      throw createError(404, "Order not found");
    }

    if (["CANCELED", "WIN", "LOSS", "DRAW"].includes(order.status)) {
      console.error(
        `Order ${orderId} is already ${order.status}. Cannot cancel again.`
      );
      return { message: "Order already processed or canceled." };
    }

    await ensureNotBanned();
    const exchange = await ensureExchange();

    const ticker = await exchange.fetchTicker(order.symbol);
    const currentPrice = ticker.last;
    if (!currentPrice) {
      throw createError(
        500,
        "Error fetching current price for the order symbol"
      );
    }

    const now = Date.now();
    const expiryTime = new Date(order.closedAt).getTime();

    if (order.type === "CALL_PUT") {
      if (expiryTime - now <= 60_000) {
        throw createError(
          400,
          "Cannot sell the CALL/PUT contract within 60 seconds of expiry."
        );
      }
    } else if (order.type === "TURBO") {
      if (order.durationType === "TICKS") {
        throw createError(
          400,
          "Cannot sell a TURBO contract with TICKS duration early."
        );
      }
      if (expiryTime - now <= 15_000) {
        throw createError(
          400,
          "Cannot sell the TURBO contract within 15 seconds of expiry."
        );
      }
    }

    await this.processStandardCancel(order, currentPrice, percentage);
    return { message: "Order cancelled" };
  }

  private static async processStandardCancel(
    order: binaryOrderAttributes,
    currentPrice: number,
    percentage?: number
  ) {
    await sequelize.transaction(async (t) => {
      if (!order.isDemo) {
        const transactionRecord = await models.transaction.findOne({
          where: { referenceId: order.id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!transactionRecord) {
          throw createError(404, "Transaction not found for completed order");
        }

        const wallet = await models.wallet.findOne({
          where: { id: transactionRecord.walletId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!wallet) {
          throw createError(404, "Wallet not found");
        }

        let partialReturn = order.amount;
        if (percentage !== undefined) {
          const cutAmount = order.amount * (Math.abs(percentage) / 100);
          partialReturn = order.amount - cutAmount;
          if (partialReturn < 0) partialReturn = 0;
        }

        const newBalance = wallet.balance + partialReturn;

        await models.wallet.update(
          { balance: newBalance },
          { where: { id: wallet.id }, transaction: t }
        );

        await models.transaction.destroy({
          where: { id: transactionRecord.id },
          force: true,
          transaction: t,
        });
      }

      if (this.orderIntervals.has(order.id)) {
        clearTimeout(this.orderIntervals.get(order.id));
        this.orderIntervals.delete(order.id);
      }

      await models.binaryOrder.update(
        { status: "CANCELED", closePrice: currentPrice, profit: 0 },
        { where: { id: order.id }, transaction: t }
      );
    });
  }

  static async processPendingOrders(shouldBroadcast: boolean = true) {
    const cronName = "processPendingOrders";
    try {
      const pendingOrders = await getBinaryOrdersByStatus("PENDING");
      const currentTime = Date.now();

      const unmonitoredOrders = pendingOrders.filter((order) => {
        const closedAtTime = new Date(order.closedAt).getTime();
        return (
          closedAtTime <= currentTime && !this.orderIntervals.has(order.id)
        );
      });

      const exchange = await ensureExchange();

      for (const order of unmonitoredOrders) {
        if (order.status !== "PENDING") {
          if (shouldBroadcast) {
            broadcastLog(
              cronName,
              `Order ${order.id} already processed as ${order.status}. Skipping.`,
              "error"
            );
          }
          continue;
        }

        const timeframe = "1m";
        let closePrice: number | undefined;

        try {
          const ohlcv = await exchange.fetchOHLCV(
            order.symbol,
            timeframe,
            Number(order.closedAt) - 60000,
            2
          );

          if (ohlcv && ohlcv.length > 1) {
            closePrice = ohlcv[1][4];
          } else {
            if (shouldBroadcast) {
              broadcastLog(
                cronName,
                `Not enough OHLCV data for order ${order.id} to determine closePrice. Using ticker.`,
                "warning"
              );
            }
            const ticker = await exchange.fetchTicker(order.symbol);
            closePrice = ticker.last;
          }
        } catch (err: any) {
          if (shouldBroadcast) {
            broadcastLog(
              cronName,
              `Error fetching OHLCV for pending order ${order.id}: ${err.message}`,
              "error"
            );
          }
          const ticker = await exchange.fetchTicker(order.symbol);
          closePrice = ticker.last;
        }

        if (closePrice === undefined) {
          if (shouldBroadcast) {
            broadcastLog(
              cronName,
              `Unable to determine closePrice for order ${order.id}. Skipping.`,
              "error"
            );
          }
          continue;
        }

        const updateData = this.determineOrderStatus(order, closePrice);
        await this.updateBinaryOrder(order.id, updateData);
      }
    } catch (error: any) {
      if (shouldBroadcast) {
        broadcastLog(
          cronName,
          `Error in processPendingOrders: ${error.message}`,
          "error"
        );
      }
      throw error;
    }
  }

  static determineOrderStatus(
    order: binaryOrderAttributes,
    closePrice: number,
    touched?: boolean,
    turboBreached?: boolean
  ): Partial<binaryOrderAttributes> {
    const updateData: Partial<binaryOrderAttributes> = {
      closePrice,
      profit: 0,
    };
    switch (order.type) {
      case "RISE_FALL":
        return determineRiseFallStatus(order, closePrice, updateData);
      case "HIGHER_LOWER":
        return determineHigherLowerStatus(order, closePrice, updateData);
      case "TOUCH_NO_TOUCH":
        return determineTouchNoTouchStatus(order, touched, updateData);
      case "CALL_PUT":
        return determineCallPutStatus(order, closePrice, updateData);
      case "TURBO":
        return determineTurboStatus(
          order,
          closePrice,
          turboBreached,
          updateData
        );
      default:
        updateData.status = "LOSS";
        return updateData;
    }
  }

  static async updateBinaryOrder(
    orderId: string,
    updateData: Partial<binaryOrderAttributes>
  ) {
    await sequelize.transaction(async (t) => {
      await models.binaryOrder.update(updateData, {
        where: { id: orderId },
        transaction: t,
      });

      const order = (await models.binaryOrder.findOne({
        where: { id: orderId },
        transaction: t,
      })) as binaryOrderAttributes | null;

      if (!order) throw new Error("Order not found after update");

      if (!order.isDemo && ["WIN", "LOSS", "DRAW"].includes(order.status)) {
        const transactionRecord = await models.transaction.findOne({
          where: { referenceId: orderId },
          transaction: t,
        });

        if (!transactionRecord) {
          throw new Error("Transaction not found for completed order");
        }

        await models.transaction.update(
          { status: "COMPLETED" },
          { where: { id: transactionRecord.id }, transaction: t }
        );

        const wallet = await models.wallet.findOne({
          where: { id: transactionRecord.walletId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!wallet) throw new Error("Wallet not found to update balance");

        let { balance } = wallet;
        balance = applyFinalPayout(order, balance);

        await models.wallet.update(
          { balance },
          { where: { id: wallet.id }, transaction: t }
        );
      }

      if (["WIN", "LOSS", "DRAW"].includes(order.status!)) {
        await messageBroker.broadcastToSubscribedClients(
          "/api/exchange/binary/order",
          { type: "order", symbol: order.symbol, userId: order.userId },
          {
            type: "ORDER_COMPLETED",
            order,
          }
        );

        const user = await models.user.findOne({
          where: { id: order.userId },
          transaction: t,
        });
        if (user) {
          try {
            await sendBinaryOrderEmail(user, order);
            await createNotification({
              userId: user.id,
              relatedId: order.id,
              title: "Binary Order Completed",
              message: `Your binary order for ${order.symbol} has been completed with a status of ${order.status}`,
              type: "system",
              link: `/binary/orders/${order.id}`,
              actions: [
                {
                  label: "View Order",
                  link: `/binary/orders/${order.id}`,
                  primary: true,
                },
              ],
            });
          } catch (error) {
            console.error(
              `Error sending binary order email for user ${user.id}, order ${order.id}:`,
              error
            );
          }
        }
      }
    });
  }

  private static scheduleOrderProcessing(
    order: binaryOrderAttributes,
    userId: string
  ) {
    const currentTimeUtc = Date.now();
    const closedAt = order.closedAt.getTime();
    const delay = closedAt - currentTimeUtc;

    if (delay < 0) {
      console.warn(
        `Order ${order.id} closedAt is in the past. Processing immediately.`
      );
      this.processOrder(userId, order.id, order.symbol);
      return;
    }

    const timer = setTimeout(() => {
      this.processOrder(userId, order.id, order.symbol);
    }, delay);

    this.orderIntervals.set(order.id, timer);
  }
}

function applyFinalPayout(
  order: binaryOrderAttributes,
  balance: number
): number {
  switch (order.status) {
    case "WIN":
      return balance + order.amount + order.profit;
    case "LOSS":
      return balance;
    case "DRAW":
      return balance + order.amount;
    default:
      return balance;
  }
}

// Determination functions
function determineRiseFallStatus(
  order: binaryOrderAttributes,
  closePrice: number,
  updateData: Partial<binaryOrderAttributes>
) {
  if (order.side === "RISE") {
    if (closePrice > order.price) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryRiseFallProfit / 100);
    } else if (closePrice === order.price) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  } else {
    if (closePrice < order.price) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryRiseFallProfit / 100);
    } else if (closePrice === order.price) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  }
  return updateData;
}

function determineHigherLowerStatus(
  order: binaryOrderAttributes,
  closePrice: number,
  updateData: Partial<binaryOrderAttributes>
) {
  const hlBarrier = order.barrier!;
  if (order.side === "HIGHER") {
    if (closePrice > hlBarrier) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryHigherLowerProfit / 100);
    } else if (closePrice === hlBarrier) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  } else {
    if (closePrice < hlBarrier) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryHigherLowerProfit / 100);
    } else if (closePrice === hlBarrier) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  }
  return updateData;
}

function determineTouchNoTouchStatus(
  order: binaryOrderAttributes,
  touched: boolean | undefined,
  updateData: Partial<binaryOrderAttributes>
) {
  if (order.side === "TOUCH") {
    if (touched) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryTouchNoTouchProfit / 100);
    } else {
      updateData.status = "LOSS";
    }
  } else {
    if (!touched) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryTouchNoTouchProfit / 100);
    } else {
      updateData.status = "LOSS";
    }
  }
  return updateData;
}

function determineCallPutStatus(
  order: binaryOrderAttributes,
  closePrice: number,
  updateData: Partial<binaryOrderAttributes>
) {
  const { strikePrice } = order;
  if (!strikePrice) {
    console.error(
      `CALL_PUT order ${order.id} missing strikePrice. Defaulting to LOSS.`
    );
    updateData.status = "LOSS";
    return updateData;
  }
  if (order.side === "CALL") {
    if (closePrice > strikePrice) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryCallPutProfit / 100);
    } else if (closePrice === strikePrice) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  } else {
    if (closePrice < strikePrice) {
      updateData.status = "WIN";
      updateData.profit = order.amount * (binaryCallPutProfit / 100);
    } else if (closePrice === strikePrice) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  }
  return updateData;
}

function determineTurboStatus(
  order: binaryOrderAttributes,
  closePrice: number,
  turboBreached: boolean | undefined,
  updateData: Partial<binaryOrderAttributes>
) {
  const { barrier, payoutPerPoint } = order;
  if (!barrier || !payoutPerPoint) {
    console.error(
      `TURBO order ${order.id} missing barrier or payoutPerPoint. Defaulting to LOSS.`
    );
    updateData.status = "LOSS";
    return updateData;
  }
  if (turboBreached) {
    updateData.status = "LOSS";
    return updateData;
  }
  let payoutValue = 0;
  if (order.side === "UP") {
    if (closePrice > barrier) {
      payoutValue = (closePrice - barrier) * payoutPerPoint;
      if (payoutValue > order.amount) {
        updateData.status = "WIN";
        updateData.profit = payoutValue - order.amount;
      } else if (payoutValue === order.amount) {
        updateData.status = "DRAW";
      } else {
        updateData.status = "LOSS";
      }
    } else if (closePrice === barrier) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  } else {
    if (closePrice < barrier) {
      payoutValue = (barrier - closePrice) * payoutPerPoint;
      if (payoutValue > order.amount) {
        updateData.status = "WIN";
        updateData.profit = payoutValue - order.amount;
      } else if (payoutValue === order.amount) {
        updateData.status = "DRAW";
      } else {
        updateData.status = "LOSS";
      }
    } else if (closePrice === barrier) {
      updateData.status = "DRAW";
    } else {
      updateData.status = "LOSS";
    }
  }
  return updateData;
}

// Validation
function validateIsPositiveNumber(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (typeof value !== "number" || isNaN(value) || value <= 0) {
    errors.push(`${fieldName} is required and must be a positive number`);
  }
}

function validateAllowedValues(
  value: string,
  allowedValues: readonly string[],
  fieldName: string,
  errors: string[]
) {
  if (!allowedValues.includes(value)) {
    errors.push(`Invalid ${fieldName}: ${value}`);
  }
}

const typeConfig: Record<BinaryOrderType, OrderValidationConfig> = {
  RISE_FALL: { validSides: ["RISE", "FALL"] as const },
  HIGHER_LOWER: {
    validSides: ["HIGHER", "LOWER"] as const,
    requiresBarrier: true,
  },
  TOUCH_NO_TOUCH: {
    validSides: ["TOUCH", "NO_TOUCH"] as const,
    requiresBarrier: true,
  },
  CALL_PUT: {
    validSides: ["CALL", "PUT"] as const,
    requiresStrikePrice: true,
    requiresPayoutPerPoint: true,
  },
  TURBO: {
    validSides: ["UP", "DOWN"] as const,
    requiresBarrier: true,
    requiresPayoutPerPoint: true,
    requiresDurationType: ["TIME", "TICKS"] as const,
  },
};

export function validateCreateOrderInput(
  params: ValidateCreateOrderInputParams
) {
  const { side, type, barrier, strikePrice, payoutPerPoint, durationType } =
    params;
  const errors: string[] = [];

  if (!(type in typeConfig)) {
    throw createError({ statusCode: 400, message: `Invalid type: ${type}` });
  }

  const config = typeConfig[type];

  validateAllowedValues(side, config.validSides, "side", errors);

  if (config.requiresBarrier) {
    validateIsPositiveNumber(barrier, "barrier", errors);
  }
  if (config.requiresStrikePrice) {
    validateIsPositiveNumber(strikePrice, "strikePrice", errors);
  }
  if (config.requiresPayoutPerPoint) {
    validateIsPositiveNumber(payoutPerPoint, "payoutPerPoint", errors);
  }
  if (config.requiresDurationType) {
    if (!durationType) {
      errors.push("durationType is required");
    } else {
      validateAllowedValues(
        durationType,
        config.requiresDurationType,
        "durationType",
        errors
      );
    }
  }

  if (errors.length > 0) {
    const errorMessage = errors.join(", ");
    throw createError({ statusCode: 400, message: errorMessage });
  }
}
