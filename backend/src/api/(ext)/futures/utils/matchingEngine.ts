// Safe import for ecosystem modules
let client: any;
let scyllaFuturesKeyspace: any;
let fromBigInt: any;
let removeTolerance: any;
let toBigIntFloat: any;
let normalizeTimeToInterval: any;
let Candle: any;
try {
  const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
  client = clientModule.default;
  scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;

  const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
  fromBigInt = blockchainModule.fromBigInt;
  removeTolerance = blockchainModule.removeTolerance;
  toBigIntFloat = blockchainModule.toBigIntFloat;

  const wsModule = require("@b/api/(ext)/ecosystem/utils/ws");
  normalizeTimeToInterval = wsModule.normalizeTimeToInterval;

  const queriesModule = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
  Candle = queriesModule.Candle;
} catch (e) {
  // Ecosystem extension not available
}
import { applyUpdatesToOrderBook } from "./orderbook";
import {
  handleCandleBroadcast,
  handleOrderBookBroadcast,
  handleOrderBroadcast,
  handleTickerBroadcast,
  handleTickersBroadcast,
  handlePositionBroadcast,
} from "./ws";
import { getFuturesMarkets } from "./markets";
import { logError } from "@b/utils/logger";
import { getLatestOrdersForCandles, intervals } from "./candles";
import { matchAndCalculateOrders, validateOrder } from "./matchmaking";
import {
  FuturesOrder,
  generateOrderUpdateQueries,
  getAllOpenOrders,
  uuidToString,
} from "./queries/order";
import { getLastCandles, getYesterdayCandles } from "./queries/candle";
import {
  fetchExistingAmounts,
  fetchOrderBooks,
  generateOrderBookUpdateQueries,
  updateSingleOrderBook,
} from "./queries/orderbook";
import {
  getAllOpenPositions,
  getPositions,
  updatePositionInDB,
} from "./queries/positions"; // Import getPositions and updatePositionInDB
import { checkForLiquidation } from "./liquidation"; // Import checkForLiquidation
import { calculateUnrealizedPnl } from "./position";

export class FuturesMatchingEngine {
  private static instancePromise: Promise<FuturesMatchingEngine> | null = null;
  private orderQueue: Record<string, FuturesOrder[]> = {};
  private marketsBySymbol: Record<string, any> = {};
  private lockedOrders: Set<string> = new Set();
  private lastCandle: Record<string, Record<string, any>> = {};
  private yesterdayCandle: Record<string, any> = {};

  public static getInstance(): Promise<FuturesMatchingEngine> {
    if (!this.instancePromise) {
      this.instancePromise = (async () => {
        const instance = new FuturesMatchingEngine();
        await instance.init();
        return instance;
      })();
    }
    return this.instancePromise;
  }

  public async init() {
    if (!client || !scyllaFuturesKeyspace) {
      console.warn("Ecosystem extension not available, futures matching engine disabled");
      return;
    }

    await this.initializeMarkets();
    await this.initializeOrders();
    await this.initializeLastCandles();
    await this.initializeYesterdayCandles();
    await this.initializePositions(); // Initialize positions
  }

  private async initializeMarkets() {
    const markets: any[] = await getFuturesMarkets();
    markets.forEach((market) => {
      // Construct symbol from currency and pair (e.g., MASH + USDT = MASH/USDT)
      const symbol = `${market.currency}/${market.pair}`;
      // Add symbol property to market object
      market.symbol = symbol;
      this.marketsBySymbol[symbol] = market;
      this.orderQueue[symbol] = [];
    });
  }

