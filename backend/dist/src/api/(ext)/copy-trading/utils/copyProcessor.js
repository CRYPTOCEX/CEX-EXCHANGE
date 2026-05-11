"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCopyAmount = calculateCopyAmount;
exports.processCopyOrder = processCopyOrder;
exports.processCopyOrdersBatch = processCopyOrdersBatch;
exports.processCopyOrderWithRetry = processCopyOrderWithRetry;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const blockchain_1 = require("@b/api/(ext)/ecosystem/utils/blockchain");
const dailyLimits_1 = require("./dailyLimits");
const currency_1 = require("./currency");
function calculateCopyAmount(leaderAmount, leaderPrice, leaderBalance, follower, availableBalance) {
    if (availableBalance <= 0) {
        return { amount: 0, cost: 0, reason: "No available balance" };
    }
    let copyAmount;
    const riskMultiplier = follower.riskMultiplier || 1;
    switch (follower.copyMode) {
        case "PROPORTIONAL": {
            if (leaderBalance <= 0) {
                return { amount: 0, cost: 0, reason: "Leader balance unknown" };
            }
            const leaderPercent = (leaderAmount * leaderPrice) / leaderBalance;
            copyAmount =
                ((availableBalance * leaderPercent) / leaderPrice) * riskMultiplier;
            break;
        }
        case "FIXED_AMOUNT": {
            const fixedAmount = follower.fixedAmount || 0;
            if (fixedAmount <= 0) {
                return { amount: 0, cost: 0, reason: "Fixed amount not configured" };
            }
            copyAmount = (fixedAmount / leaderPrice) * riskMultiplier;
            break;
        }
        case "FIXED_RATIO": {
            const ratio = follower.fixedRatio || 0.1;
            copyAmount = leaderAmount * ratio * riskMultiplier;
            break;
        }
        default:
            return { amount: 0, cost: 0, reason: "Invalid copy mode" };
    }
    if (follower.maxPositionSize && copyAmount > follower.maxPositionSize) {
        copyAmount = follower.maxPositionSize;
    }
    const cost = copyAmount * leaderPrice;
    if (cost > availableBalance) {
        copyAmount = availableBalance / leaderPrice;
    }
    return {
        amount: Math.max(0, copyAmount),
        cost: Math.max(0, copyAmount * leaderPrice),
    };
}
async function processCopyOrder(params) {
    var _a, _b, _c, _d, _e, _f;
    const { leaderTrade, follower, leaderBalance } = params;
    const startTime = Date.now();
    let orderForQueue = null;
    const t = await db_1.sequelize.transaction({
        isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    try {
        const lockedFollower = await db_1.models.copyTradingFollower.findByPk(follower.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!lockedFollower || lockedFollower.status !== "ACTIVE") {
            await t.rollback();
            return { success: false, error: "Follower is not active" };
        }
        const followerData = lockedFollower;
        const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
            where: {
                followerId: follower.id,
                symbol: leaderTrade.symbol,
                isActive: true,
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!allocation) {
            await t.rollback();
            return {
                success: false,
                error: `No allocation for market ${leaderTrade.symbol}`,
            };
        }
        const allocationData = allocation;
        const limitCheck = await (0, dailyLimits_1.checkDailyLimits)(follower.id);
        if (!limitCheck.canTrade) {
            await t.rollback();
            return { success: false, error: limitCheck.reason };
        }
        const availableAmount = leaderTrade.side === "BUY"
            ? allocationData.quoteAmount - allocationData.quoteUsedAmount
            : allocationData.baseAmount - allocationData.baseUsedAmount;
        if (availableAmount <= 0) {
            await t.rollback();
            return {
                success: false,
                error: `Insufficient allocation for ${leaderTrade.symbol} ${leaderTrade.side}. Available: ${availableAmount}`,
            };
        }
        const { amount: copyAmount, cost, reason } = calculateCopyAmount(leaderTrade.amount, leaderTrade.price, leaderBalance, followerData, availableAmount);
        if (copyAmount <= 0) {
            await t.rollback();
            return { success: false, error: reason || "Calculated amount is zero" };
        }
        const baseCurrency = (0, currency_1.getBaseCurrency)(leaderTrade.symbol);
        const quoteCurrency = (0, currency_1.getQuoteCurrency)(leaderTrade.symbol);
        const market = await db_1.models.ecosystemMarket.findOne({
            where: { currency: baseCurrency, pair: quoteCurrency },
            transaction: t,
        });
        if (!market) {
            await t.rollback();
            return { success: false, error: `Market not found: ${leaderTrade.symbol}` };
        }
        const marketData = market;
        const minAmount = Number(((_c = (_b = (_a = marketData.metadata) === null || _a === void 0 ? void 0 : _a.limits) === null || _b === void 0 ? void 0 : _b.amount) === null || _c === void 0 ? void 0 : _c.min) || 0);
        if (copyAmount < minAmount) {
            await t.rollback();
            return {
                success: false,
                error: `Amount ${copyAmount} ${baseCurrency} below minimum ${minAmount} ${baseCurrency}`,
            };
        }
        let effectivePrice = leaderTrade.price;
        if (leaderTrade.type === "MARKET") {
            try {
                const { asks, bids } = await (0, queries_1.getOrderBook)(leaderTrade.symbol);
                if (leaderTrade.side === "BUY" && asks && asks.length > 0) {
                    effectivePrice = asks[0][0];
                }
                else if (leaderTrade.side === "SELL" && bids && bids.length > 0) {
                    effectivePrice = bids[0][0];
                }
            }
            catch (e) {
            }
        }
        const precision = Number(((_e = (_d = marketData.metadata) === null || _d === void 0 ? void 0 : _d.precision) === null || _e === void 0 ? void 0 : _e.price) || 8);
        const feeRate = Number(((_f = marketData.metadata) === null || _f === void 0 ? void 0 : _f.taker) || 0.1);
        const fee = parseFloat(((copyAmount * effectivePrice * feeRate) / 100).toFixed(precision));
        const { spend: spendCurrency, receive: receiveCurrency } = (0, currency_1.getTradeCurrency)(leaderTrade.symbol, leaderTrade.side);
        const totalCost = leaderTrade.side === "BUY"
            ? parseFloat((copyAmount * effectivePrice + fee).toFixed(precision))
            : copyAmount;
        const wallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(follower.userId, spendCurrency, "COPY_TRADING", t, true);
        if (!wallet) {
            await t.rollback();
            return {
                success: false,
                error: `Wallet not found for ${spendCurrency}`,
            };
        }
        const walletBalance = parseFloat(wallet.balance.toString());
        if (walletBalance < totalCost) {
            await t.rollback();
            return {
                success: false,
                error: `Insufficient ${spendCurrency} balance: ${walletBalance} < ${totalCost}`,
            };
        }
        const newOrder = await (0, queries_1.createOrder)({
            userId: follower.userId,
            symbol: leaderTrade.symbol,
            amount: (0, blockchain_1.toBigIntFloat)(copyAmount),
            price: (0, blockchain_1.toBigIntFloat)(effectivePrice),
            cost: (0, blockchain_1.toBigIntFloat)(totalCost),
            type: leaderTrade.type === "MARKET" ? "MARKET" : "LIMIT",
            side: leaderTrade.side,
            fee: (0, blockchain_1.toBigIntFloat)(fee),
            feeCurrency: quoteCurrency,
            walletType: "COPY_TRADING",
        });
        await (0, wallet_1.updateWalletBalance)(wallet, totalCost, "subtract", `ct_order_lock_${newOrder.id}`, t);
        orderForQueue = newOrder;
        const latencyMs = Date.now() - startTime;
        const copyTrade = await db_1.models.copyTradingTrade.create({
            leaderId: leaderTrade.leaderId,
            followerId: follower.id,
            leaderOrderId: leaderTrade.leaderOrderId,
            symbol: leaderTrade.symbol,
            side: leaderTrade.side,
            type: leaderTrade.type,
            amount: copyAmount,
            price: effectivePrice,
            cost: totalCost,
            fee,
            feeCurrency: quoteCurrency,
            profitCurrency: quoteCurrency,
            status: "OPEN",
            isLeaderTrade: false,
            latencyMs,
            executedAmount: 0,
            executedPrice: 0,
        }, { transaction: t });
        if (leaderTrade.side === "BUY") {
            await allocationData.update({
                quoteUsedAmount: (0, sequelize_1.literal)(`"quoteUsedAmount" + ${totalCost}`),
            }, { transaction: t });
        }
        else {
            await allocationData.update({
                baseUsedAmount: (0, sequelize_1.literal)(`"baseUsedAmount" + ${copyAmount}`),
            }, { transaction: t });
        }
        await (0, dailyLimits_1.recordTrade)(follower.id, totalCost);
        await db_1.models.copyTradingTransaction.create({
            userId: follower.userId,
            followerId: follower.id,
            leaderId: leaderTrade.leaderId,
            tradeId: copyTrade.id,
            type: "ALLOCATION",
            amount: totalCost,
            currency: spendCurrency,
            fee: 0,
            balanceBefore: walletBalance,
            balanceAfter: walletBalance - totalCost,
            description: `Copied ${leaderTrade.side} trade: ${copyAmount.toFixed(6)} ${baseCurrency} @ ${effectivePrice} ${quoteCurrency}`,
            metadata: JSON.stringify({
                symbol: leaderTrade.symbol,
                orderId: newOrder.id,
                latencyMs,
                baseCurrency,
                quoteCurrency,
                spendCurrency,
                receiveCurrency,
            }),
            status: "COMPLETED",
        }, { transaction: t });
        await t.commit();
        try {
            await (0, queries_1.addOrderToMatchingQueue)(orderForQueue);
        }
        catch (queueError) {
            console_1.logger.error("COPY_TRADING_ORDER", `Failed to enqueue copy order to matching queue after commit (orderId=${orderForQueue === null || orderForQueue === void 0 ? void 0 : orderForQueue.id}, followerId=${follower.id}, symbol=${leaderTrade.symbol}): ${queueError === null || queueError === void 0 ? void 0 : queueError.message}`, queueError);
        }
        return {
            success: true,
            orderId: newOrder.id,
            copyTradeId: copyTrade.id,
            amount: copyAmount,
            price: effectivePrice,
            latencyMs,
        };
    }
    catch (error) {
        await t.rollback();
        console_1.logger.error("COPY_TRADING_ORDER", `Error processing copy order: ${error.message}`, error);
        return { success: false, error: error.message };
    }
}
async function processCopyOrdersBatch(leaderTrade, followers, leaderBalance, concurrencyLimit = 5) {
    const results = [];
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < followers.length; i += concurrencyLimit) {
        const batch = followers.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(batch.map((follower) => processCopyOrder({ leaderTrade, follower, leaderBalance })));
        for (const result of batchResults) {
            results.push(result);
            if (result.success) {
                successCount++;
            }
            else {
                failCount++;
            }
        }
    }
    return { results, successCount, failCount };
}
async function processCopyOrderWithRetry(params, maxRetries = 3, delayMs = 1000) {
    let lastError = "";
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await processCopyOrder(params);
        if (result.success) {
            return result;
        }
        lastError = result.error || "Unknown error";
        if (lastError.includes("Insufficient balance") ||
            lastError.includes("not active") ||
            lastError.includes("daily limit")) {
            return result;
        }
        if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
    }
    return { success: false, error: `Failed after ${maxRetries} attempts: ${lastError}` };
}
