"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
exports.metadata = {
    summary: "Get admin wallet balances for Market Maker pool",
    operationId: "getMarketMakerPoolWallet",
    tags: ["Admin", "AI Market Maker", "Pool"],
    description: "Retrieves the admin\'s wallet balances for both base and quote currencies associated with an AI Market Maker. This information is useful for checking available funds before making deposits to the pool.",
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
    responses: {
        200: {
            description: "Admin wallet balances retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            base: {
                                type: "object",
                                description: "Base currency wallet information",
                                properties: {
                                    currency: {
                                        type: "string",
                                        description: "Base currency symbol",
                                    },
                                    balance: {
                                        type: "number",
                                        description: "Available balance in base currency",
                                    },
                                    walletId: {
                                        type: "string",
                                        nullable: true,
                                        description: "Wallet ID (null if wallet doesn't exist)",
                                    },
                                },
                            },
                            quote: {
                                type: "object",
                                description: "Quote currency wallet information",
                                properties: {
                                    currency: {
                                        type: "string",
                                        description: "Quote currency symbol",
                                    },
                                    balance: {
                                        type: "number",
                                        description: "Available balance in quote currency",
                                    },
                                    walletId: {
                                        type: "string",
                                        nullable: true,
                                        description: "Wallet ID (null if wallet doesn't exist)",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Pool Wallet",
    permission: "view.ai.market-maker.pool",
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Pool Wallet");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            {
                model: db_1.models.ecosystemMarket,
                as: "market",
            },
        ],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const market = marketMaker.market;
    if (!market) {
        throw (0, error_1.createError)(404, "Ecosystem market not found");
    }
    const baseCurrency = market.currency;
    const quoteCurrency = market.pair;
    let baseWallet = null;
    let quoteWallet = null;
    try {
        baseWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, baseCurrency);
    }
    catch (_a) {
    }
    try {
        quoteWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, quoteCurrency);
    }
    catch (_b) {
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Pool Wallet retrieved successfully");
    return {
        base: {
            currency: baseCurrency,
            balance: baseWallet ? Number(baseWallet.balance || 0) : 0,
            walletId: (baseWallet === null || baseWallet === void 0 ? void 0 : baseWallet.id) || null,
        },
        quote: {
            currency: quoteCurrency,
            balance: quoteWallet ? Number(quoteWallet.balance || 0) : 0,
            walletId: (quoteWallet === null || quoteWallet === void 0 ? void 0 : quoteWallet.id) || null,
        },
    };
};
