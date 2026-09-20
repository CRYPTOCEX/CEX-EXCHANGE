"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
const decimal_1 = require("@b/utils/decimal");
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
    const cBal = (0, decimal_1.num)(currencyWallet === null || currencyWallet === void 0 ? void 0 : currencyWallet.balance);
    const cOrd = (0, decimal_1.num)(currencyWallet === null || currencyWallet === void 0 ? void 0 : currencyWallet.inOrder);
    const CURRENCY = {
        balance: cBal,
        inOrder: cOrd,
        total: cBal + cOrd,
    };
    const pBal = (0, decimal_1.num)(pairWallet === null || pairWallet === void 0 ? void 0 : pairWallet.balance);
    const pOrd = (0, decimal_1.num)(pairWallet === null || pairWallet === void 0 ? void 0 : pairWallet.inOrder);
    const PAIR = {
        balance: pBal,
        inOrder: pOrd,
        total: pBal + pOrd,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet balances retrieved successfully");
    return { CURRENCY, PAIR };
};
