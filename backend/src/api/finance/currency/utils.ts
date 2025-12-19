import { models, sequelize } from "@b/db";
import ExchangeManager from "@b/utils/exchange";
import { handleBanStatus, loadBanStatus } from "@b/api/exchange/utils";
import { logger } from "@b/utils/console";
// Safe import for MatchingEngine (only available if extension is installed)
async function getMatchingEngine() {
  try {
    // @ts-ignore - Dynamic import for optional extension
    const module = await import("@b/api/(ext)/ecosystem/utils/matchingEngine");
    return module.MatchingEngine.getInstance();
  } catch (error) {
    // Return a basic stub if extension not available
    return {
      getTicker: async (symbol: string) => ({ last: 0 })
    };
  }
}
import { RedisSingleton } from "@b/utils/redis";
import {
  baseBooleanSchema,
  baseNumberSchema,
  baseObjectSchema,
  baseStringSchema,
} from "@b/utils/schema";
import { isNumber } from "lodash";
import { createError } from "@b/utils/error";
const redis = RedisSingleton.getInstance();

export const baseCurrencySchema = {
  id: baseNumberSchema("ID of the currency"),
  name: baseStringSchema("Currency name"),
  symbol: baseStringSchema("Currency symbol"),
  precision: baseNumberSchema("Currency precision"),
  price: baseNumberSchema("Currency price"),
  status: baseBooleanSchema("Currency status"),
};

export const baseResponseSchema = {
  status: baseBooleanSchema("Indicates if the request was successful"),
  statusCode: baseNumberSchema("HTTP status code"),
  data: baseObjectSchema("Detailed data response"),
};

export async function cacheCurrencies() {
  try {
    const currencies = await getCurrencies();
    await redis.set("currencies", JSON.stringify(currencies), "EX", 300); // Cache for 5 minutes
  } catch (error) {
    logger.error("CURRENCY", "Error caching currencies", error);
  }
}

cacheCurrencies();

export async function updateCurrencyRates(
  rates: Record<string, number>
): Promise<currencyAttributes[]> {
  await sequelize.transaction(async (transaction) => {
    const codes = Object.keys(rates);

    // Validate each rate before processing
    codes.forEach((code) => {
      const price = rates[code];
      if (!isNumber(price) || isNaN(price)) {
        throw new Error(`Invalid price for currency ${code}: ${price}`);
      }
    });

    // Create a batch of update operations
    const updatePromises = codes.map((code) => {
      return models.currency.update(
        { price: rates[code] },
        { where: { id: code }, transaction }
      );
    });

    // Execute all updates within a transaction
    await Promise.all(updatePromises);
  });

  const updatedCurrencies = await models.currency.findAll({
    where: { id: Object.keys(rates) },
  });

  // Map Sequelize instances to plain objects.
  return updatedCurrencies.map((currency) =>
    currency.get({ plain: true })
  ) as unknown as currencyAttributes[];
}

// Helper Functions
export async function findCurrencyById(id: string) {
  const currency = await models.currency.findOne({
    where: { id },
  });
  if (!currency) throw new Error("Currency not found");
  return currency;
}

export async function getCurrencies(): Promise<currencyAttributes[]> {
  try {
    const currencies = await models.currency.findAll({
      where: { status: "true" }, // Assuming status is stored as string 'true'/'false'
      order: [["id", "ASC"]],
    });

    if (!currencies || !Array.isArray(currencies)) {
      return [];
    }

    return currencies.map((currency) =>
      currency.get({ plain: true })
    ) as unknown as currencyAttributes[];
  } catch (error) {
    // Return empty array if database operation fails
    return [];
  }
}

export const getFiatPriceInUSD = async (currency) => {
  // USD is 1:1
  if (currency === "USD") {
    return 1;
  }

  const fiatCurrency = await models.currency.findOne({
    where: { id: currency, status: true },
  });

  if (!fiatCurrency) {
    throw createError(404, `Currency ${currency} not found`);
  }

  const price = parseFloat(fiatCurrency.price);

  // If price is 0, NaN, or invalid, default to 1 for FIAT (assume 1:1 with USD as fallback)
  if (!price || isNaN(price) || price <= 0) {
    logger.warn("CURRENCY", `Invalid price for FIAT currency ${currency}, defaulting to 1`);
    return 1;
  }

  return price;
};

export const getSpotPriceInUSD = async (currency) => {
  if (currency === "USDT") {
    return 1;
  }

  const exchange = await ExchangeManager.startExchange();
  if (!exchange) {
    throw createError(
      503,
      "Service temporarily unavailable. Please try again later."
    );
  }

  try {
    const unblockTime = await loadBanStatus();

    if (await handleBanStatus(unblockTime)) {
      throw createError(
        503,
        "Service temporarily unavailable. Please try again later."
      );
    }

    const symbol = `${currency}/USDT`;
    const ticker = await exchange.fetchTicker(symbol);

    const price = ticker.last;
    if (price === null || price === undefined) {
      throw new Error("Error fetching ticker data");
    }

    // Allow 0 as a valid price (though unusual, it's technically valid)
    // If price is 0, it means there's no trading activity or the token has no value
    return price;
  } catch (error: any) {
    if (error.statusCode === 503) {
      throw error;
    }
    // Don't log stack trace for common cases like missing trading pairs
    const isMarketNotFound = error.message?.includes("market") ||
                             error.message?.includes("symbol") ||
                             error.message?.includes("not found");
    if (!isMarketNotFound) {
      logger.error("CURRENCY", `Error fetching spot price for ${currency}`, error);
    }
    throw new Error(`Market data unavailable for ${currency}`);
  }
};

export const getEcoPriceInUSD = async (currency) => {
  if (currency === "USDT") {
    return 1;
  }

  const engine = await getMatchingEngine();

  try {
    const symbol = `${currency}/USDT`;
    const ticker = await engine.getTicker(symbol);

    const price = ticker.last;
    if (price === null || price === undefined) {
      throw new Error("Error fetching ticker data");
    }

    // Allow 0 as a valid price (though unusual, it's technically valid)
    // If price is 0, it means there's no trading activity or the token has no value
    return price;
  } catch (error: any) {
    // Don't log stack trace for common cases like missing trading pairs
    const isMarketNotFound = error.message?.includes("market") ||
                             error.message?.includes("symbol") ||
                             error.message?.includes("not found");
    if (!isMarketNotFound) {
      logger.error("CURRENCY", `Error fetching eco price for ${currency}`, error);
    }
    throw new Error(`Market data unavailable for ${currency}`);
  }
};
