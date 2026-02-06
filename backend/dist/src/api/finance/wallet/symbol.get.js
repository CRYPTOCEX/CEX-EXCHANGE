"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves details of a specific wallet",
    description: "Fetches detailed information about a specific wallet based on its unique identifier.",
    operationId: "getWallet",
    tags: ["Finance", "Wallets"],
    requiresAuth: true,
    parameters: [
        {
            in: "query",
            name: "type",
            required: true,
            schema: {
                type: "string",
                enum: ["ECO", "SPOT"],
            },
            description: "The type of wallet to retrieve",
        },
        {
            in: "query",
            name: "currency",
            required: true,
            schema: {
                type: "string",
            },
            description: "The currency of the wallet to retrieve",
        },
        {
            in: "query",
            name: "pair",
            required: true,
            schema: {
                type: "string",
            },
            description: "The pair of the wallet to retrieve",
        },
    ],
    responses: {
        200: {
            description: "Wallet details retrieved successfully",
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { type, currency, pair } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching wallet balances for ${currency}/${pair}`);
    const currencyWallet = await (0, utils_1.getWalletSafe)(user.id, type, currency);
    const pairWallet = await (0, utils_1.getWalletSafe)(user.id, type, pair);
    const CURRENCY = {
        balance: (currencyWallet === null || currencyWallet === void 0 ? void 0 : currencyWallet.balance) || 0,
        inOrder: (currencyWallet === null || currencyWallet === void 0 ? void 0 : currencyWallet.inOrder) || 0,
        total: ((currencyWallet === null || currencyWallet === void 0 ? void 0 : currencyWallet.balance) || 0) + ((currencyWallet === null || currencyWallet === void 0 ? void 0 : currencyWallet.inOrder) || 0),
    };
    const PAIR = {
        balance: (pairWallet === null || pairWallet === void 0 ? void 0 : pairWallet.balance) || 0,
        inOrder: (pairWallet === null || pairWallet === void 0 ? void 0 : pairWallet.inOrder) || 0,
        total: ((pairWallet === null || pairWallet === void 0 ? void 0 : pairWallet.balance) || 0) + ((pairWallet === null || pairWallet === void 0 ? void 0 : pairWallet.inOrder) || 0),
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet balances retrieved successfully");
    return { CURRENCY, PAIR };
};
