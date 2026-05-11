import ExchangeManager from "@b/utils/exchange";
import { hasClients, sendMessageToRoute } from "@b/handler/Websocket";
import { models } from "@b/db";
import { logError } from "@b/utils/logger";
import { Op } from "sequelize";
import { RedisSingleton } from "@b/utils/redis";
import {
  loadBanStatus,
  saveBanStatus,
  handleExchangeError,
  formatWaitTime,
} from "../utils";

export const metadata = {};

const TICKER_CACHE_KEY = "exchange:tickers";

class TickerHandler {
  private static instance: TickerHandler;
  private accumulatedTickers = {};
  private tickerInterval: NodeJS.Timeout | null = null;
  private unblockTime = 0;
  private isRunning = false;
  private redis: any;

  private constructor() {
    this.redis = RedisSingleton.getInstance();
  }

  public static getInstance(): TickerHandler {
    if (!TickerHandler.instance) {
      TickerHandler.instance = new TickerHandler();
    }
    return TickerHandler.instance;
  }

  public isHandlerRunning(): boolean {
    return this.isRunning;
  }

  public setHandlerRunning(state: boolean): void {
    this.isRunning = state;
  }

  private startTickerInterval() {
    if (!this.tickerInterval) {
      this.tickerInterval = setInterval(this.flushTickers.bind(this), 1000);
    }
  }

  private stopTickerInterval() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  private async flushTickers() {
    if (Object.keys(this.accumulatedTickers).length > 0) {
      await this.sendTickersToClients(this.accumulatedTickers);
      await this.updateTickerCache(this.accumulatedTickers);
      this.accumulatedTickers = {};
    }
  }

  private async sendTickersToClients(tickers) {
    sendMessageToRoute(
      "/api/exchange/ticker",
      { type: "tickers" },
      {
        stream: "tickers",
        data: tickers,
      }
    );
  }

  private async updateTickerCache(tickers) {
    const cachedTickers = await this.getTickerCache();
    const updatedTickers = { ...cachedTickers, ...tickers };
    const symbolsInDB = await this.getSymbolsInDB();

    // Filter out tickers not in the DB
    const filteredTickers = Object.keys(updatedTickers)
      .filter((symbol) => symbolsInDB.includes(symbol))
      .reduce((obj, key) => {
        obj[key] = updatedTickers[key];
        return obj;
      }, {});

    await this.redis.set(TICKER_CACHE_KEY, JSON.stringify(filteredTickers));
  }

  private async getTickerCache() {
    const cachedData = await this.redis.get(TICKER_CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : {};
  }

  private async getSymbolsInDB() {
    const markets = await models.exchangeMarket.findAll({
      where: { status: true },
      attributes: ["currency", "pair"],
      raw: true,
    });
    return markets.map((market) => `${market.currency}/${market.pair}`);
  }

  private async fetchTickersWithRetries(exchange, symbolsInDB) {
    try {
      const allTickers = await exchange.fetchTickers(symbolsInDB);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return allTickers;
    } catch (error) {
      await this.disableInvalidMarkets(error, symbolsInDB);
      throw error;
    }
  }

  private async watchTickersWithRetries(exchange, symbolsInDB) {
    try {
      return await exchange.watchTickers(symbolsInDB);
    } catch (error) {
      await this.disableInvalidMarkets(error, symbolsInDB, true);
      throw error;
    }
  }

  private async disableInvalidMarkets(error, marketSymbols, isWatch = false) {
    const invalidSymbols = this.extractInvalidSymbols(
      error.message,
      marketSymbols
    );
    if (invalidSymbols.length > 0) {
      await models.exchangeMarket.update(
        { status: false },
        {
          where: {
            [Op.or]: invalidSymbols.map((symbol) => {
              const [currency, pair] = symbol.split("/");
              return { currency, pair };
            }),
          },
        }
      );
      if (isWatch) {
        await ExchangeManager.stopExchange();
      }
    }
  }

  private extractInvalidSymbols(errorMessage, symbolsInDB) {
    return symbolsInDB.filter((symbol) => errorMessage.includes(symbol));
  }

  private processTickers(allTickers, symbolsInDB) {
    return symbolsInDB.reduce((acc, symbol) => {
      if (allTickers[symbol]) {
        acc[symbol] = {
          last: allTickers[symbol].last,
          baseVolume: allTickers[symbol].baseVolume,
          quoteVolume: allTickers[symbol].quoteVolume,
          change: allTickers[symbol].percentage,
        };
      }
      return acc;
    }, {});
  }

  public async sendInitialTickers() {
    const initialTickers = await this.getTickerCache();
    await this.sendTickersToClients(initialTickers);
  }

  public async start() {
    try {
      this.unblockTime = await loadBanStatus();

      while (hasClients("/api/exchange/ticker")) {
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

        const exchange = await ExchangeManager.startExchange();
        if (!exchange) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        const provider = await ExchangeManager.getProvider();

        try {
          const symbolsInDB = await this.getSymbolsInDB();

          if (symbolsInDB.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }

          let allTickers;
          if (provider === "binance") {
            allTickers = await this.fetchTickersWithRetries(
              exchange,
              symbolsInDB
            );
            this.startTickerInterval();
          } else if (provider === "kucoin") {
            allTickers = await this.fetchTickersWithRetries(
              exchange,
              symbolsInDB
            );
            this.stopTickerInterval();
          } else {
            if (exchange && exchange.has["watchTickers"]) {
              allTickers = await this.watchTickersWithRetries(
                exchange,
                symbolsInDB
              );
              this.startTickerInterval();
            } else {
              allTickers = await this.fetchTickersWithRetries(
                exchange,
                symbolsInDB
              );
              this.stopTickerInterval();
            }
          }

          const filteredTickers = this.processTickers(allTickers, symbolsInDB);

          if (
            provider === "binance" ||
            (provider !== "kucoin" && exchange.has["watchTickers"])
          ) {
            Object.assign(this.accumulatedTickers, filteredTickers);
          } else {
            await this.sendTickersToClients(filteredTickers);
            await this.updateTickerCache(filteredTickers);
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          logError("exchange", error, __filename);
          const result = await handleExchangeError(error, ExchangeManager);
          if (typeof result === "number") {
            this.unblockTime = result;
            await saveBanStatus(this.unblockTime);
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      logError("exchange", error, __filename);
    } finally {
      this.setHandlerRunning(false);
    }
  }
}

export default async (data: Handler, message) => {
  const handler = TickerHandler.getInstance();
  await handler.sendInitialTickers();
  if (!handler.isHandlerRunning()) {
    handler.setHandlerRunning(true);
    await handler.start();
  }
};
