"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Deletes a transaction",
    operationId: "deleteTransaction",
    tags: ["Admin", "Transaction"],
    parameters: (0, query_1.deleteRecordParams)("transaction"),
    responses: (0, query_1.deleteRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "delete.transfer",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Transfer",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    // Guard: refuse to delete money-moving transactions that still back a wallet
    // balance (would orphan funds or desync verifyWalletIntegrity). Admins must
    // use the reject/refund flow to reverse balances first.
    const tx = await db_1.models.transaction.findOne({
        where: { id: params.id },
    });
    if (!tx) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Transaction not found",
        });
    }
    const MONEY_TYPES = [
        "WITHDRAW",
        "OUTGOING_TRANSFER",
        "INCOMING_TRANSFER",
        "DEPOSIT",
        "REFUND",
    ];
    if (MONEY_TYPES.includes(tx.type)) {
        if (tx.status === "PENDING" ||
            tx.status === "PROCESSING" ||
            tx.status === "FROZEN") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot delete a pending money transaction. Reject/refund it first so the wallet balance is reversed.",
            });
        }
        if (tx.status === "COMPLETED") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot delete a completed money transaction; it backs the wallet ledger.",
            });
        }
    }
    await db_1.models.adminProfit.destroy({
        where: {
            transactionId: params.id,
        },
    });
    return (0, query_1.handleSingleDelete)({
        model: "transaction",
        id: params.id,
        query,
    });
};
