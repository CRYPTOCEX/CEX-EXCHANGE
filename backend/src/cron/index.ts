import { Queue, Worker } from "bullmq";
import { CacheManager } from "@b/utils/cache";
import { broadcastLog, broadcastStatus } from "./broadcast";
import { logger } from "@b/utils/console";
import {
  getMailwizardCronUtils,
  getGeneralInvestmentCronUtils,
  getForexCronUtils,
  getIcoCronUtils,
  getStakingCronUtils,
  getAiInvestmentCronUtils,
  getAiMarketMakerCronUtils,
  getEcosystemCronUtils,
  getP2pCronUtils,
  getNftCronUtils,
  getGatewayCronUtils,
  getCopyTradingCronUtils,
  getCopyTradingQueueUtils,
} from "@b/utils/safe-imports";

// Import job handlers from separate files
import {
  cleanupOldPnlRecords,
  processPendingWithdrawals,
  processSpotPendingDeposits,
  processWalletPnl,
} from "./jobs/wallet";
import { processPendingOrders } from "./jobs/order";
import { processExpiredUserBlocks } from "./jobs/userBlock";
import {
  fetchFiatCurrencyPrices,
  processCurrenciesPrices,
  cacheExchangeCurrencies,
  updateCurrencyPricesBulk,
} from "./jobs/currency";
import BTCDepositScanner from "./jobs/btcDepositScanner";

// =============================================================================
// SAFE IMPORTS FOR ADDON CRONS
// Using centralized safe-imports for consistent error handling
// =============================================================================

async function processMailwizardCampaigns() {
  const m = await getMailwizardCronUtils();
  if (m?.processMailwizardCampaigns) return m.processMailwizardCampaigns();
}

async function processGeneralInvestments() {
  const m = await getGeneralInvestmentCronUtils();
  if (m?.processGeneralInvestments) return m.processGeneralInvestments();
}

async function processForexInvestments() {
  const m = await getForexCronUtils();
  if (m?.processForexInvestments) return m.processForexInvestments();
}

async function processIcoOfferings() {
  const m = await getIcoCronUtils();
  if (m?.processIcoOfferings) return m.processIcoOfferings();
}

async function processStakingPositions() {
  const m = await getStakingCronUtils();
  if (m?.processStakingPositions) return m.processStakingPositions();
}

async function processAiInvestments() {
  const m = await getAiInvestmentCronUtils();
  if (m?.processAiInvestments) return m.processAiInvestments();
}

async function processAiMarketMakerEngine() {
  const m = await getAiMarketMakerCronUtils();
  if (m?.processAiMarketMakerEngine) return m.processAiMarketMakerEngine();
}

async function processAiRiskMonitor() {
  const m = await getAiMarketMakerCronUtils();
  if (m?.processAiRiskMonitor) return m.processAiRiskMonitor();
}

async function processAiPoolRebalancer() {
  const m = await getAiMarketMakerCronUtils();
  if (m?.processAiPoolRebalancer) return m.processAiPoolRebalancer();
}

async function processAiDailyReset() {
  const m = await getAiMarketMakerCronUtils();
  if (m?.processAiDailyReset) return m.processAiDailyReset();
}

async function processAiAnalyticsAggregator() {
  const m = await getAiMarketMakerCronUtils();
  if (m?.processAiAnalyticsAggregator) return m.processAiAnalyticsAggregator();
}

async function processAiPriceSync() {
  const m = await getAiMarketMakerCronUtils();
  if (m?.processAiPriceSync) return m.processAiPriceSync();
}

async function processPendingEcoWithdrawals() {
  const m = await getEcosystemCronUtils();
  if (m?.processPendingEcoWithdrawals) return m.processPendingEcoWithdrawals();
}

async function p2pTradeTimeout() {
  const m = await getP2pCronUtils();
  if (m?.p2pTradeTimeout) return m.p2pTradeTimeout();
}

async function expireOffers() {
  const m = await getNftCronUtils();
  if (m?.expireOffers) return m.expireOffers();
}

