import { fromBigInt, removeTolerance, toBigIntFloat } from "./blockchain";
import { getLatestOrdersForCandles, intervals } from "./candles";
import { matchAndCalculateOrders, validateOrder } from "./matchmaking";
import {
  applyUpdatesToOrderBook,
  fetchExistingAmounts,
  generateOrderBookUpdateQueries,
  updateSingleOrderBook,
} from "./orderbook";
import client from "./scylla/client";
import {
  fetchOrderBooks,
  generateOrderUpdateQueries,
  getAllOpenOrders,
  getLastCandles,
  getYesterdayCandles,
  type Candle,
  type Order,
} from "./scylla/queries";
import {
  handleCandleBroadcast,
  handleOrderBookBroadcast,
  handleOrderBroadcast,
  handleTickerBroadcast,
  handleTickersBroadcast,
  normalizeTimeToInterval,
} from "./ws";
import { getEcoSystemMarkets } from "./markets";
import { logError } from "@b/utils/logger";
import { stringify as uuidStringify } from "uuid";

interface Uuid {
  buffer: Buffer;
}

function uuidToString(uuid: Uuid): string {
  return uuidStringify(uuid.buffer);
}

export class MatchingEngine {
  private static instancePromise: Promise<MatchingEngine> | null = null;
  private orderQueue: Record<string, Order[]> = {};
  private marketsBySymbol: Record<string, any> = {};
  private lockedOrders: Set<string> = new Set();
  private lastCandle: Record<string, Record<string, Candle>> = {};
  private yesterdayCandle: Record<string, Candle> = {};

  public static getInstance(): Promise<MatchingEngine> {
    if (!this.instancePromise) {
      this.instancePromise = (async () => {
        const instance = new MatchingEngine();
        await instance.init();
        return instance;
      })();
    }
    return this.instancePromise;
  }

  public async init() {
    await this.initializeMarkets();
    await this.initializeOrders();
    await this.validateAndCleanOrderbook(); // NEW: Validate orderbook integrity on startup
    await this.initializeLastCandles();
    await this.initializeYesterdayCandles();
  }

