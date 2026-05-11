import ExchangeManager from "@b/utils/exchange";
import { hasClients, sendMessageToRoute } from "@b/handler/Websocket";
import { models } from "@b/db";
import { getWallet } from "@b/api/finance/wallet/utils";
import { updateWalletQuery } from "./index.post";
import { logError } from "@b/utils/logger";
import {
  loadBanStatus,
  saveBanStatus,
  handleExchangeError,
  formatWaitTime,
} from "../utils";
import { adjustOrderData } from "./utils";

export const metadata = {};

class OrderHandler {
  private static instance: OrderHandler;
  private trackedOrders: { [userId: string]: any[] } = {};
  private watchedUserIds: Set<string> = new Set();
  private orderInterval: NodeJS.Timeout | null = null;
  private lastFetchTime = 0;
  private unblockTime = 0;

  private constructor() {
    this.addUserToWatchlist = this.addUserToWatchlist.bind(this);
    this.removeUserFromWatchlist = this.removeUserFromWatchlist.bind(this);
    this.addOrderToTrackedOrders = this.addOrderToTrackedOrders.bind(this);
    this.removeOrderFromTrackedOrders =
      this.removeOrderFromTrackedOrders.bind(this);
    this.fetchOrdersForUser = this.fetchOrdersForUser.bind(this);
  }

  public static getInstance(): OrderHandler {
    if (!OrderHandler.instance) {
      OrderHandler.instance = new OrderHandler();
    }
    return OrderHandler.instance;
  }

  private startInterval() {
    if (!this.orderInterval) {
      this.orderInterval = setInterval(this.flushOrders.bind(this), 1000);
    }
  }

  private stopInterval() {
    if (this.orderInterval) {
      clearInterval(this.orderInterval);
      this.orderInterval = null;
    }
  }

  private async updateWalletBalance(userId, order, provider) {
    try {
      order = adjustOrderData(order, provider);
      const [currency, pair] = order.symbol.split("/");
      const amount = Number(order.amount);
      const cost = Number(order.cost);
      const fee = Number(order.fee || 0);

      const currencyWallet = await getWallet(userId, "SPOT", currency);
      const pairWallet = await getWallet(userId, "SPOT", pair);

      if (!currencyWallet || !pairWallet) {
        throw new Error("Wallet not found");
      }

      if (order.side === "BUY") {
        const newBalance = currencyWallet.balance + (amount - fee);
        await updateWalletQuery(currencyWallet.id, newBalance);
      } else {
        const newBalance = pairWallet.balance + (cost - fee);
        await updateWalletQuery(pairWallet.id, newBalance);
      }
    } catch (error) {
      logError("wallet", error, __filename);
    }
  }

  private flushOrders() {
    if (Object.keys(this.trackedOrders).length > 0) {
      const route = "/api/exchange/order";
      const streamKey = "orders";
      Object.keys(this.trackedOrders).forEach((userId) => {
        let orders = this.trackedOrders[userId];
        orders = orders.filter(
          (order) =>
            order.price &&
            order.amount &&
            order.filled !== undefined &&
            order.remaining !== undefined &&
            order.timestamp
        );

        const seenOrders = new Set();
        orders = orders.filter((order) => {
          const isDuplicate = seenOrders.has(order.id);
          seenOrders.add(order.id);
          return !isDuplicate;
        });

        if (orders.length > 0) {
          sendMessageToRoute(
            route,
            { userId },
            { stream: streamKey, data: orders }
          );
        }
      });
      this.trackedOrders = {};
    } else {
      this.stopInterval();
    }
  }

