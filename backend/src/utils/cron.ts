import { Queue, Worker } from "bullmq";
import { models, sequelize } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import {
  cacheCurrencies,
  updateCurrencyRates,
} from "@b/api/finance/currency/utils";
import { getCurrencies } from "@b/api/exchange/currency/index.get";
import ExchangeManager from "@b/utils/exchange";
import { RedisSingleton } from "@b/utils/redis";
import { logError } from "./logger";
import {
  formatWaitTime,
  handleExchangeError,
  loadBanStatus,
  saveBanStatus,
} from "@b/api/exchange/utils";
import {
  cleanupOldPnlRecords,
  processPendingWithdrawals,
  processSpotPendingDeposits,
  processWalletPnl,
} from "./crons/wallet";
import { processForexInvestments } from "./crons/forex";
import { processIcoOfferings } from "./crons/ico";
import { processStakingPositions } from "./crons/staking";
import { processMailwizardCampaigns } from "./crons/mailwizard";
import { processGeneralInvestments } from "./crons/investment";
import { processAiInvestments } from "./crons/aiInvestment";
import { processPendingOrders } from "./crons/order";
import { processExpiredUserBlocks } from "./crons/userBlock";
// Safe import for ecosystem cron functions
async function processPendingEcoWithdrawals() {
  try {
    // @ts-ignore - Dynamic import for optional extension
    const module = await import("../api/(ext)/ecosystem/utils/cron");
    return module.processPendingEcoWithdrawals();
  } catch (error) {
    console.log("Ecosystem cron extension not available, skipping eco withdrawals processing");
  }
}
import { broadcastLog, broadcastStatus } from "./crons/broadcast";
import BTCDepositScanner from "./crons/btc-deposit-scanner";

const redis = RedisSingleton.getInstance();

// Updated CronJob type matching your Zustand store types
export type CronJobStatus = "idle" | "running" | "completed" | "failed";

export interface CronJob {
  name: string;
  title: string;
  period: number;
  description: string;
  function: string; // for display (the function name)
  handler: () => Promise<void>; // the actual execution function
  lastRun: Date | null;
  lastRunError: string | null;
  category: string;
  status: CronJobStatus;
  progress: number;
  executionTime?: number;
  successRate?: number;
  lastExecutions?: {
    timestamp: Date;
    duration: number;
    status: "completed" | "failed";
  }[];
  resourceUsage?: { cpu: number; memory: number };
  nextScheduledRun?: Date | null;
}

class CronJobManager {
  private static instance: CronJobManager;
  private cronJobs: CronJob[] = [];

  private constructor() {
    this.loadNormalCronJobs();
  }

  public static async getInstance(): Promise<CronJobManager> {
    if (!CronJobManager.instance) {
      CronJobManager.instance = new CronJobManager();
      await CronJobManager.instance.loadAddonCronJobs();
    }
    return CronJobManager.instance;
  }

  private loadNormalCronJobs() {
    this.cronJobs.push(
      {
        name: "processGeneralInvestments",
        title: "Process General Investments",
        period: 60 * 60 * 1000,
        description: "Processes active General investments.",
        function: "processGeneralInvestments",
        handler: processGeneralInvestments,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "processPendingOrders",
        title: "Process Pending Orders",
        period: 60 * 60 * 1000,
        description: "Processes pending binary orders.",
        function: "processPendingOrders",
        handler: processPendingOrders,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "fetchFiatCurrencyPrices",
        title: "Fetch Fiat Currency Prices",
        period: 30 * 60 * 1000,
        description: "Fetches the latest fiat currency prices.",
        function: "fetchFiatCurrencyPrices",
        handler: fetchFiatCurrencyPrices,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "processCurrenciesPrices",
        title: "Process Currencies Prices",
        period: 2 * 60 * 1000,
        description:
          "Updates the prices of all exchange currencies in the database.",
        function: "processCurrenciesPrices",
        handler: processCurrenciesPrices,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "processSpotPendingDeposits",
        title: "Process Pending Spot Deposits",
        period: 15 * 60 * 1000,
        description: "Processes pending spot wallet deposits.",
        function: "processSpotPendingDeposits",
        handler: processSpotPendingDeposits,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "processPendingWithdrawals",
        title: "Process Pending Withdrawals",
        period: 30 * 60 * 1000,
        description: "Processes pending spot wallet withdrawals.",
        function: "processPendingWithdrawals",
        handler: processPendingWithdrawals,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "processWalletPnl",
        title: "Process Wallet PnL",
        period: 24 * 60 * 60 * 1000,
        description: "Processes wallet PnL for all users.",
        function: "processWalletPnl",
        handler: processWalletPnl,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "cleanupOldPnlRecords",
        title: "Cleanup Old PnL Records",
        period: 24 * 60 * 60 * 1000,
        description: "Removes old PnL records and zero balance records.",
        function: "cleanupOldPnlRecords",
        handler: cleanupOldPnlRecords,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "processExpiredUserBlocks",
        title: "Process Expired User Blocks",
        period: 15 * 60 * 1000, // Run every 15 minutes
        description: "Automatically unblocks users whose temporary blocks have expired.",
        function: "processExpiredUserBlocks",
        handler: processExpiredUserBlocks,
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      },
      {
        name: "btcDepositScanner",
        title: "Bitcoin Deposit Scanner",
        period: 60 * 1000, // Run every 60 seconds
        description: "Scans all BTC wallets for deposits using Bitcoin Core node (only when BTC_NODE=node).",
        function: "btcDepositScanner",
        handler: async () => {
          const scanner = BTCDepositScanner.getInstance();
          await scanner.start();
        },
        lastRun: null,
        lastRunError: null,
        category: "normal",
        status: "idle",
        progress: 0,
        lastExecutions: [],
        nextScheduledRun: null,
      }
    );
  }

