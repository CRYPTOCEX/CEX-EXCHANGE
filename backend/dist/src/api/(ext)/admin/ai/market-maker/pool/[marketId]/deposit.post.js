"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const tvl_1 = require("../../utils/helpers/tvl");
const wallet_2 = require("@b/services/wallet");
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
    permission: "edit.ai.market-maker.pool",
};
exports.default = async (data) => {
    var _a;
    const { params, body, user, ctx } = data;
    const { currency, amount } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    if (amount <= 0) {
        throw (0, error_1.createError)(400, "Amount must be greater than 0");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker with pool and market info");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
            {
                model: db_1.models.ecosystemMarket,
                as: "market",
            },
        ],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const pool = marketMaker.pool;
    if (!pool) {
        throw (0, error_1.createError)(404, "Pool not found for this market maker");
    }
    const market = marketMaker.market;
    if (!market) {
        throw (0, error_1.createError)(404, "Ecosystem market not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate admin wallet and balance");
    const currencySymbol = currency === "BASE" ? market.currency : market.pair;
    const adminWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, currencySymbol);
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
    if (walletBalance < amount) {
        throw (0, error_1.createError)(400, `Insufficient balance. You have ${walletBalance.toFixed(8)} ${currencySymbol}, but trying to deposit ${amount} ${currencySymbol}`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Execute deposit transaction");
    const result = await db_1.sequelize.transaction(async (transaction) => {
        const debitResult = await wallet_2.walletService.debit({
            idempotencyKey: `admin_ai_mm_pool_deposit_${pool.id}_${currency}`,
            userId: user.id,
            walletId: adminWallet.id,
            walletType: adminWallet.type,
            currency: currencySymbol,
            amount: amount,
            operationType: "AI_INVESTMENT",
            description: `Deposit ${amount} ${currencySymbol} to AI Market Maker Pool`,
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
            updateData.baseCurrencyBalance = Number(pool.baseCurrencyBalance) + amount;
            if (Number(pool.initialBaseBalance) === 0) {
                updateData.initialBaseBalance = amount;
            }
        }
        else {
            balanceField = "quoteCurrencyBalance";
            updateData.quoteCurrencyBalance = Number(pool.quoteCurrencyBalance) + amount;
            if (Number(pool.initialQuoteBalance) === 0) {
                updateData.initialQuoteBalance = amount;
            }
        }
        const baseBalance = currency === "BASE"
            ? updateData.baseCurrencyBalance
            : Number(pool.baseCurrencyBalance) || 0;
        const quoteBalance = currency === "QUOTE"
            ? updateData.quoteCurrencyBalance
            : Number(pool.quoteCurrencyBalance) || 0;
        const targetPrice = Number(marketMaker.targetPrice) || 0;
        updateData.totalValueLocked = (0, tvl_1.calculateTVL)({
            baseBalance,
            quoteBalance,
            currentPrice: targetPrice,
        });
        await pool.update(updateData, { transaction });
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: marketMaker.id,
            action: "DEPOSIT",
            details: {
                currency: currencySymbol,
                depositAmount: amount,
                balanceAfter: updateData[balanceField],
                triggeredBy: "ADMIN",
                adminId: user.id,
                note: `Deposit ${amount} ${currencySymbol} to pool`,
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
    return {
        ...(_a = result.pool) === null || _a === void 0 ? void 0 : _a.toJSON(),
        wallet: {
            currency: currencySymbol,
            balanceAfter: result.walletBalance,
        },
    };
};