async function settleAuctions() {
  const m = await getNftCronUtils();
  if (m?.settleAuctions) return m.settleAuctions();
}

async function processGatewayPayouts() {
  const m = await getGatewayCronUtils();
  if (m?.processGatewayPayouts) return m.processGatewayPayouts();
}

async function processPendingCopyTrades() {
  const m = await getCopyTradingCronUtils();
  if (m?.processPendingCopyTrades) return m.processPendingCopyTrades();
}

// Initialize copy trading queue processor on startup
async function initCopyTradingQueue() {
  const m = await getCopyTradingQueueUtils();
  if (m?.startCopyQueue) {
    m.startCopyQueue();
    logger.info("CRON", "Copy trading queue initialized");
  }
}

async function processClosedCopyTrades() {
  const m = await getCopyTradingCronUtils();
  if (m?.processClosedCopyTrades) return m.processClosedCopyTrades();
}

async function updateCopyTradingLeaderDailyStats() {
  const m = await getCopyTradingCronUtils();
  if (m?.updateLeaderDailyStats) return m.updateLeaderDailyStats();
}

async function resetCopyTradingDailyLimits() {
  const m = await getCopyTradingCronUtils();
  if (m?.resetDailyLimits) return m.resetDailyLimits();
}

async function checkCopyTradingDailyLossLimits() {
  const m = await getCopyTradingCronUtils();
  if (m?.checkDailyLossLimits) return m.checkDailyLossLimits();
}

async function monitorCopyTradingStopLevels() {
  const m = await getCopyTradingCronUtils();
  if (m?.monitorStopLevels) return m.monitorStopLevels();
}

async function aggregateCopyTradingWeeklyAnalytics() {
  const m = await getCopyTradingCronUtils();
  if (m?.aggregateWeeklyAnalytics) return m.aggregateWeeklyAnalytics();
}

// =============================================================================
// CRON JOB TYPES AND MANAGER
// =============================================================================

export type CronJobStatus = "idle" | "running" | "completed" | "failed";

