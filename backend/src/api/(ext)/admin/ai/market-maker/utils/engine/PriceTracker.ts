import { logger } from "@b/utils/console";
import ExchangeManager from "@b/utils/exchange";
import { RedisSingleton } from "@b/utils/redis";
import { getLatestPrice, getPriceHistoryInRange } from "../scylla/queries";

const redis = RedisSingleton.getInstance();

// Price cache TTL in seconds
const PRICE_CACHE_TTL = 5;

/**
 * PriceTracker - Manages price data for a market
 *
 * Responsibilities:
 * - Fetch external prices from exchange APIs
 * - Track price history and volatility
 * - Cache prices in Redis for performance
 * - Calculate price statistics
 */
export class PriceTracker {
  private symbol: string;
  private marketId: string;
  private currentPrice: bigint = BigInt(0);
  private priceHistory: { price: bigint; timestamp: Date }[] = [];
  private volatility: number = 0;
  private lastFetchTime: Date | null = null;

  // Statistics
  private high24h: bigint = BigInt(0);
  private low24h: bigint = BigInt(0);
  private volume24h: bigint = BigInt(0);

  // Flag to track if this symbol is available on the exchange
  private symbolAvailableOnExchange: boolean = true;
  private exchangeCheckDone: boolean = false;

  constructor(symbol: string, marketId: string) {
    this.symbol = symbol;
    this.marketId = marketId;
  }

  /**
   * Initialize the price tracker
   */
  public async initialize(): Promise<void> {
    try {
      // Load recent price history from Scylla
      await this.loadPriceHistory();

      // Get initial price
      await this.fetchExternalPrice();

      logger.info("AI_MM", `PriceTracker initialized for ${this.symbol}`);
    } catch (error) {
      logger.error("AI_MM", "PriceTracker initialization error", error);
      throw error;
    }
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.priceHistory = [];
  }

  /**
   * Get current price
   */
  public async getCurrentPrice(): Promise<bigint> {
    // If we have a recent price, use it
    if (this.currentPrice > BigInt(0) && this.lastFetchTime) {
      const ageMs = Date.now() - this.lastFetchTime.getTime();
      if (ageMs < PRICE_CACHE_TTL * 1000) {
        return this.currentPrice;
      }
    }

    // Fetch fresh price
    return this.fetchExternalPrice();
  }

  /**
   * Fetch price from external exchange
   */
  public async fetchExternalPrice(): Promise<bigint> {
    try {
      // Skip external price fetching if we know the symbol is not on the exchange
      if (this.exchangeCheckDone && !this.symbolAvailableOnExchange) {
        return this.currentPrice;
      }

      // Try cache first
      const cached = await this.getCachedPrice();
      if (cached > BigInt(0)) {
        this.currentPrice = cached;
        this.lastFetchTime = new Date();
        return cached;
      }

      // Fetch from exchange
      const exchange = await ExchangeManager.startExchange();
      if (!exchange) {
        // No exchange configured - this is fine for custom/unique symbols
        this.symbolAvailableOnExchange = false;
        this.exchangeCheckDone = true;
        return this.currentPrice;
      }

      // Check if symbol exists on exchange (only do this once)
      if (!this.exchangeCheckDone) {
        try {
          await exchange.loadMarkets();
          const markets = exchange.markets;
          if (!markets || !markets[this.symbol]) {
            // Symbol not available on this exchange - use internal pricing only
            this.symbolAvailableOnExchange = false;
            this.exchangeCheckDone = true;
            logger.info("AI_MM", `Symbol ${this.symbol} not available on exchange - using internal pricing only`);
            return this.currentPrice;
          }
          this.exchangeCheckDone = true;
        } catch (marketError) {
          // If we can't load markets, assume symbol is not available
          this.symbolAvailableOnExchange = false;
          this.exchangeCheckDone = true;
          return this.currentPrice;
        }
      }

      // Only try to fetch ticker if symbol is available
      if (!this.symbolAvailableOnExchange) {
        return this.currentPrice;
      }

      // Fetch ticker
      const ticker = await exchange.fetchTicker(this.symbol);
      if (ticker && ticker.last) {
        const priceNum = typeof ticker.last === "number" ? ticker.last : parseFloat(ticker.last);
        this.currentPrice = BigInt(Math.floor(priceNum * 1e18));
        this.lastFetchTime = new Date();

        // Update statistics
        if (ticker.high) {
          this.high24h = BigInt(Math.floor(parseFloat(ticker.high.toString()) * 1e18));
        }
        if (ticker.low) {
          this.low24h = BigInt(Math.floor(parseFloat(ticker.low.toString()) * 1e18));
        }
        if (ticker.baseVolume) {
          this.volume24h = BigInt(Math.floor(parseFloat(ticker.baseVolume.toString()) * 1e18));
        }

        // Cache price
        await this.cachePrice(this.currentPrice);

        // Update history
        this.addToHistory(this.currentPrice);

        // Calculate volatility
        this.calculateVolatility();

        return this.currentPrice;
      }

      return this.currentPrice;
    } catch (error: any) {
      // Check if error is because symbol doesn't exist on exchange
      const errorMsg = error?.message?.toLowerCase() || "";
      if (
        errorMsg.includes("does not have market symbol") ||
        errorMsg.includes("symbol not found") ||
        errorMsg.includes("invalid symbol") ||
        errorMsg.includes("market not found")
      ) {
        // Mark symbol as not available on exchange - don't log as error
        this.symbolAvailableOnExchange = false;
        this.exchangeCheckDone = true;
        logger.info("AI_MM", `Symbol ${this.symbol} not available on exchange - using internal pricing only`);
        return this.currentPrice;
      }

      // Log other errors normally
      logger.error("AI_MM", "External price fetch error", error);

      // Try to get from internal history
      const internal = await this.getInternalPrice();
      if (internal > BigInt(0)) {
        return internal;
      }

      return this.currentPrice;
    }
  }

