"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
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
    permission: "edit.withdraw",
    logModule: "ADMIN_FIN",
    logTitle: "Update Withdraw Log",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId, metadata: requestMetadata, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching transaction");
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
    }
    transaction.amount = amount;
    transaction.fee = fee;
    transaction.description = description;
    transaction.referenceId = referenceId;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating transaction and processing wallet changes");
    const result = await db_1.sequelize.transaction(async (t) => {
        const metadata = parseMetadata(transaction.metadata);
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
            transaction: t,
        });
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        if (transaction.status === "PENDING") {
            if (status === "REJECTED") {
                await handleWalletRejection(transaction, wallet, t);
            }
            else if (status === "COMPLETED") {
                await handleWalletCompletion(wallet, t);
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending status update email");
            const user = await db_1.models.user.findOne({
                where: { id: transaction.userId },
            });
            if (user) {
                await (0, emails_1.sendTransactionStatusUpdateEmail)(user, transaction, wallet, wallet.balance, metadata.message || null);
            }
        }
        if (requestMetadata) {
            metadata.message = requestMetadata.message;
        }
        transaction.metadata = JSON.stringify(metadata);
        transaction.status = status;
        await transaction.save({ transaction: t });
        return { message: "Transaction updated successfully" };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw log updated successfully");
    return result;
};
function parseMetadata(metadataString) {
    let metadata = {};
    try {
        metadataString = metadataString.replace(/\\/g, "");
        metadata = JSON.parse(metadataString) || {};
    }
    catch (e) {
        console_1.logger.error("WITHDRAW", "Invalid JSON in metadata", e);
    }
    return metadata;
}
async function handleWalletRejection(transaction, wallet, t) {
    const refundAmount = Number(transaction.amount);
    if (refundAmount > 0) {
        const idempotencyKey = `withdraw_reject_${transaction.id}`;
        await wallet_1.walletService.credit({
            idempotencyKey,
            userId: transaction.userId,
            walletId: wallet.id,
            walletType: wallet.type,
            currency: wallet.currency,
            amount: refundAmount,
            operationType: "REFUND_WITHDRAWAL",
            referenceId: transaction.id,
            description: `Withdrawal rejected - refund ${refundAmount} ${wallet.currency}`,
            metadata: {
                transactionId: transaction.id,
                reason: "rejected",
            },
            transaction: t,
        });
    }
}
async function handleWalletCompletion(_wallet, _t) {
}
