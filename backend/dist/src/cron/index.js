"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCurrencyPricesBulk = exports.cacheExchangeCurrencies = exports.processCurrenciesPrices = exports.fetchFiatCurrencyPrices = exports.createWorker = exports.HARD_STOPPED_SETTING = void 0;
exports.initCopyTradingQueue = initCopyTradingQueue;
const bullmq_1 = require("bullmq");
const worker_threads_1 = require("worker_threads");
const cache_1 = require("@b/utils/cache");
const broadcast_1 = require("./broadcast");
const mode_1 = require("./mode");
const refusal_1 = require("./refusal");
const trigger_bus_1 = require("./trigger-bus");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const redis_1 = require("@b/utils/redis");
const rust_owns_1 = require("@b/utils/rust-owns");
const safe_imports_1 = require("@b/utils/safe-imports");
const wallet_1 = require("./jobs/wallet");
const transfi_1 = require("./jobs/transfi");
const transfi_payout_1 = require("./jobs/transfi-payout");
const poolBacking_1 = require("./jobs/poolBacking");
const poolBackingAttribution_1 = require("./jobs/poolBackingAttribution");
const order_1 = require("./jobs/order");
const futuresFunding_1 = require("./jobs/futuresFunding");
const futuresFeeReversal_1 = require("./jobs/futuresFeeReversal");
const userBlock_1 = require("./jobs/userBlock");
const geoRestriction_1 = require("./jobs/geoRestriction");
const ledger_archive_1 = require("./ledger-archive");
const currency_1 = require("./jobs/currency");
Object.defineProperty(exports, "fetchFiatCurrencyPrices", { enumerable: true, get: function () { return currency_1.fetchFiatCurrencyPrices; } });
Object.defineProperty(exports, "processCurrenciesPrices", { enumerable: true, get: function () { return currency_1.processCurrenciesPrices; } });
Object.defineProperty(exports, "cacheExchangeCurrencies", { enumerable: true, get: function () { return currency_1.cacheExchangeCurrencies; } });
Object.defineProperty(exports, "updateCurrencyPricesBulk", { enumerable: true, get: function () { return currency_1.updateCurrencyPricesBulk; } });
const btcDepositScanner_1 = __importDefault(require("./jobs/btcDepositScanner"));
const heartbeat_1 = require("./jobs/heartbeat");
const news_1 = require("./jobs/news");
const priceAlerts_1 = require("./jobs/priceAlerts");
async function processMailwizardCampaigns() {
    const m = await (0, safe_imports_1.getMailwizardCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processMailwizardCampaigns)
        return m.processMailwizardCampaigns();
}
async function processGeneralInvestments() {
    const m = await (0, safe_imports_1.getGeneralInvestmentCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processGeneralInvestments)
        return m.processGeneralInvestments();
}
async function processForexInvestments() {
    const m = await (0, safe_imports_1.getForexCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processForexInvestments)
        return m.processForexInvestments();
}
async function processFxSwaps() {
    const m = await (0, safe_imports_1.getFxTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processFxSwaps)
        return m.processFxSwaps();
}
async function reconcileFxAccounts() {
    const m = await (0, safe_imports_1.getFxTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.reconcileFxAccounts)
        return m.reconcileFxAccounts();
}
async function runDexMarketRefresh() {
    const m = await (0, safe_imports_1.getDexCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.runDexMarketRefresh)
        return m.runDexMarketRefresh();
}
async function dexConfirmationSweep() {
    const m = await (0, safe_imports_1.getDexCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.runDexConfirmationSweepJob)
        return m.runDexConfirmationSweepJob();
}
async function dexFeeSweepSettle() {
    const m = await (0, safe_imports_1.getDexCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.runDexFeeSweepSettle)
        return m.runDexFeeSweepSettle();
}
async function dexTokenRescreen() {
    const m = await (0, safe_imports_1.getDexCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.runDexTokenRescreen)
        return m.runDexTokenRescreen();
}
async function dexQuotePrune() {
    const m = await (0, safe_imports_1.getDexCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.runDexQuotePrune)
        return m.runDexQuotePrune();
}
async function fxVenueCronRefused(job) {
    if (!(0, mode_1.isCronOnlyProcess)())
        return false;
    if (!(await (0, mode_1.fxVenueCronsWouldDuplicate)()))
        return false;
    await (0, refusal_1.announceCronRefusal)({
        job,
        degraded: false,
        reason: "an fx execution provider is enabled, and the forex-trading lease holder already runs " +
            "this every 60s (armFxVenueSupervisor). Two desks reconciling one broker account would " +
            "replay the same fills.",
        impact: "this job does not run on the scheduler. The work itself is NOT missing — the lease " +
            "holder is doing it — so nothing here needs fixing unless that process is also down.",
        fix: "none required on a healthy deployment. If broker fills are genuinely not being " +
            "reconciled, check that a process holds the forex-trading venue lease rather than " +
            "looking for a fault in cron.",
    });
    return true;
}
async function warnIfAiMarketMakerHasNoHost() {
    if (!(await (0, mode_1.aiMarketMakerHasNoEngineHost)()))
        return;
    await (0, refusal_1.announceCronRefusal)({
        job: "processAiMarketMakerEngine",
        degraded: true,
        reason: "the `ecosystem` extension is not enabled, so no process in this deployment boots an " +
            "ecosystem matcher — and the market maker engine runs only in the process holding the " +
            "matching lease, because an order enqueued anywhere else is dropped.",
        impact: "market making is not running anywhere: no quotes, no bot orders, and no engine-written " +
            "1-minute candles for anything that settles off them. The other six AI market maker crons " +
            "are unaffected and still run on this process.",
        fix: "enable the `ecosystem` extension, or disable `ai_market_maker`. This combination cannot " +
            "make markets whichever way cron is deployed — the market maker trades ecosystem markets.",
    });
}
async function warnIfTradingBotHasNoHost() {
    if (!(await (0, mode_1.tradingBotHasNoEngineHost)()))
        return;
    await (0, refusal_1.announceCronRefusal)({
        job: "processTradingBotEngine",
        degraded: true,
        reason: "the `ecosystem` extension is not enabled, so no process in this deployment boots an " +
            "ecosystem matcher — and the trading bot engine runs only in the process holding the " +
            "matching lease, because an order enqueued anywhere else is refused.",
        impact: "no trading bot is running anywhere: live bots place no orders, paper bots do not tick, " +
            "and no stale-tick detection runs. The other three trading bot crons (strategy ratings, " +
            "daily stats, weekly cleanup) are unaffected and still run on this process.",
        fix: "enable the `ecosystem` extension, or disable `trading_bot`. This combination cannot trade " +
            "whichever way cron is deployed — even a PAPER bot prices off ecosystem candles.",
    });
}
async function ecoWithdrawalBackstopRefused(job) {
    if (!(0, rust_owns_1.rustOwns)("eco.withdrawals"))
        return false;
    await (0, refusal_1.announceCronRefusal)({
        job,
        degraded: false,
        reason: "RUST_OWNS names `eco.withdrawals`, so this process signs and broadcasts nothing: " +
            "WithdrawalQueue.recoverPendingTransactions returns 0 before it reads a row. The job " +
            "still ticks — the token names the queue, not this job — so without this it reported a " +
            "completed run every time.",
        impact: "no PENDING ecosystem withdrawal is re-enqueued or reverted by this process. Those rows " +
            "have ALREADY debited the customer's wallet, so if the Rust custody arm is not draining " +
            "the queue, the money is neither sent nor returned and nothing else will notice.",
        fix: "if the Rust custody arm holds the withdrawal queue, none — this is the handover working, " +
            "and its own scheduler reports the runs. If it does not, remove `eco.withdrawals` from " +
            "RUST_OWNS and restart this process to take the queue back.",
    });
    return true;
}
async function runFxExecutionReconciler() {
    if (await fxVenueCronRefused("runFxExecutionReconciler"))
        return;
    const m = await (0, safe_imports_1.getFxTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.runFxExecutionReconciler)
        return m.runFxExecutionReconciler();
}
async function runFxHedgeMonitor() {
    if (await fxVenueCronRefused("runFxHedgeMonitor"))
        return;
    const m = await (0, safe_imports_1.getFxTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.runFxHedgeMonitor)
        return m.runFxHedgeMonitor();
}
async function processFxAffiliateRebates() {
    const m = await (0, safe_imports_1.getFxTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processFxAffiliateRebates)
        return m.processFxAffiliateRebates();
}
async function syncFxCalendarAndNews() {
    const m = await (0, safe_imports_1.getFxTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.syncFxCalendarAndNews)
        return m.syncFxCalendarAndNews();
}
async function runMarketNewsSync() {
    await (0, news_1.syncMarketNews)();
}
async function processIcoOfferings() {
    const m = await (0, safe_imports_1.getIcoCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processIcoOfferings)
        return m.processIcoOfferings();
}
async function processIcoVestingReleases() {
    const m = await (0, safe_imports_1.getIcoCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processIcoVestingReleases)
        return m.processIcoVestingReleases();
}
async function processStakingPositions() {
    const m = await (0, safe_imports_1.getStakingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processStakingPositions)
        return m.processStakingPositions();
}
async function processRealStakingBatches() {
    const m = await (0, safe_imports_1.getStakingRealCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processRealStakingBatches)
        return m.processRealStakingBatches();
}
async function observeRealStaking() {
    const m = await (0, safe_imports_1.getStakingRealCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.observeRealStaking)
        return m.observeRealStaking();
}
async function reconcileRealStaking() {
    const m = await (0, safe_imports_1.getStakingRealCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.reconcileRealStakingJob)
        return m.reconcileRealStakingJob();
}
async function refreshStakingValidatorSets() {
    const m = await (0, safe_imports_1.getStakingRealCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.refreshStakingValidatorSets)
        return m.refreshStakingValidatorSets();
}
async function alertRealStaking() {
    const m = await (0, safe_imports_1.getStakingRealCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.alertRealStakingJob)
        return m.alertRealStakingJob();
}
async function generateRealStakingStatements() {
    const m = await (0, safe_imports_1.getStakingRealCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.generateRealStakingStatements)
        return m.generateRealStakingStatements();
}
async function processAiInvestments() {
    const m = await (0, safe_imports_1.getAiInvestmentCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiInvestments)
        return m.processAiInvestments();
}
async function aiSupportReindexKnowledge() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportReindexKnowledge)
        return m.aiSupportReindexKnowledge();
}
async function aiSupportCacheHealthCheck() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportCacheHealthCheck)
        return m.aiSupportCacheHealthCheck();
}
async function aiSupportRetentionSweep() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportRetentionSweep)
        return m.aiSupportRetentionSweep();
}
async function aiSupportProactiveSweep() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportProactiveSweep)
        return m.aiSupportProactiveSweep();
}
async function aiSupportHarvestAnswers() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportHarvestAnswers)
        return m.aiSupportHarvestAnswers();
}
async function aiSupportShareQuestions() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportShareQuestions)
        return m.aiSupportShareQuestions();
}
async function aiSupportAutoCloseResolved() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportAutoCloseResolved)
        return m.aiSupportAutoCloseResolved();
}
async function aiSupportExpireStale() {
    const m = await (0, safe_imports_1.getAiSupportCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aiSupportExpireStale)
        return m.aiSupportExpireStale();
}
async function processAiMarketMakerEngine() {
    await warnIfAiMarketMakerHasNoHost();
    const m = await (0, safe_imports_1.getAiMarketMakerCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiMarketMakerEngine)
        return m.processAiMarketMakerEngine();
}
async function processBinaryAiEngine() {
    const m = await (0, safe_imports_1.getBinaryAiEngineCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processBinaryAiEngine)
        return m.processBinaryAiEngine();
}
async function processAiRiskMonitor() {
    const m = await (0, safe_imports_1.getAiMarketMakerCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiRiskMonitor)
        return m.processAiRiskMonitor();
}
async function processAiPoolRebalancer() {
    const m = await (0, safe_imports_1.getAiMarketMakerCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiPoolRebalancer)
        return m.processAiPoolRebalancer();
}
async function processAiDailyReset() {
    const m = await (0, safe_imports_1.getAiMarketMakerCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiDailyReset)
        return m.processAiDailyReset();
}
async function processAiAnalyticsAggregator() {
    const m = await (0, safe_imports_1.getAiMarketMakerCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiAnalyticsAggregator)
        return m.processAiAnalyticsAggregator();
}
async function processAiPriceSync() {
    const m = await (0, safe_imports_1.getAiMarketMakerCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiPriceSync)
        return m.processAiPriceSync();
}
async function processAiHistoryRetention() {
    const m = await (0, safe_imports_1.getAiMarketMakerCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processAiHistoryRetention)
        return m.processAiHistoryRetention();
}
async function processPendingEcoWithdrawals() {
    if (await ecoWithdrawalBackstopRefused("processPendingEcoWithdrawals"))
        return;
    const m = await (0, safe_imports_1.getEcosystemCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processPendingEcoWithdrawals)
        return m.processPendingEcoWithdrawals();
}
async function ecosystemWithdrawReconJob() {
    if (await ecoWithdrawalBackstopRefused("ecosystemWithdrawRecon"))
        return;
    return (0, order_1.ecosystemWithdrawRecon)();
}
async function ensureBackgroundDepositScanner() {
    const m = await (0, safe_imports_1.getBackgroundDepositScanner)();
    if (m === null || m === void 0 ? void 0 : m.startBackgroundDepositScanner)
        m.startBackgroundDepositScanner();
}
async function stopBackgroundDepositScannerEngine() {
    const m = await (0, safe_imports_1.getBackgroundDepositScanner)();
    if (m === null || m === void 0 ? void 0 : m.stopBackgroundDepositScanner)
        m.stopBackgroundDepositScanner();
}
async function recoverEcoWithdrawalsAtBoot() {
    var _a;
    if ((0, rust_owns_1.rustOwns)("eco.withdrawals"))
        return;
    try {
        const m = await (0, safe_imports_1.getEcosystemCronUtils)();
        if (m === null || m === void 0 ? void 0 : m.recoverEcoWithdrawalsAtBoot) {
            await m.recoverEcoWithdrawalsAtBoot();
        }
    }
    catch (error) {
        console_1.logger.error("CRON", `Boot-time eco withdrawal recovery failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
}
async function p2pTradeTimeout() {
    const m = await (0, safe_imports_1.getP2pCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.p2pTradeTimeout)
        return m.p2pTradeTimeout();
}
async function updateP2PReputationScores() {
    const m = await (0, safe_imports_1.getP2pCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.updateP2PReputationScores)
        return m.updateP2PReputationScores();
}
async function processTradingBotEngine() {
    await warnIfTradingBotHasNoHost();
    const m = await (0, safe_imports_1.getTradingBotCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processTradingBotEngine)
        return m.processTradingBotEngine();
}
async function checkTradingBotStaleBots() {
    const m = await (0, safe_imports_1.getTradingBotCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.checkStaleBots)
        return m.checkStaleBots();
}
async function updateTradingBotStrategyRatings() {
    const m = await (0, safe_imports_1.getTradingBotCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.updateStrategyRatings)
        return m.updateStrategyRatings();
}
async function aggregateTradingBotDailyStats() {
    const m = await (0, safe_imports_1.getTradingBotCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aggregateDailyStats)
        return m.aggregateDailyStats();
}
async function cleanupTradingBotOldData() {
    const m = await (0, safe_imports_1.getTradingBotCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.cleanupOldData)
        return m.cleanupOldData();
}
async function expireOffers() {
    const m = await (0, safe_imports_1.getNftCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.expireOffers)
        return m.expireOffers();
}
async function settleAuctions() {
    const m = await (0, safe_imports_1.getNftCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.settleAuctions)
        return m.settleAuctions();
}
async function processNFTBackups() {
    const m = await (0, safe_imports_1.getNftCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processNFTBackups)
        return m.processNFTBackups();
}
async function processGatewayPayouts() {
    const m = await (0, safe_imports_1.getGatewayCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processGatewayPayouts)
        return m.processGatewayPayouts();
}
async function processGatewayWebhookRetries() {
    const m = await (0, safe_imports_1.getGatewayCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processGatewayWebhookRetries)
        return m.processGatewayWebhookRetries();
}
async function processGatewayPaymentExpiry() {
    const m = await (0, safe_imports_1.getGatewayCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processGatewayPaymentExpiry)
        return m.processGatewayPaymentExpiry();
}
async function processPendingCopyTrades() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processPendingCopyTrades)
        return m.processPendingCopyTrades();
}
async function initCopyTradingQueue() {
    const m = await (0, safe_imports_1.getCopyTradingQueueUtils)();
    if (m === null || m === void 0 ? void 0 : m.startCopyQueue) {
        m.startCopyQueue();
        console_1.logger.info("CRON", "Copy trading queue initialized");
    }
}
async function processClosedCopyTrades() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processClosedCopyTrades)
        return m.processClosedCopyTrades();
}
async function reconcileCopyTradingOrders() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.reconcileCopyTradingOrders)
        return m.reconcileCopyTradingOrders();
}
async function updateCopyTradingLeaderDailyStats() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.updateLeaderDailyStats)
        return m.updateLeaderDailyStats();
}
async function resetCopyTradingDailyLimits() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.resetDailyLimits)
        return m.resetDailyLimits();
}
async function checkCopyTradingDailyLossLimits() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.checkDailyLossLimits)
        return m.checkDailyLossLimits();
}
async function monitorCopyTradingStopLevels() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.monitorStopLevels)
        return m.monitorStopLevels();
}
async function aggregateCopyTradingWeeklyAnalytics() {
    const m = await (0, safe_imports_1.getCopyTradingCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.aggregateWeeklyAnalytics)
        return m.aggregateWeeklyAnalytics();
}
async function processMlmReferralConditions() {
    const m = await (0, safe_imports_1.getAffiliateCronUtils)();
    if (m === null || m === void 0 ? void 0 : m.processMlmReferralConditions)
        return m.processMlmReferralConditions();
}
exports.HARD_STOPPED_SETTING = "cronHardStoppedExtensions";
const BOOT_RECOVERY_DEADLINE_MS = 30000;
const CRON_RUN_STATE_KEY = "cron:runState";
const CRON_RUN_STATE_TTL_SECONDS = 24 * 60 * 60;
const RUN_STATE_CAS_ATTEMPTS = 3;
const RUN_STATE_CAS_LUA = `
local current = redis.call('GET', KEYS[1])
if (current == false and ARGV[1] == '') or current == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
end
return 0
`;
const RUST_OWNS_MIN_OVERDUE_MS = 15 * 60000;
const RUST_OWNS_WATCHDOG_INTERVAL_MS = 5 * 60000;
function rustOwnedStaleAfterMs(period) {
    const cadence = Number.isFinite(period) && period > 0 ? period * 2 : 0;
    return Math.min(Math.max(cadence, RUST_OWNS_MIN_OVERDUE_MS), CRON_RUN_STATE_TTL_SECONDS * 1000);
}
const rustHandoverSince = new Map();
function rustHandoverRefusal(job, since) {
    return {
        kind: "refused",
        reason: `RUST_OWNS names "${job}" on this process, so Node does not tick it — the Rust scheduler does.`,
        impact: `nothing on this process runs ${job}. Its run state comes from the Rust scheduler's own ` +
            "snapshot as soon as that side reports a run; while this row is what you are reading, no " +
            "stack has reported one.",
        fix: `if the Rust scheduler is running ${job}, none — this is the handover working, and this row ` +
            `is replaced by its run state on the next report. If it is not, remove "${job}" from ` +
            "RUST_OWNS and restart this process to take the job back.",
        since,
        lastSeen: since,
    };
}
let runStateCasUnavailableAnnounced = false;
const RUN_STATE_PUBLISH_ERROR_INTERVAL_MS = 60000;
let lastRunStatePublishErrorAt = 0;
class CronJobManager {
    constructor() {
        this.cronJobs = [];
        this.loadNormalCronJobs();
    }
    static async getInstance() {
        if (!CronJobManager.instance) {
            const instance = new CronJobManager();
            CronJobManager.instance = instance;
            CronJobManager.initPromise = instance.loadAddonCronJobs();
        }
        if (CronJobManager.initPromise) {
            await CronJobManager.initPromise;
        }
        return CronJobManager.instance;
    }
    static async startScheduler() {
        const instance = await CronJobManager.getInstance();
        if (!worker_threads_1.isMainThread)
            return instance;
        if (!CronJobManager.schedulerBoot) {
            CronJobManager.schedulerBoot = (async () => {
                const extensions = await cache_1.CacheManager.getInstance().getExtensions();
                if (extensions.has("ecosystem")) {
                    let bootRecoveryTimer;
                    let recoveryDone = false;
                    await Promise.race([
                        recoverEcoWithdrawalsAtBoot().then(() => {
                            recoveryDone = true;
                        }),
                        new Promise((resolve) => {
                            bootRecoveryTimer = setTimeout(() => {
                                if (!recoveryDone) {
                                    console_1.logger.warn("CRON", "Boot-time eco withdrawal recovery still running after " +
                                        `${BOOT_RECOVERY_DEADLINE_MS}ms — continuing startup, it finishes in the background`);
                                }
                                resolve();
                            }, BOOT_RECOVERY_DEADLINE_MS);
                            bootRecoveryTimer.unref();
                        }),
                    ]);
                    if (bootRecoveryTimer)
                        clearTimeout(bootRecoveryTimer);
                }
            })();
        }
        await CronJobManager.schedulerBoot;
        if (!CronJobManager.triggerBusServed) {
            CronJobManager.triggerBusServed = true;
            (0, trigger_bus_1.serveTriggerRequests)((name) => instance.triggerJob(name));
        }
        return instance;
    }
    loadNormalCronJobs() {
        this.cronJobs.push({
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
        }, {
            name: "processPendingOrders",
            title: "Process Pending Orders",
            period: 15 * 1000,
            description: "Processes pending binary orders.",
            function: "processPendingOrders",
            handler: order_1.processPendingOrders,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "processPendingSpotOrders",
            title: "Process Pending Spot Orders",
            period: 60 * 1000,
            description: "Reconciles open spot orders against the external exchange — credits fills, refunds cancellations, handles partial fills.",
            function: "processPendingSpotOrders",
            handler: order_1.processPendingSpotOrders,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "fetchFiatCurrencyPrices",
            title: "Fetch Fiat Currency Prices",
            period: 30 * 60 * 1000,
            description: "Fetches the latest fiat currency prices.",
            function: "fetchFiatCurrencyPrices",
            handler: currency_1.fetchFiatCurrencyPrices,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "processCurrenciesPrices",
            title: "Process Currencies Prices",
            period: 2 * 60 * 1000,
            description: "Updates the prices of all exchange currencies in the database.",
            function: "processCurrenciesPrices",
            handler: currency_1.processCurrenciesPrices,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "processSpotPendingDeposits",
            title: "Process Pending Spot Deposits",
            period: 15 * 60 * 1000,
            description: "Processes pending spot wallet deposits.",
            function: "processSpotPendingDeposits",
            handler: wallet_1.processSpotPendingDeposits,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "poolBackingReconcile",
            title: "Pool Backing Reconciliation",
            period: 15 * 60 * 1000,
            description: "Measures every currency's SPOT liabilities against the exchange's holdings across its account types and explains the gap with the pool-backing obligation ledger. Moves no money; alerts on persistent unexplained drift.",
            function: "poolBackingReconcile",
            handler: poolBacking_1.poolBackingReconcile,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "poolBackingSettle",
            title: "Pool Backing Settlement",
            period: 5 * 60 * 1000,
            description: "Verifies every in-flight pool-backing settlement on the receiving side's own evidence (the exchange listing the deposit, the treasury wallet's credited DEPOSIT row) and, in auto mode only, nets the nettable obligations per currency and dispatches one movement between custody and the exchange when the net is above the threshold. Refuses on a stale reconciliation, unacknowledged drift, an unmapped network or a pause; every refusal is shown in the console.",
            function: "poolBackingSettle",
            handler: poolBacking_1.poolBackingSettle,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "poolBackingAttribute",
            title: "Pool Backing Attribution",
            period: 24 * 60 * 60 * 1000,
            description: "Derives, for every finished UTC day since the last attributed one, the SPOT balance changes the platform minted itself (ROI, rewards, binary outcomes, commerce, parallel-store moves, platform fees) as `minted` obligation rows per currency and family, so the reconciliation's residual is explained rather than discovered. Moves no money.",
            function: "poolBackingAttribute",
            handler: poolBackingAttribution_1.poolBackingAttribute,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "syncMarketNews",
            title: "Sync Market News",
            period: 15 * 60 * 1000,
            description: "Pulls market news for the trading terminal from every provider enabled in Admin → News Providers, then prunes each provider's aged stories. No-ops quietly when none is enabled — operator-authored stories still serve the feed.",
            function: "syncMarketNews",
            handler: runMarketNewsSync,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "evaluatePriceAlerts",
            title: "Evaluate Price Alerts",
            period: 30 * 1000,
            description: "Fires the price alerts whose level was crossed, so an alert works with the browser closed. No-ops when nobody has one armed.",
            function: "evaluatePriceAlerts",
            handler: priceAlerts_1.evaluatePriceAlerts,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "processPendingWithdrawals",
            title: "Process Pending Withdrawals",
            period: 30 * 60 * 1000,
            description: "Processes pending spot wallet withdrawals.",
            function: "processPendingWithdrawals",
            handler: wallet_1.processPendingWithdrawals,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "reconcileSpotWithdrawals",
            title: "Reconcile Spot Withdrawals",
            period: 5 * 60 * 1000,
            description: "Crash-recovery reconciler for spot wallet withdrawals: finalizes withdrawals whose external send committed but whose local status update was lost to a process restart. Idempotent.",
            function: "reconcileSpotWithdrawals",
            handler: wallet_1.reconcileSpotWithdrawals,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "reconcileTransfiDeposits",
            title: "Reconcile TransFi Deposits",
            period: 5 * 60 * 1000,
            description: "Polls TransFi for PENDING deposits and credits, fails or expires them. Required, not optional: fund_processing has no webhook, retries stop after ~2h, and manual_review has no documented exit. Shares the webhook's idempotency key, so it cannot double-credit.",
            function: "reconcileTransfiDeposits",
            handler: transfi_1.reconcileTransfiDeposits,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "reconcileTransfiPayouts",
            title: "Reconcile TransFi Payouts",
            period: 5 * 60 * 1000,
            description: "Settles or fails dispatched TransFi payouts, and resolves rows orphaned between debit and dispatch. Refunds ONLY on positive evidence that no payout exists; anything ambiguous is escalated for review.",
            function: "reconcileTransfiPayouts",
            handler: transfi_payout_1.reconcileTransfiPayouts,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "processWalletPnl",
            title: "Process Wallet PnL",
            period: 24 * 60 * 60 * 1000,
            description: "Processes wallet PnL for all users.",
            function: "processWalletPnl",
            handler: wallet_1.processWalletPnl,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "cleanupOldPnlRecords",
            title: "Cleanup Old PnL Records",
            period: 24 * 60 * 60 * 1000,
            description: "Removes old PnL records and zero balance records.",
            function: "cleanupOldPnlRecords",
            handler: wallet_1.cleanupOldPnlRecords,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "processExpiredUserBlocks",
            title: "Process Expired User Blocks",
            period: 15 * 60 * 1000,
            description: "Automatically unblocks users whose temporary blocks have expired.",
            function: "processExpiredUserBlocks",
            handler: userBlock_1.processExpiredUserBlocks,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "purgeGeoAccessLog",
            title: "Purge Geo Access Log",
            period: 24 * 60 * 60 * 1000,
            description: "Trims the geographic access log to the configured retention window. Does nothing when retention is set to keep entries indefinitely.",
            function: "purgeGeoAccessLog",
            handler: geoRestriction_1.purgeGeoAccessLog,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: ledger_archive_1.LEDGER_ARCHIVE_CRON,
            title: "Ledger Archive",
            period: 60 * 60 * 1000,
            description: "Moves terminal transaction and wallet audit rows older than ECO_LEDGER_ARCHIVE_AFTER_DAYS into the archive tables in batches, then hard-deletes them from the live tables (plans/done/ORDER-SCALE-10K.md WP-4.4). Does nothing while ECO_LEDGER_ARCHIVE_ENABLED is off.",
            function: "ledgerArchive",
            handler: ledger_archive_1.ledgerArchive,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "cacheExchangeCurrencies",
            title: "Cache Exchange Currencies",
            period: 60 * 60 * 1000,
            description: "Warms the Redis exchangeCurrencies cache consumed by the exchange currency endpoints (30-minute TTL; endpoints fall back to the DB but never re-populate the cache themselves).",
            function: "cacheExchangeCurrencies",
            handler: currency_1.cacheExchangeCurrencies,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        }, {
            name: "licenseHeartbeat",
            title: "License Heartbeat",
            period: 6 * 60 * 60 * 1000,
            description: "Sends periodic heartbeat to license server to validate license status.",
            function: "processLicenseHeartbeat",
            handler: heartbeat_1.processLicenseHeartbeat,
            lastRun: null,
            lastRunError: null,
            category: "normal",
            status: "idle",
            progress: 0,
            lastExecutions: [],
            nextScheduledRun: null,
        });
    }
    buildAddonCronJobs() {
        return {
            ecosystem: [
                {
                    name: "processPendingEcoWithdrawals",
                    returnsCustomerMoney: true,
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
                {
                    name: "ecosystemWithdrawRecon",
                    returnsCustomerMoney: true,
                    title: "Ecosystem Withdrawal Watchdog",
                    period: 5 * 60 * 1000,
                    description: "Re-enqueues orphaned PENDING ecosystem withdrawals onto the in-memory queue. Protects against wallet-debited rows being stranded by a process restart.",
                    function: "ecosystemWithdrawRecon",
                    handler: ecosystemWithdrawReconJob,
                    lastRun: null,
                    lastRunError: null,
                    category: "ecosystem",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "verifyPendingEcoDeposits",
                    title: "Ecosystem Deposit Verification Watchdog",
                    period: 60 * 1000,
                    description: "Finalizes pending ecosystem deposits stored in Redis (confirmation-depth checks + crediting). The only job that does this: the deposit WebSocket used to register a second, unlisted 10s worker for the same queue, which no admin surface could see, trigger or stop — and which kept crediting after the ecosystem extension was disabled. It has been removed; this is now the single path.",
                    function: "verifyPendingEcoDeposits",
                    handler: order_1.verifyPendingEcoDeposits,
                    lastRun: null,
                    lastRunError: null,
                    category: "ecosystem",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "backgroundDepositScanner",
                    title: "Background Deposit Scanner",
                    period: 60 * 1000,
                    description: "Rate-limited background detection for deposits that arrive after the user closes the deposit page. Scans only recently-active deposit addresses (registered on deposit-page visits, 72h TTL) with a per-chain token bucket, so provider rate limits are respected regardless of user count. Disable with ECOSYSTEM_BACKGROUND_SCAN=false.",
                    function: "backgroundDepositScanner",
                    handler: ensureBackgroundDepositScanner,
                    teardown: stopBackgroundDepositScannerEngine,
                    lastRun: null,
                    lastRunError: null,
                    category: "ecosystem",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "btcDepositScanner",
                    title: "Bitcoin Deposit Scanner",
                    period: 60 * 1000,
                    description: "Scans BTC wallets for deposits and credits them via the configured provider chain (BTC_NODE=node|mempool|blockcypher, defaults to mempool with automatic provider fallback). Extension-gated: must not credit deposits while ecosystem is disabled.",
                    function: "btcDepositScanner",
                    handler: async () => {
                        const scanner = btcDepositScanner_1.default.getInstance();
                        await scanner.start();
                    },
                    teardown: () => btcDepositScanner_1.default.getInstance().stop(),
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
                    returnsCustomerMoney: true,
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
            futures: [
                {
                    name: "sweepFuturesPositions",
                    title: "Futures Mark Sweep",
                    period: 60 * 1000,
                    description: "Re-marks every open futures position against its market's live ticker, enforcing stop-loss / take-profit and liquidation for traders who were not party to the print that moved the price.",
                    function: "sweepFuturesPositions",
                    handler: order_1.sweepFuturesPositions,
                    lastRun: null,
                    lastRunError: null,
                    category: "futures",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "reconcileFuturesPositions",
                    title: "Reconcile Futures Positions",
                    period: 5 * 60 * 1000,
                    description: "Replays Scylla status updates for futures positions whose wallet credit committed but whose Scylla write failed (closePosition / liquidatePosition). Idempotent; read-only on MySQL wallets.",
                    function: "reconcileFuturesPositions",
                    handler: order_1.reconcileFuturesPositions,
                    lastRun: null,
                    lastRunError: null,
                    category: "futures",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "reconcileFuturesOrders",
                    title: "Reconcile Futures Orders",
                    period: 5 * 60 * 1000,
                    description: "Replays Scylla status updates for futures orders whose wallet credit/debit committed but whose Scylla write failed. Idempotent; read-only on MySQL wallets.",
                    function: "reconcileFuturesOrders",
                    handler: order_1.reconcileFuturesOrders,
                    lastRun: null,
                    lastRunError: null,
                    category: "futures",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "settleFuturesFunding",
                    title: "Settle Perpetual Funding",
                    period: 60 * 1000,
                    description: "Charges and pays funding on open perpetual positions at each configured funding window. Collects from payers first and distributes only what was collected, so a payer who cannot fund reduces the receivers' share rather than minting the difference.",
                    function: "settleFuturesFunding",
                    handler: futuresFunding_1.settleFuturesFunding,
                    lastRun: null,
                    lastRunError: null,
                    category: "futures",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "sweepFuturesFeeReversals",
                    title: "Finish Interrupted Cancel Bookkeeping",
                    period: 5 * 60 * 1000,
                    description: "Completes the fee reversal a cancelled futures order owes when the cancel was interrupted before it finished. Verifies the trader's refund actually reached a wallet before touching the treasury, so an unpaid refund is abandoned rather than booked as a loss.",
                    function: "sweepFuturesFeeReversals",
                    handler: futuresFeeReversal_1.sweepFuturesFeeReversals,
                    lastRun: null,
                    lastRunError: null,
                    category: "futures",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
            forex_trading: [
                {
                    name: "processFxSwaps",
                    title: "Fx Swap Rollover",
                    period: 60 * 60 * 1000,
                    description: "Settles overnight swap/rollover on open fx positions at the 17:00 New York cutoff (triple on the group's triple-swap day; weekdays only for FX/metals/stocks; 7d for crypto CFDs). Idempotent per position per rollover date.",
                    function: "processFxSwaps",
                    handler: processFxSwaps,
                    lastRun: null,
                    lastRunError: null,
                    category: "forex_trading",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "reconcileFxAccounts",
                    title: "Reconcile Fx Accounts",
                    period: 5 * 60 * 1000,
                    description: "Expires due GTD/DAY orders, verifies the fx deals ledger (Σ pnl == balance) for accounts with open positions, alerts on drift, and refreshes denormalized equity/margin.",
                    function: "reconcileFxAccounts",
                    handler: reconcileFxAccounts,
                    lastRun: null,
                    lastRunError: null,
                    category: "forex_trading",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "runFxExecutionReconciler",
                    returnsCustomerMoney: true,
                    title: "Fx Execution Reconciler",
                    period: 60 * 1000,
                    description: "Replays each enabled execution provider's broker ledger into the idempotent external booking paths, detects orphans in both directions (alert-only, never auto-trades), sweeps stale in-flight rows, watches financing basis and cursor stalls (auto-suspends NEW routing on stall), and runs the zero-open-positions negative-balance sweep. Silent no-op without provider rows.",
                    function: "runFxExecutionReconciler",
                    handler: runFxExecutionReconciler,
                    lastRun: null,
                    lastRunError: null,
                    category: "forex_trading",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "runFxHedgeMonitor",
                    title: "Fx Hedge Monitor",
                    period: 60 * 1000,
                    description: "Syncs each enabled execution provider's hedge account state (balance/NAV/margin/closeout) onto the provider row and alerts when marginUsed/NAV breaches marginAlertRatio or the sync itself fails repeatedly. Silent no-op without enabled provider rows.",
                    function: "runFxHedgeMonitor",
                    handler: runFxHedgeMonitor,
                    lastRun: null,
                    lastRunError: null,
                    category: "forex_trading",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "processFxAffiliateRebates",
                    title: "Fx Affiliate Rebates",
                    period: 10 * 60 * 1000,
                    description: "Awards IB/partner rebates on committed fx COMMISSION deals (FX_TRADE_COMMISSION / FX_TRADE_VOLUME conditions). LIVE accounts only; exactly-once via the reward sourceId. Silent no-op until an operator enables a rebate condition.",
                    function: "processFxAffiliateRebates",
                    handler: processFxAffiliateRebates,
                    lastRun: null,
                    lastRunError: null,
                    category: "forex_trading",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "syncFxCalendarAndNews",
                    title: "Fx Calendar & News Sync",
                    period: 15 * 60 * 1000,
                    description: "Refreshes the economic calendar and market-news feed from the active fx data provider. Provider-sourced rows are upserted; operator-authored (MANUAL) rows are never touched. Silent no-op when the provider serves neither feed.",
                    function: "syncFxCalendarAndNews",
                    handler: syncFxCalendarAndNews,
                    lastRun: null,
                    lastRunError: null,
                    category: "forex_trading",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
            dex: [
                {
                    name: "runDexMarketRefresh",
                    title: "Refresh DEX Market Data",
                    period: 5 * 60 * 1000,
                    description: "Refreshes cached ticker and liquidity figures for every enabled DEX pair from the configured market-data provider. Read-only: it never broadcasts and never touches a wallet, so a provider outage degrades the pair list's freshness and nothing else.",
                    function: "runDexMarketRefresh",
                    handler: runDexMarketRefresh,
                    lastRun: null,
                    lastRunError: null,
                    category: "dex",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "dexConfirmationSweep",
                    title: "DEX Confirmation Sweep",
                    period: 30 * 1000,
                    description: "Polls receipts for PENDING/MINED swaps, advances the swap state machine (MINED, CONFIRMED, REVERTED, DROPPED), and re-verifies each CONFIRMED row exactly once inside its reorg window. Declines on a dedicated cron process, where the web half already holds the dex-confirmations lease and sweeps — so exactly one process polls the chain whichever way the deployment is split.",
                    function: "dexConfirmationSweep",
                    handler: dexConfirmationSweep,
                    lastRun: null,
                    lastRunError: null,
                    category: "dex",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "dexFeeSweepSettle",
                    title: "DEX Fee Sweep Settlement",
                    period: 5 * 60 * 1000,
                    description: "Credits DEX fee accruals the operator has already swept on-chain. Waits for the recorded sweep transaction to reach the chain's confirmation depth, nets out any reorg reversals, refuses a currency the platform does not list rather than minting an unspendable wallet, and books one adminProfit row of type DEX_SWAP per real transfer. The platform holds no key here — this observes a transfer the operator made themselves.",
                    function: "dexFeeSweepSettle",
                    handler: dexFeeSweepSettle,
                    lastRun: null,
                    lastRunError: null,
                    category: "dex",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "dexTokenRescreen",
                    title: "DEX Token Re-screening",
                    period: 24 * 60 * 60 * 1000,
                    description: "Re-runs the safety screen over the token catalogue, oldest first, dexScreeningSliceSize rows per run — so a large catalogue is fully covered within ceil(n / slice) runs instead of never. A keyset cursor advances past every row it visited, including ones the provider could not answer for, so a handful of dead contracts cannot sit at the front of the queue and starve everything behind them. Records verdicts only: it never changes a token's listing or status.",
                    function: "dexTokenRescreen",
                    handler: dexTokenRescreen,
                    lastRun: null,
                    lastRunError: null,
                    category: "dex",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "dexQuotePrune",
                    title: "DEX Quote Pruning",
                    period: 60 * 60 * 1000,
                    description: "Deletes dex_quote rows older than dexQuoteRetentionDays. Until this existed the setting had no reader outside the admin form, so the fastest-growing table in the addon was never pruned. Quotes referenced by a dexSwap row are KEPT whatever their age, because the trade history joins through them. Work is bounded — 1,000 rows a slice, 50 slices a run — so a large backlog drains over several runs instead of holding row locks on the table the quote path is writing to.",
                    function: "dexQuotePrune",
                    handler: dexQuotePrune,
                    lastRun: null,
                    lastRunError: null,
                    category: "dex",
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
                    returnsCustomerMoney: true,
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
                {
                    name: "processIcoVestingReleases",
                    title: "Process ICO Vesting",
                    period: 60 * 60 * 1000,
                    description: "Announces vesting tranches that have come due, closes finished schedules and cancels schedules behind refunded contributions.",
                    function: "processIcoVestingReleases",
                    handler: processIcoVestingReleases,
                    lastRun: null,
                    lastRunError: null,
                    category: "ico",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
            mlm: [
                {
                    name: "processMlmReferralConditions",
                    title: "Process MLM Referral Conditions",
                    period: 60 * 60 * 1000,
                    description: "Evaluates active MLM referral conditions and auto-creates rewards for referrers whose referred users meet the criteria.",
                    function: "processMlmReferralConditions",
                    handler: processMlmReferralConditions,
                    lastRun: null,
                    lastRunError: null,
                    category: "mlm",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
            staking: [
                {
                    name: "processStakingPositions",
                    returnsCustomerMoney: true,
                    title: "Process Staking Logs",
                    period: 60 * 60 * 1000,
                    description: "Processes staking positions and rewards users accordingly.",
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
                {
                    name: "processRealStakingBatches",
                    returnsCustomerMoney: true,
                    title: "On-chain staking: batches",
                    period: 2 * 60 * 1000,
                    description: "Signs and broadcasts due on-chain batches (gathers, delegations, exits, claims, returns, refunds) and polls the ones in flight. Exits run regardless of intake switches.",
                    function: "processRealStakingBatches",
                    handler: processRealStakingBatches,
                    lastRun: null,
                    lastRunError: null,
                    category: "staking",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "observeRealStaking",
                    title: "On-chain staking: observe rewards",
                    period: 15 * 60 * 1000,
                    description: "Reads what the network paid each on-chain pool for any new epoch or day, moves the share price, mints the commission as treasury shares and writes one earning row per holder.",
                    function: "observeRealStaking",
                    handler: observeRealStaking,
                    lastRun: null,
                    lastRunError: null,
                    category: "staking",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "reconcileRealStaking",
                    title: "On-chain staking: reconcile",
                    period: 60 * 60 * 1000,
                    description: "Compares on-chain truth with the book: wallet gas reserve, share ledger, tranche value, stuck batches, observer lag and validator policy. Opens and clears incidents; never moves coins.",
                    function: "reconcileRealStaking",
                    handler: reconcileRealStaking,
                    lastRun: null,
                    lastRunError: null,
                    category: "staking",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "refreshStakingValidatorSets",
                    title: "On-chain staking: validator policy",
                    period: 6 * 60 * 60 * 1000,
                    description: "Re-screens every validator set against the live network and the policy; a breaching validator receives no new delegation.",
                    function: "refreshStakingValidatorSets",
                    handler: refreshStakingValidatorSets,
                    lastRun: null,
                    lastRunError: null,
                    category: "staking",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "alertRealStaking",
                    title: "On-chain staking: alerts",
                    period: 10 * 60 * 1000,
                    description: "Opens and clears the time-based incidents the reconciler cannot see from the chain: exits past the promised bound, stakes still pending delegation, and a settled commission exit that is not being paid.",
                    function: "alertRealStaking",
                    handler: alertRealStaking,
                    lastRun: null,
                    lastRunError: null,
                    category: "staking",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "generateRealStakingStatements",
                    title: "On-chain staking: monthly statements",
                    period: 24 * 60 * 60 * 1000,
                    description: "Writes the previous month's statement for every user who held an on-chain position in it: staked, exited, rewards net of commission, commission, and value at statement time. Generated once per user and month; never regenerated.",
                    function: "generateRealStakingStatements",
                    handler: generateRealStakingStatements,
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
                    description: "Processes Mailwizard campaigns and sends emails. Runs hourly; each run sends at most `speed` emails per active campaign.",
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
                    returnsCustomerMoney: true,
                    title: "P2P Trade Timeout Handler",
                    period: 1 * 60 * 1000,
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
                {
                    name: "updateP2PReputationScores",
                    title: "Update P2P Reputation Scores",
                    period: 60 * 60 * 1000,
                    description: "Recalculates reputation scores for users with recent P2P activity and records milestones.",
                    function: "updateP2PReputationScores",
                    handler: updateP2PReputationScores,
                    lastRun: null,
                    lastRunError: null,
                    category: "p2p",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
            trading_bot: [
                {
                    name: "processTradingBotEngine",
                    title: "Trading Bot Engine",
                    period: 5 * 1000,
                    description: "Supervises the trading bot engine: starts it when enabled, stops it in maintenance mode, and periodically resyncs running bots with the database.",
                    function: "processTradingBotEngine",
                    handler: processTradingBotEngine,
                    lastRun: null,
                    lastRunError: null,
                    category: "trading_bot",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "checkTradingBotStaleBots",
                    title: "Check Stale Trading Bots",
                    period: 60 * 1000,
                    description: "Marks RUNNING bots whose engine tick went stale as errored and notifies their owners.",
                    function: "checkTradingBotStaleBots",
                    handler: checkTradingBotStaleBots,
                    lastRun: null,
                    lastRunError: null,
                    category: "trading_bot",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "updateTradingBotStrategyRatings",
                    title: "Update Trading Bot Strategy Ratings",
                    period: 60 * 60 * 1000,
                    description: "Aggregates review ratings for public approved trading bot strategies.",
                    function: "updateTradingBotStrategyRatings",
                    handler: updateTradingBotStrategyRatings,
                    lastRun: null,
                    lastRunError: null,
                    category: "trading_bot",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aggregateTradingBotDailyStats",
                    title: "Aggregate Trading Bot Daily Stats",
                    period: 24 * 60 * 60 * 1000,
                    description: "Aggregates per-bot daily statistics and resets daily trade/profit counters (daily loss limits depend on this reset).",
                    function: "aggregateTradingBotDailyStats",
                    handler: aggregateTradingBotDailyStats,
                    lastRun: null,
                    lastRunError: null,
                    category: "trading_bot",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "cleanupTradingBotOldData",
                    title: "Cleanup Trading Bot Data",
                    period: 7 * 24 * 60 * 60 * 1000,
                    description: "Weekly cleanup of trading bot audit logs and stale cancelled/failed orders past the 90-day retention window.",
                    function: "cleanupTradingBotOldData",
                    handler: cleanupTradingBotOldData,
                    lastRun: null,
                    lastRunError: null,
                    category: "trading_bot",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
            nft: [
                {
                    name: "expireOffers",
                    returnsCustomerMoney: true,
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
                {
                    name: "processNFTBackups",
                    title: "Process NFT Blockchain Backups",
                    period: 15 * 60 * 1000,
                    description: "Runs due NFT blockchain-state backups from their configured schedules.",
                    function: "processNFTBackups",
                    handler: processNFTBackups,
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
                    description: "Automatically creates payout records for merchants based on their payout schedule. INSTANT and DAILY balances are candidates on every run, so an INSTANT merchant settles within this hourly cadence (and still awaits admin approval) — not immediately; WEEKLY/MONTHLY fire when due-or-overdue.",
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
                {
                    name: "processGatewayWebhookRetries",
                    title: "Retry Failed Gateway Webhooks",
                    period: 60 * 1000,
                    description: "Redelivers merchant webhooks whose previous attempt failed, on an exponential backoff (1m, 5m, 30m, 2h, 24h).",
                    function: "processGatewayWebhookRetries",
                    handler: processGatewayWebhookRetries,
                    lastRun: null,
                    lastRunError: null,
                    category: "gateway",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "processGatewayPaymentExpiry",
                    title: "Expire Lapsed Gateway Payments",
                    period: 5 * 60 * 1000,
                    description: "Marks checkout sessions that passed their expiry as EXPIRED and emits the payment.expired webhook.",
                    function: "processGatewayPaymentExpiry",
                    handler: processGatewayPaymentExpiry,
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
                    returnsCustomerMoney: true,
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
                    name: "reconcileCopyTradingOrders",
                    returnsCustomerMoney: true,
                    title: "Reconcile Copy Trading Orders",
                    period: 5 * 60 * 1000,
                    description: "Reconciles follower copy trades whose ecosystem order was cancelled/closed out of band, releasing any stranded COPY_TRADING wallet holds.",
                    function: "reconcileCopyTradingOrders",
                    handler: reconcileCopyTradingOrders,
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
            binary_ai_engine: [
                {
                    name: "processBinaryAiEngine",
                    title: "Binary AI Engine",
                    period: 10 * 1000,
                    description: "Supervises the Binary AI Engine lifecycle: boots/reloads active engines after restarts, reconciles DB<->memory status, and enforces the global enable/pause kill-switch.",
                    function: "processBinaryAiEngine",
                    handler: processBinaryAiEngine,
                    lastRun: null,
                    lastRunError: null,
                    category: "binary_ai_engine",
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
                    description: "Main AI market maker engine loop that processes active markets and coordinates bot trading activities. Runs in whichever process holds the ecosystem matching lease; on a dedicated cron process it is a no-op.",
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
                {
                    name: "processAiHistoryRetention",
                    title: "AI History Retention",
                    period: 24 * 60 * 60 * 1000,
                    description: "Prunes per-trade AI market-maker history rows past the configured retention window. Daily summaries and lifecycle audit rows are never pruned.",
                    function: "processAiHistoryRetention",
                    handler: processAiHistoryRetention,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_market_maker",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
            ai_support: [
                {
                    name: "aiSupportReindexKnowledge",
                    title: "Rebuild AI Knowledge Index",
                    period: 24 * 60 * 60 * 1000,
                    description: "Re-chunks the shipped documentation packs, the operator's knowledge base articles and the FAQ. Skips packs whose checksum has not changed, so a nightly run on an unchanged corpus costs almost nothing.",
                    function: "aiSupportReindexKnowledge",
                    handler: aiSupportReindexKnowledge,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aiSupportCacheHealthCheck",
                    title: "Check AI Prompt Cache Health",
                    period: 60 * 60 * 1000,
                    description: "Alerts when prompt-cache reads fall below half of input tokens, which silently multiplies the cost of every AI answer.",
                    function: "aiSupportCacheHealthCheck",
                    handler: aiSupportCacheHealthCheck,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aiSupportRetentionSweep",
                    title: "AI Support Retention Sweep",
                    period: 24 * 60 * 60 * 1000,
                    description: "Deletes AI turn records past the operator's retention window (default 90 days). Handover history and open conversations are never pruned.",
                    function: "aiSupportRetentionSweep",
                    handler: aiSupportRetentionSweep,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aiSupportProactiveSweep",
                    title: "AI Support Proactive Sweep",
                    period: 15 * 60 * 1000,
                    description: "Opens a ticket, with an explanation, for deposits and withdrawals that failed in the last 45 minutes. Does nothing unless Proactive Support is switched on — it is the only job that contacts a customer who did not contact support.",
                    function: "aiSupportProactiveSweep",
                    handler: aiSupportProactiveSweep,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aiSupportHarvestAnswers",
                    title: "Harvest Answers From Agent Replies",
                    period: 24 * 60 * 60 * 1000,
                    description: "Finds the reply a human agent already typed for each undocumented question and files it as a DRAFT article for review. Costs nothing — no AI call is made. Nothing is ever published automatically.",
                    function: "aiSupportHarvestAnswers",
                    handler: aiSupportHarvestAnswers,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aiSupportShareQuestions",
                    title: "Share Anonymised Questions",
                    period: 7 * 24 * 60 * 60 * 1000,
                    description: "Sends MashDiv the questions your customers ask that nothing can answer, as word fingerprints filtered against our own documentation's vocabulary. No message text, no answers, no account data. Does nothing unless you have switched it on.",
                    function: "aiSupportShareQuestions",
                    handler: aiSupportShareQuestions,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aiSupportExpireStale",
                    title: "Retire Unused AI Offers",
                    period: 60 * 60 * 1000,
                    description: "Closes off actions and step-by-step processes the assistant offered that nobody used in time, so they stop showing as live work. It never undoes anything that already ran. Always on — these rows are wrong whether or not you use automatic ticket closing.",
                    function: "aiSupportExpireStale",
                    handler: aiSupportExpireStale,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
                {
                    name: "aiSupportAutoCloseResolved",
                    title: "Close Tickets Nobody Replied To",
                    period: 24 * 60 * 60 * 1000,
                    description: "Closes tickets where your team answered and the customer never replied, after the number of days you set. Posts an explanation before closing. Does nothing until you set a day count — it ships at zero, which is off.",
                    function: "aiSupportAutoCloseResolved",
                    handler: aiSupportAutoCloseResolved,
                    lastRun: null,
                    lastRunError: null,
                    category: "ai_support",
                    status: "idle",
                    progress: 0,
                    lastExecutions: [],
                    nextScheduledRun: null,
                },
            ],
        };
    }
    async hardStoppedAddons() {
        var _a;
        var _b;
        try {
            const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
            if (!((_a = models === null || models === void 0 ? void 0 : models.settings) === null || _a === void 0 ? void 0 : _a.findOne))
                return new Set();
            const row = await models.settings.findOne({
                where: { key: exports.HARD_STOPPED_SETTING },
            });
            const raw = String((_b = row === null || row === void 0 ? void 0 : row.value) !== null && _b !== void 0 ? _b : "");
            return new Set(raw
                .split(",")
                .map((name) => name.trim())
                .filter(Boolean));
        }
        catch (_c) {
            return new Set();
        }
    }
    async loadAddonCronJobs() {
        const addonCronJobs = this.buildAddonCronJobs();
        const cacheManager = cache_1.CacheManager.getInstance();
        const extensions = await cacheManager.getExtensions();
        const existingJobNames = new Set(this.cronJobs.map(job => job.name));
        const hardStopped = await this.hardStoppedAddons();
        for (const addon of Object.keys(addonCronJobs)) {
            const addonEnabled = extensions.has(addon);
            for (const cronJob of addonCronJobs[addon]) {
                const keepForMoney = Boolean(cronJob.returnsCustomerMoney) && !hardStopped.has(addon);
                if (!addonEnabled && !keepForMoney)
                    continue;
                if (existingJobNames.has(cronJob.name))
                    continue;
                this.cronJobs.push(cronJob);
                existingJobNames.add(cronJob.name);
                if (!addonEnabled) {
                    console_1.logger.info("CRON", `Extension ${addon} is off — keeping cron ${cronJob.name}: it settles money customers are already owed`);
                }
            }
        }
        this.markRustOwned();
        (0, rust_owns_1.reportRustOwnsTokens)(this.cronJobs.map((job) => job.name), Object.values(addonCronJobs).flatMap((jobs) => jobs.map((job) => job.name)));
    }
    markRustOwned() {
        if ((0, rust_owns_1.rustOwnsNothing)())
            return;
        const now = Date.now();
        for (const job of this.cronJobs) {
            if (!(0, rust_owns_1.rustOwns)(job.name))
                continue;
            job.owner = "rust";
            if (!rustHandoverSince.has(job.name))
                rustHandoverSince.set(job.name, now);
            if (!job.lastRun && job.status === "idle" && !job.refusal) {
                job.status = "refused";
                job.refusal = rustHandoverRefusal(job.name, new Date(rustHandoverSince.get(job.name)));
            }
        }
    }
    async auditRustOwnedHandover(now = Date.now()) {
        var _a, _b, _c;
        if ((0, rust_owns_1.rustOwnsNothing)())
            return;
        const owned = this.cronJobs.filter((job) => (0, rust_owns_1.rustOwns)(job.name));
        if (!owned.length)
            return;
        let raw;
        try {
            raw = await redis_1.RedisSingleton.getInstance().get(CRON_RUN_STATE_KEY);
        }
        catch (error) {
            console_1.logger.debug("CRON", `RUST_OWNS handover watchdog could not read ${CRON_RUN_STATE_KEY}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}. ` +
                "Saying nothing rather than alarming about every handed-over job.");
            return;
        }
        let snapshot = {};
        try {
            const decoded = raw ? JSON.parse(raw) : null;
            if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
                snapshot = decoded;
            }
        }
        catch (_d) {
            snapshot = {};
        }
        for (const job of owned) {
            const window = rustOwnedStaleAfterMs(job.period);
            const since = (_b = rustHandoverSince.get(job.name)) !== null && _b !== void 0 ? _b : now;
            const entry = snapshot[job.name];
            const lastRun = entry && typeof entry === "object" ? entry.lastRun : null;
            const parsed = lastRun == null ? NaN : new Date(lastRun).getTime();
            const reported = Number.isFinite(parsed) ? parsed : null;
            if (reported !== null && now - reported <= window) {
                (0, refusal_1.clearCronRefusal)(job.name);
                job.refusal = null;
                continue;
            }
            if (reported === null && now - since <= window) {
                continue;
            }
            await (0, refusal_1.announceCronRefusal)({
                job: job.name,
                degraded: false,
                reason: `RUST_OWNS names "${job.name}", so this process does not tick it — and the Rust ` +
                    (reported === null
                        ? `scheduler has not reported a single run of it in the ${Math.round(window / 60000)} ` +
                            "minutes since this process handed it over."
                        : `scheduler last reported a run at ${new Date(reported).toISOString()}, longer ago ` +
                            `than the ${Math.round(window / 60000)} minutes this job's schedule allows.`),
                impact: `${job.name} is running NOWHERE. Node stood down for it and nothing has taken it up` +
                    (job.returnsCustomerMoney
                        ? " — and this job settles money customers are already owed."
                        : "."),
                fix: `start the Rust scheduler with "${job.name}" in its handler set, or remove "${job.name}" ` +
                    "from RUST_OWNS on this process and restart it to take the job back. A token this side " +
                    "honours and that side does not claim is a job neither stack runs.",
            });
            job.refusal = (_c = (0, refusal_1.getCronRefusal)(job.name)) !== null && _c !== void 0 ? _c : job.refusal;
            job.status = "refused";
        }
    }
    async resyncAddonCronJobs() {
        var _a;
        var _b;
        const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
        if (!((_a = models === null || models === void 0 ? void 0 : models.extension) === null || _a === void 0 ? void 0 : _a.findAll))
            return;
        const rows = await models.extension.findAll({ where: { status: true } });
        const enabled = new Set(rows.map((row) => row.name));
        const addonCronJobs = this.buildAddonCronJobs();
        const registered = new Set(this.cronJobs.map((job) => job.name));
        const hardStopped = await this.hardStoppedAddons();
        for (const addon of Object.keys(addonCronJobs)) {
            if (enabled.has(addon)) {
                for (const cronJob of addonCronJobs[addon]) {
                    if (registered.has(cronJob.name))
                        continue;
                    this.cronJobs.push(cronJob);
                    registered.add(cronJob.name);
                    await (0, exports.createWorker)(cronJob.name, cronJob.handler, cronJob.period);
                    console_1.logger.info("CRON", `Extension ${addon} enabled — scheduled cron ${cronJob.name}`);
                }
            }
            else {
                for (const cronJob of addonCronJobs[addon]) {
                    if (cronJob.returnsCustomerMoney && !hardStopped.has(addon)) {
                        if (!registered.has(cronJob.name)) {
                            this.cronJobs.push(cronJob);
                            registered.add(cronJob.name);
                            await (0, exports.createWorker)(cronJob.name, cronJob.handler, cronJob.period);
                            console_1.logger.info("CRON", `Extension ${addon} is off — scheduled cron ${cronJob.name} anyway: it settles money customers are already owed`);
                        }
                        continue;
                    }
                    if (!registered.has(cronJob.name))
                        continue;
                    const managed = managedJobs.get(cronJob.name);
                    if (managed) {
                        managed.stopped = true;
                        await removeBullMqRepeatable(managed);
                        stopBullMqJob(managed);
                        stopFallbackJob(managed);
                        managedJobs.delete(cronJob.name);
                    }
                    this.cronJobs = this.cronJobs.filter((job) => job.name !== cronJob.name);
                    registered.delete(cronJob.name);
                    if (cronJob.teardown) {
                        try {
                            await cronJob.teardown();
                        }
                        catch (error) {
                            console_1.logger.error("CRON", `Cron ${cronJob.name}: teardown failed — ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`);
                        }
                    }
                    console_1.logger.info("CRON", `Extension ${addon} disabled — stopped cron ${cronJob.name}`);
                }
            }
        }
        this.markRustOwned();
    }
    getCronJobs() {
        return this.cronJobs;
    }
    async getCronJobsWithRunState() {
        if (worker_threads_1.isMainThread && !(0, mode_1.isCronDelegated)() && (0, rust_owns_1.rustOwnsNothing)()) {
            return this.cronJobs;
        }
        let snapshot = {};
        try {
            const raw = await redis_1.RedisSingleton.getInstance().get(CRON_RUN_STATE_KEY);
            if (raw)
                snapshot = JSON.parse(raw);
        }
        catch (_a) {
            return this.cronJobs;
        }
        const ownJobsAreFresher = worker_threads_1.isMainThread && !(0, mode_1.isCronDelegated)();
        return this.cronJobs.map((job) => {
            const state = snapshot[job.name];
            if (!state)
                return job;
            if (ownJobsAreFresher && !(0, rust_owns_1.rustOwns)(job.name))
                return job;
            return { ...job, ...state };
        });
    }
    publishRunState() {
        var _a;
        if (!worker_threads_1.isMainThread || (0, mode_1.isCronDelegated)())
            return;
        const snapshot = {};
        for (const job of this.cronJobs) {
            snapshot[job.name] = {
                lastRun: job.lastRun,
                lastRunError: job.lastRunError,
                status: job.status,
                executionTime: job.executionTime,
                successRate: job.successRate,
                refusal: (_a = job.refusal) !== null && _a !== void 0 ? _a : null,
                lastExecutions: job.lastExecutions,
                nextScheduledRun: job.nextScheduledRun,
            };
        }
        if ((0, rust_owns_1.rustOwnsNothing)()) {
            void redis_1.RedisSingleton.getInstance()
                .set(CRON_RUN_STATE_KEY, JSON.stringify(snapshot), "EX", CRON_RUN_STATE_TTL_SECONDS)
                .catch(() => { });
            return;
        }
        void this.publishRunStatePreservingRustEntries(snapshot).catch((error) => {
            var _a;
            const now = Date.now();
            if (now - lastRunStatePublishErrorAt < RUN_STATE_PUBLISH_ERROR_INTERVAL_MS)
                return;
            lastRunStatePublishErrorAt = now;
            console_1.logger.error("CRON", `Could not publish ${CRON_RUN_STATE_KEY}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}. The admin cron page ` +
                "reads this key from the web process, so until it succeeds that page is stale — and with " +
                "no snapshot at all it shows every job as never run.", error);
        });
    }
    rustOwnedCarryWindows() {
        const windows = {};
        for (const job of this.cronJobs) {
            if ((0, rust_owns_1.rustOwns)(job.name))
                windows[job.name] = rustOwnedStaleAfterMs(job.period);
        }
        return windows;
    }
    async publishRunStateWithoutCas(merged, error) {
        var _a;
        if (!runStateCasUnavailableAnnounced) {
            runStateCasUnavailableAnnounced = true;
            console_1.logger.error("CRON", `This Redis will not run the ${CRON_RUN_STATE_KEY} compare-and-set (EVAL: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}). ` +
                "RUST_OWNS is set, so the snapshot is being published with a plain SET instead: the Rust " +
                "scheduler's entries are preserved from the read a moment earlier, but one of its writes " +
                "landing between that read and this write is lost. Publishing nothing was the alternative, " +
                "and that shows every cron job on the admin page as never run.", error);
        }
        await redis_1.RedisSingleton.getInstance().set(CRON_RUN_STATE_KEY, JSON.stringify(merged), "EX", CRON_RUN_STATE_TTL_SECONDS);
    }
    async publishRunStatePreservingRustEntries(snapshot) {
        const redis = redis_1.RedisSingleton.getInstance();
        const windows = this.rustOwnedCarryWindows();
        for (let attempt = 0; attempt < RUN_STATE_CAS_ATTEMPTS; attempt++) {
            const previous = await redis.get(CRON_RUN_STATE_KEY);
            const merged = (0, rust_owns_1.preserveRustOwnedRunState)(previous, snapshot, {
                staleAfterMs: windows,
                defaultStaleAfterMs: CRON_RUN_STATE_TTL_SECONDS * 1000,
            });
            let applied;
            try {
                applied = await redis.eval(RUN_STATE_CAS_LUA, 1, CRON_RUN_STATE_KEY, previous !== null && previous !== void 0 ? previous : "", JSON.stringify(merged), String(CRON_RUN_STATE_TTL_SECONDS));
            }
            catch (error) {
                await this.publishRunStateWithoutCas(merged, error);
                return;
            }
            if (Number(applied) === 1)
                return;
        }
        console_1.logger.debug("CRON", `cron:runState was rewritten under ${RUN_STATE_CAS_ATTEMPTS} attempts; leaving the Rust scheduler's snapshot in place`);
    }
    updateJobStatus(name, lastRun, lastRunError, executionTime, nextScheduledRun) {
        const job = this.cronJobs.find((job) => job.name === name);
        if (job) {
            job.lastRun = lastRun;
            job.lastRunError = lastRunError;
            const refusal = (0, refusal_1.getCronRefusal)(name);
            job.refusal = refusal;
            if (lastRunError) {
                job.status = "failed";
            }
            else if ((refusal === null || refusal === void 0 ? void 0 : refusal.kind) === "refused") {
                job.status = "refused";
            }
            else {
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
                status: lastRunError
                    ? "failed"
                    : (refusal === null || refusal === void 0 ? void 0 : refusal.kind) === "refused"
                        ? "refused"
                        : "completed"
            });
            if (job.lastExecutions.length > 10) {
                job.lastExecutions = job.lastExecutions.slice(0, 10);
            }
            const totalExecutions = job.lastExecutions.length;
            const successfulExecutions = job.lastExecutions.filter(exec => exec.status === "completed").length;
            job.successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;
            this.publishRunState();
            setTimeout(() => {
                if (job.status === "completed" || job.status === "failed") {
                    job.status = "idle";
                    job.progress = 0;
                    void (0, broadcast_1.broadcastStatus)(name, "idle");
                }
            }, 5000);
        }
    }
    updateJobRunningStatus(name, status, progress) {
        const job = this.cronJobs.find((job) => job.name === name);
        if (job) {
            job.status = status;
            if (progress !== undefined) {
                job.progress = progress;
            }
            if (status === "completed" || status === "failed" || status === "refused") {
                job.progress = 0;
            }
        }
    }
    async triggerJob(name) {
        if (!worker_threads_1.isMainThread) {
            throw (0, error_1.createError)({
                statusCode: 503,
                message: "Cron jobs can only be triggered on the scheduling thread. Retry — the request must be served by the main thread.",
            });
        }
        if ((0, mode_1.isCronDelegated)()) {
            const outcome = await (0, trigger_bus_1.requestRemoteTrigger)(name);
            if (outcome.status === "ran" || outcome.status === "started")
                return true;
            if (outcome.status === "busy")
                return false;
            if (outcome.status === "failed") {
                throw (0, error_1.createError)({ statusCode: 500, message: outcome.message });
            }
            throw (0, error_1.createError)({
                statusCode: 503,
                message: "Cron jobs run in a dedicated cron process, and it did not answer the request to run " +
                    `'${name}'. Either no cron process is up — in which case NOTHING scheduled is running ` +
                    "— or Redis cannot carry the request between them. Check `pm2 logs cron` and the " +
                    "scheduler heartbeat on System Health.",
            });
        }
        const job = this.cronJobs.find((job) => job.name === name);
        if (!job) {
            return false;
        }
        if ((0, rust_owns_1.rustOwns)(name)) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `'${name}' is run by the Rust scheduler on this deployment (RUST_OWNS), so this process ` +
                    "will not run it. Trigger it there, or remove the token and restart this app to take it back.",
            });
        }
        if (job.status === "running") {
            return false;
        }
        const managed = managedJobs.get(name);
        if ((managed === null || managed === void 0 ? void 0 : managed.running) || inFlightJobs.has(name)) {
            return false;
        }
        if (managed) {
            managed.running = true;
        }
        inFlightJobs.add(name);
        const startTime = Date.now();
        try {
            this.updateJobRunningStatus(name, "running", 0);
            const refusalsBefore = (0, refusal_1.cronRefusalTicks)(name);
            await job.handler();
            if ((0, refusal_1.cronRefusalTicks)(name) === refusalsBefore) {
                (0, refusal_1.clearCronRefusal)(name);
            }
            const executionTime = Date.now() - startTime;
            this.updateJobStatus(name, new Date(startTime), null, executionTime);
            return true;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateJobStatus(name, new Date(startTime), error.message, executionTime);
            console_1.logger.error("CRON", "Manual trigger failed", error);
            throw error;
        }
        finally {
            if (managed) {
                managed.running = false;
            }
            inFlightJobs.delete(name);
        }
    }
}
CronJobManager.initPromise = null;
CronJobManager.schedulerBoot = null;
CronJobManager.triggerBusServed = false;
const managedJobs = new Map();
const inFlightJobs = new Set();
const BULLMQ_READY_TIMEOUT_MS = 10000;
const BULLMQ_COMMAND_TIMEOUT_MS = 10000;
const BULLMQ_LOCK_DURATION_MS = 5 * 60000;
const BULLMQ_STALLED_INTERVAL_MS = BULLMQ_LOCK_DURATION_MS;
const withBullMqDeadline = (op, label) => Promise.race([
    op,
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${BULLMQ_COMMAND_TIMEOUT_MS}ms`)), BULLMQ_COMMAND_TIMEOUT_MS).unref()),
]);
const isConnectionError = (error) => {
    const msg = String((error === null || error === void 0 ? void 0 : error.message) || error);
    return (msg.includes("ECONNREFUSED") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EHOSTUNREACH") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("Connection is closed"));
};
const bullConnection = () => ({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0"),
    retryStrategy: (times) => Math.min(500 * Math.pow(2, Math.min(times, 6)), 30000),
});
const runManagedJob = async (job, mode) => {
    if ((0, rust_owns_1.rustOwns)(job.name))
        return;
    if (job.mode !== mode || job.running || job.stopped)
        return;
    if (inFlightJobs.has(job.name))
        return;
    job.running = true;
    inFlightJobs.add(job.name);
    const startTime = Date.now();
    let cronJobManager;
    try {
        cronJobManager = await CronJobManager.getInstance();
        cronJobManager.updateJobRunningStatus(job.name, "running", 0);
        (0, broadcast_1.broadcastStatus)(job.name, "running");
        const refusalsBefore = (0, refusal_1.cronRefusalTicks)(job.name);
        await job.handler();
        if ((0, refusal_1.cronRefusalTicks)(job.name) === refusalsBefore) {
            (0, refusal_1.clearCronRefusal)(job.name);
        }
        const executionTime = Date.now() - startTime;
        const nextScheduledRun = new Date(Date.now() + job.period);
        cronJobManager.updateJobStatus(job.name, new Date(startTime), null, executionTime, nextScheduledRun);
        const refusal = (0, refusal_1.getCronRefusal)(job.name);
        (0, broadcast_1.broadcastStatus)(job.name, (refusal === null || refusal === void 0 ? void 0 : refusal.kind) === "refused" ? "refused" : "completed", { duration: executionTime, refusal });
    }
    catch (error) {
        const executionTime = Date.now() - startTime;
        const nextScheduledRun = new Date(Date.now() + job.period);
        cronJobManager === null || cronJobManager === void 0 ? void 0 : cronJobManager.updateJobStatus(job.name, new Date(startTime), error.message, executionTime, nextScheduledRun);
        (0, broadcast_1.broadcastStatus)(job.name, "failed");
        console_1.logger.error("CRON", `Worker ${job.name} error`, error);
        throw error;
    }
    finally {
        job.running = false;
        inFlightJobs.delete(job.name);
        lastRunAt.set(job.name, Date.now());
        void redis_1.RedisSingleton.getInstance()
            .set(cronLastRunKey(job.name), String(Date.now()))
            .catch(() => { });
    }
};
const cronLastRunKey = (name) => `cron:lastRun:${name}`;
const lastRunAt = new Map();
const DAY_MS = 24 * 60 * 60 * 1000;
let fallbackAnnounced = false;
const startFallbackJob = (job) => {
    if (job.stopped)
        return;
    job.mode = "fallback";
    if (job.interval || job.startupTimer || job.arming)
        return;
    if (!fallbackAnnounced) {
        fallbackAnnounced = true;
        console_1.logger.warn("CRON", "Redis unavailable — cron jobs running on in-process intervals (BullMQ resumes when Redis returns)");
    }
    job.arming = true;
    const armInterval = () => {
        if (job.mode !== "fallback" || job.interval)
            return;
        const interval = setInterval(() => {
            void runManagedJob(job, "fallback").catch(() => {
            });
        }, job.period);
        interval.unref();
        job.interval = interval;
    };
    void (async () => {
        var _a;
        let delay = job.period;
        let lastRun = (_a = lastRunAt.get(job.name)) !== null && _a !== void 0 ? _a : NaN;
        if (!Number.isFinite(lastRun)) {
            try {
                const raw = await redis_1.RedisSingleton.getInstance().get(cronLastRunKey(job.name));
                lastRun = raw ? parseInt(raw, 10) : NaN;
            }
            catch (_b) {
            }
        }
        const now = Date.now();
        if (job.period % DAY_MS === 0) {
            const boundary = Math.floor(now / job.period) * job.period;
            delay = boundary + job.period - now;
            if (Number.isFinite(lastRun) && lastRun < boundary)
                delay = 0;
        }
        else if (Number.isFinite(lastRun)) {
            delay = Math.max(0, lastRun + job.period - now);
        }
        delay += 1000 + Math.floor(Math.random() * Math.min(job.period, 120000));
        if (!job.arming)
            return;
        job.arming = false;
        const timer = setTimeout(() => {
            job.startupTimer = undefined;
            if (job.mode !== "fallback")
                return;
            void runManagedJob(job, "fallback").catch(() => {
            });
            armInterval();
        }, delay);
        timer.unref();
        job.startupTimer = timer;
    })();
};
const stopFallbackJob = (job) => {
    job.arming = false;
    if (job.startupTimer) {
        clearTimeout(job.startupTimer);
        job.startupTimer = undefined;
    }
    if (job.interval) {
        clearInterval(job.interval);
        job.interval = undefined;
    }
};
const removeBullMqRepeatable = async (job) => {
    var _a;
    const queue = job.queue;
    if (!queue)
        return;
    try {
        const repeatables = await withBullMqDeadline(queue.getRepeatableJobs(), `getRepeatableJobs(${job.name})`);
        for (const repeatable of repeatables) {
            if (repeatable.name !== job.name)
                continue;
            await withBullMqDeadline(queue.removeRepeatableByKey(repeatable.key), `removeRepeatableByKey(${job.name})`);
        }
    }
    catch (error) {
        console_1.logger.error("CRON", `Cron ${job.name}: failed to remove repeatable — ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
};
const stopBullMqJob = (job) => {
    if (job.worker) {
        void job.worker.close().catch(() => { });
        job.worker = undefined;
    }
    if (job.queue) {
        void job.queue.close().catch(() => { });
        job.queue = undefined;
    }
};
const startBullMqJob = (job) => {
    if (!job.starting) {
        job.starting = doStartBullMqJob(job).finally(() => {
            job.starting = undefined;
        });
    }
    return job.starting;
};
const doStartBullMqJob = async (job) => {
    if (job.worker || job.queue) {
        job.mode = "bullmq";
        stopFallbackJob(job);
        return true;
    }
    stopFallbackJob(job);
    try {
        const queue = new bullmq_1.Queue(job.name, { connection: bullConnection() });
        queue.on("error", (error) => {
            if (isConnectionError(error))
                return;
            console_1.logger.error("CRON", `Queue ${job.name} error: ${error.message}`, error);
        });
        const ready = await Promise.race([
            queue.waitUntilReady().then(() => true, () => false),
            new Promise((resolve) => setTimeout(() => resolve(false), BULLMQ_READY_TIMEOUT_MS).unref()),
        ]);
        if (!ready) {
            void queue.close().catch(() => { });
            return false;
        }
        if (!redis_1.RedisSingleton.isRedisUp()) {
            void queue.close().catch(() => { });
            return false;
        }
        if (job.stopped) {
            void queue.close().catch(() => { });
            return false;
        }
        job.mode = "bullmq";
        job.queue = queue;
        const worker = new bullmq_1.Worker(job.name, async (_job) => runManagedJob(job, "bullmq"), {
            connection: bullConnection(),
            concurrency: job.concurrency,
            lockDuration: BULLMQ_LOCK_DURATION_MS,
            stalledInterval: BULLMQ_STALLED_INTERVAL_MS,
        });
        job.worker = worker;
        worker.on('error', (error) => {
            if (isConnectionError(error))
                return;
            console_1.logger.error("CRON", `Worker ${job.name} error: ${error.message}`, error);
        });
        worker.on('failed', (_job, error) => {
            console_1.logger.error("CRON", `Job ${job.name} failed: ${error.message}`, error);
        });
        const existingRepeatableJobs = await withBullMqDeadline(queue.getRepeatableJobs(), `getRepeatableJobs(${job.name})`);
        let alreadyRegistered = false;
        for (const repeatable of existingRepeatableJobs) {
            const isCurrent = repeatable.name === job.name &&
                String(repeatable.every) === String(job.period);
            if (isCurrent && !alreadyRegistered) {
                alreadyRegistered = true;
                continue;
            }
            await withBullMqDeadline(queue.removeRepeatableByKey(repeatable.key), `removeRepeatableByKey(${job.name})`);
        }
        if (!alreadyRegistered) {
            await withBullMqDeadline(queue.add(job.name, {}, {
                jobId: `repeatable-${job.name}`,
                repeat: { every: job.period },
                removeOnComplete: 100,
                removeOnFail: 500,
            }), `add(${job.name})`);
        }
        if (job.stopped) {
            stopBullMqJob(job);
            return false;
        }
        if (job.mode === "bullmq") {
            stopFallbackJob(job);
        }
        return true;
    }
    catch (error) {
        console_1.logger.error("CRON", `Cron ${job.name} failed`, error);
        stopBullMqJob(job);
        return false;
    }
};
let availabilityHookInstalled = false;
const installAvailabilityHook = () => {
    if (availabilityHookInstalled)
        return;
    availabilityHookInstalled = true;
    redis_1.RedisSingleton.onAvailabilityChange((up) => {
        if (up) {
            fallbackAnnounced = false;
            console_1.logger.warn("CRON", "Redis restored — moving cron jobs back to BullMQ");
            void Promise.all([...managedJobs.values()].map(async (job) => {
                if (job.mode === "bullmq")
                    return;
                const started = await startBullMqJob(job);
                if (!started)
                    startFallbackJob(job);
            }));
        }
        else {
            for (const job of managedJobs.values()) {
                stopBullMqJob(job);
                startFallbackJob(job);
            }
        }
    });
};
let extensionResyncStarted = false;
const EXTENSION_RESYNC_INTERVAL_MS = 60000;
const startExtensionResync = () => {
    if (extensionResyncStarted)
        return;
    extensionResyncStarted = true;
    let resyncRunning = false;
    const interval = setInterval(() => {
        if (resyncRunning)
            return;
        resyncRunning = true;
        void (async () => {
            const manager = await CronJobManager.getInstance();
            await manager.resyncAddonCronJobs();
        })()
            .catch((error) => {
            var _a;
            console_1.logger.error("CRON", `Extension cron re-sync failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        })
            .finally(() => {
            resyncRunning = false;
        });
    }, EXTENSION_RESYNC_INTERVAL_MS);
    interval.unref();
};
let rustOwnsWatchdogStarted = false;
const startRustOwnsHandoverWatchdog = () => {
    if (rustOwnsWatchdogStarted)
        return;
    if ((0, rust_owns_1.rustOwnsNothing)())
        return;
    if (!worker_threads_1.isMainThread || (0, mode_1.isCronDelegated)())
        return;
    rustOwnsWatchdogStarted = true;
    let auditRunning = false;
    const interval = setInterval(() => {
        if (auditRunning)
            return;
        auditRunning = true;
        void (async () => {
            const manager = await CronJobManager.getInstance();
            await manager.auditRustOwnedHandover();
        })()
            .catch((error) => {
            var _a;
            console_1.logger.error("CRON", `RUST_OWNS handover watchdog failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        })
            .finally(() => {
            auditRunning = false;
        });
    }, RUST_OWNS_WATCHDOG_INTERVAL_MS);
    interval.unref();
};
const createWorker = async (name, handler, period, concurrency = 1) => {
    await CronJobManager.getInstance();
    installAvailabilityHook();
    startExtensionResync();
    startRustOwnsHandoverWatchdog();
    if ((0, rust_owns_1.rustOwns)(name)) {
        console_1.logger.info("CRON", `RUST_OWNS: ${name} is ticked by the Rust scheduler — registered here, not armed`);
        return;
    }
    let job = managedJobs.get(name);
    if (job) {
        const periodChanged = job.period !== period;
        job.handler = handler;
        job.period = period;
        job.concurrency = concurrency;
        const scheduled = job.worker || job.queue || job.interval || job.startupTimer || job.arming;
        if (job.starting || (scheduled && !periodChanged)) {
            return;
        }
        if (scheduled) {
            await removeBullMqRepeatable(job);
            stopBullMqJob(job);
            stopFallbackJob(job);
        }
    }
    else {
        job = { name, handler, period, concurrency, mode: "fallback", running: false };
        managedJobs.set(name, job);
    }
    const redisUp = await redis_1.RedisSingleton.waitForProbe();
    if (redisUp && (await startBullMqJob(job)))
        return;
    startFallbackJob(job);
};
exports.createWorker = createWorker;
exports.default = CronJobManager;
