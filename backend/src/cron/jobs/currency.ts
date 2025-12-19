import { models, sequelize } from "@b/db";
import {
  cacheCurrencies,
  updateCurrencyRates,
} from "@b/api/finance/currency/utils";
import { getCurrencies } from "@b/api/exchange/currency/index.get";
import ExchangeManager from "@b/utils/exchange";
import { RedisSingleton } from "@b/utils/redis";
import {
  formatWaitTime,
  handleExchangeError,
  loadBanStatus,
  saveBanStatus,
} from "@b/api/exchange/utils";
import { broadcastLog, broadcastStatus } from "../broadcast";
import { logger } from "@b/utils/console";

const redis = RedisSingleton.getInstance();

export async function fetchFiatCurrencyPrices() {
  const cronName = "fetchFiatCurrencyPrices";
  const startTime = Date.now();
  broadcastStatus(cronName, "running");
  broadcastLog(cronName, "Starting fetch fiat currency prices");

  const baseCurrency = "USD";
  const provider = process.env.APP_FIAT_RATES_PROVIDER || "openexchangerates";
  broadcastLog(
    cronName,
    `Using provider: ${provider}, baseCurrency: ${baseCurrency}`
  );

  try {
    switch (provider.toLowerCase()) {
      case "openexchangerates":
        broadcastLog(cronName, "Fetching rates from OpenExchangeRates");
        await fetchOpenExchangeRates(baseCurrency);
        break;
      case "exchangerate-api":
        broadcastLog(cronName, "Fetching rates from ExchangeRate API");
        await fetchExchangeRateApi(baseCurrency);
        break;
      default:
        throw new Error(`Unsupported fiat rates provider: ${provider}`);
    }
    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(cronName, "Fetch fiat currency prices completed", "success");
  } catch (error: any) {
    logger.error("CRON", "fetchFiatCurrencyPrices failed", error);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Fetch fiat currency prices failed: ${error.message}`,
      "error"
    );
    // Don't throw - allow other operations to continue
    logger.warn("CRON", "Fiat currency prices update failed, but continuing normal operations");
  }
}

async function fetchOpenExchangeRates(baseCurrency: string) {
  const cronName = "fetchOpenExchangeRates";
  broadcastLog(
    cronName,
    `Starting OpenExchangeRates API call with baseCurrency: ${baseCurrency}`
  );
  const openExchangeRatesApiKey = process.env.APP_OPENEXCHANGERATES_APP_ID;
  const openExchangeRatesUrl = `https://openexchangerates.org/api/latest.json?appId=${openExchangeRatesApiKey}&base=${baseCurrency}`;
  const frankfurterApiUrl = `https://api.frankfurter.app/latest?from=${baseCurrency}`;

  try {
    const data = await fetchWithTimeout(openExchangeRatesUrl, 30000);
    broadcastLog(cronName, "Data fetched from OpenExchangeRates API");
    if (data && data.rates) {
      await updateRatesFromData(data.rates);
      broadcastLog(
        cronName,
        "Rates updated from OpenExchangeRates data",
        "success"
      );
    } else {
      throw new Error(
        "Invalid data format received from OpenExchangeRates API"
      );
    }
  } catch (error: any) {
    logger.error("CRON", "fetchOpenExchangeRates - OpenExchangeRates failed", error);
    broadcastLog(
      cronName,
      `OpenExchangeRates API failed: ${error.message}`,
      "error"
    );
    broadcastLog(cronName, "Attempting fallback with Frankfurter API");
    try {
      const data = await fetchWithTimeout(frankfurterApiUrl, 30000);
      broadcastLog(cronName, "Data fetched from Frankfurter API");
      if (data && data.rates) {
        await updateRatesFromData(data.rates);
        broadcastLog(
          cronName,
          "Rates updated from Frankfurter API data",
          "success"
        );
      } else {
        throw new Error("Invalid data format received from Frankfurter API");
      }
    } catch (fallbackError: any) {
      logger.error("CRON", "fetchOpenExchangeRates - Frankfurter failed", fallbackError);
      broadcastLog(
        cronName,
        `Fallback Frankfurter API failed: ${fallbackError.message}`,
        "error"
      );
      logger.warn("CRON", `Both fiat API calls failed: ${error.message}, ${fallbackError.message}`);
      return;
    }
  }
}

async function fetchExchangeRateApi(baseCurrency: string) {
  const cronName = "fetchExchangeRateApi";
  broadcastLog(
    cronName,
    `Starting ExchangeRate API call with baseCurrency: ${baseCurrency}`
  );
  const exchangeRateApiKey = process.env.APP_EXCHANGERATE_API_KEY;

  if (!exchangeRateApiKey) {
    throw new Error("APP_EXCHANGERATE_API_KEY is not configured in environment variables");
  }

  const exchangeRateApiUrl = `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${baseCurrency}`;

  try {
    const data = await fetchWithTimeout(exchangeRateApiUrl, 30000);
    broadcastLog(cronName, "Data fetched from ExchangeRate API");
    if (data && data.conversion_rates) {
      await updateRatesFromData(data.conversion_rates);
      broadcastLog(
        cronName,
        "Rates updated from ExchangeRate API data",
        "success"
      );
    } else {
      throw new Error("Invalid data format received from ExchangeRate API");
    }
  } catch (error: any) {
    logger.error("CRON", "fetchExchangeRateApi failed", error);
    broadcastLog(
      cronName,
      `ExchangeRate API call failed: ${error.message}`,
      "error"
    );
    logger.warn("CRON", `ExchangeRate API failed: ${error.message}`);
    return;
  }
}

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error("Unauthorized: Invalid API key.");
        case 403:
          throw new Error("Forbidden: Access denied.");
        case 429:
          throw new Error("Too Many Requests: Rate limit exceeded.");
        case 500:
          throw new Error(
            "Internal Server Error: The API is currently unavailable."
          );
        default:
          throw new Error(
            `Network response was not ok: ${response.statusText}`
          );
      }
    }
    const data = await response.json();
    return data;
  } finally {
    clearTimeout(id);
  }
}

