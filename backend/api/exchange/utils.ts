import { baseNumberSchema, baseStringSchema } from "@b/utils/schema";
import { RedisSingleton } from "@b/utils/redis";

const redis = RedisSingleton.getInstance();

export const BAN_STATUS_KEY = "exchange:ban_status";

export async function saveBanStatus(unblockTime) {
  await redis.set(BAN_STATUS_KEY, unblockTime);
}

export async function loadBanStatus() {
  const unblockTime = await redis.get(BAN_STATUS_KEY);
  return unblockTime ? parseInt(unblockTime) : 0;
}

export function formatWaitTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes} minutes and ${seconds} seconds`;
}

export async function handleBanStatus(unblockTime) {
  if (Date.now() < unblockTime) {
    const waitTime = unblockTime - Date.now();
    console.log(`Waiting for ${formatWaitTime(waitTime)} until unblock time`);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(waitTime, 60000))
    );
    return true;
  }
  return false;
}

export function extractBanTime(errorMessage) {
  if (errorMessage.includes("IP banned until")) {
    const match = errorMessage.match(/until (\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
}

export async function handleExchangeError(error, ExchangeManager) {
  const banTime = extractBanTime(error.message);
  if (banTime) {
    await saveBanStatus(banTime);
    return banTime;
  }
  await ExchangeManager.stopExchange();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  return await ExchangeManager.startExchange();
}

export function sanitizeErrorMessage(errorMessage) {
  // Handle undefined or null inputs explicitly
  if (errorMessage == null) {
    // Customize this message as needed
    return "An unknown error occurred";
  }

  // Convert Error objects to their message string
  if (errorMessage instanceof Error) {
    errorMessage = errorMessage.message;
  }

  // Proceed with sanitization only if errorMessage is a string
  if (typeof errorMessage === "string") {
    const keywordsToHide = ["kucoin", "binance", "okx"];
    let sanitizedMessage = errorMessage;

    keywordsToHide.forEach((keyword) => {
      const regex = new RegExp(keyword, "gi"); // 'gi' for global and case-insensitive match
      sanitizedMessage = sanitizedMessage.replace(regex, "***");
    });

    return sanitizedMessage;
  }

  // Return the input unchanged if it's not a string, as we only sanitize strings
  return errorMessage;
}

export const baseOrderBookEntrySchema = {
  type: "array",
  items: {
    type: "number",
    description: "Order book entry consisting of price and volume",
  },
};

export const baseOrderBookSchema = {
  asks: {
    type: "array",
    items: baseOrderBookEntrySchema,
    description: "Asks are sell orders in the order book",
  },
  bids: {
    type: "array",
    items: baseOrderBookEntrySchema,
    description: "Bids are buy orders in the order book",
  },
};

export const baseTickerSchema = {
  symbol: baseStringSchema("Trading symbol for the market pair"),
  bid: baseNumberSchema("Current highest bid price"),
  ask: baseNumberSchema("Current lowest ask price"),
  close: baseNumberSchema("Last close price"),
  last: baseNumberSchema("Most recent transaction price"),
  change: baseNumberSchema("Price change percentage"),
  baseVolume: baseNumberSchema("Volume of base currency traded"),
  quoteVolume: baseNumberSchema("Volume of quote currency traded"),
};

export const baseWatchlistItemSchema = {
  id: baseStringSchema(
    "Unique identifier for the watchlist item",
    undefined,
    undefined,
    false,
    undefined,
    "uuid"
  ),
  userId: baseStringSchema(
    "User ID associated with the watchlist item",
    undefined,
    undefined,
    false,
    undefined,
    "uuid"
  ),
  symbol: baseStringSchema("Symbol of the watchlist item"),
};
