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
exports.mapBinaryOutcomeToPnL = mapBinaryOutcomeToPnL;
exports.calculateBinaryStake = calculateBinaryStake;
exports.ensureBinaryCopySchema = ensureBinaryCopySchema;
exports.handleBinaryOrderCreated = handleBinaryOrderCreated;
exports.processBinaryCopyOrder = processBinaryCopyOrder;
exports.releaseBinaryClaim = releaseBinaryClaim;
exports.reopenBinaryClaimWithOrder = reopenBinaryClaimWithOrder;
exports.handleBinaryOrderSettled = handleBinaryOrderSettled;
exports.settleBinaryCopyTrade = settleBinaryCopyTrade;
exports.handleBinaryOrderCanceled = handleBinaryOrderCanceled;
exports.processPendingBinaryCopies = processPendingBinaryCopies;
exports.reconcileBinaryCopyTrades = reconcileBinaryCopyTrades;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const settings_core_1 = require("./settings-core");
const dailyLimits_1 = require("./dailyLimits");
const profitShare_1 = require("./profitShare");
const currency_1 = require("./currency");
const FANOUT_LOCK_TTL_MS = 120000;
const MAX_COPY_STALENESS_MS = 90000;
const BACKSTOP_MIN_AGE_MS = 8000;
const MIN_TIME_TO_EXPIRY_MS = 15000;
const PAYOUT_PER_POINT_MIN = 0.01;
const PAYOUT_PER_POINT_MAX = 1000;
function mapBinaryOutcomeToPnL(status, profit, stake) {
    if (status === "WIN")
        return Math.max(0, profit);
    if (status === "DRAW")
        return 0;
    return profit < 0 ? Math.max(profit, -stake) : -stake;
}
function calculateBinaryStake(leaderStake, leaderPreTradeBalance, follower, allocationTotal, allocationAvailable, binaryMaxStake = 0) {
    if (allocationAvailable <= 0) {
        return { stake: 0, reason: "No available allocation budget" };
    }
    if (leaderStake <= 0) {
        return { stake: 0, reason: "Leader stake is zero" };
    }
    const riskMultiplier = follower.riskMultiplier || 1;
    let stake;
    switch (follower.copyMode || "PROPORTIONAL") {
        case "PROPORTIONAL": {
            if (leaderPreTradeBalance <= 0) {
                return { stake: 0, reason: "Leader balance unknown" };
            }
            const leaderPercent = Math.min(1, leaderStake / leaderPreTradeBalance);
            stake = allocationAvailable * leaderPercent * riskMultiplier;
            break;
        }
        case "FIXED_AMOUNT": {
            const fixedAmount = follower.fixedAmount || 0;
            if (fixedAmount <= 0) {
                return { stake: 0, reason: "Fixed amount not configured" };
            }
            stake = fixedAmount * riskMultiplier;
            break;
        }
        case "FIXED_RATIO": {
            stake = leaderStake * (follower.fixedRatio || 0.1) * riskMultiplier;
            break;
        }
        default:
            return { stake: 0, reason: "Invalid copy mode" };
    }
    if (follower.maxPositionSize && follower.maxPositionSize > 0 && allocationTotal > 0) {
        const cap = allocationTotal * (Math.min(follower.maxPositionSize, 100) / 100);
        if (stake > cap)
            stake = cap;
    }
    if (binaryMaxStake > 0 && stake > binaryMaxStake) {
        stake = binaryMaxStake;
    }
    if (stake > allocationAvailable)
        stake = allocationAvailable;
    stake = Math.floor(stake * 1e8) / 1e8;
    if (stake <= 0)
        return { stake: 0, reason: "Calculated stake is zero" };
    return { stake };
}
async function ensureBinaryCopySchema() {
    const legacy = [
        [
            "copy_trading_leader_markets",
            "copy_trading_leader_markets_unique",
            "copy_trading_leader_markets_unique_v2",
        ],
        [
            "copy_trading_follower_allocations",
            "copy_trading_follower_alloc_unique",
            "copy_trading_follower_alloc_unique_v2",
        ],
    ];
    for (const [table, legacyIndex, replacementIndex] of legacy) {
        try {
            const [rows] = await db_1.sequelize.query(`SELECT
           (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = :table
                AND index_name = :legacyIndex) AS legacyCount,
           (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = :table
                AND index_name = :replacementIndex) AS replacementCount,
           (SELECT COUNT(*) FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = :table
                AND column_name = 'marketType') AS columnCount`, { replacements: { table, legacyIndex, replacementIndex } });
            const row = rows[0] || {};
            const hasLegacy = Number(row.legacyCount || 0) > 0;
            const hasReplacement = Number(row.replacementCount || 0) > 0;
            const hasColumn = Number(row.columnCount || 0) > 0;
            if (!hasLegacy)
                continue;
            if (!hasReplacement || !hasColumn) {
                console_1.logger.warn("COPY_TRADING", `Skipping drop of ${legacyIndex} on ${table}: marketType-aware schema not present yet ` +
                    `(marketType column: ${hasColumn}, ${replacementIndex}: ${hasReplacement}). ` +
                    `Run the backend once with model sync enabled (DB_SYNC unset or "always") to complete the binary copy-trading migration.`);
                continue;
            }
            await db_1.sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${legacyIndex}\``);
            console_1.logger.info("COPY_TRADING", `Dropped legacy unique index ${legacyIndex} on ${table} (superseded by ${replacementIndex})`);
        }
        catch (error) {
            console_1.logger.error("COPY_TRADING", `Failed to drop legacy index ${legacyIndex} on ${table}: ${error.message}`);
        }
    }
}
async function handleBinaryOrderCreated(event) {
    const { redlock } = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
    let lock = null;
    try {
        lock = await redlock.acquire([`ct:binary:fanout:${event.orderId}`], FANOUT_LOCK_TTL_MS);
    }
    catch (lockError) {
        console_1.logger.warn("COPY_TRADING", `Could not acquire binary fan-out lock for order ${event.orderId} (already held, or lock backend unavailable): ${lockError === null || lockError === void 0 ? void 0 : lockError.message}`);
        return { success: true };
    }
    try {
        return await fanOutBinaryOrder(event);
    }
    finally {
        try {
            await lock.release();
        }
        catch (_a) {
        }
    }
}
async function fanOutBinaryOrder(event) {
    var _a;
    try {
        if (event.isDemo)
            return { success: true };
        const nowMs = Date.now();
        if (event.createdAt) {
            const placedAt = new Date(event.createdAt).getTime();
            if (Number.isFinite(placedAt) && nowMs - placedAt > MAX_COPY_STALENESS_MS) {
                console_1.logger.warn("COPY_TRADING", `Skipping stale binary copy of order ${event.orderId} (placed ${Math.round((nowMs - placedAt) / 1000)}s ago)`);
                return { success: true };
            }
        }
        const expiryMs = new Date(event.closedAt).getTime();
        if (Number.isFinite(expiryMs) && expiryMs - nowMs < MIN_TIME_TO_EXPIRY_MS) {
            return { success: true };
        }
        const availability = await (0, settings_core_1.checkCopyTypeAvailability)("BINARY");
        if (!availability.available)
            return { success: true };
        const leader = await db_1.models.copyTradingLeader.findOne({
            where: { userId: event.userId, status: "ACTIVE" },
        });
        if (!leader)
            return { success: true };
        const leaderData = leader;
        if (!(0, settings_core_1.leaderOffersMarketType)(leaderData.tradingType, "BINARY")) {
            return { success: true };
        }
        const leaderMarket = await db_1.models.copyTradingLeaderMarket.findOne({
            where: {
                leaderId: leaderData.id,
                symbol: event.symbol,
                marketType: "BINARY",
                isActive: true,
            },
        });
        if (!leaderMarket)
            return { success: true };
        const followers = await db_1.models.copyTradingFollower.findAll({
            where: { leaderId: leaderData.id, status: "ACTIVE" },
            include: [
                {
                    model: db_1.models.copyTradingFollowerAllocation,
                    as: "allocations",
                    where: { symbol: event.symbol, marketType: "BINARY", isActive: true },
                    required: true,
                },
            ],
        });
        if (followers.length === 0)
            return { success: true };
        const [leaderTrade, created] = await db_1.models.copyTradingTrade.findOrCreate({
            where: {
                leaderId: leaderData.id,
                leaderOrderId: event.orderId,
                isLeaderTrade: true,
            },
            defaults: {
                leaderId: leaderData.id,
                symbol: event.symbol,
                marketType: "BINARY",
                side: event.side,
                type: event.type,
                amount: event.amount,
                price: event.price,
                cost: event.amount,
                fee: 0,
                feeCurrency: (0, currency_1.getQuoteCurrency)(event.symbol),
                profitCurrency: (0, currency_1.getQuoteCurrency)(event.symbol),
                status: "OPEN",
                isLeaderTrade: true,
                leaderOrderId: event.orderId,
                expiresAt: new Date(event.closedAt),
                executedAmount: event.amount,
                executedPrice: event.price,
            },
        });
        if (created) {
            await (0, settings_core_1.createAuditLog)({
                entityType: "copyTradingTrade",
                entityId: leaderTrade.id,
                action: "BINARY_TRADE_CREATED",
                userId: event.userId,
                metadata: {
                    symbol: event.symbol,
                    side: event.side,
                    type: event.type,
                    amount: event.amount,
                    expiresAt: event.closedAt,
                    followers: followers.length,
                },
            });
        }
        const quoteCurrency = (0, currency_1.getQuoteCurrency)(event.symbol);
        const leaderWallet = await db_1.models.wallet.findOne({
            where: { userId: event.userId, currency: quoteCurrency, type: "SPOT" },
        });
        const leaderPreTradeBalance = leaderWallet
            ? parseFloat(leaderWallet.balance.toString()) +
                parseFloat(((_a = leaderWallet.inOrder) === null || _a === void 0 ? void 0 : _a.toString()) || "0")
            : 0;
        let processed = 0;
        const BATCH = 5;
        for (let i = 0; i < followers.length; i += BATCH) {
            const batch = followers.slice(i, i + BATCH);
            const results = await Promise.all(batch.map((follower) => processBinaryCopyOrder(leaderTrade, event, follower, leaderPreTradeBalance)));
            processed += results.filter((r) => r.success && r.copied).length;
        }
        return { success: true, followersProcessed: processed };
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Error in handleBinaryOrderCreated", error);
        return { success: false, error: error.message };
    }
}
async function processBinaryCopyOrder(leaderTrade, event, follower, leaderPreTradeBalance) {
    var _a, _b;
    const startTime = Date.now();
    const [currency, pair] = event.symbol.split("/");
    const idempotencyKey = `ct_binary_${event.orderId}_${follower.id}`;
    let claimId = null;
    let reservedStake = 0;
    let allocationId = null;
    try {
        const existing = await db_1.models.copyTradingTrade.findOne({
            where: {
                followerId: follower.id,
                leaderOrderId: event.orderId,
                isLeaderTrade: false,
            },
        });
        const isResumableClaim = existing &&
            existing.status === "PENDING" &&
            !existing.followerOrderId;
        if (existing && !isResumableClaim) {
            return { success: true, copied: false };
        }
        const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
            where: {
                followerId: follower.id,
                symbol: event.symbol,
                marketType: "BINARY",
                isActive: true,
            },
        });
        if (!allocation) {
            return { success: false, error: `No binary allocation for ${event.symbol}` };
        }
        allocationId = allocation.id;
        if (isResumableClaim) {
            claimId = existing.id;
            reservedStake = Number(existing.amount) || 0;
        }
        else {
            const limitCheck = await (0, dailyLimits_1.checkDailyLimits)(follower.id);
            if (!limitCheck.canTrade) {
                return { success: false, error: limitCheck.reason };
            }
            const settings = await (0, settings_core_1.getCopyTradingSettings)();
            const claimTx = await db_1.sequelize.transaction();
            try {
                const lockedAllocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                    where: { id: allocationId },
                    transaction: claimTx,
                    lock: claimTx.LOCK.UPDATE,
                });
                if (!lockedAllocation) {
                    await claimTx.rollback();
                    return { success: false, error: "Allocation disappeared" };
                }
                const locked = lockedAllocation;
                const available = Number(locked.quoteAmount) - Number(locked.quoteUsedAmount);
                const { stake, reason } = calculateBinaryStake(event.amount, leaderPreTradeBalance, follower, Number(locked.quoteAmount), available, settings.binaryMaxStake);
                if (stake <= 0) {
                    await claimTx.rollback();
                    return { success: false, error: reason || "Calculated stake is zero" };
                }
                await locked.update({ quoteUsedAmount: (0, sequelize_1.literal)(`quoteUsedAmount + ${stake}`) }, { transaction: claimTx });
                const claim = await db_1.models.copyTradingTrade.create({
                    leaderId: leaderTrade.leaderId,
                    followerId: follower.id,
                    leaderOrderId: event.orderId,
                    symbol: event.symbol,
                    marketType: "BINARY",
                    side: event.side,
                    type: event.type,
                    amount: stake,
                    price: event.price,
                    cost: stake,
                    fee: 0,
                    feeCurrency: pair,
                    profitCurrency: pair,
                    status: "PENDING",
                    isLeaderTrade: false,
                    expiresAt: new Date(event.closedAt),
                    executedAmount: 0,
                    executedPrice: 0,
                }, { transaction: claimTx });
                await claimTx.commit();
                claimId = claim.id;
                reservedStake = stake;
            }
            catch (claimError) {
                try {
                    await claimTx.rollback();
                }
                catch (_c) {
                }
                return { success: false, error: claimError.message };
            }
        }
        let order;
        try {
            const { BinaryOrderService } = await Promise.resolve().then(() => __importStar(require("@b/api/exchange/binary/order/util/BinaryOrderService")));
            let scaledPayoutPerPoint = event.payoutPerPoint;
            if (event.type === "TURBO" &&
                event.payoutPerPoint != null &&
                Number.isFinite(event.payoutPerPoint)) {
                const stakeRatio = event.amount > 0 ? reservedStake / event.amount : 0;
                scaledPayoutPerPoint = event.payoutPerPoint * stakeRatio;
                if (!Number.isFinite(scaledPayoutPerPoint) ||
                    scaledPayoutPerPoint < PAYOUT_PER_POINT_MIN ||
                    scaledPayoutPerPoint > PAYOUT_PER_POINT_MAX) {
                    const reason = `Scaled TURBO payout ${scaledPayoutPerPoint} outside the tradable range [${PAYOUT_PER_POINT_MIN}, ${PAYOUT_PER_POINT_MAX}] — stake too small relative to the leader's`;
                    await releaseBinaryClaim(claimId, allocationId, reservedStake, reason);
                    return { success: false, error: reason };
                }
            }
            const replicatedProfitPercentage = Number(event.profitPercentage);
            if (!Number.isFinite(replicatedProfitPercentage) ||
                replicatedProfitPercentage < 0) {
                const reason = `Leader order ${event.orderId} has no payout percentage to replicate`;
                await releaseBinaryClaim(claimId, allocationId, reservedStake, reason);
                return { success: false, error: reason };
            }
            order = await BinaryOrderService.createOrder({
                userId: follower.userId,
                currency,
                pair,
                amount: reservedStake,
                side: event.side,
                type: event.type,
                durationType: event.durationType || "TIME",
                barrier: event.barrier,
                strikePrice: event.strikePrice,
                payoutPerPoint: scaledPayoutPerPoint,
                closedAt: event.closedAt instanceof Date
                    ? event.closedAt.toISOString()
                    : String(event.closedAt),
                isDemo: false,
                idempotencyKey,
                walletType: "COPY_TRADING",
                replication: {
                    profitPercentage: replicatedProfitPercentage,
                    copiedFromOrderId: event.orderId,
                },
            });
        }
        catch (placeError) {
            await releaseBinaryClaim(claimId, allocationId, reservedStake, placeError.message);
            console_1.logger.warn("COPY_TRADING", `Binary copy placement failed for follower ${follower.id} on ${event.symbol}: ${placeError.message}`);
            return { success: false, error: placeError.message };
        }
        const placedStake = Number(order.amount) || reservedStake;
        const stakeDelta = placedStake - reservedStake;
        const latencyMs = Date.now() - startTime;
        const t = await db_1.sequelize.transaction();
        try {
            const claimRow = await db_1.models.copyTradingTrade.findOne({
                where: { id: claimId },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!claimRow || claimRow.status !== "PENDING") {
                await t.commit();
                const reopened = await reopenBinaryClaimWithOrder(claimId, order, allocationId);
                if (!reopened) {
                    console_1.logger.error("COPY_TRADING", `Could not re-attach orphaned binary order ${order.id} to claim ${claimId} (follower ${follower.id}, leader order ${event.orderId}); manual reconcile required`);
                    return { success: true, copied: false };
                }
                try {
                    const freshOrder = await db_1.models.binaryOrder.findOne({
                        where: { id: order.id },
                    });
                    const st = freshOrder === null || freshOrder === void 0 ? void 0 : freshOrder.status;
                    if (st && ["WIN", "LOSS", "DRAW"].includes(st)) {
                        const openClaim = await db_1.models.copyTradingTrade.findByPk(claimId);
                        if (openClaim) {
                            await settleBinaryCopyTrade(openClaim, st, Number(freshOrder.profit) || 0, freshOrder.closePrice != null
                                ? Number(freshOrder.closePrice)
                                : undefined);
                        }
                    }
                    else {
                        const { BinaryOrderService } = await Promise.resolve().then(() => __importStar(require("@b/api/exchange/binary/order/util/BinaryOrderService")));
                        try {
                            await BinaryOrderService.cancelOrder(follower.userId, order.id);
                        }
                        catch (cancelError) {
                            console_1.logger.warn("COPY_TRADING", `Orphaned binary order ${order.id} not cancellable (${cancelError.message}); will settle at expiry on the re-attached row`);
                        }
                    }
                }
                catch (disposeError) {
                    console_1.logger.error("COPY_TRADING", `Orphan dispose routing failed for order ${order.id} (claim ${claimId}): ${disposeError.message}`);
                }
                return { success: true, copied: false };
            }
            if (stakeDelta !== 0 && allocationId) {
                const lockedAllocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                    where: { id: allocationId },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (lockedAllocation) {
                    const a = lockedAllocation;
                    await a.update({
                        quoteUsedAmount: Math.max(0, Number(a.quoteUsedAmount) + stakeDelta),
                    }, { transaction: t });
                }
            }
            await claimRow.update({
                followerOrderId: order.id,
                status: "OPEN",
                amount: placedStake,
                cost: placedStake,
                price: (_a = order.price) !== null && _a !== void 0 ? _a : event.price,
                executedAmount: placedStake,
                executedPrice: (_b = order.price) !== null && _b !== void 0 ? _b : event.price,
                latencyMs,
            }, { transaction: t });
            await (0, settings_core_1.createCopyTradingTransaction)({
                userId: follower.userId,
                followerId: follower.id,
                leaderId: leaderTrade.leaderId,
                tradeId: claimId,
                type: "ALLOCATION",
                amount: placedStake,
                currency: pair,
                balanceBefore: 0,
                balanceAfter: 0,
                description: `Copied binary ${event.type} ${event.side}: ${placedStake} ${pair} stake on ${event.symbol}`,
                metadata: {
                    symbol: event.symbol,
                    binaryOrderId: order.id,
                    leaderOrderId: event.orderId,
                    latencyMs,
                },
            }, t);
            await t.commit();
            await (0, dailyLimits_1.recordTrade)(follower.id, placedStake);
            try {
                const { broadcastTradeUpdate } = await Promise.resolve().then(() => __importStar(require("../index.ws")));
                broadcastTradeUpdate(claimRow, "opened");
            }
            catch (_d) {
            }
            try {
                const { notifyFollowerTradeEvent } = await Promise.resolve().then(() => __importStar(require("./notifications")));
                await notifyFollowerTradeEvent(follower.id, claimId, "COPIED", {
                    symbol: event.symbol,
                });
            }
            catch (_e) {
            }
            return { success: true, copied: true, tradeId: claimId };
        }
        catch (txError) {
            try {
                await t.rollback();
            }
            catch (_f) {
            }
            console_1.logger.error("COPY_TRADING", `Binary copy booking failed for follower ${follower.id} (order ${order === null || order === void 0 ? void 0 : order.id}); claim ${claimId} left PENDING for resume: ${txError.message}`);
            return { success: false, error: txError.message };
        }
    }
    catch (error) {
        console_1.logger.warn("COPY_TRADING", `Binary copy skipped/failed for follower ${follower.id} on ${event.symbol}: ${error.message}`);
        return { success: false, error: error.message };
    }
}
async function releaseBinaryClaim(claimId, allocationId, stake, errorMessage) {
    if (!claimId)
        return;
    const t = await db_1.sequelize.transaction();
    try {
        const claim = await db_1.models.copyTradingTrade.findOne({
            where: { id: claimId, status: "PENDING" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!claim) {
            await t.commit();
            return;
        }
        if (allocationId && stake > 0) {
            const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                where: { id: allocationId },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (allocation) {
                const a = allocation;
                await a.update({ quoteUsedAmount: Math.max(0, Number(a.quoteUsedAmount) - stake) }, { transaction: t });
            }
        }
        await claim.update({
            status: "FAILED",
            errorMessage: errorMessage === null || errorMessage === void 0 ? void 0 : errorMessage.slice(0, 500),
            closedAt: new Date(),
        }, { transaction: t });
        await t.commit();
    }
    catch (releaseError) {
        try {
            await t.rollback();
        }
        catch (_a) {
        }
        console_1.logger.error("COPY_TRADING", `Failed to release binary claim ${claimId}: ${releaseError.message}`);
    }
}
async function reopenBinaryClaimWithOrder(claimId, order, allocationId) {
    const placedStake = Number(order === null || order === void 0 ? void 0 : order.amount) || 0;
    const orderId = order === null || order === void 0 ? void 0 : order.id;
    if (!orderId)
        return false;
    const t = await db_1.sequelize.transaction();
    try {
        const claim = await db_1.models.copyTradingTrade.findOne({
            where: { id: claimId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!claim) {
            await t.commit();
            return false;
        }
        const c = claim;
        if (c.followerOrderId === orderId) {
            await t.commit();
            return true;
        }
        const wasPending = c.status === "PENDING";
        const reserveDelta = wasPending
            ? placedStake - (Number(c.amount) || 0)
            : placedStake;
        if (reserveDelta !== 0 && allocationId) {
            const lockedAllocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                where: { id: allocationId },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (lockedAllocation) {
                const a = lockedAllocation;
                await a.update({
                    quoteUsedAmount: Math.max(0, Number(a.quoteUsedAmount) + reserveDelta),
                }, { transaction: t });
            }
        }
        await c.update({
            followerOrderId: orderId,
            status: "OPEN",
            amount: placedStake,
            cost: placedStake,
            price: Number(order.price) || c.price,
            executedAmount: placedStake,
            executedPrice: Number(order.price) || c.price,
            errorMessage: null,
            closedAt: null,
        }, { transaction: t });
        await t.commit();
        return true;
    }
    catch (e) {
        try {
            await t.rollback();
        }
        catch (_a) {
        }
        console_1.logger.error("COPY_TRADING", `reopenBinaryClaimWithOrder failed for claim ${claimId} (order ${orderId}): ${e.message}`);
        return false;
    }
}
async function handleBinaryOrderSettled(orderId, status, profit, closePrice) {
    try {
        const trades = await db_1.models.copyTradingTrade.findAll({
            where: {
                marketType: "BINARY",
                status: "OPEN",
                [sequelize_1.Op.or]: [
                    { leaderOrderId: orderId, isLeaderTrade: true },
                    { followerOrderId: orderId, isLeaderTrade: false },
                ],
            },
        });
        for (const trade of trades) {
            await settleBinaryCopyTrade(trade, status, profit, closePrice);
        }
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `handleBinaryOrderSettled failed for ${orderId}`, error);
    }
}
async function settleBinaryCopyTrade(trade, status, profit, closePrice) {
    var _a;
    const stake = Number(trade.amount) || 0;
    const pnl = mapBinaryOutcomeToPnL(status, Number(profit) || 0, stake);
    const quoteCurrency = trade.profitCurrency || (0, currency_1.getQuoteCurrency)(trade.symbol);
    let leaderShare = 0;
    let platformFee = 0;
    let followerForNotify = null;
    let leaderForNotify = null;
    let sweepAmount = 0;
    let sweepUserId = null;
    const t = await db_1.sequelize.transaction();
    try {
        const locked = await db_1.models.copyTradingTrade.findOne({
            where: { id: trade.id, status: "OPEN" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!locked) {
            await t.commit();
            return false;
        }
        const lockedTrade = locked;
        await lockedTrade.update({
            status: "CLOSED",
            binaryResult: status,
            profit: pnl,
            profitPercent: stake > 0 ? (pnl / stake) * 100 : 0,
            closedAt: new Date(),
        }, { transaction: t });
        if (lockedTrade.isLeaderTrade || !lockedTrade.followerId) {
            await t.commit();
            await afterSettleSideEffects(lockedTrade, null, null, 0, 0);
            return true;
        }
        const follower = await db_1.models.copyTradingFollower.findByPk(lockedTrade.followerId, { transaction: t, lock: t.LOCK.UPDATE });
        const leader = await db_1.models.copyTradingLeader.findByPk(lockedTrade.leaderId, {
            transaction: t,
        });
        followerForNotify = follower ? follower.toJSON() : null;
        leaderForNotify = leader ? leader.toJSON() : null;
        if (status === "WIN" && pnl > 0 && follower && leader) {
            const breakdown = await (0, profitShare_1.calculateProfitShareBreakdown)(pnl, (_a = leader.profitSharePercent) !== null && _a !== void 0 ? _a : 20, quoteCurrency);
            leaderShare = breakdown.leaderShare;
            platformFee = breakdown.platformFee;
            if (leaderShare > 0) {
                await wallet_1.walletService.transfer({
                    idempotencyKey: `ct_binary_ps_${lockedTrade.id}_leader`,
                    fromUserId: follower.userId,
                    toUserId: leader.userId,
                    fromWalletType: "COPY_TRADING",
                    toWalletType: "SPOT",
                    fromCurrency: quoteCurrency,
                    toCurrency: quoteCurrency,
                    amount: leaderShare,
                    description: `Binary copy profit share for trade ${lockedTrade.id}`,
                    metadata: { tradeId: lockedTrade.id, grossProfit: pnl },
                    transaction: t,
                });
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: leader.userId,
                    leaderId: leader.id,
                    followerId: follower.id,
                    tradeId: lockedTrade.id,
                    type: "PROFIT_SHARE",
                    amount: leaderShare,
                    currency: quoteCurrency,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    description: `Profit share from copied binary trade (${lockedTrade.symbol})`,
                    metadata: { grossProfit: pnl, sharePercent: breakdown.leaderSharePercent },
                }, t);
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: follower.userId,
                    leaderId: leader.id,
                    followerId: follower.id,
                    tradeId: lockedTrade.id,
                    type: "PROFIT_SHARE",
                    amount: leaderShare,
                    currency: quoteCurrency,
                    fee: platformFee,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    description: `Profit share paid to leader (${lockedTrade.symbol})`,
                    metadata: {
                        grossProfit: pnl,
                        leaderSharePercent: breakdown.leaderSharePercent,
                        platformFeePercent: breakdown.platformFeePercent,
                    },
                }, t);
            }
            if (platformFee > 0) {
                await wallet_1.walletService.debit({
                    idempotencyKey: `ct_binary_ps_${lockedTrade.id}_fee`,
                    userId: follower.userId,
                    walletType: "COPY_TRADING",
                    currency: quoteCurrency,
                    amount: platformFee,
                    operationType: "TRADING_FEE",
                    description: `Platform fee on binary copy profit (trade ${lockedTrade.id})`,
                    metadata: { tradeId: lockedTrade.id, grossProfit: pnl },
                    transaction: t,
                });
                await (0, fees_1.collectPlatformFee)({
                    userId: follower.userId,
                    currency: quoteCurrency,
                    walletType: "SPOT",
                    feeAmount: platformFee,
                    type: "BINARY_ORDER",
                    description: `Binary copy-trading platform fee (trade ${lockedTrade.id})`,
                    referenceId: `${lockedTrade.id}_ps_fee`,
                    metadata: { tradeId: lockedTrade.id, source: "COPY_TRADING_PROFIT_SHARE" },
                    transaction: t,
                });
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: follower.userId,
                    followerId: follower.id,
                    tradeId: lockedTrade.id,
                    type: "FEE",
                    amount: platformFee,
                    currency: quoteCurrency,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    description: `Platform fee for profitable binary copy trade`,
                    metadata: { grossProfit: pnl },
                }, t);
            }
        }
        const netDelta = pnl - leaderShare - platformFee;
        const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
            where: {
                followerId: lockedTrade.followerId,
                symbol: lockedTrade.symbol,
                marketType: "BINARY",
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (allocation) {
            const a = allocation;
            const newUsed = Math.max(0, Number(a.quoteUsedAmount) - stake);
            const newAmount = Math.max(0, Number(a.quoteAmount) + netDelta);
            await a.update({ quoteUsedAmount: newUsed, quoteAmount: newAmount }, { transaction: t });
            const followerStopped = follower && follower.status === "STOPPED";
            sweepUserId = follower ? follower.userId : null;
            if ((!a.isActive || followerStopped) && sweepUserId) {
                const ctWallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: sweepUserId,
                        currency: quoteCurrency,
                        type: "COPY_TRADING",
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                const freeBalance = ctWallet
                    ? parseFloat(ctWallet.balance.toString())
                    : 0;
                const ideal = Math.max(0, stake + netDelta);
                sweepAmount = Math.floor(Math.min(ideal, freeBalance) * 1e6) / 1e6;
                if (sweepAmount > 0) {
                    await wallet_1.walletService.transfer({
                        idempotencyKey: `ct_binary_sweep_${lockedTrade.id}`,
                        fromUserId: sweepUserId,
                        toUserId: sweepUserId,
                        fromWalletType: "COPY_TRADING",
                        toWalletType: "SPOT",
                        fromCurrency: quoteCurrency,
                        toCurrency: quoteCurrency,
                        amount: sweepAmount,
                        description: `Return settled binary copy funds after unfollow (trade ${lockedTrade.id})`,
                        metadata: { tradeId: lockedTrade.id },
                        transaction: t,
                    });
                    await a.update({ quoteAmount: Math.max(0, newAmount - sweepAmount) }, { transaction: t });
                    await (0, settings_core_1.createCopyTradingTransaction)({
                        userId: sweepUserId,
                        followerId: lockedTrade.followerId,
                        leaderId: lockedTrade.leaderId,
                        tradeId: lockedTrade.id,
                        type: "DEALLOCATION",
                        amount: sweepAmount,
                        currency: quoteCurrency,
                        balanceBefore: 0,
                        balanceAfter: 0,
                        description: `Swept settled binary copy proceeds back to SPOT wallet`,
                    }, t);
                }
            }
        }
        await (0, settings_core_1.createCopyTradingTransaction)({
            userId: follower ? follower.userId : lockedTrade.followerId,
            followerId: lockedTrade.followerId,
            leaderId: lockedTrade.leaderId,
            tradeId: lockedTrade.id,
            type: pnl >= 0 ? "TRADE_PROFIT" : "TRADE_LOSS",
            amount: Math.abs(pnl),
            currency: quoteCurrency,
            balanceBefore: 0,
            balanceAfter: 0,
            description: `Binary copy trade ${status} on ${lockedTrade.symbol} (stake ${stake} ${quoteCurrency})`,
            metadata: { result: status, stake, closePrice },
        }, t);
        await t.commit();
        if (pnl < 0) {
            await (0, dailyLimits_1.recordLoss)(lockedTrade.followerId, Math.abs(pnl), quoteCurrency);
        }
        await afterSettleSideEffects(lockedTrade, followerForNotify, leaderForNotify, pnl, leaderShare);
        return true;
    }
    catch (error) {
        try {
            await t.rollback();
        }
        catch (_b) {
        }
        console_1.logger.error("COPY_TRADING", `settleBinaryCopyTrade failed for trade ${trade.id}: ${error.message}`);
        return false;
    }
}
async function afterSettleSideEffects(trade, follower, leader, pnl, leaderShare) {
    try {
        const { invalidateTradeRelatedCaches } = await Promise.resolve().then(() => __importStar(require("./stats-calculator")));
        await invalidateTradeRelatedCaches(trade.leaderId, trade.followerId || undefined, trade.symbol);
    }
    catch (_a) {
    }
    try {
        const { broadcastTradeUpdate } = await Promise.resolve().then(() => __importStar(require("../index.ws")));
        broadcastTradeUpdate(trade, "closed");
    }
    catch (_b) {
    }
    if (follower && trade.followerId) {
        try {
            const { notifyFollowerTradeEvent, notifyProfitShareEvent } = await Promise.resolve().then(() => __importStar(require("./notifications")));
            await notifyFollowerTradeEvent(trade.followerId, trade.id, pnl >= 0 ? (pnl > 0 ? "PROFIT" : "CLOSED") : "LOSS", { symbol: trade.symbol, profit: pnl });
            if (leaderShare > 0 && leader) {
                await notifyProfitShareEvent(leader.userId, "EARNED", {
                    amount: leaderShare,
                });
            }
        }
        catch (_c) {
        }
    }
}
async function handleBinaryOrderCanceled(orderId, userId, refundAmount) {
    var _a, _b, _c, _d;
    try {
        const leaderTrade = await db_1.models.copyTradingTrade.findOne({
            where: {
                leaderOrderId: orderId,
                isLeaderTrade: true,
                marketType: "BINARY",
                status: "OPEN",
            },
        });
        if (leaderTrade) {
            await leaderTrade.update({ status: "CANCELLED", closedAt: new Date() });
            const followerTrades = await db_1.models.copyTradingTrade.findAll({
                where: {
                    leaderOrderId: orderId,
                    isLeaderTrade: false,
                    marketType: "BINARY",
                    status: "OPEN",
                },
                include: [{ model: db_1.models.copyTradingFollower, as: "follower" }],
            });
            const { BinaryOrderService } = await Promise.resolve().then(() => __importStar(require("@b/api/exchange/binary/order/util/BinaryOrderService")));
            for (const ft of followerTrades) {
                const followerUserId = (_a = ft.follower) === null || _a === void 0 ? void 0 : _a.userId;
                if (!followerUserId || !ft.followerOrderId)
                    continue;
                try {
                    await BinaryOrderService.cancelOrder(followerUserId, ft.followerOrderId);
                }
                catch (cancelError) {
                    console_1.logger.warn("COPY_TRADING", `Could not cancel follower binary order ${ft.followerOrderId}: ${cancelError.message}`);
                }
            }
            await (0, settings_core_1.createAuditLog)({
                entityType: "copyTradingTrade",
                entityId: leaderTrade.id,
                action: "BINARY_TRADE_CANCELLED",
                userId,
                metadata: { orderId, followers: followerTrades.length },
            });
            return;
        }
        const followerTrade = await db_1.models.copyTradingTrade.findOne({
            where: {
                followerOrderId: orderId,
                isLeaderTrade: false,
                marketType: "BINARY",
                status: "OPEN",
            },
            include: [{ model: db_1.models.copyTradingFollower, as: "follower" }],
        });
        if (!followerTrade)
            return;
        const ft = followerTrade;
        const stake = Number(ft.amount) || 0;
        const refunded = refundAmount !== undefined ? Math.max(0, refundAmount) : stake;
        const penalty = Math.max(0, stake - refunded);
        const quoteCurrency = ft.profitCurrency || (0, currency_1.getQuoteCurrency)(ft.symbol);
        const t = await db_1.sequelize.transaction();
        let sweepAmount = 0;
        try {
            const locked = await db_1.models.copyTradingTrade.findOne({
                where: { id: ft.id, status: "OPEN" },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!locked) {
                await t.commit();
                return;
            }
            await locked.update({
                status: "CANCELLED",
                binaryResult: null,
                profit: penalty > 0 ? -penalty : 0,
                profitPercent: stake > 0 && penalty > 0 ? (-penalty / stake) * 100 : 0,
                closedAt: new Date(),
            }, { transaction: t });
            const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                where: {
                    followerId: ft.followerId,
                    symbol: ft.symbol,
                    marketType: "BINARY",
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (allocation) {
                const a = allocation;
                const newUsed = Math.max(0, Number(a.quoteUsedAmount) - stake);
                const newAmount = Math.max(0, Number(a.quoteAmount) - penalty);
                await a.update({ quoteUsedAmount: newUsed, quoteAmount: newAmount }, { transaction: t });
                const followerStopped = ((_b = ft.follower) === null || _b === void 0 ? void 0 : _b.status) === "STOPPED";
                const sweepUserId = (_c = ft.follower) === null || _c === void 0 ? void 0 : _c.userId;
                if ((!a.isActive || followerStopped) && sweepUserId) {
                    const ctWallet = await db_1.models.wallet.findOne({
                        where: {
                            userId: sweepUserId,
                            currency: quoteCurrency,
                            type: "COPY_TRADING",
                        },
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });
                    const freeBalance = ctWallet
                        ? parseFloat(ctWallet.balance.toString())
                        : 0;
                    sweepAmount = Math.floor(Math.min(refunded, freeBalance) * 1e6) / 1e6;
                    if (sweepAmount > 0) {
                        await wallet_1.walletService.transfer({
                            idempotencyKey: `ct_binary_sweep_${ft.id}`,
                            fromUserId: sweepUserId,
                            toUserId: sweepUserId,
                            fromWalletType: "COPY_TRADING",
                            toWalletType: "SPOT",
                            fromCurrency: quoteCurrency,
                            toCurrency: quoteCurrency,
                            amount: sweepAmount,
                            description: `Return cancelled binary copy funds after unfollow (trade ${ft.id})`,
                            metadata: { tradeId: ft.id },
                            transaction: t,
                        });
                        await a.update({ quoteAmount: Math.max(0, newAmount - sweepAmount) }, { transaction: t });
                        await (0, settings_core_1.createCopyTradingTransaction)({
                            userId: sweepUserId,
                            followerId: ft.followerId,
                            leaderId: ft.leaderId,
                            tradeId: ft.id,
                            type: "DEALLOCATION",
                            amount: sweepAmount,
                            currency: quoteCurrency,
                            balanceBefore: 0,
                            balanceAfter: 0,
                            description: `Swept cancelled binary copy funds back to SPOT wallet`,
                        }, t);
                    }
                }
            }
            if (penalty > 0) {
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: ((_d = ft.follower) === null || _d === void 0 ? void 0 : _d.userId) || ft.followerId,
                    followerId: ft.followerId,
                    leaderId: ft.leaderId,
                    tradeId: ft.id,
                    type: "TRADE_LOSS",
                    amount: penalty,
                    currency: quoteCurrency,
                    balanceBefore: 0,
                    balanceAfter: 0,
                    description: `Binary copy cancel penalty on ${ft.symbol}`,
                    metadata: { orderId, refunded, penalty },
                }, t);
            }
            await t.commit();
        }
        catch (txError) {
            try {
                await t.rollback();
            }
            catch (_e) {
            }
            console_1.logger.error("COPY_TRADING", `Binary cancel bookkeeping failed for trade ${ft.id}: ${txError.message}`);
            return;
        }
        await afterSettleSideEffects(ft, ft.follower || null, null, penalty > 0 ? -penalty : 0, 0);
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `handleBinaryOrderCanceled failed for ${orderId}`, error);
    }
}
async function processPendingBinaryCopies() {
    const availability = await (0, settings_core_1.checkCopyTypeAvailability)("BINARY");
    if (!availability.available)
        return { processed: 0 };
    const leaders = await db_1.models.copyTradingLeader.findAll({
        where: {
            status: "ACTIVE",
            tradingType: { [sequelize_1.Op.in]: ["BINARY", "BOTH"] },
        },
        attributes: ["id", "userId"],
    });
    if (leaders.length === 0)
        return { processed: 0 };
    const userIds = leaders.map((l) => l.userId);
    const now = Date.now();
    const orders = await db_1.models.binaryOrder.findAll({
        where: {
            userId: { [sequelize_1.Op.in]: userIds },
            isDemo: false,
            status: "PENDING",
            createdAt: {
                [sequelize_1.Op.gte]: new Date(now - MAX_COPY_STALENESS_MS),
                [sequelize_1.Op.lte]: new Date(now - BACKSTOP_MIN_AGE_MS),
            },
            closedAt: { [sequelize_1.Op.gt]: new Date(now + MIN_TIME_TO_EXPIRY_MS) },
            [sequelize_1.Op.and]: [
                (0, sequelize_1.literal)("JSON_EXTRACT(`binaryOrder`.`metadata`, '$.copiedFromOrderId') IS NULL"),
            ],
        },
        order: [["createdAt", "ASC"]],
    });
    let processed = 0;
    for (const order of orders) {
        const result = await handleBinaryOrderCreated({
            orderId: order.id,
            userId: order.userId,
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            amount: Number(order.amount),
            price: Number(order.price),
            closedAt: order.closedAt,
            createdAt: order.createdAt,
            durationType: order.durationType,
            barrier: order.barrier != null ? Number(order.barrier) : undefined,
            strikePrice: order.strikePrice != null ? Number(order.strikePrice) : undefined,
            payoutPerPoint: order.payoutPerPoint != null ? Number(order.payoutPerPoint) : undefined,
            profitPercentage: order.profitPercentage != null ? Number(order.profitPercentage) : undefined,
            isDemo: order.isDemo,
        });
        if (result.success && (result.followersProcessed || 0) > 0)
            processed++;
    }
    return { processed };
}
async function reconcileBinaryCopyTrades() {
    var _a;
    const cutoff = new Date(Date.now() - 2 * 60 * 1000);
    let reconciled = 0;
    const staleClaimCutoff = new Date(Date.now() - MAX_COPY_STALENESS_MS - 60000);
    const staleClaims = await db_1.models.copyTradingTrade.findAll({
        where: {
            marketType: "BINARY",
            status: "PENDING",
            isLeaderTrade: false,
            followerOrderId: null,
            createdAt: { [sequelize_1.Op.lt]: staleClaimCutoff },
        },
        include: [
            { model: db_1.models.copyTradingFollower, as: "follower", attributes: ["userId"] },
        ],
        limit: 200,
    });
    for (const claim of staleClaims) {
        const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
            where: {
                followerId: claim.followerId,
                symbol: claim.symbol,
                marketType: "BINARY",
            },
        });
        const followerUserId = (_a = claim.follower) === null || _a === void 0 ? void 0 : _a.userId;
        let placedOrder = null;
        if (followerUserId) {
            try {
                placedOrder = await db_1.models.binaryOrder.findOne({
                    where: {
                        userId: followerUserId,
                        metadata: {
                            idempotencyKey: `ct_binary_${claim.leaderOrderId}_${claim.followerId}`,
                        },
                    },
                });
            }
            catch (_b) {
            }
        }
        if (placedOrder) {
            const adoptTx = await db_1.sequelize.transaction();
            try {
                const lockedClaim = await db_1.models.copyTradingTrade.findOne({
                    where: { id: claim.id, status: "PENDING" },
                    transaction: adoptTx,
                    lock: adoptTx.LOCK.UPDATE,
                });
                if (!lockedClaim) {
                    await adoptTx.commit();
                    continue;
                }
                const placedStake = Number(placedOrder.amount) || Number(claim.amount) || 0;
                const stakeDelta = placedStake - (Number(claim.amount) || 0);
                if (stakeDelta !== 0 && allocation) {
                    const lockedAllocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                        where: { id: allocation.id },
                        transaction: adoptTx,
                        lock: adoptTx.LOCK.UPDATE,
                    });
                    if (lockedAllocation) {
                        const a = lockedAllocation;
                        await a.update({
                            quoteUsedAmount: Math.max(0, Number(a.quoteUsedAmount) + stakeDelta),
                        }, { transaction: adoptTx });
                    }
                }
                await lockedClaim.update({
                    followerOrderId: placedOrder.id,
                    status: "OPEN",
                    amount: placedStake,
                    cost: placedStake,
                    price: Number(placedOrder.price) || claim.price,
                    executedAmount: placedStake,
                    executedPrice: Number(placedOrder.price) || claim.price,
                }, { transaction: adoptTx });
                await adoptTx.commit();
                console_1.logger.warn("COPY_TRADING", `Adopted orphaned binary copy order ${placedOrder.id} into claim ${claim.id}`);
                reconciled++;
            }
            catch (adoptError) {
                try {
                    await adoptTx.rollback();
                }
                catch (_c) {
                }
                console_1.logger.error("COPY_TRADING", `Failed to adopt binary order ${placedOrder.id} into claim ${claim.id}: ${adoptError.message}`);
            }
            continue;
        }
        await releaseBinaryClaim(claim.id, allocation ? allocation.id : null, Number(claim.amount) || 0, "Copy never placed (stale claim released by reconciler)");
        reconciled++;
    }
    const openTrades = await db_1.models.copyTradingTrade.findAll({
        where: {
            marketType: "BINARY",
            status: "OPEN",
            [sequelize_1.Op.or]: [
                { expiresAt: { [sequelize_1.Op.lt]: cutoff } },
                { expiresAt: null, createdAt: { [sequelize_1.Op.lt]: cutoff } },
            ],
        },
        limit: 200,
    });
    for (const trade of openTrades) {
        const orderId = trade.isLeaderTrade ? trade.leaderOrderId : trade.followerOrderId;
        if (!orderId)
            continue;
        const order = await db_1.models.binaryOrder.findOne({ where: { id: orderId } });
        if (!order) {
            await trade.update({
                status: "FAILED",
                errorMessage: "Underlying binary order not found",
                closedAt: new Date(),
            });
            if (!trade.isLeaderTrade) {
                const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
                    where: {
                        followerId: trade.followerId,
                        symbol: trade.symbol,
                        marketType: "BINARY",
                    },
                });
                if (allocation) {
                    const a = allocation;
                    await a.update({
                        quoteUsedAmount: (0, sequelize_1.literal)(`GREATEST(0, quoteUsedAmount - ${Number(trade.amount) || 0})`),
                    });
                }
            }
            reconciled++;
            continue;
        }
        const o = order;
        if (["WIN", "LOSS", "DRAW"].includes(o.status)) {
            const ok = await settleBinaryCopyTrade(trade, o.status, Number(o.profit) || 0, o.closePrice != null ? Number(o.closePrice) : undefined);
            if (ok)
                reconciled++;
        }
        else if (o.status === "CANCELED") {
            let refund = undefined;
            try {
                const rawMeta = o.metadata;
                const meta = typeof rawMeta === "string" ? JSON.parse(rawMeta) : rawMeta || {};
                if ((meta === null || meta === void 0 ? void 0 : meta.refundedAmount) != null)
                    refund = Number(meta.refundedAmount);
            }
            catch (_d) {
            }
            await handleBinaryOrderCanceled(o.id, o.userId, refund);
            reconciled++;
        }
    }
    return { reconciled };
}