async function updateRatesFromData(exchangeRates: any) {
  const cronName = "updateRatesFromData";
  broadcastLog(cronName, "Starting update of currency rates from fetched data");
  const ratesToUpdate: Record<string, any> = {};
  const currenciesRaw = await redis.get("currencies");
  let currencies: { id: string; code: string }[];

  if (!currenciesRaw) {
    broadcastLog(cronName, "No currencies in Redis, fetching from database");
    try {
      const currenciesFromDb = await models.currency.findAll({
        where: { status: true },
        attributes: ["id", "code"]
      });

      if (!currenciesFromDb || currenciesFromDb.length === 0) {
        broadcastLog(cronName, "No currencies found in database, skipping rate update", "warning");
        return;
      }

      currencies = currenciesFromDb.map((c: any) => ({
        id: c.code,
        code: c.code
      }));

      await redis.set("currencies", JSON.stringify(currencies), "EX", 86400);
      broadcastLog(cronName, `Cached ${currencies.length} currencies from database`);
    } catch (dbError: any) {
      broadcastLog(cronName, `Database fetch failed: ${dbError.message}`, "error");
      return;
    }
  } else {
    try {
      currencies = JSON.parse(currenciesRaw);
    } catch (parseError: any) {
      broadcastLog(cronName, `Error parsing currencies data: ${parseError.message}`, "error");
      return;
    }
    if (!Array.isArray(currencies)) {
      broadcastLog(cronName, "Currencies data is not an array", "error");
      return;
    }
  }
  for (const currency of currencies) {
    if (Object.prototype.hasOwnProperty.call(exchangeRates, currency.id)) {
      ratesToUpdate[currency.id] = exchangeRates[currency.id];
    }
  }
  broadcastLog(
    cronName,
    `Updating rates for ${Object.keys(ratesToUpdate).length} currencies`
  );
  await updateCurrencyRates(ratesToUpdate);
  broadcastLog(cronName, "Currency rates updated in database", "success");
  await cacheCurrencies();
  broadcastLog(cronName, "Currencies cached successfully", "success");
}

export async function cacheExchangeCurrencies() {
  const cronName = "cacheExchangeCurrencies";
  broadcastLog(cronName, "Caching exchange currencies");
  const currencies = await getCurrencies();
  await redis.set("exchangeCurrencies", JSON.stringify(currencies), "EX", 1800);
  broadcastLog(cronName, "Exchange currencies cached", "success");
}

