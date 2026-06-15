"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an existing transaction",
    operationId: "updateTransaction",
    tags: ["Admin", "Wallets", "Transactions"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the transaction to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the transaction",
        content: {
            "application/json": {
                schema: utils_1.transactionUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "edit.transaction",
    logModule: "ADMIN_FIN",
    logTitle: "Update Transaction",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId } = body;
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
    }
    // pass2 #8 FIX: this generic editor never moves the wallet ledger, so settling a
    // money-bearing transaction here desyncs the books or loses funds. The worst case is a
    // PENDING WITHDRAW (already debited at creation in manual-approval mode) being marked
    // REJECTED/CANCELLED here with NO walletService.credit refund -> the user's debited funds
    // are permanently lost. Force money-bearing settlements through their dedicated
    // approve/reject/refund endpoints, which handle the ledger correctly.
    const MONEY_TYPES = ["DEPOSIT", "WITHDRAW", "INCOMING_TRANSFER", "OUTGOING_TRANSFER"];
    const SETTLED_STATUSES = ["COMPLETED", "REJECTED", "CANCELLED", "FAILED", "EXPIRED", "REFUNDED"];
    if (MONEY_TYPES.includes(transaction.type) &&
        status !== undefined &&
        status !== transaction.status &&
        SETTLED_STATUSES.includes(status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Settling a ${transaction.type} transaction (status → ${status}) must go through its dedicated approve/reject/refund flow so the wallet ledger and any refund are handled. This change is not permitted via the generic transaction editor.`,
        });
    }
    // Block silent ledger desync: this endpoint does not move the wallet balance,
    // so changing amount/fee away from the stored values would desync the books.
    if (amount !== undefined && Number(amount) !== Number(transaction.amount)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Amount changes must go through an audited balance adjustment so the wallet ledger stays in sync. Amount change not permitted here.",
        });
    }
    if (fee !== undefined && Number(fee) !== Number(transaction.fee)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Fee changes must go through an audited balance adjustment so the wallet ledger stays in sync. Fee change not permitted here.",
        });
    }
    transaction.amount = amount;
    transaction.fee = fee;
    transaction.description = description;
    transaction.referenceId = referenceId;
    return await db_1.sequelize.transaction(async (t) => {
        transaction.status = status;
        await transaction.save({ transaction: t });
        return { message: "Transaction updated successfully" };
    });
};
