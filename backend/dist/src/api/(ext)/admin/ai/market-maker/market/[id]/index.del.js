"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const queries_1 = require("../../utils/scylla/queries");
const poolWallet_1 = require("../../utils/helpers/poolWallet");
const MarketMakerEngine_1 = __importDefault(require("../../utils/engine/MarketMakerEngine"));
const wallet_1 = require("@b/services/wallet");
const transaction_1 = require("@b/utils/transaction");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const futures_orders_1 = require("../../utils/venue/futures-orders");
const pool_account_1 = require("../../utils/venue/pool-account");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Delete AI Market Maker market",
    operationId: "deleteAiMarketMakerMarket",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Permanently deletes an AI Market Maker market. Automatically stops the market if active, cancels all open ecosystem orders, withdraws remaining pool balances to admin wallet, cleans up all ScyllaDB and MySQL data including trade history, and creates withdrawal transaction records. This operation cannot be undone.",
    logModule: "ADMIN_MM",
    logTitle: "Delete AI Market Maker",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker to delete",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "AI Market Maker deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            withdrawal: {
                                type: "object",
                                properties: {
                                    baseAmount: { type: "number" },
                                    quoteAmount: { type: "number" },
                                    baseCurrency: { type: "string" },
                                    quoteCurrency: { type: "string" },
                                },
                            },
                            cleanup: {
                                type: "object",
                                properties: {
                                    ordersDeleted: { type: "number" },
                                    tradesDeleted: { type: "number" },
                                    priceHistoryDeleted: { type: "number" },
                                    realLiquidityOrdersDeleted: { type: "number" },
                                    orderbookEntriesCleared: { type: "number" },
                                    ecosystemOrdersCancelled: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.ai.market_maker.market",
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker with related data");
    const marketMaker = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            { model: db_1.models.aiBot, as: "bots" },
            ...(0, market_resolver_1.makerMarketIncludes)(),
        ],
    }));
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const marketMakerAny = marketMaker;
    const pool = marketMakerAny.pool;
    const market = marketMakerAny.market;
    const symbol = market ? `${market.currency}/${market.pair}` : null;
    const ecosystemMarketId = marketMakerAny.marketId;
    const venue = (0, market_resolver_1.normaliseVenue)(marketMakerAny.marketType);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Stop market maker if active");
    if (marketMaker.status === "ACTIVE" || marketMaker.status === "PAUSED") {
        const engine = MarketMakerEngine_1.default;
        const marketManager = engine.getMarketManager();
        if (marketManager && marketManager.isMarketActive(params.id)) {
            console_1.logger.info("AI_MM", `Delete: Stopping market maker ${params.id} through engine...`);
            const stopped = await marketManager.stopMarket(params.id);
            if (!stopped) {
                console_1.logger.warn("AI_MM", `Delete: Engine stopMarket returned false, forcing stop...`);
            }
            const maxWaitMs = 10000;
            const startTime = Date.now();
            while (Date.now() - startTime < maxWaitMs) {
                const status = marketManager.getMarketStatus(params.id);
                if (!status || status === "STOPPED") {
                    console_1.logger.info("AI_MM", `Delete: Engine confirmed market stopped`);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        await marketMaker.update({ status: "STOPPED" });
        console_1.logger.info("AI_MM", `Delete: Stopped market maker ${params.id}`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancel open ecosystem orders");
    let ecosystemOrdersCancelled = 0;
    let failedCancellations = [];
    let totalOrdersFound = 0;
    if (symbol) {
        try {
            const outcome = venue === "FUTURES"
                ? await (0, futures_orders_1.cancelAllPoolOrders)(symbol)
                : await (0, queries_1.cancelOpenBotEcosystemOrders)(symbol);
            totalOrdersFound = outcome.found;
            ecosystemOrdersCancelled = outcome.cancelled;
            failedCancellations = outcome.failed;
            console_1.logger.info("AI_MM", `Delete: Cancelled ${ecosystemOrdersCancelled}/${totalOrdersFound} orders for ${symbol}`);
            if (failedCancellations.length > 0) {
                console_1.logger.warn("AI_MM", `Delete: Failed to cancel ${failedCancellations.length} orders: ${failedCancellations.map((f) => f.orderId).join(", ")}`);
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Delete: Failed to cancel orders: ${error}`);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Auto-withdraw pool balances to admin wallet");
    let withdrawal = {
        baseAmount: 0,
        quoteAmount: 0,
        baseCurrency: (market === null || market === void 0 ? void 0 : market.currency) || "UNKNOWN",
        quoteCurrency: (market === null || market === void 0 ? void 0 : market.pair) || "UNKNOWN",
    };
    if (pool && market) {
        try {
            const snapshotBase = Number(pool.baseCurrencyBalance) || 0;
            const snapshotQuote = Number(pool.quoteCurrencyBalance) || 0;
            const baseWallet = snapshotBase > 0 && venue !== "FUTURES"
                ? await (0, poolWallet_1.getPoolAdminWallet)(user.id, market.currency, { createIfMissing: true })
                : null;
            const quoteWallet = snapshotQuote > 0
                ? venue === "FUTURES"
                    ? await (0, pool_account_1.getFuturesPoolSourceWallet)(user.id, market.pair, {
                        createIfMissing: true,
                    })
                    : await (0, poolWallet_1.getPoolAdminWallet)(user.id, market.pair, { createIfMissing: true })
                : null;
            await db_1.sequelize.transaction(async (t) => {
                const locked = await db_1.models.aiMarketMakerPool.findByPk(pool.id, {
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!locked)
                    return;
                const baseBalance = Number(locked.baseCurrencyBalance) || 0;
                const quoteBalance = Number(locked.quoteCurrencyBalance) || 0;
                if (baseBalance > 0) {
                    if (!baseWallet) {
                        throw (0, error_1.createError)(400, `The pool holds ${baseBalance} ${market.currency} but no admin wallet was resolved for it. Retry the delete, or withdraw the balance first.`);
                    }
                    await wallet_1.walletService.credit({
                        idempotencyKey: `admin_ai_mm_delete_withdraw_base_${marketMaker.id}`,
                        userId: user.id,
                        walletId: baseWallet.id,
                        walletType: baseWallet.type,
                        currency: market.currency,
                        amount: baseBalance,
                        operationType: "AI_INVESTMENT_ROI",
                        description: `Auto-withdraw ${baseBalance} ${market.currency} from deleted AI Market Maker Pool`,
                        metadata: {
                            poolId: pool === null || pool === void 0 ? void 0 : pool.id,
                            marketMakerId: marketMaker.id,
                            marketSymbol: symbol,
                            action: "DELETE_WITHDRAW",
                        },
                        transaction: t,
                    });
                    withdrawal.baseAmount = baseBalance;
                }
                if (quoteBalance > 0) {
                    if (!quoteWallet) {
                        throw (0, error_1.createError)(400, `The pool holds ${quoteBalance} ${market.pair} but no admin wallet was resolved for it. Retry the delete, or withdraw the balance first.`);
                    }
                    if (venue === "FUTURES") {
                        const poolWallet = await (0, pool_account_1.getPoolFuturesWallet)(market.pair);
                        if (!poolWallet) {
                            throw (0, error_1.createError)(400, `The pool records ${quoteBalance} ${market.pair} but the market maker holds no ${market.pair} futures wallet. Withdraw the balance manually before deleting.`);
                        }
                        const [affected] = await db_1.models.wallet.decrement("balance", {
                            by: quoteBalance,
                            where: {
                                id: poolWallet.id,
                                balance: { [sequelize_1.Op.gte]: quoteBalance },
                            },
                            transaction: t,
                        });
                        const changed = Array.isArray(affected)
                            ? affected.length
                            : Number(affected !== null && affected !== void 0 ? affected : 0);
                        if (!changed) {
                            throw (0, error_1.createError)(400, `The market maker's ${market.pair} futures wallet no longer holds ${quoteBalance} — margin is posted behind an open position or a resting order. Pause the market, let its exits unwind, then delete.`);
                        }
                    }
                    await wallet_1.walletService.credit({
                        idempotencyKey: `admin_ai_mm_delete_withdraw_quote_${marketMaker.id}`,
                        userId: user.id,
                        walletId: quoteWallet.id,
                        walletType: quoteWallet.type,
                        currency: market.pair,
                        amount: quoteBalance,
                        operationType: "AI_INVESTMENT_ROI",
                        description: `Auto-withdraw ${quoteBalance} ${market.pair} from deleted AI Market Maker Pool`,
                        metadata: {
                            poolId: pool === null || pool === void 0 ? void 0 : pool.id,
                            marketMakerId: marketMaker.id,
                            marketSymbol: symbol,
                            action: "DELETE_WITHDRAW",
                        },
                        transaction: t,
                    });
                    withdrawal.quoteAmount = quoteBalance;
                }
                if (baseBalance > 0 || quoteBalance > 0) {
                    await locked.update({
                        baseCurrencyBalance: 0,
                        quoteCurrencyBalance: 0,
                        totalValueLocked: 0,
                    }, { transaction: t });
                }
            });
            if (withdrawal.baseAmount > 0) {
                console_1.logger.info("AI_MM", `Delete: Withdrawn ${withdrawal.baseAmount} ${market.currency} to admin wallet`);
            }
            if (withdrawal.quoteAmount > 0) {
                console_1.logger.info("AI_MM", `Delete: Withdrawn ${withdrawal.quoteAmount} ${market.pair} to admin wallet`);
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Delete: pool payout failed, market maker left intact: ${error}`);
            throw error;
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clean up ScyllaDB data");
    let cleanupStats = {
        ordersDeleted: 0,
        tradesDeleted: 0,
        priceHistoryDeleted: 0,
        realLiquidityOrdersDeleted: 0,
        orderbookEntriesCleared: 0,
    };
    if (ecosystemMarketId && symbol) {
        try {
            cleanupStats = await (0, queries_1.cleanupMarketMakerData)(ecosystemMarketId, symbol, venue);
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Delete: ScyllaDB cleanup failed: ${error}`);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clean up MySQL data");
    const transaction = await db_1.sequelize.transaction();
    try {
        await db_1.models.aiBot.destroy({
            where: { marketMakerId: marketMaker.id },
            transaction,
        });
        await db_1.models.aiMarketMakerPool.destroy({
            where: { marketMakerId: marketMaker.id },
            transaction,
        });
        await db_1.models.aiMarketMakerHistory.destroy({
            where: { marketMakerId: marketMaker.id },
            transaction,
        });
        await marketMaker.destroy({ transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("AI Market Maker deleted successfully");
        return {
            message: "AI Market Maker deleted successfully",
            withdrawal: {
                baseAmount: withdrawal.baseAmount,
                quoteAmount: withdrawal.quoteAmount,
                baseCurrency: withdrawal.baseCurrency,
                quoteCurrency: withdrawal.quoteCurrency,
            },
            cleanup: {
                ...cleanupStats,
                ecosystemOrdersCancelled,
                totalOrdersFound,
                failedCancellations: failedCancellations.length > 0 ? failedCancellations : undefined,
            },
        };
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(transaction);
        throw error;
    }
};
