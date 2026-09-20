"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const crypto_1 = require("crypto");
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const tvl_1 = require("../../utils/helpers/tvl");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const poolWallet_1 = require("../../utils/helpers/poolWallet");
const liveConfig_1 = require("../../utils/helpers/liveConfig");
const wallet_1 = require("@b/services/wallet");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const pool_account_1 = require("../../utils/venue/pool-account");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Withdraw liquidity from AI Market Maker pool",
    operationId: "withdrawFromMarketMakerPool",
    tags: ["Admin", "AI Market Maker", "Pool"],
    description: "Withdraws liquidity from an AI Market Maker pool back to the admin\'s wallet. The withdrawal can be in either base or quote currency. Can only be performed when the market maker is paused or stopped. Updates pool balance and TVL accordingly.",
    logModule: "ADMIN_MM",
    logTitle: "Withdraw from Market Maker Pool",
    parameters: [
        {
            index: 0,
            name: "marketId",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.poolWithdrawSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Pool withdrawal completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.aiMarketMakerPoolSchema,
                            wallet: {
                                type: "object",
                                properties: {
                                    currency: {
                                        type: "string",
                                        description: "Currency symbol",
                                    },
                                    balanceAfter: {
                                        type: "number",
                                        description: "Admin wallet balance after withdrawal",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Pool"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market_maker.pool",
};
exports.default = async (data) => {
    var _a;
    const { params, body, user, ctx } = data;
    const { currency, amount } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw (0, error_1.createError)(400, "Amount must be greater than 0");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker with pool and market info");
    const marketMaker = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
            ...(0, market_resolver_1.makerMarketIncludes)(),
        ],
    }));
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const pool = marketMaker.pool;
    if (!pool) {
        throw (0, error_1.createError)(404, "Pool not found for this market maker");
    }
    const market = marketMaker.market;
    if (!market) {
        throw (0, error_1.createError)(404, "Market not found for this market maker");
    }
    const venue = (0, market_resolver_1.normaliseVenue)(marketMaker.marketType);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate market maker is not active");
    if (marketMaker.status === "ACTIVE") {
        throw (0, error_1.createError)(400, "Cannot withdraw from active market maker. Please pause or stop it first.");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate pool balance");
    const currentPoolBalance = currency === "BASE"
        ? Number(pool.baseCurrencyBalance)
        : Number(pool.quoteCurrencyBalance);
    if (numericAmount > currentPoolBalance) {
        throw (0, error_1.createError)(400, `Insufficient pool balance. Available: ${currentPoolBalance}, Requested: ${numericAmount}`);
    }
    const currencySymbol = currency === "BASE" ? market.currency : market.pair;
    if (venue === "FUTURES") {
        const free = await (0, pool_account_1.poolFuturesFreeBalance)(currencySymbol);
        if (numericAmount > free) {
            throw (0, error_1.createError)(400, `Only ${free} ${currencySymbol} is free to withdraw. The rest is posted as margin ` +
                `behind an open position or a resting order — close them to release it.`);
        }
    }
    const adminWallet = venue === "FUTURES"
        ? await (0, pool_account_1.getFuturesPoolSourceWallet)(user.id, currencySymbol, { createIfMissing: true })
        : await (0, poolWallet_1.getPoolAdminWallet)(user.id, currencySymbol, { createIfMissing: true });
    if (!adminWallet) {
        throw (0, error_1.createError)(404, `Wallet not found for ${currencySymbol}`);
    }
    const requestToken = typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : (0, crypto_1.randomUUID)();
    const ledgerKey = `admin_ai_mm_pool_withdraw_${pool.id}_${currency}_${requestToken}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Execute withdrawal transaction");
    const result = await db_1.sequelize.transaction(async (transaction) => {
        const locked = await db_1.models.aiMarketMakerPool.findByPk(pool.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!locked)
            throw (0, error_1.createError)(404, "Pool not found");
        const lockedPoolBalance = currency === "BASE"
            ? Number(locked.baseCurrencyBalance)
            : Number(locked.quoteCurrencyBalance);
        if (numericAmount > lockedPoolBalance) {
            throw (0, error_1.createError)(400, `Insufficient pool balance. Available: ${lockedPoolBalance}, Requested: ${numericAmount}`);
        }
        const updateData = {};
        let balanceField;
        if (currency === "BASE") {
            balanceField = "baseCurrencyBalance";
            updateData.baseCurrencyBalance = lockedPoolBalance - numericAmount;
            updateData.initialBaseBalance = Math.max(0, Number(locked.initialBaseBalance) - numericAmount);
        }
        else {
            balanceField = "quoteCurrencyBalance";
            updateData.quoteCurrencyBalance = lockedPoolBalance - numericAmount;
            updateData.initialQuoteBalance = Math.max(0, Number(locked.initialQuoteBalance) - numericAmount);
        }
        const baseBalance = currency === "BASE"
            ? updateData.baseCurrencyBalance
            : Number(locked.baseCurrencyBalance) || 0;
        const quoteBalance = currency === "QUOTE"
            ? updateData.quoteCurrencyBalance
            : Number(locked.quoteCurrencyBalance) || 0;
        const targetPrice = Number(marketMaker.targetPrice) || 0;
        updateData.totalValueLocked = (0, tvl_1.calculateTVL)({
            baseBalance,
            quoteBalance,
            currentPrice: targetPrice,
        });
        if (venue === "FUTURES") {
            const poolWallet = await (0, pool_account_1.getPoolFuturesWallet)(currencySymbol);
            if (!poolWallet) {
                throw (0, error_1.createError)(404, `The market maker holds no ${currencySymbol} futures wallet`);
            }
            const [affected] = await db_1.models.wallet.decrement("balance", {
                by: numericAmount,
                where: {
                    id: poolWallet.id,
                    balance: { [sequelize_1.Op.gte]: numericAmount },
                },
                transaction,
            });
            const changed = Array.isArray(affected) ? affected.length : Number(affected !== null && affected !== void 0 ? affected : 0);
            if (!changed) {
                throw (0, error_1.createError)(400, `The market maker's ${currencySymbol} futures wallet no longer holds ${numericAmount}. ` +
                    `A fill or a margin hold took it between the check and the payout — try again.`);
            }
        }
        await locked.update(updateData, { transaction });
        const creditResult = await wallet_1.walletService.credit({
            idempotencyKey: ledgerKey,
            userId: user.id,
            walletId: adminWallet.id,
            walletType: adminWallet.type,
            currency: currencySymbol,
            amount: numericAmount,
            operationType: "AI_INVESTMENT_ROI",
            description: `Withdraw ${numericAmount} ${currencySymbol} from AI Market Maker Pool`,
            metadata: {
                poolId: pool.id,
                marketMakerId: marketMaker.id,
                marketSymbol: market.symbol,
                currencyType: currency,
                action: "WITHDRAW",
            },
            transaction,
        });
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: marketMaker.id,
            action: "WITHDRAW",
            details: {
                currency: currencySymbol,
                withdrawAmount: numericAmount,
                balanceBefore: lockedPoolBalance,
                balanceAfter: updateData[balanceField],
                triggeredBy: "ADMIN",
                adminId: user.id,
                note: `Withdraw ${numericAmount} ${currencySymbol} from pool`,
            },
            priceAtAction: marketMaker.targetPrice,
            poolValueAtAction: updateData.totalValueLocked,
        }, { transaction });
        return {
            pool: await db_1.models.aiMarketMakerPool.findByPk(pool.id, { transaction }),
            walletBalance: creditResult.newBalance,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdrawal completed successfully");
    await (0, liveConfig_1.applyConfigToRunningEngine)(marketMaker.id);
    return {
        ...(_a = result.pool) === null || _a === void 0 ? void 0 : _a.toJSON(),
        wallet: {
            currency: currencySymbol,
            balanceAfter: result.walletBalance,
        },
    };
};
