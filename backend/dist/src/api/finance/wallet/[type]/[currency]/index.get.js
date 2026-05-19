"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../../utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves details of a specific wallet",
    description: "Fetches detailed information about a specific wallet based on its unique identifier.",
    operationId: "getWallet",
    tags: ["Finance", "Wallets"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "type",
            in: "path",
            required: true,
            description: "The type of wallet to retrieve",
            schema: {
                type: "string",
                enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
            },
        },
        {
            index: 1,
            name: "currency",
            in: "path",
            required: true,
            description: "The currency of the wallet to retrieve",
            schema: { type: "string" },
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
    const { user, params, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { type, currency } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${type} wallet for ${currency}`);
    const wallet = await (0, utils_1.getWallet)(user.id, type, currency);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Wallet retrieved successfully`);
    return wallet;
};