export interface CronJob {
  name: string;
  title: string;
  period: number;
  description: string;
  function: string;
  handler: () => Promise<void>;
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
      // Initialize copy trading queue processor
      await initCopyTradingQueue();
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
        period: 15 * 60 * 1000,
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
        period: 60 * 1000,
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
      },
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
      p2p: [
        {
          name: "p2pTradeTimeout",
          title: "P2P Trade Timeout Handler",
          period: 5 * 60 * 1000,
          description: "Automatically expires P2P trades that have passed their expiration date and releases escrowed funds.",
          function: "p2pTradeTimeout",
          handler: p2pTradeTimeout,
          lastRun: null,
          lastRunError: null,
          category: "p2p",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      nft: [
        {
          name: "expireOffers",
          title: "Expire NFT Offers",
          period: 5 * 60 * 1000,
          description: "Automatically expires NFT offers that have passed their expiration date.",
          function: "expireOffers",
          handler: expireOffers,
          lastRun: null,
          lastRunError: null,
          category: "nft",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "settleAuctions",
          title: "Settle NFT Auctions",
          period: 10 * 60 * 1000,
          description: "Automatically settles NFT auctions that have ended.",
          function: "settleAuctions",
          handler: settleAuctions,
          lastRun: null,
          lastRunError: null,
          category: "nft",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      gateway: [
        {
          name: "processGatewayPayouts",
          title: "Process Gateway Payouts",
          period: 60 * 60 * 1000,
          description: "Automatically creates payout records for merchants based on their payout schedule (Daily, Weekly, Monthly).",
          function: "processGatewayPayouts",
          handler: processGatewayPayouts,
          lastRun: null,
          lastRunError: null,
          category: "gateway",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      copy_trading: [
        {
          name: "processPendingCopyTrades",
          title: "Process Pending Copy Trades",
          period: 10 * 1000,
          description: "Replicates leader trades to all active followers.",
          function: "processPendingCopyTrades",
          handler: processPendingCopyTrades,
          lastRun: null,
          lastRunError: null,
          category: "copy_trading",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "processClosedCopyTrades",
          title: "Process Closed Copy Trades",
          period: 30 * 1000,
          description: "Processes closed trades and distributes profit shares.",
          function: "processClosedCopyTrades",
          handler: processClosedCopyTrades,
          lastRun: null,
          lastRunError: null,
          category: "copy_trading",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "updateCopyTradingLeaderDailyStats",
          title: "Update Leader Daily Stats",
          period: 5 * 60 * 1000,
          description: "Updates daily statistics for all active copy trading leaders.",
          function: "updateCopyTradingLeaderDailyStats",
          handler: updateCopyTradingLeaderDailyStats,
          lastRun: null,
          lastRunError: null,
          category: "copy_trading",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "checkCopyTradingDailyLossLimits",
          title: "Check Daily Loss Limits",
          period: 60 * 1000,
          description: "Checks and pauses followers exceeding their daily loss limits.",
          function: "checkCopyTradingDailyLossLimits",
          handler: checkCopyTradingDailyLossLimits,
          lastRun: null,
          lastRunError: null,
          category: "copy_trading",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "monitorCopyTradingStopLevels",
          title: "Monitor Stop Loss/Take Profit",
          period: 30 * 1000,
          description: "Monitors and triggers stop-loss/take-profit for open trades.",
          function: "monitorCopyTradingStopLevels",
          handler: monitorCopyTradingStopLevels,
          lastRun: null,
          lastRunError: null,
          category: "copy_trading",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "resetCopyTradingDailyLimits",
          title: "Reset Daily Limits",
          period: 24 * 60 * 60 * 1000,
          description: "Resets daily limits and reactivates paused followers at midnight.",
          function: "resetCopyTradingDailyLimits",
          handler: resetCopyTradingDailyLimits,
          lastRun: null,
          lastRunError: null,
          category: "copy_trading",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "aggregateCopyTradingWeeklyAnalytics",
          title: "Aggregate Weekly Analytics",
          period: 7 * 24 * 60 * 60 * 1000,
          description: "Aggregates weekly performance analytics for leaders.",
          function: "aggregateCopyTradingWeeklyAnalytics",
          handler: aggregateCopyTradingWeeklyAnalytics,
          lastRun: null,
          lastRunError: null,
          category: "copy_trading",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
      ai_market_maker: [
        {
          name: "processAiMarketMakerEngine",
          title: "AI Market Maker Engine",
          period: 5 * 1000,
          description: "Main AI market maker engine loop that processes active markets and coordinates bot trading activities.",
          function: "processAiMarketMakerEngine",
          handler: processAiMarketMakerEngine,
          lastRun: null,
          lastRunError: null,
          category: "ai_market_maker",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "processAiRiskMonitor",
          title: "AI Risk Monitor",
          period: 10 * 1000,
          description: "Monitors risk metrics for AI market makers including volatility, loss limits, and trading patterns.",
          function: "processAiRiskMonitor",
          handler: processAiRiskMonitor,
          lastRun: null,
          lastRunError: null,
          category: "ai_market_maker",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "processAiPoolRebalancer",
          title: "AI Pool Rebalancer",
          period: 60 * 60 * 1000,
          description: "Automatically rebalances AI market maker pools when asset ratios become too skewed.",
          function: "processAiPoolRebalancer",
          handler: processAiPoolRebalancer,
          lastRun: null,
          lastRunError: null,
          category: "ai_market_maker",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "processAiDailyReset",
          title: "AI Daily Reset",
          period: 24 * 60 * 60 * 1000,
          description: "Resets daily volume counters, trade counts, and generates daily summary reports for AI markets.",
          function: "processAiDailyReset",
          handler: processAiDailyReset,
          lastRun: null,
          lastRunError: null,
          category: "ai_market_maker",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "processAiAnalyticsAggregator",
          title: "AI Analytics Aggregator",
          period: 15 * 60 * 1000,
          description: "Aggregates trading statistics and performance metrics for AI market makers.",
          function: "processAiAnalyticsAggregator",
          handler: processAiAnalyticsAggregator,
          lastRun: null,
          lastRunError: null,
          category: "ai_market_maker",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
        {
          name: "processAiPriceSync",
          title: "AI Price Sync",
          period: 30 * 1000,
          description: "Syncs external price feeds for AI market makers and alerts on major deviations.",
          function: "processAiPriceSync",
          handler: processAiPriceSync,
          lastRun: null,
          lastRunError: null,
          category: "ai_market_maker",
          status: "idle",
          progress: 0,
          lastExecutions: [],
          nextScheduledRun: null,
        },
      ],
    };

    const cacheManager = CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();

    const existingJobNames = new Set(this.cronJobs.map(job => job.name));

    for (const addon of Object.keys(addonCronJobs)) {
      if (extensions.has(addon)) {
        for (const cronJob of addonCronJobs[addon]) {
          if (!existingJobNames.has(cronJob.name)) {
            this.cronJobs.push(cronJob);
            existingJobNames.add(cronJob.name);
          }
        }
      }
    }
  }

  public getCronJobs(): CronJob[] {
    return this.cronJobs;
  }

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

      if (!job.lastExecutions) {
        job.lastExecutions = [];
      }
      job.lastExecutions.unshift({
        timestamp: lastRun,
        duration: executionTime || 0,
        status: lastRunError ? "failed" : "completed"
      });

      if (job.lastExecutions.length > 10) {
        job.lastExecutions = job.lastExecutions.slice(0, 10);
      }

      const totalExecutions = job.lastExecutions.length;
      const successfulExecutions = job.lastExecutions.filter(exec => exec.status === "completed").length;
      job.successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

      setTimeout(() => {
        if (job.status === "completed" || job.status === "failed") {
          job.status = "idle";
          job.progress = 0;
        }
      }, 5000);
    }
  }

  public updateJobRunningStatus(name: string, status: CronJobStatus, progress?: number) {
    const job = this.cronJobs.find((job) => job.name === name);
    if (job) {
      job.status = status;
      if (progress !== undefined) {
        job.progress = progress;
      }

      if (status === "completed" || status === "failed") {
        job.progress = 0;
      }
    }
  }

  public async triggerJob(name: string): Promise<boolean> {
    const job = this.cronJobs.find((job) => job.name === name);
    if (!job) {
      return false;
    }

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
      logger.error("CRON", "Manual trigger failed", error);
      return false;
    }
  }
}

export const createWorker = async (
  name: string,
  handler: () => Promise<void>,
  period: number,
  concurrency: number = 1
) => {
  const cronJobManager = await CronJobManager.getInstance();

  try {
    const queue = new Queue(name, {
      connection: {
        host: "127.0.0.1",
        port: 6379,
      },
    });

    await queue.waitUntilReady();

    const worker = new Worker(
      name,
      async (_job) => {
        const startTime = Date.now();
        try {
          cronJobManager.updateJobRunningStatus(name, "running", 0);
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

          broadcastStatus(name, "failed");
          logger.error("CRON", `Worker ${name} error`, error);
          throw error;
        }
      },
      {
        connection: {
          host: "127.0.0.1",
          port: 6379,
        },
        concurrency,
      }
    );

    worker.on('error', (error) => {
      logger.error("CRON", `Worker ${name} error: ${error.message}`, error);
    });

    worker.on('failed', (_job, error) => {
      logger.error("CRON", `Job ${name} failed: ${error.message}`, error);
    });

    await queue.add(
      name,
      {},
      {
        jobId: `repeatable-${name}`,
        repeat: { every: period, startDate: new Date(Date.now() - period) },
        backoff: { type: "exponential", delay: Math.floor(period / 2) },
      }
    );
  } catch (error: any) {
    logger.error("CRON", `Cron ${name} failed`, error);
    throw error;
  }
};

// Re-export functions that are imported elsewhere
export {
  fetchFiatCurrencyPrices,
  processCurrenciesPrices,
  cacheExchangeCurrencies,
  updateCurrencyPricesBulk,
};

export default CronJobManager;
