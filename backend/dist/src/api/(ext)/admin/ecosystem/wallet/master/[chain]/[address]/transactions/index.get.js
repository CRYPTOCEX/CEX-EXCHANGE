"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionsController = exports.metadata = void 0;
const transactions_1 = require("@b/api/(ext)/ecosystem/utils/transactions");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get master wallet transactions",
    description: "Retrieves the transaction history for a specific master wallet address on a given blockchain. Returns transaction details including sender, receiver, amount, and timestamp.",
    operationId: "getMasterWalletTransactions",
    tags: ["Admin", "Ecosystem", "Wallet"],
    parameters: [
        {
            name: "chain",
            in: "path",
            required: true,
            schema: { type: "string", description: "Blockchain chain identifier" },
        },
        {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string", description: "Blockchain address" },
        },
    ],
    responses: {
        200: {
            description: "Transactions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                txid: { type: "string", description: "Transaction ID" },
                                from: { type: "string", description: "Sender address" },
                                to: { type: "string", description: "Receiver address" },
                                amount: { type: "number", description: "Amount transferred" },
                                timestamp: {
                                    type: "number",
                                    description: "Timestamp of the transaction",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ecosystem.master.wallet",
};
const getTransactionsController = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching master wallet transactions");
    try {
        const { chain, address } = params;
        return await (0, transactions_1.fetchEcosystemTransactions)(chain, address);
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch transactions: ${error.message}`,
        });
    }
};
exports.getTransactionsController = getTransactionsController;