  /**
   * Get cached price from Redis
   */
  private async getCachedPrice(): Promise<bigint> {
    try {
      const key = `ai_market_maker:price:${this.symbol}`;
      const cached = await redis.get(key);
      if (cached) {
        return BigInt(cached);
      }
    } catch (error) {
      // Ignore cache errors
    }
    return BigInt(0);
  }

  /**
   * Cache price to Redis
   */
  private async cachePrice(price: bigint): Promise<void> {
    try {
      const key = `ai_market_maker:price:${this.symbol}`;
      await redis.set(key, price.toString(), "EX", PRICE_CACHE_TTL);
    } catch (error) {
      // Ignore cache errors
    }
  }

  /**
   * Get price from internal history (Scylla)
   */
  private async getInternalPrice(): Promise<bigint> {
    try {
      const latest = await getLatestPrice(this.marketId);
      if (latest) {
        return latest.price;
      }
    } catch (error) {
      // Ignore internal price errors
    }
    return BigInt(0);
  }

  /**
   * Load price history from Scylla
   */
  private async loadPriceHistory(): Promise<void> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

      const history = await getPriceHistoryInRange(
        this.marketId,
        startTime,
        endTime,
        100
      );

      this.priceHistory = history.map((h) => ({
        price: h.price,
        timestamp: h.timestamp,
      }));

      // Calculate initial volatility
      this.calculateVolatility();
    } catch (error) {
      // Ignore history loading errors
    }
  }

  /**
   * Add price to history
   */
  private addToHistory(price: bigint): void {
    this.priceHistory.push({
      price,
      timestamp: new Date(),
    });

    // Keep only last 100 entries
    if (this.priceHistory.length > 100) {
      this.priceHistory = this.priceHistory.slice(-100);
    }
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(): void {
    if (this.priceHistory.length < 2) {
      this.volatility = 0;
      return;
    }

    const returns: number[] = [];
    for (let i = 1; i < this.priceHistory.length; i++) {
      const prevPrice = Number(this.priceHistory[i - 1].price);
      const currPrice = Number(this.priceHistory[i].price);
      if (prevPrice > 0) {
        returns.push((currPrice - prevPrice) / prevPrice);
      }
    }

    if (returns.length === 0) {
      this.volatility = 0;
      return;
    }

    // Calculate standard deviation
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;

    // Convert to percentage
    this.volatility = Math.sqrt(variance) * 100;
  }

  /**
   * Get current volatility
   */
  public getVolatility(): number {
    return this.volatility;
  }

  /**
   * Get price change over period
   */
  public getPriceChange(minutes: number): { absolute: bigint; percent: number } {
    if (this.priceHistory.length < 2) {
      return { absolute: BigInt(0), percent: 0 };
    }

    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const oldPrices = this.priceHistory.filter((p) => p.timestamp <= cutoffTime);

    if (oldPrices.length === 0) {
      return { absolute: BigInt(0), percent: 0 };
    }

    const oldPrice = oldPrices[oldPrices.length - 1].price;
    const absolute = this.currentPrice - oldPrice;
    const percent = oldPrice > BigInt(0)
      ? (Number(absolute) / Number(oldPrice)) * 100
      : 0;

    return { absolute, percent };
  }

  /**
   * Check if price is within range
   */
  public isPriceInRange(low: bigint, high: bigint): boolean {
    return this.currentPrice >= low && this.currentPrice <= high;
  }

  /**
   * Get 24h statistics
   */
  public get24hStats(): {
    high: bigint;
    low: bigint;
    volume: bigint;
    change: number;
  } {
    let change = 0;
    if (this.low24h > BigInt(0)) {
      change = (Number(this.currentPrice - this.low24h) / Number(this.low24h)) * 100;
    }

    return {
      high: this.high24h,
      low: this.low24h,
      volume: this.volume24h,
      change,
    };
  }

  /**
   * Get price history
   */
  public getPriceHistory(): { price: bigint; timestamp: Date }[] {
    return [...this.priceHistory];
  }

  /**
   * Get time since last fetch
   */
  public getTimeSinceLastFetch(): number | null {
    if (!this.lastFetchTime) {
      return null;
    }
    return Date.now() - this.lastFetchTime.getTime();
  }
}

export default PriceTracker;
