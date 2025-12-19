import * as ccxt from "ccxt";
import { sleep } from "./system";
import { models } from "@b/db";
import { logger } from "@b/utils/console";
import {
  loadBanStatus,
  saveBanStatus,
  handleBanStatus,
} from "@b/api/exchange/utils";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

class ExchangeManager {
  static readonly instance = new ExchangeManager();
  private readonly exchangeCache = new Map<string, any>();
  private readonly initializationPromises = new Map<string, Promise<any>>();
  private provider: string | null = null;
  private exchange: any = null;
  private exchangeProvider: any = null;
  private lastAttemptTime: number | null = null;
  private attemptCount: number = 0;
  private isInitializing: boolean = false;
  private initializationQueue: Array<{resolve: Function, reject: Function}> = [];

  private constructor() {}

  private async fetchActiveProvider(): Promise<string | null> {
    try {
      const provider = await models.exchange.findOne({
        where: {
          status: true,
        },
      });
      if (!provider) {
        return null;
      }
      return provider.name;
    } catch (error) {
      logger.error("EXCHANGE", "Failed to fetch active provider", error);
      return null;
    }
  }

  private async initializeExchange(
    provider: string,
    retries = 3,
    ctx?: LogContext
  ): Promise<any> {
    ctx?.step?.(`Checking ban status for ${provider}`);
    if (await handleBanStatus(await loadBanStatus())) {
      return null;
    }

    if (this.exchangeCache.has(provider)) {
      ctx?.step?.(`Using cached exchange instance for ${provider}`);
      return this.exchangeCache.get(provider);
    }

    const now = Date.now();
    if (
      this.attemptCount >= 3 &&
      this.lastAttemptTime &&
      now - this.lastAttemptTime < 30 * 60 * 1000
    ) {
      ctx?.step?.(`Rate limit reached for ${provider}, waiting...`);
      return null;
    }

    ctx?.step?.(`Loading API credentials for ${provider}`);
    const apiKey = process.env[`APP_${provider.toUpperCase()}_API_KEY`];
    const apiSecret = process.env[`APP_${provider.toUpperCase()}_API_SECRET`];
    const apiPassphrase =
      process.env[`APP_${provider.toUpperCase()}_API_PASSPHRASE`];

    if (!apiKey || !apiSecret || apiKey === "" || apiSecret === "") {
      logger.error("EXCHANGE", `API credentials for ${provider} are missing.`, new Error(`API credentials for ${provider} are missing.`));
      this.attemptCount += 1;
      this.lastAttemptTime = now;
      return null;
    }

    try {
      ctx?.step?.(`Creating exchange instance for ${provider}`);
      let exchange = new ccxt.pro[provider]({
        apiKey,
        secret: apiSecret,
        password: apiPassphrase,
      });

      ctx?.step?.(`Validating credentials for ${provider}`);
      const credentialsValid = await exchange.checkRequiredCredentials();
      if (!credentialsValid) {
        logger.error("EXCHANGE", `API credentials for ${provider} are invalid.`, new Error(`API credentials for ${provider} are invalid.`));
        await exchange.close();
        exchange = new ccxt.pro[provider]();
      }

      try {
        ctx?.step?.(`Loading markets for ${provider}`);
        await exchange.loadMarkets();
      } catch (error) {
        if (this.isRateLimitError(error)) {
          ctx?.step?.(`Rate limit error detected for ${provider}, retrying...`);
          await this.handleRateLimitError(provider, ctx);
          return this.initializeExchange(provider, retries, ctx);
        } else {
          logger.error("EXCHANGE", `Failed to load markets: ${error.message}`, new Error(`Failed to load markets: ${error.message}`));
          await exchange.close();
          exchange = new ccxt.pro[provider]();
        }
      }

      this.exchangeCache.set(provider, exchange);
      this.attemptCount = 0;
      this.lastAttemptTime = null;
      ctx?.step?.(`Exchange ${provider} initialized successfully`);
      return exchange;
    } catch (error) {
      logger.error("EXCHANGE", "Failed to initialize exchange", error);
      this.attemptCount += 1;
      this.lastAttemptTime = now;

      if (
        retries > 0 &&
        (this.attemptCount < 3 || now - this.lastAttemptTime >= 30 * 60 * 1000)
      ) {
        ctx?.step?.(`Retrying exchange initialization for ${provider} (${retries} retries left)`);
        await sleep(5000);
        return this.initializeExchange(provider, retries - 1, ctx);
      }
      return null;
    }
  }

