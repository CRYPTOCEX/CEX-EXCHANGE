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
Object.defineProperty(exports, "__esModule", { value: true });
exports.replicateLeaderTrade = replicateLeaderTrade;
exports.processPendingCopyTrades = processPendingCopyTrades;
exports.reconcileCopyTradingOrders = reconcileCopyTradingOrders;
exports.processClosedCopyTrades = processClosedCopyTrades;
exports.updateLeaderDailyStats = updateLeaderDailyStats;
exports.resetDailyLimits = resetDailyLimits;
exports.aggregateWeeklyAnalytics = aggregateWeeklyAnalytics;
exports.monitorStopLevels = monitorStopLevels;
exports.checkDailyLossLimits = checkDailyLossLimits;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const broadcast_1 = require("@b/cron/broadcast");
const console_1 = require("@b/utils/console");
const notifications_1 = require("@b/utils/notifications");
const cache_1 = require("@b/utils/cache");
const settings_core_1 = require("./settings-core");
const safe_imports_1 = require("@b/utils/safe-imports");
async function isEcosystemAvailable() {
    const extensions = await cache_1.CacheManager.getInstance().getExtensions();
    if (!extensions.has("ecosystem"))
        return false;
    const [walletUtils, scyllaUtils] = await Promise.all([
        (0, safe_imports_1.getEcosystemWalletUtils)(),
        (0, safe_imports_1.getEcosystemScyllaUtils)(),
    ]);
    return Boolean((walletUtils === null || walletUtils === void 0 ? void 0 : walletUtils.getWalletByUserIdAndCurrency) &&
        (walletUtils === null || walletUtils === void 0 ? void 0 : walletUtils.updateWalletBalance) &&
        (scyllaUtils === null || scyllaUtils === void 0 ? void 0 : scyllaUtils.createOrder));
}
const currency_1 = require("./currency");
const copyProcessor_1 = require("./copyProcessor");
const dailyLimits_1 = require("./dailyLimits");
const stats_calculator_1 = require("@b/api/(ext)/copy-trading/utils/stats-calculator");
const transaction_1 = require("@b/utils/transaction");
const MAX_CONCURRENCY = 3;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
async function processFollowerCopy(trade, follower, leaderBalance, cronName, bookLevels) {
    var _a, _b, _c, _d, _e, _f;
    if (!(await isEcosystemAvailable())) {
        (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: Ecosystem extension not available`, "warning");
        return false;
    }
    if (!trade.leaderOrderId) {
        (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: leader trade ${trade.id} has no leaderOrderId`, "error");
        return false;
    }
    const limitCheck = await (0, dailyLimits_1.checkDailyLimits)(follower.id);
    if (!limitCheck.canTrade) {
        (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: ${limitCheck.reason}`, "info");
        return true;
    }
    let retryCount = 0;
    while (retryCount < MAX_RETRY_ATTEMPTS) {
        const t = await db_1.sequelize.transaction({
            isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
        });
        let createdOrder = null;
        try {
            const followerWithLock = await db_1.models.copyTradingFollower.findByPk(follower.id, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!followerWithLock || followerWithLock.status !== "ACTIVE") {
                await t.rollback();
                return true;
            }
            const lockedFollower = followerWithLock;
            const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                where: {
                    followerId: follower.id,
                    symbol: trade.symbol,
                    marketType: "SPOT",
                    isActive: true,
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!allocation) {
                await t.rollback();
                (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: no spot allocation for ${trade.symbol}`, "info");
                return true;
            }
            const allocationData = allocation;
            const availableAmount = trade.side === "BUY"
                ? allocationData.quoteAmount - allocationData.quoteUsedAmount
                : allocationData.baseAmount - allocationData.baseUsedAmount;
            if (availableAmount <= 0) {
                await t.rollback();
                (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: insufficient ${trade.symbol} allocation for ${trade.side}`, "info");
                return true;
            }
            const { amount: copyAmount, cost, reason } = (0, copyProcessor_1.calculateCopyAmount)(trade.amount, trade.price, leaderBalance, lockedFollower, availableAmount);
            if (copyAmount <= 0) {
                await t.rollback();
                (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: ${reason || 'zero copy amount calculated'}`, "info");
                return true;
            }
            const baseCurrency = (0, currency_1.getBaseCurrency)(trade.symbol);
            const quoteCurrency = (0, currency_1.getQuoteCurrency)(trade.symbol);
            const market = await db_1.models.ecosystemMarket.findOne({
                where: { currency: baseCurrency, pair: quoteCurrency },
                transaction: t,
            });
            if (!market) {
                await t.rollback();
                throw (0, error_1.createError)({ statusCode: 404, message: `Market not found: ${trade.symbol}` });
            }
            const marketData = market;
            const minAmount = Number(((_c = (_b = (_a = marketData.metadata) === null || _a === void 0 ? void 0 : _a.limits) === null || _b === void 0 ? void 0 : _b.amount) === null || _c === void 0 ? void 0 : _c.min) || 0);
            if (copyAmount < minAmount) {
                await t.rollback();
                (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: copy amount ${copyAmount} below minimum ${minAmount}`, "info");
                return true;
            }
            const { spend: spendCurrency } = (0, currency_1.getTradeCurrency)(trade.symbol, trade.side);
            const existingCopy = await db_1.models.copyTradingTrade.findOne({
                where: { followerId: follower.id, leaderOrderId: trade.leaderOrderId, isLeaderTrade: false },
                transaction: t,
            });
            if (existingCopy) {
                await t.rollback();
                return true;
            }
            const wallet = await (0, safe_imports_1.getWalletByUserIdAndCurrency)(follower.userId, spendCurrency, "COPY_TRADING", t, true);
            if (!wallet) {
                await t.rollback();
                throw (0, error_1.createError)({ statusCode: 404, message: `Wallet not found for user ${follower.userId} currency ${spendCurrency}` });
            }
            let effectivePrice = trade.price;
            if (trade.type.toLowerCase() === "market") {
                const levels = bookLevels;
                if (levels && levels.length > 0) {
                    let remaining = copyAmount;
                    let sweptCost = 0;
                    let swept = 0;
                    for (const [levelPrice, levelAmount] of levels) {
                        const p = Number(levelPrice);
                        const avail = Number(levelAmount);
                        if (!(p > 0) || !(avail > 0))
                            continue;
                        const fillQty = Math.min(remaining, avail);
                        sweptCost += fillQty * p;
                        swept += fillQty;
                        remaining -= fillQty;
                        if (remaining <= 0)
                            break;
                    }
                    if (swept > 0)
                        effectivePrice = sweptCost / swept;
                    if (remaining > 1e-12) {
                        const deepest = Number(levels[levels.length - 1][0]);
                        if (deepest > 0) {
                            effectivePrice =
                                trade.side === "BUY"
                                    ? Math.max(effectivePrice, deepest)
                                    : Math.min(effectivePrice, deepest);
                        }
                    }
                }
            }
            const precision = Number(((_e = (_d = marketData.metadata) === null || _d === void 0 ? void 0 : _d.precision) === null || _e === void 0 ? void 0 : _e.price) || 8);
            const feeRate = Number(((_f = marketData.metadata) === null || _f === void 0 ? void 0 : _f.taker) || 0.1);
            const fee = parseFloat(((copyAmount * effectivePrice * feeRate) / 100).toFixed(precision));
            const orderCost = trade.side === "BUY"
                ? parseFloat((copyAmount * effectivePrice).toFixed(precision))
                : copyAmount;
            const totalCost = trade.side === "BUY"
                ? parseFloat((orderCost + fee).toFixed(precision))
                : copyAmount;
            const walletBalance = parseFloat(wallet.balance.toString());
            if (walletBalance < totalCost) {
                await t.rollback();
                (0, broadcast_1.broadcastLog)(cronName, `Skipping follower ${follower.id}: insufficient ${spendCurrency} balance (${walletBalance} < ${totalCost})`, "warning");
                return true;
            }
            const newOrder = await (0, safe_imports_1.createOrder)({
                userId: follower.userId,
                symbol: trade.symbol,
                amount: await (0, safe_imports_1.toBigIntFloat)(copyAmount),
                price: await (0, safe_imports_1.toBigIntFloat)(effectivePrice),
                cost: await (0, safe_imports_1.toBigIntFloat)(orderCost),
                type: trade.type.toLowerCase() === "market" ? "MARKET" : "LIMIT",
                side: trade.side,
                fee: await (0, safe_imports_1.toBigIntFloat)(fee),
                feeCurrency: quoteCurrency,
                walletType: "COPY_TRADING",
            });
            createdOrder = newOrder;
            await (0, safe_imports_1.updateWalletBalance)(wallet, totalCost, "subtract", `ct_order_lock_${newOrder.id}`, t);
            await db_1.models.copyTradingTrade.create({
                followerId: follower.id,
                leaderId: trade.leaderId,
                leaderOrderId: trade.leaderOrderId,
                followerOrderId: newOrder.id,
                symbol: trade.symbol,
                side: trade.side,
                type: trade.type,
                amount: copyAmount,
                price: effectivePrice,
                cost: totalCost,
                fee,
                feeCurrency: quoteCurrency,
                profitCurrency: quoteCurrency,
                status: "OPEN",
                isLeaderTrade: false,
            }, { transaction: t });
            if (trade.side === "BUY") {
                await allocationData.update({
                    quoteUsedAmount: (0, sequelize_1.literal)(`quoteUsedAmount + ${totalCost}`),
                }, { transaction: t });
            }
            else {
                await allocationData.update({
                    baseUsedAmount: (0, sequelize_1.literal)(`baseUsedAmount + ${copyAmount}`),
                }, { transaction: t });
            }
            await db_1.models.copyTradingTransaction.create({
                userId: follower.userId,
                followerId: follower.id,
                leaderId: trade.leaderId,
                type: "ALLOCATION",
                amount: totalCost,
                currency: spendCurrency,
                fee: 0,
                balanceBefore: walletBalance,
                balanceAfter: walletBalance - totalCost,
                description: `Copied ${trade.side} trade: ${copyAmount.toFixed(6)} ${baseCurrency} @ ${effectivePrice} ${quoteCurrency}`,
                metadata: JSON.stringify({
                    leaderTradeId: trade.id,
                    orderId: newOrder.id,
                    symbol: trade.symbol,
                    allocationId: allocationData.id,
                }),
                status: "COMPLETED",
            }, { transaction: t });
            await t.commit();
            (0, broadcast_1.broadcastLog)(cronName, `Follower ${follower.id} copied trade: ${trade.side} ${copyAmount.toFixed(6)} ${baseCurrency} @ ${effectivePrice} ${quoteCurrency}`, "success");
            return true;
        }
        catch (error) {
            try {
                await t.rollback();
            }
            catch (_g) { }
            if (createdOrder === null || createdOrder === void 0 ? void 0 : createdOrder.id) {
                try {
                    const { rollbackOrderCreation } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
                    await rollbackOrderCreation(createdOrder.id, follower.userId, createdOrder.createdAt);
                }
                catch (compErr) {
                    console_1.logger.error("COPY_TRADING", `Failed to compensate orphaned order ${createdOrder.id}: ${compErr.message}`);
                }
            }
            retryCount++;
            console_1.logger.error("COPY_TRADING", `Failed to process follower ${follower.id} copy`, error);
            if (retryCount < MAX_RETRY_ATTEMPTS) {
                (0, broadcast_1.broadcastLog)(cronName, `Retrying follower ${follower.id} copy (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}): ${error.message}`, "warning");
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            }
            else {
                console_1.logger.error("COPY_TRADING", `Failed to copy for follower ${follower.id}: ${error.message}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Failed to copy for follower ${follower.id}: ${error.message}`, "error");
                return false;
            }
        }
    }
    return false;
}
async function replicateLeaderTrade(trade, leaderBalance) {
    const cronName = "processPendingCopyTrades";
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Replicating trade ${trade.id} for leader ${trade.leaderId}`);
        const followers = await db_1.models.copyTradingFollower.findAll({
            where: {
                leaderId: trade.leaderId,
                status: "ACTIVE",
            },
        });
        if (followers.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, `No active followers for leader ${trade.leaderId}`, "info");
            return { followerCount: 0, successCount: 0, failCount: 0 };
        }
        (0, broadcast_1.broadcastLog)(cronName, `Found ${followers.length} active followers to replicate to`);
        let bookLevels = null;
        if (trade.type.toLowerCase() === "market") {
            const { asks, bids } = await (0, safe_imports_1.getRealOrderBook)(trade.symbol);
            bookLevels = trade.side === "BUY" ? asks : bids;
        }
        const results = await processWithConcurrency(followers, MAX_CONCURRENCY, async (follower) => {
            return processFollowerCopy(trade, follower, leaderBalance, cronName, bookLevels);
        });
        const successCount = results.filter((r) => r === true).length;
        const failCount = results.length - successCount;
        (0, broadcast_1.broadcastLog)(cronName, `Trade replication complete: ${successCount} successful, ${failCount} failed`, failCount === 0 ? "success" : "warning");
        return { followerCount: followers.length, successCount, failCount };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Trade replication failed: ${error.message}`, error);
        (0, broadcast_1.broadcastLog)(cronName, `Trade replication failed: ${error.message}`, "error");
        throw error;
    }
}
const PENDING_BACKSTOP_MIN_AGE_MS = 2 * 60 * 1000;
const MAX_REPLICATION_ATTEMPTS = 5;
const REPLICATION_ATTEMPTS_PREFIX = "REPLICATION_ATTEMPTS:";
const RUN_BUDGET_MS = 60 * 1000;
function parseReplicationAttempts(errorMessage) {
    if (!errorMessage || !errorMessage.startsWith(REPLICATION_ATTEMPTS_PREFIX)) {
        return 0;
    }
    const n = parseInt(errorMessage.slice(REPLICATION_ATTEMPTS_PREFIX.length), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
async function processPendingCopyTrades() {
    const cronName = "processPendingCopyTrades";
    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting copy trade replication process");
        const { enabled: copyTradingEnabled } = await (0, settings_core_1.getCopyTradingSettings)();
        if (!copyTradingEnabled) {
            (0, broadcast_1.broadcastLog)(cronName, "Copy trading is disabled, skipping", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
            return;
        }
        try {
            const { processPendingBinaryCopies } = await Promise.resolve().then(() => __importStar(require("./binary")));
            const binaryResult = await processPendingBinaryCopies();
            if (binaryResult.processed > 0) {
                (0, broadcast_1.broadcastLog)(cronName, `Binary backstop replicated ${binaryResult.processed} leader order(s)`);
            }
        }
        catch (binaryError) {
            console_1.logger.error("COPY_TRADING", "Binary copy backstop failed", binaryError);
        }
        const spotAvailability = await (0, settings_core_1.checkCopyTypeAvailability)("SPOT");
        if (!spotAvailability.available) {
            (0, broadcast_1.broadcastLog)(cronName, "Spot copy trading is disabled, skipping", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
            return;
        }
        const pendingTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                followerId: null,
                isLeaderTrade: true,
                marketType: "SPOT",
                status: { [sequelize_1.Op.in]: ["PENDING", "PENDING_REPLICATION"] },
                createdAt: {
                    [sequelize_1.Op.lt]: new Date(Date.now() - PENDING_BACKSTOP_MIN_AGE_MS),
                },
            },
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    include: [{ model: db_1.models.user, as: "user" }],
                },
            ],
            order: [["createdAt", "ASC"]],
            limit: 50,
        });
        if (pendingTrades.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No pending trades to replicate", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { processed: 0 });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Found ${pendingTrades.length} pending trades to replicate`);
        for (const trade of pendingTrades) {
            if (Date.now() - startTime > RUN_BUDGET_MS) {
                (0, broadcast_1.broadcastLog)(cronName, "Run budget reached; leaving remaining pending trades for the next tick", "warning");
                break;
            }
            try {
                const leader = trade.leader;
                if (!leader) {
                    (0, broadcast_1.broadcastLog)(cronName, `Leader not found for trade ${trade.id}`, "warning");
                    continue;
                }
                if (!trade.leaderOrderId) {
                    console_1.logger.error("COPY_TRADING", `Leader trade ${trade.id} has no leaderOrderId; cannot replicate safely`);
                    await trade.update({
                        status: "REPLICATION_FAILED",
                        errorMessage: "Missing leaderOrderId; cannot replicate safely",
                    });
                    failedCount++;
                    continue;
                }
                const leaderWallet = await (0, safe_imports_1.getWalletByUserIdAndCurrency)(leader.userId, trade.symbol.split("/")[1]);
                const leaderBalance = leaderWallet
                    ? parseFloat(leaderWallet.balance.toString())
                    : 0;
                if (!(0, settings_core_1.leaderOffersMarketType)(leader.tradingType, "SPOT")) {
                    await trade.update({
                        status: "REPLICATION_FAILED",
                        errorMessage: "Leader no longer offers SPOT copy trading",
                    });
                    failedCount++;
                    continue;
                }
                const { failCount: replicationFailures } = await replicateLeaderTrade(trade, leaderBalance);
                if (replicationFailures === 0) {
                    await trade.update({ status: "REPLICATED", errorMessage: null });
                    processedCount++;
                }
                else {
                    const attempts = parseReplicationAttempts(trade.errorMessage) + 1;
                    if (attempts >= MAX_REPLICATION_ATTEMPTS) {
                        console_1.logger.error("COPY_TRADING", `Trade ${trade.id}: ${replicationFailures} follower cop(ies) still failing after ${attempts} attempts; marking REPLICATION_FAILED for manual review`);
                        (0, broadcast_1.broadcastLog)(cronName, `Trade ${trade.id} replication gave up after ${attempts} attempts (${replicationFailures} failing followers)`, "error");
                        await trade.update({
                            status: "REPLICATION_FAILED",
                            errorMessage: `${REPLICATION_ATTEMPTS_PREFIX}${attempts}`,
                        });
                        failedCount++;
                    }
                    else {
                        console_1.logger.error("COPY_TRADING", `Trade ${trade.id}: ${replicationFailures} follower cop(ies) failed (attempt ${attempts}/${MAX_REPLICATION_ATTEMPTS}); leaving pending for retry`);
                        (0, broadcast_1.broadcastLog)(cronName, `Trade ${trade.id}: ${replicationFailures} follower copies failed (attempt ${attempts}/${MAX_REPLICATION_ATTEMPTS}); will retry`, "warning");
                        await trade.update({
                            errorMessage: `${REPLICATION_ATTEMPTS_PREFIX}${attempts}`,
                        });
                    }
                }
            }
            catch (error) {
                console_1.logger.error("COPY_TRADING", `Failed to replicate trade ${trade.id}`, error);
                const attempts = parseReplicationAttempts(trade.errorMessage) + 1;
                if (attempts >= MAX_REPLICATION_ATTEMPTS) {
                    (0, broadcast_1.broadcastLog)(cronName, `Trade ${trade.id} replication gave up after ${attempts} attempts: ${error.message}`, "error");
                    await trade.update({
                        status: "REPLICATION_FAILED",
                        errorMessage: `${REPLICATION_ATTEMPTS_PREFIX}${attempts}`,
                    });
                    failedCount++;
                }
                else {
                    (0, broadcast_1.broadcastLog)(cronName, `Failed to replicate trade ${trade.id} (attempt ${attempts}/${MAX_REPLICATION_ATTEMPTS}); will retry: ${error.message}`, "warning");
                    await trade.update({
                        errorMessage: `${REPLICATION_ATTEMPTS_PREFIX}${attempts}`,
                    });
                }
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            failed: failedCount,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Copy trade replication completed: ${processedCount} processed, ${failedCount} failed`, "success");
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Copy trade replication failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            failed: failedCount,
            error: error.message,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Copy trade replication failed: ${error.message}`, "error");
        throw error;
    }
}
async function reconcileCopyTradingOrders() {
    var _a;
    const cronName = "reconcileCopyTradingOrders";
    const startTime = Date.now();
    (0, broadcast_1.broadcastStatus)(cronName, "running");
    (0, broadcast_1.broadcastLog)(cronName, "Starting copy trade order reconciliation");
    try {
        const { reconcileBinaryCopyTrades } = await Promise.resolve().then(() => __importStar(require("./binary")));
        await reconcileBinaryCopyTrades();
    }
    catch (binaryError) {
        console_1.logger.error("COPY_TRADING", "Binary copy reconcile failed", binaryError);
    }
    if (!(await isEcosystemAvailable())) {
        (0, broadcast_1.broadcastLog)(cronName, "Ecosystem extension not available, skipping", "warning");
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
        return;
    }
    try {
        const { getOrderByUserAndId } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
        const { teardownFollowerTrade } = await Promise.resolve().then(() => __importStar(require("./teardown")));
        const liveTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                isLeaderTrade: false,
                marketType: "SPOT",
                followerOrderId: { [sequelize_1.Op.ne]: null },
                status: {
                    [sequelize_1.Op.in]: ["PENDING", "PENDING_REPLICATION", "REPLICATED", "OPEN", "PARTIALLY_FILLED"],
                },
                createdAt: { [sequelize_1.Op.lt]: new Date(Date.now() - 2 * 60 * 1000) },
            },
            include: [
                { model: db_1.models.copyTradingFollower, as: "follower", attributes: ["userId"] },
            ],
            limit: 500,
        });
        let reconciled = 0;
        for (const trade of liveTrades) {
            const userId = (_a = trade.follower) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId || !trade.followerOrderId)
                continue;
            let order = null;
            try {
                order = await getOrderByUserAndId(userId, trade.followerOrderId);
            }
            catch (_b) {
                continue;
            }
            const status = order ? String(order.status) : "MISSING";
            if (status === "CANCELED" || status === "MISSING") {
                if (await teardownFollowerTrade(trade))
                    reconciled++;
            }
            else if (status === "CLOSED" && !["OPEN", "PARTIALLY_FILLED"].includes(trade.status)) {
                console_1.logger.warn("COPY_TRADING", `Reconcile: trade ${trade.id} order ${trade.followerOrderId} is CLOSED but trade status=${trade.status}; fill monitor missed it`);
            }
        }
        if (reconciled > 0) {
            console_1.logger.info("COPY_TRADING", `Reconciliation tore down ${reconciled} stale copy trade(s)`);
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            checked: liveTrades.length,
            reconciled,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Reconciliation complete: ${liveTrades.length} checked, ${reconciled} torn down`, "success");
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `reconcileCopyTradingOrders failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            error: error.message,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Reconciliation failed: ${error.message}`, "error");
    }
}
async function processClosedCopyTrades() {
    var _a, _b;
    const cronName = "processClosedCopyTrades";
    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting closed copy trade processing");
        const closedTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                followerId: { [sequelize_1.Op.ne]: null },
                marketType: "SPOT",
                status: "CLOSED",
                profit: null,
            },
            include: [
                {
                    model: db_1.models.copyTradingFollower,
                    as: "follower",
                    include: [
                        { model: db_1.models.copyTradingLeader, as: "leader" },
                        { model: db_1.models.user, as: "user" },
                    ],
                },
            ],
            limit: 100,
        });
        if (closedTrades.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No closed trades to process", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { processed: 0 });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Found ${closedTrades.length} closed trades to process`);
        const { platformFeePercent } = await (0, settings_core_1.getCopyTradingSettings)();
        for (const trade of closedTrades) {
            const t = await db_1.sequelize.transaction();
            try {
                const follower = trade.follower;
                const leader = follower === null || follower === void 0 ? void 0 : follower.leader;
                if (!follower || !leader) {
                    await t.rollback();
                    continue;
                }
                const lockedTrade = await db_1.models.copyTradingTrade.findByPk(trade.id, {
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!lockedTrade ||
                    lockedTrade.status !== "CLOSED" ||
                    lockedTrade.profit !== null) {
                    await t.rollback();
                    continue;
                }
                const profit = Number((_a = lockedTrade.profit) !== null && _a !== void 0 ? _a : 0);
                const profitPercent = trade.cost > 0 ? (profit / trade.cost) * 100 : 0;
                const leaderSharePercent = (_b = leader.profitSharePercent) !== null && _b !== void 0 ? _b : 20;
                let leaderProfit = 0;
                let platformFee = 0;
                let followerProfit = profit;
                if (profit > 0) {
                    platformFee = profit * (platformFeePercent / 100);
                    leaderProfit = (profit - platformFee) * (leaderSharePercent / 100);
                    followerProfit = profit - platformFee - leaderProfit;
                }
                await lockedTrade.update({
                    profit: followerProfit,
                    profitPercent,
                }, { transaction: t });
                const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                    where: {
                        followerId: follower.id,
                        symbol: trade.symbol,
                        marketType: "SPOT",
                    },
                    transaction: t,
                });
                if (allocation) {
                    const allocationData = allocation;
                    if (trade.side === "BUY") {
                        await allocationData.update({
                            quoteUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, quoteUsedAmount - ${trade.cost})`),
                        }, { transaction: t });
                    }
                    else {
                        await allocationData.update({
                            baseUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, baseUsedAmount - ${trade.amount})`),
                        }, { transaction: t });
                    }
                }
                if (profit > 0) {
                    const profitCurrency = trade.profitCurrency || trade.symbol.split("/")[1] || "USDT";
                    await db_1.models.copyTradingTransaction.create({
                        userId: follower.userId,
                        followerId: follower.id,
                        leaderId: leader.id,
                        tradeId: trade.id,
                        type: "FEE",
                        amount: platformFee,
                        currency: profitCurrency,
                        fee: 0,
                        balanceBefore: 0,
                        balanceAfter: 0,
                        description: `Platform fee for trade ${trade.id}`,
                        metadata: JSON.stringify({ tradeId: trade.id }),
                        status: "COMPLETED",
                    }, { transaction: t });
                    await db_1.models.copyTradingTransaction.create({
                        userId: follower.userId,
                        followerId: follower.id,
                        leaderId: leader.id,
                        tradeId: trade.id,
                        type: "PROFIT_SHARE",
                        amount: leaderProfit,
                        currency: profitCurrency,
                        fee: 0,
                        balanceBefore: 0,
                        balanceAfter: 0,
                        description: `Leader profit share for trade ${trade.id}`,
                        metadata: JSON.stringify({ tradeId: trade.id, leaderId: leader.id }),
                        status: "COMPLETED",
                    }, { transaction: t });
                    const leaderWallet = await (0, safe_imports_1.getWalletByUserIdAndCurrency)(leader.userId, profitCurrency, "ECO", t, true);
                    if (leaderWallet && leaderProfit > 0) {
                        await (0, safe_imports_1.updateWalletBalance)(leaderWallet, leaderProfit, "add", `copy_profit_share_${trade.id}_leader`, t);
                    }
                }
                const [base, pair] = trade.symbol.split("/");
                const creditFollower = async (currency, amount, keySuffix) => {
                    if (amount <= 0)
                        return;
                    let wallet = await (0, safe_imports_1.getWalletByUserIdAndCurrency)(follower.userId, currency, "COPY_TRADING", t, true);
                    if (!wallet) {
                        console_1.logger.warn("COPY_TRADING", `Trade ${trade.id}: COPY_TRADING ${currency} wallet missing for follower ${follower.id}; crediting ECO wallet instead`);
                        wallet = await (0, safe_imports_1.getWalletByUserIdAndCurrency)(follower.userId, currency, "ECO", t, true);
                    }
                    if (!wallet) {
                        throw (0, error_1.createError)({
                            statusCode: 500,
                            message: `No wallet to return ${amount} ${currency} to follower ${follower.id} for trade ${trade.id}`,
                        });
                    }
                    await (0, safe_imports_1.updateWalletBalance)(wallet, amount, "add", `copy_profit_share_${trade.id}_${keySuffix}`, t);
                };
                if (trade.side === "BUY") {
                    await creditFollower(pair, Number(trade.cost) + followerProfit, "follower");
                }
                else {
                    await creditFollower(base, Number(trade.cost), "follower");
                    await creditFollower(pair, followerProfit, "follower_profit");
                }
                await (0, notifications_1.createNotification)({
                    userId: follower.userId,
                    type: "system",
                    title: profit > 0 ? "Copy Trade Profit" : "Copy Trade Closed",
                    message: profit > 0
                        ? `Your copied trade made ${followerProfit.toFixed(2)} ${pair} profit!`
                        : `Your copied trade closed with ${followerProfit.toFixed(2)} ${pair} ${profit < 0 ? "loss" : ""}.`,
                    link: `/copy-trading/subscriptions`,
                });
                await t.commit();
                processedCount++;
                try {
                    await (0, stats_calculator_1.invalidateTradeRelatedCaches)(leader.id, follower.id, trade.symbol);
                }
                catch (cacheError) {
                    console_1.logger.warn("COPY_TRADING", `Failed to invalidate cache for trade ${trade.id}`, cacheError);
                }
                (0, broadcast_1.broadcastLog)(cronName, `Processed trade ${trade.id}: profit=${profit.toFixed(2)}, followerShare=${followerProfit.toFixed(2)}, leaderShare=${leaderProfit.toFixed(2)}`, "success");
            }
            catch (error) {
                await (0, transaction_1.rollbackIfActive)(t);
                console_1.logger.error("COPY_TRADING", `Failed to process closed trade ${trade.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Failed to process trade ${trade.id}: ${error.message}`, "error");
                failedCount++;
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            failed: failedCount,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Closed trade processing completed: ${processedCount} processed, ${failedCount} failed`, "success");
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Closed trade processing failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            failed: failedCount,
            error: error.message,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Closed trade processing failed: ${error.message}`, "error");
        throw error;
    }
}
async function updateLeaderDailyStats() {
    var _a;
    const cronName = "updateCopyTradingLeaderDailyStats";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting leader daily stats update");
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const leaders = await db_1.models.copyTradingLeader.findAll({
            where: { status: "ACTIVE" },
            attributes: ["id"],
        });
        const byLeader = new Map();
        let batched = true;
        try {
            const leaderIds = leaders.map((l) => l.id);
            for (let i = 0; i < leaderIds.length; i += 500) {
                const chunk = leaderIds.slice(i, i + 500);
                const rows = await db_1.models.copyTradingTrade.findAll({
                    where: {
                        leaderId: { [sequelize_1.Op.in]: chunk },
                        followerId: null,
                        createdAt: { [sequelize_1.Op.gte]: today },
                    },
                    attributes: ["id", "leaderId", "profit", "amount", "price", "symbol", "profitCurrency", "fee", "feeCurrency"],
                    raw: true,
                });
                for (const row of rows) {
                    const bucket = byLeader.get(row.leaderId);
                    if (bucket)
                        bucket.push(row);
                    else
                        byLeader.set(row.leaderId, [row]);
                }
            }
        }
        catch (error) {
            batched = false;
            console_1.logger.error("COPY_TRADING", `Batched leader trade read failed, falling back to per-leader queries: ${error.message}`, error);
        }
        const rateCache = new Map();
        const toUsdt = async (amount, cur) => {
            if (cur === "USDT" || cur === "USD")
                return amount;
            let rate = rateCache.get(cur);
            if (rate === undefined) {
                rate = await (0, currency_1.getPriceInUSDT)(cur);
                rateCache.set(cur, rate);
            }
            return amount * rate;
        };
        for (const leader of leaders) {
            try {
                const todayTrades = batched
                    ? (_a = byLeader.get(leader.id)) !== null && _a !== void 0 ? _a : [] : await db_1.models.copyTradingTrade.findAll({
                    where: {
                        leaderId: leader.id,
                        followerId: null,
                        createdAt: { [sequelize_1.Op.gte]: today },
                    },
                    attributes: ["id", "profit", "amount", "price", "symbol", "profitCurrency", "fee", "feeCurrency"],
                });
                const trades = todayTrades;
                const totalTrades = trades.length;
                const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;
                let totalProfitUSDT = 0;
                let totalVolumeUSDT = 0;
                let totalFeesUSDT = 0;
                for (const trade of trades) {
                    const profit = trade.profit || 0;
                    const volume = (trade.amount || 0) * (trade.price || 0);
                    const fee = trade.fee || 0;
                    let profitCurrency = trade.profitCurrency;
                    if (!profitCurrency && trade.symbol) {
                        profitCurrency = (0, currency_1.getQuoteCurrency)(trade.symbol);
                    }
                    if (!profitCurrency) {
                        profitCurrency = "USDT";
                    }
                    const feeCurrency = trade.feeCurrency || profitCurrency;
                    try {
                        const profitInUSDT = await toUsdt(profit, profitCurrency);
                        const volumeInUSDT = await toUsdt(volume, profitCurrency);
                        totalProfitUSDT += profitInUSDT;
                        totalVolumeUSDT += volumeInUSDT;
                        if (fee)
                            totalFeesUSDT += await toUsdt(fee, feeCurrency);
                    }
                    catch (conversionError) {
                        console_1.logger.warn("COPY_TRADING", `Currency conversion failed for ${profitCurrency}`, conversionError);
                        totalProfitUSDT += profit;
                        totalVolumeUSDT += volume;
                        totalFeesUSDT += fee;
                    }
                }
                await db_1.models.copyTradingLeaderStats.upsert({
                    leaderId: leader.id,
                    date: today.toISOString().split("T")[0],
                    trades: totalTrades,
                    winningTrades,
                    losingTrades: totalTrades - winningTrades,
                    profit: totalProfitUSDT,
                    volume: totalVolumeUSDT,
                    fees: totalFeesUSDT,
                });
                (0, broadcast_1.broadcastLog)(cronName, `Updated stats for leader ${leader.id}: trades=${totalTrades}, profit=${(0, currency_1.formatCurrencyAmount)(totalProfitUSDT, "USDT")}`, "info");
            }
            catch (error) {
                console_1.logger.error("COPY_TRADING", `Failed to update stats for leader ${leader.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Failed to update stats for leader ${leader.id}: ${error.message}`, "error");
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            leaders: leaders.length,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Leader stats update completed for ${leaders.length} leaders`, "success");
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Leader stats update failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            error: error.message,
        });
        throw error;
    }
}
async function processWithConcurrency(items, concurrencyLimit, asyncFn) {
    const results = new Array(items.length);
    let index = 0;
    const workers = new Array(concurrencyLimit).fill(0).map(async () => {
        while (index < items.length) {
            const currentIndex = index++;
            try {
                results[currentIndex] = await asyncFn(items[currentIndex]);
            }
            catch (error) {
                results[currentIndex] = error;
            }
        }
    });
    await Promise.all(workers);
    return results;
}
const RESET_MARKER_ENTITY_TYPE = "copyTradingSystem";
const RESET_MARKER_ENTITY_ID = "00000000-0000-0000-0000-000000000000";
const PAUSE_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
async function resetDailyLimits() {
    const cronName = "resetCopyTradingDailyLimits";
    const startTime = Date.now();
    let reset = 0;
    let reactivated = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting daily limits reset");
        const utcMidnight = new Date();
        utcMidnight.setUTCHours(0, 0, 0, 0);
        const utcDateKey = utcMidnight.toISOString().slice(0, 10);
        const alreadyRan = await db_1.models.copyTradingAuditLog.findOne({
            where: {
                entityType: RESET_MARKER_ENTITY_TYPE,
                entityId: RESET_MARKER_ENTITY_ID,
                action: "DAILY_LIMITS_RESET",
                createdAt: { [sequelize_1.Op.gte]: utcMidnight },
            },
        });
        if (alreadyRan) {
            (0, broadcast_1.broadcastLog)(cronName, `Daily reset already ran for ${utcDateKey}, skipping`, "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
            return;
        }
        const pausedFollowers = await db_1.models.copyTradingFollower.findAll({
            where: { status: "PAUSED" },
            include: [
                { model: db_1.models.copyTradingLeader, as: "leader", attributes: ["status"] },
            ],
        });
        for (const follower of pausedFollowers) {
            if (follower.leader && follower.leader.status !== "ACTIVE")
                continue;
            const lastPause = await db_1.models.copyTradingAuditLog.findOne({
                where: {
                    entityType: { [sequelize_1.Op.in]: ["copyTradingFollower", "FOLLOWER"] },
                    entityId: follower.id,
                    action: { [sequelize_1.Op.in]: ["DAILY_LOSS_LIMIT_REACHED", "PAUSE", "RESUME"] },
                    createdAt: { [sequelize_1.Op.gte]: new Date(Date.now() - PAUSE_LOOKBACK_MS) },
                },
                order: [["createdAt", "DESC"]],
            });
            if (lastPause &&
                lastPause.action === "DAILY_LOSS_LIMIT_REACHED" &&
                new Date(lastPause.createdAt) < utcMidnight) {
                await follower.update({ status: "ACTIVE" });
                reactivated++;
                await (0, notifications_1.createNotification)({
                    userId: follower.userId,
                    type: "system",
                    title: "Copy Trading Resumed",
                    message: "Your copy trading subscription has been automatically reactivated for the new trading day.",
                    link: "/copy-trading/subscription",
                });
                (0, broadcast_1.broadcastLog)(cronName, `Reactivated follower ${follower.id}`, "info");
            }
        }
        reset = 1;
        await db_1.models.copyTradingAuditLog.create({
            entityType: RESET_MARKER_ENTITY_TYPE,
            entityId: RESET_MARKER_ENTITY_ID,
            action: "DAILY_LIMITS_RESET",
            metadata: JSON.stringify({ utcDateKey, reactivated }),
        });
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            reset,
            reactivated,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Daily limits reset: ${reactivated} followers reactivated`, "success");
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Daily limits reset failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            error: error.message,
        });
        throw error;
    }
}
async function aggregateWeeklyAnalytics() {
    const cronName = "aggregateCopyTradingWeeklyAnalytics";
    const startTime = Date.now();
    let processed = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting weekly analytics aggregation");
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const leaders = await db_1.models.copyTradingLeader.findAll({
            where: { status: "ACTIVE" },
        });
        for (const leader of leaders) {
            try {
                const trades = await db_1.models.copyTradingTrade.findAll({
                    where: {
                        leaderId: leader.id,
                        isLeaderTrade: true,
                        status: "CLOSED",
                        closedAt: { [sequelize_1.Op.gte]: weekStart },
                    },
                    attributes: ["id", "profit", "cost", "symbol", "profitCurrency"],
                });
                const tradesData = trades;
                const totalTrades = tradesData.length;
                const winningTrades = tradesData.filter((t) => (t.profit || 0) > 0).length;
                let totalProfitUSDT = 0;
                let totalVolumeUSDT = 0;
                for (const trade of tradesData) {
                    const profit = trade.profit || 0;
                    const cost = trade.cost || 0;
                    let profitCurrency = trade.profitCurrency;
                    if (!profitCurrency && trade.symbol) {
                        profitCurrency = (0, currency_1.getQuoteCurrency)(trade.symbol);
                    }
                    if (!profitCurrency) {
                        profitCurrency = "USDT";
                    }
                    try {
                        const profitInUSDT = await (0, currency_1.convertToUSDT)(profit, profitCurrency);
                        const costInUSDT = await (0, currency_1.convertToUSDT)(cost, profitCurrency);
                        totalProfitUSDT += profitInUSDT;
                        totalVolumeUSDT += costInUSDT;
                    }
                    catch (conversionError) {
                        console_1.logger.warn("COPY_TRADING", `Currency conversion failed for ${profitCurrency}`, conversionError);
                        totalProfitUSDT += profit;
                        totalVolumeUSDT += cost;
                    }
                }
                const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
                const roi = totalVolumeUSDT > 0 ? (totalProfitUSDT / totalVolumeUSDT) * 100 : 0;
                processed++;
                (0, broadcast_1.broadcastLog)(cronName, `Aggregated stats for leader ${leader.id}: weekly trades=${totalTrades}, profit=${(0, currency_1.formatCurrencyAmount)(totalProfitUSDT, "USDT")}`, "info");
            }
            catch (error) {
                console_1.logger.error("COPY_TRADING", `Failed to aggregate stats for leader ${leader.id}`, error);
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Weekly analytics aggregation completed for ${processed} leaders`, "success");
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Weekly analytics aggregation failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            error: error.message,
        });
        throw error;
    }
}
async function monitorStopLevels() {
    const cronName = "monitorCopyTradingStopLevels";
    const startTime = Date.now();
    let checked = 0;
    let triggered = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting stop-loss/take-profit monitoring");
        if (!(await isEcosystemAvailable())) {
            (0, broadcast_1.broadcastLog)(cronName, "Ecosystem extension not available, skipping", "warning");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
            return;
        }
        const { closeFollowerPosition } = await Promise.resolve().then(() => __importStar(require("./closePosition")));
        const closeTriggeredTrade = async (trade, currentPrice, action) => {
            var _a;
            var _b, _c;
            const result = await closeFollowerPosition(trade.id, action);
            if (!result.success) {
                console_1.logger.error("COPY_TRADING", `Failed to close trade ${trade.id} on ${action}: ${result.error}`);
                (0, broadcast_1.broadcastLog)(cronName, `Failed to close trade ${trade.id} on ${action}: ${result.error}`, "error");
                return false;
            }
            await db_1.models.copyTradingAuditLog.create({
                entityType: "copyTradingTrade",
                entityId: trade.id,
                action,
                userId: (_a = trade.follower) === null || _a === void 0 ? void 0 : _a.userId,
                metadata: JSON.stringify({
                    triggerPrice: currentPrice,
                    entryPrice: trade.executedPrice || trade.price,
                    closeOrderId: (_b = result.closeOrderId) !== null && _b !== void 0 ? _b : null,
                    nothingToClose: (_c = result.nothingToClose) !== null && _c !== void 0 ? _c : false,
                }),
            });
            return true;
        };
        const bookCache = new Map();
        const readBook = async (symbol) => {
            var _a;
            if (!bookCache.has(symbol)) {
                try {
                    bookCache.set(symbol, await (0, safe_imports_1.getRealOrderBook)(symbol));
                }
                catch (_b) {
                    bookCache.set(symbol, null);
                }
            }
            return (_a = bookCache.get(symbol)) !== null && _a !== void 0 ? _a : null;
        };
        const openTrades = await db_1.models.copyTradingTrade.findAll({
            where: {
                followerId: { [sequelize_1.Op.ne]: null },
                marketType: "SPOT",
                status: "OPEN",
                executedAmount: { [sequelize_1.Op.gt]: 0 },
            },
            include: [
                {
                    model: db_1.models.copyTradingFollower,
                    as: "follower",
                    where: {
                        [sequelize_1.Op.or]: [
                            { stopLossPercent: { [sequelize_1.Op.ne]: null } },
                            { takeProfitPercent: { [sequelize_1.Op.ne]: null } },
                        ],
                    },
                },
            ],
        });
        for (const trade of openTrades) {
            checked++;
            const follower = trade.follower;
            if (!follower)
                continue;
            const [currency, pair] = trade.symbol.split("/");
            let currentPrice = trade.price;
            const book = await readBook(trade.symbol);
            const levels = book ? (trade.side === "BUY" ? book.bids : book.asks) : null;
            if (levels && levels.length > 0) {
                currentPrice = levels[0][0];
            }
            else if (book) {
                currentPrice = trade.price;
                (0, broadcast_1.broadcastLog)(cronName, `No real liquidity on ${trade.symbol}; SL/TP cannot exit trade ${trade.id}. ` +
                    `If this market is AI-managed, raise its Real Liquidity % - a fully ` +
                    `synthetic book has nothing to trade against.`, "warning");
            }
            const entryPrice = trade.executedPrice || trade.price;
            const isLong = trade.side === "BUY";
            if (follower.stopLossPercent) {
                const stopPrice = isLong
                    ? entryPrice * (1 - follower.stopLossPercent / 100)
                    : entryPrice * (1 + follower.stopLossPercent / 100);
                const triggered_sl = isLong
                    ? currentPrice <= stopPrice
                    : currentPrice >= stopPrice;
                if (triggered_sl) {
                    (0, broadcast_1.broadcastLog)(cronName, `Stop-loss triggered for trade ${trade.id} at ${currentPrice}`, "warning");
                    if (await closeTriggeredTrade(trade, currentPrice, "STOP_LOSS_TRIGGERED")) {
                        triggered++;
                    }
                    continue;
                }
            }
            if (follower.takeProfitPercent) {
                const tpPrice = isLong
                    ? entryPrice * (1 + follower.takeProfitPercent / 100)
                    : entryPrice * (1 - follower.takeProfitPercent / 100);
                const triggered_tp = isLong
                    ? currentPrice >= tpPrice
                    : currentPrice <= tpPrice;
                if (triggered_tp) {
                    (0, broadcast_1.broadcastLog)(cronName, `Take-profit triggered for trade ${trade.id} at ${currentPrice}`, "success");
                    if (await closeTriggeredTrade(trade, currentPrice, "TAKE_PROFIT_TRIGGERED")) {
                        triggered++;
                    }
                }
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            checked,
            triggered,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Stop-loss/take-profit monitoring: ${checked} checked, ${triggered} triggered`, "success");
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Stop-loss/take-profit monitoring failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            error: error.message,
        });
        throw error;
    }
}
async function checkDailyLossLimits() {
    var _a, _b;
    var _c;
    const cronName = "checkCopyTradingDailyLossLimits";
    const startTime = Date.now();
    let checked = 0;
    let paused = 0;
    let retryAttempt = 0;
    while (retryAttempt < MAX_RETRY_ATTEMPTS) {
        try {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            if (retryAttempt > 0) {
                (0, broadcast_1.broadcastLog)(cronName, `Retrying daily loss limit check (attempt ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS})`);
            }
            else {
                (0, broadcast_1.broadcastLog)(cronName, "Checking daily loss limits");
            }
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const followers = await db_1.models.copyTradingFollower.findAll({
                where: {
                    status: "ACTIVE",
                    maxDailyLoss: { [sequelize_1.Op.gt]: 0 },
                },
            });
            const byFollower = new Map();
            const followerIds = followers.map((f) => f.id);
            for (let i = 0; i < followerIds.length; i += 500) {
                const chunk = followerIds.slice(i, i + 500);
                const rows = await db_1.models.copyTradingTrade.findAll({
                    where: {
                        followerId: { [sequelize_1.Op.in]: chunk },
                        status: "CLOSED",
                        closedAt: { [sequelize_1.Op.gte]: today },
                        profit: { [sequelize_1.Op.lt]: 0 },
                    },
                    attributes: ["followerId", "profit", "symbol", "profitCurrency"],
                    raw: true,
                });
                for (const row of rows) {
                    const bucket = byFollower.get(row.followerId);
                    if (bucket)
                        bucket.push(row);
                    else
                        byFollower.set(row.followerId, [row]);
                }
            }
            for (const follower of followers) {
                checked++;
                const todayTrades = (_c = byFollower.get(follower.id)) !== null && _c !== void 0 ? _c : [];
                let totalLossUSDT = 0;
                for (const trade of todayTrades) {
                    const loss = Math.abs(trade.profit || 0);
                    let profitCurrency = trade.profitCurrency;
                    if (!profitCurrency && trade.symbol) {
                        profitCurrency = (0, currency_1.getQuoteCurrency)(trade.symbol);
                    }
                    if (!profitCurrency) {
                        profitCurrency = "USDT";
                    }
                    try {
                        const lossInUSDT = await (0, currency_1.convertToUSDT)(loss, profitCurrency);
                        totalLossUSDT += lossInUSDT;
                    }
                    catch (conversionError) {
                        console_1.logger.warn("COPY_TRADING", `Currency conversion failed for ${profitCurrency}`, conversionError);
                        totalLossUSDT += loss;
                    }
                }
                if (totalLossUSDT >= follower.maxDailyLoss) {
                    await follower.update({ status: "PAUSED" });
                    paused++;
                    await (0, notifications_1.createNotification)({
                        userId: follower.userId,
                        type: "system",
                        title: "Copy Trading Paused",
                        message: `Your copy trading has been paused due to reaching your daily loss limit of ${(0, currency_1.formatCurrencyAmount)(follower.maxDailyLoss, "USDT")}. Current loss: ${(0, currency_1.formatCurrencyAmount)(totalLossUSDT, "USDT")}`,
                        link: "/copy-trading/subscription",
                    });
                    await db_1.models.copyTradingAuditLog.create({
                        entityType: "copyTradingFollower",
                        entityId: follower.id,
                        action: "DAILY_LOSS_LIMIT_REACHED",
                        userId: follower.userId,
                        metadata: JSON.stringify({
                            totalLoss: totalLossUSDT,
                            maxDailyLoss: follower.maxDailyLoss,
                            currency: "USDT",
                        }),
                    });
                    (0, broadcast_1.broadcastLog)(cronName, `Paused follower ${follower.id} due to daily loss limit: ${(0, currency_1.formatCurrencyAmount)(totalLossUSDT, "USDT")} >= ${(0, currency_1.formatCurrencyAmount)(follower.maxDailyLoss, "USDT")}`, "warning");
                }
            }
            (0, broadcast_1.broadcastStatus)(cronName, "completed", {
                duration: Date.now() - startTime,
                checked,
                paused,
            });
            (0, broadcast_1.broadcastLog)(cronName, `Daily loss limit check: ${checked} checked, ${paused} paused`, "success");
            return;
        }
        catch (error) {
            retryAttempt++;
            const isConnectionError = error.code === "ECONNRESET" ||
                error.code === "ETIMEDOUT" ||
                error.code === "ENOTFOUND" ||
                error.code === "ECONNREFUSED" ||
                ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("ECONNRESET")) ||
                ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("read ECONNRESET"));
            if (isConnectionError && retryAttempt < MAX_RETRY_ATTEMPTS) {
                console_1.logger.warn("COPY_TRADING", `Connection error in daily loss limit check, retrying (${retryAttempt}/${MAX_RETRY_ATTEMPTS}): ${error.message}`);
                (0, broadcast_1.broadcastLog)(cronName, `Connection error, retrying in ${RETRY_DELAY_MS}ms...`, "warning");
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * retryAttempt));
                checked = 0;
                paused = 0;
                continue;
            }
            console_1.logger.error("COPY_TRADING", `Daily loss limit check failed: ${error.message}`, error);
            (0, broadcast_1.broadcastStatus)(cronName, "failed", {
                duration: Date.now() - startTime,
                error: error.message,
                retryAttempts: retryAttempt,
            });
            throw error;
        }
    }
}