  private async initializeOrders() {
    try {
      const openOrders = await getAllOpenOrders();
      openOrders.forEach((order) => {
        const createdAt = new Date(order.createdAt);
        const updatedAt = new Date(order.updatedAt);

        if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
          logError(
            "matching_engine",
            new Error("Invalid date in order"),
            __filename
          );
          return;
        }

        if (!order.userId?.buffer || !order.id?.buffer) {
          logError(
            "matching_engine",
            new Error("Invalid Uuid in order"),
            __filename
          );
          return;
        }

        const normalizedOrder: FuturesOrder = {
          ...order,
          userId: uuidToString(order.userId),
          id: uuidToString(order.id),
          amount: BigInt(order.amount ?? 0),
          price: BigInt(order.price ?? 0),
          cost: BigInt(order.cost ?? 0),
          fee: BigInt(order.fee ?? 0),
          remaining: BigInt(order.remaining ?? 0),
          filled: BigInt(order.filled ?? 0),
          createdAt,
          updatedAt,
          leverage: BigInt(order.leverage ?? 0),
          stopLossPrice: order.stopLossPrice
            ? BigInt(order.stopLossPrice)
            : null,
          takeProfitPrice: order.takeProfitPrice
            ? BigInt(order.takeProfitPrice)
            : null,
        };

        if (!this.orderQueue[normalizedOrder.symbol]) {
          this.orderQueue[normalizedOrder.symbol] = [];
        }
        this.orderQueue[normalizedOrder.symbol].push(normalizedOrder);
      });

      await this.processQueue();
    } catch (error) {
      logError("matching_engine", error, __filename);
      console.error(
        `Failed to populate order queue with open orders: ${error}`
      );
    }
  }

  private async initializeLastCandles() {
    try {
      const lastCandles = await getLastCandles();

      lastCandles.forEach((candle) => {
        if (!this.lastCandle[candle.symbol]) {
          this.lastCandle[candle.symbol] = {};
        }
        this.lastCandle[candle.symbol][candle.interval] = candle;
      });
    } catch (error) {
      logError("matching_engine", error, __filename);
      console.error(`Failed to initialize last candles: ${error}`);
    }
  }

  private async initializeYesterdayCandles() {
    try {
      const yesterdayCandles = await getYesterdayCandles();

      Object.keys(yesterdayCandles).forEach((symbol) => {
        const candles = yesterdayCandles[symbol];
        if (candles.length > 0) {
          this.yesterdayCandle[symbol] = candles[0];
        }
      });
    } catch (error) {
      logError("matching_engine", error, __filename);
      console.error(`Failed to initialize yesterday's candles: ${error}`);
    }
  }

  private async initializePositions() {
    if (!toBigIntFloat || !fromBigInt) {
      console.warn("Ecosystem extension not available for position initialization");
      return;
    }

    try {
      const openPositions = await getAllOpenPositions();
      const userIds = [
        ...new Set(openPositions.map((position) => position.userId)),
      ]; // Extract unique user IDs

      await Promise.all(
        userIds.map(async (userId) => {
          const positions = openPositions.filter(
            (position) => position.userId === userId
          );
          await Promise.all(
            positions.map(async (position) => {
              const lastCandle = this.lastCandle[position.symbol]?.["1m"];
              if (lastCandle) {
                const currentPrice = toBigIntFloat(lastCandle.close);
                const unrealizedPnl = calculateUnrealizedPnl(
                  position.entryPrice,
                  position.amount,
                  currentPrice,
                  position.side as "BUY" | "SELL"
                );

                await updatePositionInDB(
                  position.userId,
                  position.id,
                  position.entryPrice,
                  position.amount,
                  unrealizedPnl,
                  position.stopLossPrice,
                  position.takeProfitPrice
                );

                await checkForLiquidation(
                  position,
                  Number(fromBigInt(currentPrice))
                );
              }
            })
          );
        })
      );
    } catch (error) {
      logError("matching_engine", error, __filename);
      console.error(`Failed to initialize positions: ${error}`);
    }
  }

  private async processQueue() {
    if (!client || !removeTolerance || !toBigIntFloat) {
      console.warn("Ecosystem extension not available for queue processing");
      return;
    }

    const ordersToUpdate: FuturesOrder[] = [];
    const orderBookUpdates: Record<string, any> = {};

    const allOrderBookEntries = await fetchOrderBooks();

    const mappedOrderBook: Record<
      string,
      Record<"bids" | "asks", Record<string, bigint>>
    > = {};

    allOrderBookEntries?.forEach((entry) => {
      if (!mappedOrderBook[entry.symbol]) {
        mappedOrderBook[entry.symbol] = { bids: {}, asks: {} };
      }
      mappedOrderBook[entry.symbol][entry.side.toLowerCase()][
        removeTolerance(toBigIntFloat(Number(entry.price))).toString()
      ] = removeTolerance(toBigIntFloat(Number(entry.amount)));
    });

    const calculationPromises: Promise<void>[] = [];
    for (const symbol in this.orderQueue) {
      const orders = this.orderQueue[symbol];
      if (orders.length === 0) continue;

      const promise = (async () => {
        const { matchedOrders, bookUpdates } = await matchAndCalculateOrders(
          orders,
          mappedOrderBook[symbol] || { bids: {}, asks: {} }
        );

        if (matchedOrders.length === 0) {
          return;
        }

        ordersToUpdate.push(...matchedOrders);
        orderBookUpdates[symbol] = bookUpdates;
      })();

      calculationPromises.push(promise);
    }

    await Promise.all(calculationPromises);

    if (ordersToUpdate.length === 0) {
      return;
    }

    await this.performUpdates(ordersToUpdate, orderBookUpdates);

    const finalOrderBooks: Record<string, any> = {};
    for (const symbol in orderBookUpdates) {
      finalOrderBooks[symbol] = applyUpdatesToOrderBook(
        mappedOrderBook[symbol],
        orderBookUpdates[symbol]
      );
    }

    const cleanupPromises: Promise<void>[] = [];
    for (const symbol in this.orderQueue) {
      const promise = (async () => {
        this.orderQueue[symbol] = this.orderQueue[symbol].filter(
          (order) => order.status === "OPEN"
        );
      })();

      cleanupPromises.push(promise);
    }

    await Promise.all(cleanupPromises);

    this.broadcastUpdates(ordersToUpdate, finalOrderBooks);
  }

  private async performUpdates(
    ordersToUpdate: FuturesOrder[],
    orderBookUpdates: Record<string, any>
  ) {
    const locked = this.lockOrders(ordersToUpdate);
    if (!locked) {
      console.warn(
        "Couldn't obtain a lock on all orders, skipping this batch."
      );
      return;
    }

    const updateQueries: Array<{ query: string; params: any[] }> = [];

    updateQueries.push(...generateOrderUpdateQueries(ordersToUpdate));

    const latestOrdersForCandles = getLatestOrdersForCandles(ordersToUpdate);

    latestOrdersForCandles.forEach((order) => {
      updateQueries.push(...this.updateLastCandles(order));
    });

    const orderBookQueries = generateOrderBookUpdateQueries(orderBookUpdates);
    updateQueries.push(...orderBookQueries);

    if (updateQueries.length > 0) {
      try {
        await client.batch(updateQueries, { prepare: true });
      } catch (error) {
        logError("matching_engine", error, __filename);
        console.error("Failed to batch update:", error);
      }
    } else {
      console.warn("No queries to batch update.");
    }

    // Broadcast position updates and check for liquidation
    const positionPromises = ordersToUpdate.map(async (order) => {
      const positions = await getPositions(order.userId, order.symbol, "OPEN");
      if (positions.length > 0) {
        if (fromBigInt) {
          await Promise.all(
            positions.map((position) =>
              checkForLiquidation(position, fromBigInt(order.price))
            )
          );
        }
        await Promise.all(
          positions.map((position) => handlePositionBroadcast(position))
        );
      }
    });

    await Promise.all(positionPromises);

    this.unlockOrders(ordersToUpdate);
  }

  public async addToQueue(order: FuturesOrder) {
    if (!validateOrder(order)) {
      return;
    }
    if (
      !order.createdAt ||
      isNaN(new Date(order.createdAt).getTime()) ||
      !order.updatedAt ||
      isNaN(new Date(order.updatedAt).getTime())
    ) {
      logError(
        "matching_engine",
        new Error("Invalid date in order"),
        __filename
      );
      return;
    }

    if (!this.orderQueue[order.symbol]) {
      this.orderQueue[order.symbol] = [];
    }

    this.orderQueue[order.symbol].push(order);

    const symbolOrderBook = await updateSingleOrderBook(order, "add");
    handleOrderBookBroadcast(order.symbol, symbolOrderBook);
    await this.processQueue();
  }

  private updateLastCandles(
    order: FuturesOrder
  ): Array<{ query: string; params: any[] }> {
    if (!toBigIntFloat || !fromBigInt || !scyllaFuturesKeyspace || !normalizeTimeToInterval) {
      console.warn("Ecosystem extension not available for candle updates");
      return [];
    }

    let finalPrice = BigInt(0);
    let trades;
    try {
      trades = JSON.parse(order.trades);
    } catch (error) {
      logError("matching_engine", error, __filename);
      console.error("Failed to parse trades:", error);
      return [];
    }

    if (
      trades &&
      trades.length > 0 &&
      (trades[trades.length - 1] as any).price !== undefined
    ) {
      finalPrice = toBigIntFloat ? toBigIntFloat((trades[trades.length - 1] as any).price) : BigInt(0);
    } else if (order.price !== undefined) {
      finalPrice = order.price;
    } else {
      logError(
        "matching_engine",
        new Error("Neither trade prices nor order price are available"),
        __filename
      );
      console.error("Neither trade prices nor order price are available");
      return [];
    }

    const updateQueries: Array<{ query: string; params: any[] }> = [];

    if (!this.lastCandle[order.symbol]) {
      this.lastCandle[order.symbol] = {};
    }

    intervals.forEach((interval) => {
      const updateQuery = this.generateCandleQueries(
        order,
        interval,
        finalPrice
      );
      if (updateQuery) {
        updateQueries.push(updateQuery);
      }
    });

    return updateQueries;
  }

  private generateCandleQueries(
    order: FuturesOrder,
    interval: string,
    finalPrice: bigint
  ): { query: string; params: any[] } | null {
    const existingLastCandle = this.lastCandle[order.symbol]?.[interval];
    const normalizedCurrentTime = normalizeTimeToInterval(
      new Date().getTime(),
      interval
    );
    const normalizedLastCandleTime = existingLastCandle
      ? normalizeTimeToInterval(
          new Date(existingLastCandle.createdAt).getTime(),
          interval
        )
      : null;

    const shouldCreateNewCandle =
      !existingLastCandle || normalizedCurrentTime !== normalizedLastCandleTime;

    if (shouldCreateNewCandle) {
      const newOpenPrice = existingLastCandle
        ? existingLastCandle.close
        : (fromBigInt ? fromBigInt(finalPrice) : 0);

      if (!newOpenPrice) {
        return null;
      }

      const finalPriceNumber = fromBigInt ? fromBigInt(finalPrice) : 0;

      const normalizedTime = new Date(
        normalizeTimeToInterval(new Date().getTime(), interval)
      );

      const newLastCandle = {
        symbol: order.symbol,
        interval,
        open: newOpenPrice,
        high: Math.max(newOpenPrice, finalPriceNumber),
        low: Math.min(newOpenPrice, finalPriceNumber),
        close: finalPriceNumber,
        volume: fromBigInt ? fromBigInt(order.amount) : 0,
        createdAt: normalizedTime,
        updatedAt: new Date(),
      };

      this.lastCandle[order.symbol][interval] = newLastCandle;

      return {
        query: `INSERT INTO ${scyllaFuturesKeyspace}.candles (symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          order.symbol,
          interval,
          newLastCandle.createdAt,
          newLastCandle.updatedAt,
          newOpenPrice,
          newLastCandle.high,
          newLastCandle.low,
          newLastCandle.close,
          newLastCandle.volume,
        ],
      };
    } else {
      let updateQuery = `UPDATE ${scyllaFuturesKeyspace}.candles SET "updatedAt" = ?, close = ?`;
      const now = new Date();
      const finalPriceNumber = fromBigInt ? fromBigInt(finalPrice) : 0;
      const updateParams: any[] = [now, finalPriceNumber];

      const newVolume = existingLastCandle.volume + (fromBigInt ? fromBigInt(order.amount) : 0);
      updateQuery += ", volume = ?";
      updateParams.push(newVolume);

      if (finalPriceNumber > existingLastCandle.high) {
        updateQuery += ", high = ?";
        updateParams.push(finalPriceNumber);
        existingLastCandle.high = finalPriceNumber;
      } else if (finalPriceNumber < existingLastCandle.low) {
        updateQuery += ", low = ?";
        updateParams.push(finalPriceNumber);
        existingLastCandle.low = finalPriceNumber;
      }

      existingLastCandle.close = finalPriceNumber;
      existingLastCandle.volume = newVolume;
      existingLastCandle.updatedAt = now;

      this.lastCandle[order.symbol][interval] = existingLastCandle;

      updateQuery += ` WHERE symbol = ? AND interval = ? AND "createdAt" = ?`;
      updateParams.push(order.symbol, interval, existingLastCandle.createdAt);

      return {
        query: updateQuery,
        params: updateParams,
      };
    }
  }

  async broadcastUpdates(
    ordersToUpdate: FuturesOrder[],
    finalOrderBooks: Record<string, any>
  ) {
    const updatePromises: Promise<void>[] = [];

    // Create and push order broadcast promises
    updatePromises.push(...this.createOrdersBroadcastPromise(ordersToUpdate));

    for (const symbol in this.orderQueue) {
      if (finalOrderBooks[symbol]) {
        updatePromises.push(
          this.createOrderBookUpdatePromise(symbol, finalOrderBooks[symbol])
        );
        updatePromises.push(...this.createCandleBroadcastPromises(symbol));
      }
    }

    await Promise.all(updatePromises);
  }

  private createOrderBookUpdatePromise(
    symbol: string,
    finalOrderBookState: any
  ) {
    return handleOrderBookBroadcast(symbol, finalOrderBookState);
  }

  private createCandleBroadcastPromises(symbol: string) {
    const promises: Promise<void>[] = [];
    for (const interval in this.lastCandle[symbol]) {
      promises.push(
        handleCandleBroadcast(
          symbol,
          interval,
          this.lastCandle[symbol][interval]
        )
      );
    }
    promises.push(
      handleTickerBroadcast(symbol, this.getTicker(symbol)),
      handleTickersBroadcast(this.getTickers())
    );
    return promises;
  }

  private createOrdersBroadcastPromise(orders: FuturesOrder[]) {
    return orders.map((order) => handleOrderBroadcast(order));
  }

  private lockOrders(orders: FuturesOrder[]): boolean {
    for (const order of orders) {
      if (this.lockedOrders.has(order.id)) {
        return false;
      }
    }

    for (const order of orders) {
      this.lockedOrders.add(order.id);
    }

    return true;
  }

  private unlockOrders(orders: FuturesOrder[]) {
    for (const order of orders) {
      this.lockedOrders.delete(order.id);
    }
  }

  public async handleOrderCancellation(orderId: string, symbol: string) {
    this.orderQueue[symbol] = this.orderQueue[symbol].filter(
      (order) => order.id !== orderId
    );

    const updatedOrderBook = await fetchExistingAmounts(symbol);
    handleOrderBookBroadcast(symbol, updatedOrderBook);

    await this.processQueue();
  }

  public getTickers(): { [symbol: string]: any } {
    const symbolsWithTickers: { [symbol: string]: any } = {};
    // Include all markets, even those with no trading activity (last price = 0)
    // This ensures all futures markets are displayed in the UI
    for (const symbol in this.marketsBySymbol) {
      symbolsWithTickers[symbol] = this.getTicker(symbol);
    }
    return symbolsWithTickers;
  }

  public getTicker(symbol: string): {
    symbol: string;
    last: number;
    baseVolume: number;
    quoteVolume: number;
    change: number;
    percentage: number;
    high: number;
    low: number;
  } {
    const lastCandle = this.lastCandle[symbol]?.["1d"];
    const previousCandle = this.yesterdayCandle[symbol];

    if (!lastCandle) {
      return {
        symbol,
        last: 0,
        baseVolume: 0,
        quoteVolume: 0,
        change: 0,
        percentage: 0,
        high: 0,
        low: 0,
      };
    }

    const last = lastCandle.close;
    const baseVolume = lastCandle.volume;
    const quoteVolume = last * baseVolume;

    let change = 0;
    let percentage = 0;

    if (previousCandle) {
      const open = previousCandle.close;
      const close = lastCandle.close;

      change = close - open;
      percentage = ((close - open) / open) * 100;
    }

    return {
      symbol,
      last,
      baseVolume,
      quoteVolume,
      percentage,
      change,
      high: lastCandle.high,
      low: lastCandle.low,
    };
  }
}