  private async fetchOpenOrdersWithRetries(exchange, symbol, provider) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (Date.now() < this.unblockTime) {
          throw new Error(
            `Blocked until ${new Date(this.unblockTime).toLocaleString()}`
          );
        }
        const orders = await exchange.fetchOpenOrders(symbol);
        const adjustedOrders = orders.map((order) =>
          adjustOrderData(order, provider)
        );
        return adjustedOrders.map((order) => ({
          ...order,
          status: order.status.toUpperCase(),
        }));
      } catch (error) {
        const result = await handleExchangeError(error, ExchangeManager);
        if (typeof result === "number") {
          this.unblockTime = result;
          await saveBanStatus(this.unblockTime);
          throw error;
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          throw error;
        }
      }
    }
  }

  private async fetchOrder(exchange, orderId, symbol, provider) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (Date.now() < this.unblockTime) {
          throw new Error(
            `Blocked until ${new Date(this.unblockTime).toLocaleString()}`
          );
        }
        const order = await exchange.fetchOrder(Number(orderId), symbol);
        order.status = order.status.toUpperCase();
        return adjustOrderData(order, provider);
      } catch (error) {
        const result = await handleExchangeError(error, ExchangeManager);
        if (typeof result === "number") {
          this.unblockTime = result;
          await saveBanStatus(this.unblockTime);
          throw error;
        }
        if (
          error.message.includes(
            "Order was canceled or expired with no executed qty over 90 days ago and has been archived"
          )
        ) {
          await this.removeOrder(orderId);
          return null;
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          throw error;
        }
      }
    }
  }

  private async updateOrder(orderId, data) {
    try {
      await models.exchangeOrder.update(
        { ...data },
        { where: { referenceId: orderId } }
      );
    } catch (error) {
      logError("exchange", error, __filename);
    }
  }

  private async removeOrder(orderId) {
    try {
      await models.exchangeOrder.destroy({
        where: { referenceId: orderId },
        force: true,
      });
    } catch (error) {
      logError("exchange", error, __filename);
    }
  }

  public addUserToWatchlist(userId) {
    if (!this.watchedUserIds.has(userId)) {
      this.watchedUserIds.add(userId);
      this.trackedOrders[userId] = this.trackedOrders[userId] || [];
      if (!this.orderInterval) {
        this.startInterval();
      }
    }
  }

  public removeUserFromWatchlist(userId) {
    if (this.watchedUserIds.has(userId)) {
      this.watchedUserIds.delete(userId);
      delete this.trackedOrders[userId];
    }
  }

  public removeOrderFromTrackedOrders(userId, orderId) {
    if (this.trackedOrders[userId]) {
      this.trackedOrders[userId] = this.trackedOrders[userId].filter(
        (order) => order.id !== orderId
      );
      if (this.trackedOrders[userId].length === 0) {
        delete this.trackedOrders[userId];
        this.removeUserFromWatchlist(userId);
      }
    }
  }

  public addOrderToTrackedOrders(userId, order) {
    this.trackedOrders[userId] = this.trackedOrders[userId] || [];
    this.trackedOrders[userId].push({
      id: order.id,
      status: order.status,
      price: order.price,
      amount: order.amount,
      filled: order.filled,
      remaining: order.remaining,
      timestamp: order.timestamp,
    });
  }

  public async fetchOrdersForUser(userId, userOrders, exchange, provider) {
    let symbols = userOrders.map((order) => order.symbol);

    while (
      hasClients("/api/exchange/order") &&
      this.watchedUserIds.has(userId)
    ) {
      const currentTime = Date.now();
      if (currentTime - this.lastFetchTime < 5000) {
        await new Promise((resolve) =>
          setTimeout(resolve, 5000 - (currentTime - this.lastFetchTime))
        );
      }

      this.lastFetchTime = Date.now();

      for (const symbol of symbols) {
        try {
          if (Date.now() < this.unblockTime) {
            const waitTime = this.unblockTime - Date.now();
            console.log(
              `Waiting for ${formatWaitTime(waitTime)} until unblock time`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(waitTime, 60000))
            );
            this.unblockTime = await loadBanStatus(); // Reload ban status
            continue;
          }

          const openOrders = await this.fetchOpenOrdersWithRetries(
            exchange,
            symbol,
            provider
          );

          if (!openOrders) {
            throw new Error("Failed to fetch open orders after retries");
          }

          for (const order of userOrders) {
            const updatedOrder = openOrders.find(
              (o) => o.id === order.referenceId
            );
            if (!updatedOrder) {
              const fetchedOrder = await this.fetchOrder(
                exchange,
                order.referenceId,
                symbol,
                provider
              );

              if (fetchedOrder) {
                if (fetchedOrder.status !== order.status) {
                  this.addOrderToTrackedOrders(userId, {
                    id: order.id,
                    status: fetchedOrder.status,
                    price: fetchedOrder.price,
                    amount: fetchedOrder.amount,
                    filled: fetchedOrder.filled,
                    remaining: fetchedOrder.remaining,
                    timestamp: fetchedOrder.timestamp,
                  });
                  await this.updateOrder(fetchedOrder.id, {
                    status: fetchedOrder.status.toUpperCase(),
                    price: fetchedOrder.price,
                    filled: fetchedOrder.filled,
                    remaining: fetchedOrder.remaining,
                  });
                  if (fetchedOrder.status === "CLOSED") {
                    userOrders.splice(userOrders.indexOf(order), 1);
                    await this.updateWalletBalance(
                      userId,
                      fetchedOrder,
                      provider
                    );
                  }
                }
              } else {
                await this.removeOrder(order.referenceId);
                userOrders.splice(userOrders.indexOf(order), 1);
                this.removeOrderFromTrackedOrders(userId, order.id);
                if (userOrders.length === 0) {
                  this.removeUserFromWatchlist(userId);
                  break;
                }
              }
            } else if (updatedOrder.status !== order.status) {
              this.addOrderToTrackedOrders(userId, {
                id: order.id,
                status: updatedOrder.status,
                price: updatedOrder.price,
                amount: updatedOrder.amount,
                filled: updatedOrder.filled,
                remaining: updatedOrder.remaining,
                timestamp: updatedOrder.timestamp,
              });
              await this.updateOrder(updatedOrder.id, {
                status: updatedOrder.status.toUpperCase(),
                price: updatedOrder.price,
                filled: updatedOrder.filled,
                remaining: updatedOrder.remaining,
              });
              if (updatedOrder.status === "CLOSED") {
                userOrders.splice(userOrders.indexOf(order), 1);
                await this.updateWalletBalance(userId, updatedOrder, provider);
              } else {
                order.status = updatedOrder.status;
              }
            }
          }

          if (openOrders.length > 0) {
            this.trackedOrders[userId] = this.trackedOrders[userId] || [];
            openOrders.forEach((order) => {
              if (!this.trackedOrders[userId].some((o) => o.id === order.id)) {
                this.addOrderToTrackedOrders(userId, {
                  id: order.id,
                  status: order.status,
                  price: order.price,
                  amount: order.amount,
                  filled: order.filled,
                  remaining: order.remaining,
                  timestamp: order.timestamp,
                });
              }
            });
          }

          if (userOrders.length === 0) {
            this.removeUserFromWatchlist(userId);
            break;
          }

          if (Object.keys(this.trackedOrders).length > 0) {
            this.startInterval();
          } else {
            this.stopInterval();
          }
        } catch (error) {
          logError("exchange", error, __filename);
          symbols = symbols.filter((s) => s !== symbol);
          const filteredOrders = userOrders.filter(
            (order) => order.symbol !== symbol
          );
          userOrders.length = 0;
          userOrders.push(...filteredOrders);

          if (userOrders.length === 0) {
            this.removeUserFromWatchlist(userId);
            break;
          }
        }
      }
    }
  }

  public async handleMessage(data: Handler, message) {
    if (typeof message === "string") {
      message = JSON.parse(message);
    }

    const { user } = data;
    if (!user?.id) {
      return;
    }

    const { userId } = message.payload;
    if (!userId) {
      return;
    }

    if (user.id !== userId) {
      return;
    }

    if (!this.watchedUserIds.has(userId)) {
      this.addUserToWatchlist(userId);
    } else {
      return;
    }

    const userOrders = await models.exchangeOrder.findAll({
      where: { userId: user.id, status: "OPEN" },
      attributes: ["id", "referenceId", "symbol", "status", "createdAt"],
      raw: true,
    });

    if (!userOrders.length) {
      this.removeUserFromWatchlist(userId);
      return;
    }

    const exchange = await ExchangeManager.startExchange();
    if (!exchange) return;
    const provider = await ExchangeManager.getProvider();

    this.fetchOrdersForUser(userId, userOrders, exchange, provider);
  }
}

export default async (data: Handler, message) => {
  const handler = OrderHandler.getInstance();
  await handler.handleMessage(data, message);
};

export const {
  addUserToWatchlist,
  removeUserFromWatchlist,
  addOrderToTrackedOrders,
  removeOrderFromTrackedOrders,
} = OrderHandler.getInstance();