  private async loadAddonCronJobs() {
    const addonCronJobs: { [key: string]: CronJob[] } = {
      ecosystem: [
        {
          name: "processPendingEcoWithdrawals",
          title: "Process Pending Ecosystem Withdrawals",
          period: 30 * 60 * 1000,
          description: "Processes pending funding wallet withdrawals.",
          function: "processPendingEcoWithdrawals",
          handler: processPendingEcoWithdrawals,
          lastRun: null,
          lastRunError: null,
          category: "ecosystem",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      ai_investment: [
        {
          name: "processAiInvestments",
          title: "Process AI Investments",
          period: 60 * 60 * 1000,
          description: "Processes active AI investments.",
          function: "processAiInvestments",
          handler: processAiInvestments,
          lastRun: null,
          lastRunError: null,
          category: "ai_investment",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      forex: [
        {
          name: "processForexInvestments",
          title: "Process Forex Investments",
          period: 60 * 60 * 1000,
          description: "Processes active Forex investments.",
          function: "processForexInvestments",
          handler: processForexInvestments,
          lastRun: null,
          lastRunError: null,
          category: "forex",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      ico: [
        {
          name: "processIcoOfferings",
          title: "Process ICO Phases",
          period: 60 * 60 * 1000,
          description: "Processes ICO offerings and updates their status.",
          function: "processIcoOfferings",
          handler: processIcoOfferings,
          lastRun: null,
          lastRunError: null,
          category: "ico",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      staking: [
        {
          name: "processStakingPositions",
          title: "Process Staking Logs",
          period: 60 * 60 * 1000,
          description:
            "Processes staking positions and rewards users accordingly.",
          function: "processStakingPositions",
          handler: processStakingPositions,
          lastRun: null,
          lastRunError: null,
          category: "staking",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      mailwizard: [
        {
          name: "processMailwizardCampaigns",
          title: "Process Mailwizard Campaigns",
          period: 60 * 60 * 1000,
          description: "Processes Mailwizard campaigns and sends emails.",
          function: "processMailwizardCampaigns",
          handler: processMailwizardCampaigns,
          lastRun: null,
          lastRunError: null,
          category: "mailwizard",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
    };

    const cacheManager = CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    for (const addon of Object.keys(addonCronJobs)) {
      if (extensions.has(addon)) {
        addonCronJobs[addon].forEach((cronJob) => {
          if (!this.isCronJobPresent(this.cronJobs, cronJob.name)) {
            this.cronJobs.push(cronJob);
          }
        });
      }
    }
  }

  public getCronJobs(): CronJob[] {
    return this.cronJobs;
  }

  // Updated to also record execution time and next scheduled run
  public updateJobStatus(
    name: string,
    lastRun: Date,
    lastRunError: string | null,
    executionTime?: number,
    nextScheduledRun?: Date | null
  ) {
    const job = this.cronJobs.find((job) => job.name === name);
    if (job) {
      job.lastRun = lastRun;
      job.lastRunError = lastRunError;
      
      // Update job status based on execution result
      if (lastRunError) {
        job.status = "failed";
      } else {
        job.status = "completed";
      }
      
      if (executionTime !== undefined) {
        job.executionTime = executionTime;
      }
      if (nextScheduledRun) {
        job.nextScheduledRun = nextScheduledRun;
      }
      
      // Add execution to historical metrics
      if (!job.lastExecutions) {
        job.lastExecutions = [];
      }
      job.lastExecutions.unshift({
        timestamp: lastRun,
        duration: executionTime || 0,
        status: lastRunError ? "failed" : "completed"
      });
      
      // Keep only last 10 executions for memory efficiency
      if (job.lastExecutions.length > 10) {
        job.lastExecutions = job.lastExecutions.slice(0, 10);
      }

      // Calculate success rate
      const totalExecutions = job.lastExecutions.length;
      const successfulExecutions = job.lastExecutions.filter(exec => exec.status === "completed").length;
      job.successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

      // Set job back to idle after a short delay (to allow UI to show completed status)
      setTimeout(() => {
        if (job.status === "completed" || job.status === "failed") {
          job.status = "idle";
          job.progress = 0;
        }
      }, 5000); // Reset to idle after 5 seconds
    }
  }

  // New method to update job status during execution
  public updateJobRunningStatus(name: string, status: CronJobStatus, progress?: number) {
    const job = this.cronJobs.find((job) => job.name === name);
    if (job) {
      job.status = status;
      if (progress !== undefined) {
        job.progress = progress;
      }
      
      // Reset progress when job completes or fails
      if (status === "completed" || status === "failed") {
        job.progress = 0;
      }
    }
  }

  // Method to manually trigger a cron job (for testing purposes)
  public async triggerJob(name: string): Promise<boolean> {
    const job = this.cronJobs.find((job) => job.name === name);
    if (!job) {
      return false;
    }

    // Don't trigger if job is already running
    if (job.status === "running") {
      return false;
    }

    const startTime = Date.now();
    try {
      this.updateJobRunningStatus(name, "running", 0);
      
      await job.handler();
      
      const executionTime = Date.now() - startTime;
      this.updateJobStatus(name, new Date(startTime), null, executionTime);
      
      return true;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.updateJobStatus(name, new Date(startTime), error.message, executionTime);
      logError("manual trigger", error, __filename);
      return false;
    }
  }

  private isCronJobPresent(cronJobs: CronJob[], jobName: string): boolean {
    return cronJobs.some((job) => job.name === jobName);
  }
}

export const createWorker = async (
  name: string,
  handler: () => Promise<void>,
  period: number,
  concurrency: number = 1 // default concurrency set to 1; adjust as needed
) => {
  const cronJobManager = await CronJobManager.getInstance();

  try {
    const queue = new Queue(name, {
      connection: {
        host: "127.0.0.1",
        port: 6379,
      },
    });

    // Test Redis connection before creating worker
    await queue.waitUntilReady();

    // Worker with added concurrency option
    const worker = new Worker(
      name,
      async (job) => {
        const startTime = Date.now();
        try {
          // Set job status to running when it starts
          cronJobManager.updateJobRunningStatus(name, "running", 0);

          // Broadcast status change to WebSocket clients
          broadcastStatus(name, "running");

          await handler();

          const executionTime = Date.now() - startTime;
          const nextScheduledRun = new Date(Date.now() + period);
          cronJobManager.updateJobStatus(
            name,
            new Date(startTime),
            null,
            executionTime,
            nextScheduledRun
          );

          // Broadcast completion status
          broadcastStatus(name, "completed", { duration: executionTime });
        } catch (error: any) {
          const executionTime = Date.now() - startTime;
          const nextScheduledRun = new Date(Date.now() + period);
          cronJobManager.updateJobStatus(
            name,
            new Date(startTime),
            error.message,
            executionTime,
            nextScheduledRun
          );

          // Broadcast failure status
          broadcastStatus(name, "failed");
          logError("worker", error, __filename);
          throw error;
        }
      },
      {
        connection: {
          host: "127.0.0.1",
          port: 6379,
        },
        concurrency, // worker concurrency
      }
    );

    // Listen for worker errors
    worker.on('error', (error) => {
      console.error(`\x1b[31mWorker ${name} error: ${error.message}\x1b[0m`);
      logError(`worker-${name}`, error, __filename);
    });

    worker.on('failed', (job, error) => {
      console.error(`\x1b[31mJob ${name} failed: ${error.message}\x1b[0m`);
    });

    // Use a deterministic jobId to prevent duplicate scheduling and add a backoff strategy for retries.
    await queue.add(
      name,
      {},
      {
        jobId: `repeatable-${name}`,
        repeat: { every: period, startDate: new Date(Date.now() - period) },
        backoff: { type: "exponential", delay: Math.floor(period / 2) },
      }
    );

    console.log(`\x1b[32mCron worker ${name} successfully scheduled\x1b[0m`);
  } catch (error: any) {
    console.error(`\x1b[31mFailed to create cron worker ${name}: ${error.message}\x1b[0m`);
    console.error(`\x1b[33mMake sure Redis is running on 127.0.0.1:6379\x1b[0m`);
    logError(`createWorker-${name}`, error, __filename);
    throw error;
  }
};
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
    logError("fetchFiatCurrencyPrices", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Fetch fiat currency prices failed: ${error.message}`,
      "error"
    );
    throw error;
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
    const data = await fetchWithTimeout(openExchangeRatesUrl, 30000); // Increase timeout to 30 seconds
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
    logError("fetchOpenExchangeRates - OpenExchangeRates", error, __filename);
    broadcastLog(
      cronName,
      `OpenExchangeRates API failed: ${error.message}`,
      "error"
    );
    broadcastLog(cronName, "Attempting fallback with Frankfurter API");
    try {
      const data = await fetchWithTimeout(frankfurterApiUrl, 30000); // Increase timeout to 30 seconds
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
      logError(
        "fetchOpenExchangeRates - Frankfurter",
        fallbackError,
        __filename
      );
      broadcastLog(
        cronName,
        `Fallback Frankfurter API failed: ${fallbackError.message}`,
        "error"
      );
      throw new Error(
        `Both API calls failed: ${error.message}, ${fallbackError.message}`
      );
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
    const data = await fetchWithTimeout(exchangeRateApiUrl, 30000); // Increase timeout to 30 seconds
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
    logError("fetchExchangeRateApi", error, __filename);
    broadcastLog(
      cronName,
      `ExchangeRate API call failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

async function fetchWithTimeout(url: string, timeout = 5000) {
  // Note: This helper function does not use broadcast logging since it's a low-level utility.
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
  if (!currenciesRaw) {
    throw new Error("No currencies data available in Redis");
  }
  let currencies;
  try {
    currencies = JSON.parse(currenciesRaw);
  } catch (parseError: any) {
    throw new Error(`Error parsing currencies data: ${parseError.message}`);
  }
  if (!Array.isArray(currencies)) {
    throw new Error("Currencies data is not an array");
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
      console.log(`Waiting for ${formatWaitTime(waitTime)} until unblock time`);
      broadcastLog(
        cronName,
        `Currently banned; waiting for ${formatWaitTime(waitTime)}`,
        "info"
      );
      return; // Exit if currently banned
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
    } catch (err) {
      logError("processCurrenciesPrices - fetch markets", err, __filename);
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
    } catch (err) {
      logError("processCurrenciesPrices - fetch currencies", err, __filename);
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
      logError("processCurrenciesPrices - market symbols", error, __filename);
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
        console.log(
          `Ban detected. Blocked until ${new Date(unblockTime).toLocaleString()}`
        );
        broadcastLog(
          cronName,
          `Ban detected. Blocked until ${new Date(unblockTime).toLocaleString()}`,
          "error"
        );
        return;
      }
      logError(
        "processCurrenciesPrices - fetch markets data",
        error,
        __filename
      );
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
        let price;
        if (exchange.has["fetchLastPrices"]) {
          price = market.price;
        } else {
          price = market.last;
        }
        if (!price || isNaN(parseFloat(price))) {
          console.warn(
            `Invalid or missing price for symbol: ${symbol}, market data: ${JSON.stringify(market)}`
          );
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
          matchingCurrency.price = parseFloat(price);
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
      logError("processCurrenciesPrices - update database", error, __filename);
      broadcastLog(
        cronName,
        `Error updating database: ${error.message}`,
        "error"
      );
      throw error;
    }
  } catch (error: any) {
    logError("processCurrenciesPrices", error, __filename);
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
    logError("updateCurrencyPricesBulk", error, __filename);
    broadcastLog(cronName, `Bulk update failed: ${error.message}`, "error");
    throw error;
  }
}

export default CronJobManager;
