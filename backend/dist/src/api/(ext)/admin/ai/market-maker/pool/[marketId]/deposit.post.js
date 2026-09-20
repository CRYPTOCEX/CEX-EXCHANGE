"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const crypto_1 = require("crypto");
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const poolWallet_1 = require("../../utils/helpers/poolWallet");
const liveConfig_1 = require("../../utils/helpers/liveConfig");
const tvl_1 = require("../../utils/helpers/tvl");
const wallet_1 = require("@b/services/wallet");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const pool_account_1 = require("../../utils/venue/pool-account");
exports.metadata = {
    summary: "Deposit liquidity into AI Market Maker pool",
    operationId: "depositToMarketMakerPool",
    tags: ["Admin", "AI Market Maker", "Pool"],
    description: "Deposits liquidity from the admin\'s wallet into an AI Market Maker pool. The deposit can be in either base or quote currency, and will update the pool\'s balance and TVL accordingly. A transaction record is created for auditing purposes.",
    logModule: "ADMIN_MM",
    logTitle: "Deposit to Market Maker Pool",
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
                schema: utils_1.poolDepositSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Pool deposit completed successfully",
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
                                        description: "Admin wallet balance after deposit",
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
    if (venue === "FUTURES" && currency === "BASE") {
        throw (0, error_1.createError)(400, `A futures market maker posts margin in ${market.pair} only. Deposit QUOTE instead — ` +
            `there is no ${market.currency} balance for it to hold.`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate admin wallet and balance");
    const currencySymbol = currency === "BASE" ? market.currency : market.pair;
    const adminWallet = venue === "FUTURES"
        ? await (0, pool_account_1.getFuturesPoolSourceWallet)(user.id, currencySymbol, { createIfMissing: true })
        : await (0, poolWallet_1.getPoolAdminWallet)(user.id, currencySymbol, { createIfMissing: true });
    if (!adminWallet) {
        throw (0, error_1.createError)(404, `Wallet not found for ${currencySymbol}`);
    }
    const walletBalance = (() => {
        if (adminWallet.balance === null || adminWallet.balance === undefined) {
            return 0;
        }
        const parsed = parseFloat(String(adminWallet.balance));
        return isNaN(parsed) ? 0 : parsed;
    })();
    if (walletBalance < numericAmount) {
        throw (0, error_1.createError)(400, `Insufficient balance. You have ${walletBalance.toFixed(8)} ${currencySymbol}, but trying to deposit ${numericAmount} ${currencySymbol}`);
    }
    const requestToken = typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : (0, crypto_1.randomUUID)();
    const ledgerKey = `admin_ai_mm_pool_deposit_${pool.id}_${currency}_${requestToken}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Execute deposit transaction");
    const result = await db_1.sequelize.transaction(async (transaction) => {
        const locked = await db_1.models.aiMarketMakerPool.findByPk(pool.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!locked)
            throw (0, error_1.createError)(404, "Pool not found");
        const debitResult = await wallet_1.walletService.debit({
            idempotencyKey: ledgerKey,
            userId: user.id,
            walletId: adminWallet.id,
            walletType: adminWallet.type,
            currency: currencySymbol,
            amount: numericAmount,
            operationType: "AI_INVESTMENT",
            description: `Deposit ${numericAmount} ${currencySymbol} to AI Market Maker Pool`,
            metadata: {
                poolId: pool.id,
                marketMakerId: marketMaker.id,
                marketSymbol: market.symbol,
                currencyType: currency,
                action: "DEPOSIT",
            },
            transaction,
        });
        const updateData = {};
        let balanceField;
        if (currency === "BASE") {
            balanceField = "baseCurrencyBalance";
            updateData.baseCurrencyBalance = Number(locked.baseCurrencyBalance) + numericAmount;
            updateData.initialBaseBalance = Number(locked.initialBaseBalance) + numericAmount;
        }
        else {
            balanceField = "quoteCurrencyBalance";
            updateData.quoteCurrencyBalance = Number(locked.quoteCurrencyBalance) + numericAmount;
            updateData.initialQuoteBalance = Number(locked.initialQuoteBalance) + numericAmount;
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
            const poolWallet = await (0, pool_account_1.getPoolFuturesWallet)(currencySymbol, {
                createIfMissing: true,
            });
            if (!poolWallet) {
                throw (0, error_1.createError)(500, `Could not open the market maker's ${currencySymbol} futures wallet`);
            }
            await db_1.models.wallet.increment("balance", {
                by: numericAmount,
                where: { id: poolWallet.id },
                transaction,
            });
        }
        await locked.update(updateData, { transaction });
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: marketMaker.id,
            action: "DEPOSIT",
            details: {
                currency: currencySymbol,
                depositAmount: numericAmount,
                balanceAfter: updateData[balanceField],
                triggeredBy: "ADMIN",
                adminId: user.id,
                note: `Deposit ${numericAmount} ${currencySymbol} to pool`,
            },
            priceAtAction: marketMaker.targetPrice,
            poolValueAtAction: updateData.totalValueLocked,
        }, { transaction });
        return {
            pool: await db_1.models.aiMarketMakerPool.findByPk(pool.id, { transaction }),
            walletBalance: debitResult.newBalance,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit completed successfully");
    await (0, liveConfig_1.applyConfigToRunningEngine)(marketMaker.id);
    return {
        ...(_a = result.pool) === null || _a === void 0 ? void 0 : _a.toJSON(),
        wallet: {
            currency: currencySymbol,
            balanceAfter: result.walletBalance,
        },
    };
};