  private async initializeMarkets() {
    const markets: any[] = await getEcoSystemMarkets();
    markets.forEach((market) => {
      this.marketsBySymbol[market.symbol] = market;
      this.orderQueue[market.symbol] = [];
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

        const normalizedOrder = {
          ...order,
          amount: BigInt(order.amount ?? 0),
          price: BigInt(order.price ?? 0),
          cost: BigInt(order.cost ?? 0),
          fee: BigInt(order.fee ?? 0),
          remaining: BigInt(order.remaining ?? 0),
          filled: BigInt(order.filled ?? 0),
          createdAt,
          updatedAt,
          userId: uuidToString(order.userId),
          id: uuidToString(order.id),
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

  /**
   * Syncs orderbook with actual order states from Scylla
   * Removes "ghost" orderbook entries for orders that are CLOSED/CANCELLED
   */
  private async syncOrderbookWithOrders() {
    try {
      // Fetch all orderbook entries
      const allOrderBookEntries = await fetchOrderBooks();

      if (!allOrderBookEntries || allOrderBookEntries.length === 0) {
        return;
      }

      // Group by symbol for efficient processing
      const orderbookBySymbol: Record<string, any[]> = {};
      allOrderBookEntries.forEach((entry) => {
        if (!orderbookBySymbol[entry.symbol]) {
          orderbookBySymbol[entry.symbol] = [];
        }
        orderbookBySymbol[entry.symbol].push(entry);
      });

      let ghostEntriesRemoved = 0;

      // For each symbol, check if orderbook entries match actual OPEN orders
      for (const symbol in orderbookBySymbol) {
        const orderbookEntries = orderbookBySymbol[symbol];

        // Get all OPEN orders for this symbol
        const openOrders = this.orderQueue[symbol] || [];

        // Create a map of price -> total remaining amount from OPEN orders
        const openOrdersByPrice: Record<string, { bids: bigint; asks: bigint }> = {};

        for (const order of openOrders) {
          const priceStr = fromBigInt(order.price).toString();
          if (!openOrdersByPrice[priceStr]) {
            openOrdersByPrice[priceStr] = { bids: BigInt(0), asks: BigInt(0) };
          }

          if (order.side === "BUY") {
            openOrdersByPrice[priceStr].bids += order.remaining;
          } else {
            openOrdersByPrice[priceStr].asks += order.remaining;
          }
        }

        // Check each orderbook entry
        for (const entry of orderbookEntries) {
          const priceStr = entry.price.toString();
          const side = entry.side.toUpperCase();

          // Convert orderbook amount to BigInt (it's stored as a decimal)
          const orderbookAmount = toBigIntFloat(Number(entry.amount));

          const openAmount = openOrdersByPrice[priceStr]?.[side === "BIDS" ? "bids" : "asks"] || BigInt(0);

          // Check for discrepancies between orderbook and actual open orders
          if (orderbookAmount !== openAmount) {
            if (openAmount === BigInt(0)) {
              // Ghost entry: orderbook has amount but no open orders exist
              try {
                // Remove ghost entry from orderbook
                const deleteQuery = `DELETE FROM ${client.keyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
                await client.execute(deleteQuery, [symbol, priceStr, side], { prepare: true });
                ghostEntriesRemoved++;
              } catch (deleteError) {
                console.error(`[ORDERBOOK_SYNC] Failed to remove ghost entry for ${symbol}:`, deleteError.message);
              }
            } else {
              // Amount mismatch: orderbook amount doesn't match sum of open orders
              try {
                // Update orderbook with correct amount
                const updateQuery = `UPDATE ${client.keyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`;
                await client.execute(
                  updateQuery,
                  [fromBigInt(openAmount), symbol, priceStr, side],
                  { prepare: true }
                );
                ghostEntriesRemoved++;
              } catch (updateError) {
                console.error(`[ORDERBOOK_SYNC] Failed to fix amount for ${symbol}:`, updateError.message);
              }
            }
          }
        }

        // Check for missing orderbook entries (open orders not in orderbook)
        for (const priceStr in openOrdersByPrice) {
          const amounts = openOrdersByPrice[priceStr];

          // Check BIDS
          if (amounts.bids > BigInt(0)) {
            const existingEntry = orderbookEntries.find(
              e => e.price.toString() === priceStr && e.side.toUpperCase() === "BIDS"
            );

            if (!existingEntry) {
              try {
                const insertQuery = `INSERT INTO ${client.keyspace}.orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)`;
                await client.execute(
                  insertQuery,
                  [symbol, priceStr, "BIDS", fromBigInt(amounts.bids)],
                  { prepare: true }
                );
                ghostEntriesRemoved++;
              } catch (insertError) {
                console.error(`[ORDERBOOK_SYNC] Failed to add missing BID entry for ${symbol}:`, insertError.message);
              }
            }
          }

          // Check ASKS
          if (amounts.asks > BigInt(0)) {
            const existingEntry = orderbookEntries.find(
              e => e.price.toString() === priceStr && e.side.toUpperCase() === "ASKS"
            );

            if (!existingEntry) {
              try {
                const insertQuery = `INSERT INTO ${client.keyspace}.orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)`;
                await client.execute(
                  insertQuery,
                  [symbol, priceStr, "ASKS", fromBigInt(amounts.asks)],
                  { prepare: true }
                );
                ghostEntriesRemoved++;
              } catch (insertError) {
                console.error(`[ORDERBOOK_SYNC] Failed to add missing ASK entry for ${symbol}:`, insertError.message);
              }
            }
          }
        }
      }

      // Only log if there were issues fixed
      if (ghostEntriesRemoved > 0) {
        console.log(`[ORDERBOOK_SYNC] Fixed ${ghostEntriesRemoved} orderbook discrepancies`);
        // Refresh orderbook broadcasts
        await this.refreshOrderBooks();
      }
    } catch (error) {
      logError("orderbook_sync", error, __filename);
      console.error(`[ORDERBOOK_SYNC] Sync failed:`, error);
    }
  }

  /**
   * Validates orderbook integrity on startup and fixes/cancels problematic orders
   * This prevents stuck orderbooks where orders exist but funds aren't properly locked
   */
  private async validateAndCleanOrderbook() {
    try {
      // STEP 1: Sync orderbook with actual order states (remove ghost entries)
      await this.syncOrderbookWithOrders();

      const { getUserEcosystemWalletByCurrency } = await import("./matchmaking");
      const { updateWalletBalance } = await import("./wallet");
      let totalOrdersChecked = 0;
      let ordersFixed = 0;
      let invalidOrdersCancelled = 0;

      for (const symbol in this.orderQueue) {
        // Skip invalid/undefined symbols
        if (!symbol || symbol === 'undefined' || !symbol.includes('/')) {
          continue;
        }

        const orders = this.orderQueue[symbol];
        const [baseCurrency, quoteCurrency] = symbol.split("/");

        const invalidOrders: Order[] = [];

        for (const order of orders) {
          totalOrdersChecked++;

          try {
            const orderAmount = fromBigInt(removeTolerance(order.remaining));
            const orderCost = fromBigInt(removeTolerance(
              (order.remaining * order.price) / BigInt(10 ** 18)
            ));

            if (order.side === "SELL") {
              // Check if seller has BASE tokens locked
              const sellerWallet = await getUserEcosystemWalletByCurrency(
                order.userId,
                baseCurrency
              );

              if (!sellerWallet) {
                console.warn(`[ORDERBOOK_VALIDATION] Wallet not found for user ${order.userId}, currency ${baseCurrency}`);
                invalidOrders.push(order);
                continue;
              }

              const sellerInOrder = parseFloat(sellerWallet.inOrder?.toString() || "0");
              const sellerBalance = parseFloat(sellerWallet.balance?.toString() || "0");

              if (sellerInOrder < orderAmount) {
                // Check if user has enough available balance to lock the funds
                const availableBalance = sellerBalance - sellerInOrder;

                if (availableBalance >= orderAmount) {
                  // FIX: User has balance, just wasn't locked. Lock it now.
                  try {
                    await updateWalletBalance(sellerWallet, orderAmount, "subtract");
                    ordersFixed++;
                  } catch (lockError) {
                    console.error(`[ORDERBOOK_VALIDATION] Failed to lock funds for ${symbol}:`, lockError.message);
                    invalidOrders.push(order);
                  }
                } else {
                  // User doesn't have enough balance - invalid order
                  invalidOrders.push(order);
                }
              }
            } else if (order.side === "BUY") {
              // Check if buyer has QUOTE tokens locked
              const buyerWallet = await getUserEcosystemWalletByCurrency(
                order.userId,
                quoteCurrency
              );

              if (!buyerWallet) {
                console.warn(`[ORDERBOOK_VALIDATION] Wallet not found for user ${order.userId}, currency ${quoteCurrency}`);
                invalidOrders.push(order);
                continue;
              }

              const buyerInOrder = parseFloat(buyerWallet.inOrder?.toString() || "0");
              const buyerBalance = parseFloat(buyerWallet.balance?.toString() || "0");

              if (buyerInOrder < orderCost) {
                // Check if user has enough available balance to lock the funds
                const availableBalance = buyerBalance - buyerInOrder;

                if (availableBalance >= orderCost) {
                  // FIX: User has balance, just wasn't locked. Lock it now.
                  try {
                    await updateWalletBalance(buyerWallet, orderCost, "subtract");
                    ordersFixed++;
                  } catch (lockError) {
                    console.error(`[ORDERBOOK_VALIDATION] Failed to lock funds for ${symbol}:`, lockError.message);
                    invalidOrders.push(order);
                  }
                } else {
                  // User doesn't have enough balance - invalid order
                  invalidOrders.push(order);
                }
              }
            }
          } catch (error) {
            console.error(`[ORDERBOOK_VALIDATION] Error validating order ${order.id}:`, error.message);
            invalidOrders.push(order);
          }
        }

        // Cancel invalid orders
        if (invalidOrders.length > 0) {
          for (const order of invalidOrders) {
            try {
              // Import necessary functions
              const { cancelOrderByUuid } = await import("./scylla/queries");

              // Cancel in Scylla (requires all 7 parameters)
              await cancelOrderByUuid(
                order.userId,
                order.id,
                order.createdAt.toISOString(),
                order.symbol,
                order.price,
                order.side,
                order.remaining
              );

              // Remove from local queue
              const index = this.orderQueue[symbol].indexOf(order);
              if (index > -1) {
                this.orderQueue[symbol].splice(index, 1);
              }

              // Broadcast cancellation
              await handleOrderBroadcast({
                ...order,
                status: "CANCELLED",
              });

              invalidOrdersCancelled++;
            } catch (cancelError) {
              console.error(`[ORDERBOOK_VALIDATION] Failed to cancel order for ${symbol}:`, cancelError.message);
            }
          }
        }
      }

      // Only log if there were issues
      if (ordersFixed > 0 || invalidOrdersCancelled > 0) {
        console.log(
          `[ORDERBOOK_VALIDATION] Fixed ${ordersFixed} orders, cancelled ${invalidOrdersCancelled} invalid orders`
        );
      }

      if (ordersFixed > 0 || invalidOrdersCancelled > 0) {
        // Refresh orderbook after cleanup
        await this.refreshOrderBooks();

        // Re-load and re-run matching engine to process the fixed orders
        if (ordersFixed > 0) {
          // Clear the current queue
          for (const symbol in this.orderQueue) {
            this.orderQueue[symbol] = [];
          }

          // Reload all open orders from Scylla
          const openOrders = await getAllOpenOrders();
          const uuidStringify = await import("uuid").then(m => m.stringify);

          openOrders.forEach((order) => {
            const createdAt = new Date(order.createdAt);
            const updatedAt = new Date(order.updatedAt);

            if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) return;
            if (!order.userId?.buffer || !order.id?.buffer) return;

            const normalizedOrder = {
              ...order,
              amount: BigInt(order.amount ?? 0),
              price: BigInt(order.price ?? 0),
              cost: BigInt(order.cost ?? 0),
              fee: BigInt(order.fee ?? 0),
              remaining: BigInt(order.remaining ?? 0),
              filled: BigInt(order.filled ?? 0),
              createdAt,
              updatedAt,
              userId: uuidStringify(order.userId.buffer),
              id: uuidStringify(order.id.buffer),
            };

            if (!this.orderQueue[normalizedOrder.symbol]) {
              this.orderQueue[normalizedOrder.symbol] = [];
            }
            this.orderQueue[normalizedOrder.symbol].push(normalizedOrder);
          });

          await this.processQueue();
        }
      }
    } catch (error) {
      logError("orderbook_validation", error, __filename);
      console.error(`[ORDERBOOK_VALIDATION] Validation failed:`, error);
    }
  }

  /**
   * Refreshes all orderbooks after cleanup
   */
  private async refreshOrderBooks() {
    try {
      const allOrderBookEntries = await fetchOrderBooks();
      const mappedOrderBook: Record<string, Record<"bids" | "asks", Record<string, bigint>>> = {};

      allOrderBookEntries?.forEach((entry) => {
        if (!mappedOrderBook[entry.symbol]) {
          mappedOrderBook[entry.symbol] = { bids: {}, asks: {} };
        }
        mappedOrderBook[entry.symbol][entry.side.toLowerCase()][
          removeTolerance(toBigIntFloat(Number(entry.price))).toString()
        ] = removeTolerance(toBigIntFloat(Number(entry.amount)));
      });

      // Broadcast updated orderbooks
      for (const symbol in mappedOrderBook) {
        await handleOrderBookBroadcast(symbol, mappedOrderBook[symbol]);
      }
    } catch (error) {
      console.error("[ORDERBOOK_VALIDATION] Failed to refresh orderbooks:", error);
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

  private async processQueue() {
    const ordersToUpdate: Order[] = [];
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
    ordersToUpdate: Order[],
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

    const orderUpdateQueries = await generateOrderUpdateQueries(ordersToUpdate);
    updateQueries.push(...orderUpdateQueries);

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

    this.unlockOrders(ordersToUpdate);
  }

  public async addToQueue(order: Order) {
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
    order: Order
  ): Array<{ query: string; params: any[] }> {
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
      finalPrice = toBigIntFloat((trades[trades.length - 1] as any).price);
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
    order: Order,
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
        : fromBigInt(finalPrice);

      if (!newOpenPrice) {
        return null;
      }

      const finalPriceNumber = fromBigInt(finalPrice);

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
        volume: fromBigInt(order.amount),
        createdAt: normalizedTime,
        updatedAt: new Date(),
      };

      this.lastCandle[order.symbol][interval] = newLastCandle;

      return {
        query: `INSERT INTO candles (symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      let updateQuery = `UPDATE candles SET "updatedAt" = ?, close = ?`;
      const now = new Date();
      const finalPriceNumber = fromBigInt(finalPrice);
      const updateParams: any[] = [now, finalPriceNumber];

      const newVolume = existingLastCandle.volume + fromBigInt(order.amount);
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
    ordersToUpdate: Order[],
    finalOrderBooks: Record<string, any>
  ) {
    const updatePromises: Promise<void>[] = [];

    updatePromises.push(...this.createOrdersBroadcastPromise(ordersToUpdate));

    // Broadcast updates for all symbols that had trades (in finalOrderBooks)
    // instead of only symbols still in orderQueue (which may be empty after cleanup)
    for (const symbol in finalOrderBooks) {
      updatePromises.push(
        this.createOrderBookUpdatePromise(symbol, finalOrderBooks[symbol])
      );
      updatePromises.push(...this.createCandleBroadcastPromises(symbol));
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

    // Broadcast candles for all intervals that have been updated
    if (this.lastCandle[symbol]) {
      for (const interval in this.lastCandle[symbol]) {
        promises.push(
          handleCandleBroadcast(
            symbol,
            interval,
            this.lastCandle[symbol][interval]
          )
        );
      }
    }

    promises.push(
      handleTickerBroadcast(symbol, this.getTicker(symbol)),
      handleTickersBroadcast(this.getTickers())
    );
    return promises;
  }

  private createOrdersBroadcastPromise(orders: Order[]) {
    return orders.map((order) => handleOrderBroadcast(order));
  }

  private lockOrders(orders: Order[]): boolean {
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

  private unlockOrders(orders: Order[]) {
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
    for (const symbol in this.lastCandle) {
      const ticker = this.getTicker(symbol);
      if (ticker.last !== 0) {
        symbolsWithTickers[symbol] = ticker;
      }
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