export async function processCurrenciesPrices() {
  const cronName = "processCurrenciesPrices";
  broadcastLog(cronName, "Starting processCurrenciesPrices");
  let unblockTime = await loadBanStatus();

  try {
    if (Date.now() < unblockTime) {
      const waitTime = unblockTime - Date.now();
      logger.info("CRON", `Waiting for ${formatWaitTime(waitTime)} until unblock time`);
      broadcastLog(
        cronName,
        `Currently banned; waiting for ${formatWaitTime(waitTime)}`,
        "info"
      );
      return;
    }
    const exchange = await ExchangeManager.startExchange();
    if (!exchange) {
      broadcastLog(
        cronName,
        "Exchange instance not available; exiting",
        "error"
      );
      return;
    }
    let marketsCache: any[] = [];
    let currenciesCache: any[] = [];
    try {
      marketsCache = await models.exchangeMarket.findAll({
        where: { status: true },
        attributes: ["currency", "pair"],
      });
      broadcastLog(
        cronName,
        `Fetched ${marketsCache.length} active market records`
      );
    } catch (err: any) {
      logger.error("CRON", "processCurrenciesPrices - fetch markets failed", err);
      broadcastLog(
        cronName,
        `Error fetching market records: ${err.message}`,
        "error"
      );
      throw err;
    }
    try {
      currenciesCache = await models.exchangeCurrency.findAll({
        attributes: ["currency", "id", "price", "status"],
      });
      broadcastLog(
        cronName,
        `Fetched ${currenciesCache.length} exchange currency records`
      );
    } catch (err: any) {
      logger.error("CRON", "processCurrenciesPrices - fetch currencies failed", err);
      broadcastLog(
        cronName,
        `Error fetching currencies: ${err.message}`,
        "error"
      );
      throw err;
    }
    const marketSymbols = marketsCache.map(
      (market: any) => `${market.currency}/${market.pair}`
    );
    if (!marketSymbols.length) {
      const error = new Error("No market symbols found");
      logger.error("CRON", "processCurrenciesPrices - market symbols", error);
      broadcastLog(cronName, error.message, "error");
      throw error;
    }
    broadcastLog(cronName, `Market symbols: ${marketSymbols.join(", ")}`);

    let markets: any = {};
    try {
      if (exchange.has["fetchLastPrices"]) {
        markets = await exchange.fetchLastPrices(marketSymbols);
      } else {
        markets = await exchange.fetchTickers(marketSymbols);
      }
      broadcastLog(cronName, "Fetched market data from exchange");
    } catch (error: any) {
      const result = await handleExchangeError(error, ExchangeManager);
      if (typeof result === "number") {
        unblockTime = result;
        await saveBanStatus(unblockTime);
        logger.warn("CRON", `Ban detected. Blocked until ${new Date(unblockTime).toLocaleString()}`);
        broadcastLog(
          cronName,
          `Ban detected. Blocked until ${new Date(unblockTime).toLocaleString()}`,
          "error"
        );
        return;
      }
      logger.error("CRON", "processCurrenciesPrices - fetch markets data failed", error);
      broadcastLog(
        cronName,
        `Error fetching market data: ${error.message}`,
        "error"
      );
      throw error;
    }
    const usdtPairs = Object.keys(markets).filter((symbol) =>
      symbol.endsWith("/USDT")
    );
    broadcastLog(
      cronName,
      `Found ${usdtPairs.length} USDT pairs in market data`
    );

    const bulkUpdateData = usdtPairs
      .map((symbol) => {
        const currency = symbol.split("/")[0];
        const market = markets[symbol];
        let price: number;
        if (exchange.has["fetchLastPrices"]) {
          price = market.price;
        } else {
          price = market.last;
        }
        if (!price || isNaN(parseFloat(String(price)))) {
          logger.warn("CRON", `Invalid or missing price for symbol: ${symbol}, market data: ${JSON.stringify(market)}`);
          broadcastLog(
            cronName,
            `Invalid or missing price for symbol: ${symbol}`,
            "warning"
          );
          return null;
        }
        const matchingCurrency = currenciesCache.find(
          (dbCurrency) => dbCurrency.currency === currency
        );
        if (matchingCurrency) {
          matchingCurrency.price = parseFloat(String(price));
          return matchingCurrency;
        }
        return null;
      })
      .filter((item) => item !== null);
    const usdtCurrency = currenciesCache.find(
      (dbCurrency) => dbCurrency.currency === "USDT"
    );
    if (usdtCurrency) {
      usdtCurrency.price = 1;
      bulkUpdateData.push(usdtCurrency);
    }
    broadcastLog(
      cronName,
      `Prepared bulk update data for ${bulkUpdateData.length} currencies`
    );

    try {
      await sequelize.transaction(async (transaction) => {
        for (const item of bulkUpdateData) {
          await item.save({ transaction });
        }
      });
      broadcastLog(
        cronName,
        "Bulk update of currency prices completed",
        "success"
      );
    } catch (error: any) {
      logger.error("CRON", "processCurrenciesPrices - update database failed", error);
      broadcastLog(
        cronName,
        `Error updating database: ${error.message}`,
        "error"
      );
      throw error;
    }
  } catch (error: any) {
    logger.error("CRON", "processCurrenciesPrices failed", error);
    broadcastLog(
      cronName,
      `processCurrenciesPrices failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

export async function updateCurrencyPricesBulk(
  data: { id: number; price: number }[]
) {
  const cronName = "updateCurrencyPricesBulk";
  broadcastLog(
    cronName,
    `Starting bulk update for ${data.length} currency prices`
  );
  try {
    await sequelize.transaction(async (transaction) => {
      for (const item of data) {
        await models.exchangeCurrency.update(
          { price: item.price },
          { where: { id: item.id }, transaction }
        );
      }
    });
    broadcastLog(
      cronName,
      "Bulk update of currency prices succeeded",
      "success"
    );
  } catch (error: any) {
    logger.error("CRON", "updateCurrencyPricesBulk failed", error);
    broadcastLog(cronName, `Bulk update failed: ${error.message}`, "error");
    throw error;
  }
}
