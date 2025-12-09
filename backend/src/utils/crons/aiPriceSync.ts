import { models } from "@b/db";
import { logError } from "../logger";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import { Op } from "sequelize";
import ExchangeManager from "@b/utils/exchange";
import { CacheManager } from "../cache";

/**
 * AI Price Sync
 *
 * This cron job syncs external price feeds for AI market makers.
 * It fetches prices from external exchanges (via CCXT) and compares
 * them with the AI target prices to detect major deviations.
 *
 * Run frequency: Every 30 seconds (configured in cron.ts)
 */

// Alert if price deviation exceeds this percentage
const PRICE_DEVIATION_ALERT_THRESHOLD = 10; // 10%

// Cache for external prices with automatic cleanup
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const PRICE_CACHE_TTL = 10000; // 10 seconds
const PRICE_CACHE_MAX_SIZE = 1000; // Maximum cache entries to prevent memory bloat

// Periodic cache cleanup to prevent memory leaks
let lastCacheCleanup = Date.now();
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

function cleanupPriceCache() {
  const now = Date.now();
  if (now - lastCacheCleanup < CACHE_CLEANUP_INTERVAL) return;

  lastCacheCleanup = now;
  let removed = 0;

  // Remove stale entries
  for (const [symbol, data] of priceCache) {
    if (now - data.timestamp > PRICE_CACHE_TTL * 6) { // 60 seconds
      priceCache.delete(symbol);
      removed++;
    }
  }

  // If still too large, remove oldest entries
  if (priceCache.size > PRICE_CACHE_MAX_SIZE) {
    const entries = Array.from(priceCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = priceCache.size - PRICE_CACHE_MAX_SIZE;
    for (let i = 0; i < toRemove; i++) {
      priceCache.delete(entries[i][0]);
      removed++;
    }
  }

  if (removed > 0) {
    console.info(`[AI Price Sync] Cleaned up ${removed} stale cache entries`);
  }
}

export async function processAiPriceSync() {
  const cronName = "processAiPriceSync";
  const startTime = Date.now();

  try {
    // Clean up stale cache entries to prevent memory leaks
    cleanupPriceCache();

    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI Price Sync");

    // Check if AI Market Maker is enabled from centralized settings
    const cacheManager = CacheManager.getInstance();
    const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
    if (tradingEnabled === false) {
      broadcastLog(cronName, "AI Market Maker disabled, skipping price sync", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    // Get all active markets
    const activeMarkets = await models.aiMarketMaker.findAll({
      where: { status: "ACTIVE" },
      include: [{ model: models.ecosystemMarket, as: "market" }],
    });

    const total = activeMarkets.length;
    if (total === 0) {
      broadcastLog(cronName, "No active markets to sync prices", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    broadcastLog(cronName, `Syncing prices for ${total} active markets`);

    const alerts: string[] = [];

    for (let i = 0; i < total; i++) {
      const market = activeMarkets[i];
      try {
        const marketAlerts = await syncMarketPrice(market);
        alerts.push(...marketAlerts);
      } catch (error: any) {
        logError(`processAiPriceSync - market ${market.id}`, error, __filename);
        broadcastLog(
          cronName,
          `Error syncing price for ${market.id}: ${error.message}`,
          "error"
        );
      }

      const progress = Math.round(((i + 1) / total) * 100);
      broadcastProgress(cronName, progress);
    }

    // Log alerts
    if (alerts.length > 0) {
      broadcastLog(cronName, `Price alerts: ${alerts.length}`, "warning");
      for (const alert of alerts) {
        broadcastLog(cronName, alert, "warning");
      }
    }

    broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    broadcastLog(
      cronName,
      `AI Price Sync completed in ${Date.now() - startTime}ms`,
      "success"
    );
  } catch (error: any) {
    logError("processAiPriceSync", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(cronName, `AI Price Sync failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Sync price for a single market
 */
async function syncMarketPrice(market: any): Promise<string[]> {
  const alerts: string[] = [];
  const symbol = market.market?.symbol;

  if (!symbol) {
    return alerts;
  }

  // Fetch external price
  const externalPrice = await fetchExternalPrice(symbol);
  if (!externalPrice) {
    return alerts;
  }

  const targetPrice = Number(market.targetPrice);

  // Calculate deviation
  const deviation = Math.abs((targetPrice - externalPrice) / externalPrice) * 100;

  // Store price in history
  await storePriceHistory(market.id, externalPrice, targetPrice);

  // Check for significant deviation
  if (deviation > PRICE_DEVIATION_ALERT_THRESHOLD) {
    alerts.push(
      `${symbol}: Target price $${targetPrice.toFixed(6)} deviates ${deviation.toFixed(2)}% from external $${externalPrice.toFixed(6)}`
    );

    // Log price deviation to history
    await models.aiMarketMakerHistory.create({
      marketMakerId: market.id,
      action: "CONFIG_CHANGE",
      details: {
        type: "PRICE_DEVIATION_ALERT",
        targetPrice,
        externalPrice,
        deviation,
        symbol,
      },
      priceAtAction: targetPrice,
      poolValueAtAction: 0,
    });
  }

  return alerts;
}

/**
 * Fetch external price for a symbol
 */
async function fetchExternalPrice(symbol: string): Promise<number | null> {
  const cronName = "processAiPriceSync";

  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.price;
  }

  try {
    // Parse symbol (e.g., "BTC/USDT" -> currency: BTC, pair: USDT)
    const [currency, pair] = symbol.split("/");
    if (!currency || !pair) {
      return null;
    }

    // Start exchange if needed and fetch ticker
    const exchange = await ExchangeManager.startExchange();
    if (!exchange) {
      return null;
    }

    const ticker = await exchange.fetchTicker(symbol);
    if (ticker && ticker.last) {
      const price = Number(ticker.last);
      priceCache.set(symbol, { price, timestamp: Date.now() });
      return price;
    }

    return null;
  } catch (error: any) {
    // Don't log every price fetch failure as it can be noisy
    // Only log if it's not a common "symbol not found" error
    if (!error.message?.includes("not found") && !error.message?.includes("not available")) {
      broadcastLog(
        cronName,
        `Failed to fetch price for ${symbol}: ${error.message}`,
        "warning"
      );
    }
    return null;
  }
}

/**
 * Store price history for analytics
 */
async function storePriceHistory(
  marketMakerId: string,
  externalPrice: number,
  targetPrice: number
) {
  try {
    // Store price point periodically (every 5 minutes for history)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentPriceRecord = await models.aiMarketMakerHistory.findOne({
      where: {
        marketMakerId,
        action: "TARGET_CHANGE",
        createdAt: { [Op.gte]: fiveMinutesAgo },
      },
      order: [["createdAt", "DESC"]],
    });

    // Only store if we don't have a recent record
    if (!recentPriceRecord) {
      await models.aiMarketMakerHistory.create({
        marketMakerId,
        action: "TARGET_CHANGE",
        details: {
          type: "PRICE_SYNC",
          externalPrice,
          targetPrice,
          source: "EXTERNAL_EXCHANGE",
        },
        priceAtAction: targetPrice,
        poolValueAtAction: 0,
      });
    }
  } catch (error) {
    logError("storePriceHistory", error, __filename);
  }
}

/**
 * Get cached external price for a symbol (for use by other modules)
 */
export function getCachedExternalPrice(symbol: string): number | null {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL * 3) {
    return cached.price;
  }
  return null;
}

/**
 * Force refresh price for a symbol
 */
export async function forceRefreshPrice(symbol: string): Promise<number | null> {
  priceCache.delete(symbol);
  return fetchExternalPrice(symbol);
}