  private isRateLimitError(error: any): boolean {
    return error instanceof ccxt.RateLimitExceeded || error.code === -1003;
  }

  private async handleRateLimitError(provider: string, ctx?: LogContext): Promise<void> {
    ctx?.step?.(`Rate limit exceeded for ${provider}, applying 1-minute ban`);
    const banTime = Date.now() + 60000; // Ban for 1 minute
    await saveBanStatus(banTime);
    await sleep(60000); // Wait for 1 minute
  }

  public async startExchange(ctx?: LogContext): Promise<any> {
    ctx?.step?.("Starting exchange initialization");
    if (await handleBanStatus(await loadBanStatus())) {
      ctx?.step?.("Exchange is currently banned");
      return null;
    }

    if (this.exchange) {
      ctx?.step?.("Using existing exchange instance");
      return this.exchange;
    }

    // Handle concurrent initialization
    if (this.isInitializing) {
      ctx?.step?.("Exchange initialization already in progress, queuing request");
      return new Promise((resolve, reject) => {
        this.initializationQueue.push({ resolve, reject });
      });
    }

    this.isInitializing = true;

    try {
      ctx?.step?.("Fetching active exchange provider");
      this.provider = this.provider || (await this.fetchActiveProvider());
      if (!this.provider) {
        ctx?.step?.("No active exchange provider found");
        this.resolveQueue(null);
        return null;
      }

      ctx?.step?.(`Active provider: ${this.provider}`);

      // Check if exchange is already cached
      if (this.exchangeCache.has(this.provider)) {
        ctx?.step?.(`Using cached exchange for ${this.provider}`);
        this.exchange = this.exchangeCache.get(this.provider);
        this.resolveQueue(this.exchange);
        return this.exchange;
      }

      // Initialize exchange
      ctx?.step?.(`Initializing exchange: ${this.provider}`);
      this.exchange = await this.initializeExchange(this.provider, 3, ctx);
      this.resolveQueue(this.exchange);
      return this.exchange;
    } catch (error) {
      this.rejectQueue(error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private resolveQueue(result: any): void {
    while (this.initializationQueue.length > 0) {
      const { resolve } = this.initializationQueue.shift()!;
      resolve(result);
    }
  }

  private rejectQueue(error: any): void {
    while (this.initializationQueue.length > 0) {
      const { reject } = this.initializationQueue.shift()!;
      reject(error);
    }
  }

  public async startExchangeProvider(provider: string, ctx?: LogContext): Promise<any> {
    ctx?.step?.(`Starting exchange provider: ${provider}`);
    if (await handleBanStatus(await loadBanStatus())) {
      ctx?.step?.("Exchange is currently banned");
      return null;
    }

    if (!provider) {
      throw new Error("Provider is required to start exchange provider.");
    }

    if (this.exchangeCache.has(provider)) {
      ctx?.step?.(`Using cached exchange provider: ${provider}`);
    } else {
      ctx?.step?.(`Initializing exchange provider: ${provider}`);
    }

    this.exchangeProvider =
      this.exchangeCache.get(provider) ||
      (await this.initializeExchange(provider, 3, ctx));
    return this.exchangeProvider;
  }

  public removeExchange(provider: string): void {
    if (!provider) {
      throw new Error("Provider is required to remove exchange.");
    }

    this.exchangeCache.delete(provider);
    if (this.provider === provider) {
      this.exchange = null;
      this.provider = null;
    }
  }

  public async getProvider(): Promise<string | null> {
    if (!this.provider) {
      this.provider = await this.fetchActiveProvider();
    }
    return this.provider;
  }

  public async testExchangeCredentials(
    provider: string,
    ctx?: LogContext
  ): Promise<{ status: boolean; message: string }> {
    ctx?.step?.(`Testing exchange credentials for ${provider}`);
    if (await handleBanStatus(await loadBanStatus())) {
      ctx?.step?.("Exchange is currently banned");
      return {
        status: false,
        message: "Service temporarily unavailable. Please try again later.",
      };
    }

    try {
      ctx?.step?.(`Loading API credentials for ${provider}`);
      const apiKey = process.env[`APP_${provider.toUpperCase()}_API_KEY`];
      const apiSecret = process.env[`APP_${provider.toUpperCase()}_API_SECRET`];
      const apiPassphrase =
        process.env[`APP_${provider.toUpperCase()}_API_PASSPHRASE`];

      if (!apiKey || !apiSecret || apiKey === "" || apiSecret === "") {
        ctx?.step?.("API credentials are missing");
        return {
          status: false,
          message: "API credentials are missing from environment variables",
        };
      }

      // Create exchange instance with timeout and error handling
      ctx?.step?.(`Creating test exchange instance for ${provider}`);
      const exchange = new ccxt.pro[provider]({
        apiKey,
        secret: apiSecret,
        password: apiPassphrase,
        timeout: 30000, // 30 second timeout
        enableRateLimit: true,
      });

      // Test connection by loading markets first
      ctx?.step?.(`Loading markets for ${provider}`);
      await exchange.loadMarkets();

      // Test credentials by fetching balance
      ctx?.step?.(`Fetching balance to verify credentials for ${provider}`);
      const balance = await exchange.fetchBalance();

      // Clean up the connection
      ctx?.step?.(`Closing test connection for ${provider}`);
      await exchange.close();

      if (balance && typeof balance === 'object') {
        ctx?.step?.(`Credentials verified successfully for ${provider}`);
        return {
          status: true,
          message: "API credentials are valid and connection successful",
        };
      } else {
        ctx?.step?.(`Failed to verify credentials for ${provider}`);
        return {
          status: false,
          message: "Failed to fetch balance with the provided credentials",
        };
      }
    } catch (error) {
      logger.error("EXCHANGE", "Failed to test exchange credentials", error);

      // Handle specific error types
      if (error.name === 'AuthenticationError') {
        ctx?.step?.(`Authentication error for ${provider}`);
        return {
          status: false,
          message: "Invalid API credentials. Please check your API key and secret.",
        };
      } else if (error.name === 'NetworkError' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        ctx?.step?.(`Network error for ${provider}`);
        return {
          status: false,
          message: "Network error. Please check your internet connection and try again.",
        };
      } else if (error.name === 'ExchangeNotAvailable') {
        ctx?.step?.(`Exchange not available: ${provider}`);
        return {
          status: false,
          message: "Exchange service is temporarily unavailable. Please try again later.",
        };
      } else if (error.name === 'RateLimitExceeded') {
        ctx?.step?.(`Rate limit exceeded for ${provider}`);
        return {
          status: false,
          message: "Rate limit exceeded. Please wait a moment and try again.",
        };
      } else if (error.name === 'PermissionDenied') {
        ctx?.step?.(`Permission denied for ${provider}`);
        return {
          status: false,
          message: "Insufficient API permissions. Please check your API key permissions.",
        };
      } else {
        ctx?.step?.(`Connection failed for ${provider}: ${error.message}`);
        return {
          status: false,
          message: `Connection failed: ${error.message || 'Unknown error occurred'}`,
        };
      }
    }
  }

  public async stopExchange(): Promise<void> {
    if (this.exchange) {
      await this.exchange.close();
      this.exchange = null;
    }
  }
}

export default ExchangeManager.instance;

export function mapChainNameToChainId(chainName: string) {
  const chainMap: { [key: string]: string } = {
    BEP20: "bsc",
    BEP2: "bnb",
    ERC20: "eth",
    TRC20: "trx",
    "KAVA EVM CO-CHAIN": "kavaevm",
    "LIGHTNING NETWORK": "lightning",
    "BTC-SEGWIT": "btc",
    "ASSET HUB(POLKADOT)": "polkadot",
  };

  return chainMap[chainName] || chainName;
}
