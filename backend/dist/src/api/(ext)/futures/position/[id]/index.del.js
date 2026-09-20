"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
let fromBigInt;
let updateWalletBalance;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    updateWalletBalance = walletModule.updateWalletBalance;
}
catch (e) {
}
const query_1 = require("@b/utils/query");
const positions_1 = require("@b/api/(ext)/futures/utils/queries/positions");
const utils_1 = require("@b/api/finance/wallet/utils");
exports.metadata = {
    summary: "Closes an open futures position",
    description: "Closes an open futures position for the logged-in user.",
    operationId: "closeFuturesPosition",
    tags: ["Futures", "Positions"],
    logModule: "FUTURES",
    logTitle: "Close futures position",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: {
                            type: "string",
                            description: "Currency symbol (e.g., BTC)",
                        },
                        pair: { type: "string", description: "Pair symbol (e.g., USDT)" },
                        side: {
                            type: "string",
                            description: "Position side, either buy or sell",
                        },
                    },
                    required: ["currency", "pair", "side"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Position closed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Position"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async ({ user, body, params }) => {
    if (!user?.id) throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    if (!params?.id || !body?.currency || !body?.pair || !["BUY", "SELL"].includes(body?.side)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid position close request" });
    }
    // Do not refund leveraged notional or close a position without its collateral ledger.
    // The previous implementation also ignored the requested position id.
    throw (0, error_1.createError)({ statusCode: 503, message: "Futures position settlement unavailable: collateral reconciliation required" });
};
