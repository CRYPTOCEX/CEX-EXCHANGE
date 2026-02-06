"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an existing deposit transaction",
    operationId: "updateDepositTransaction",
    tags: ["Admin", "Finance", "Deposits"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the deposit transaction to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the deposit transaction",
        content: {
            "application/json": {
                schema: utils_1.depositUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Deposit Transaction"),
    requiresAuth: true,
    permission: "edit.deposit",
    logModule: "ADMIN_FIN",
    logTitle: "Update deposit transaction",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId, metadata: requestMetadata, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit transaction");
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
    return await db_1.sequelize.transaction(async (t) => {
        const metadata = parseMetadata(transaction.metadata);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching wallet");
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
            transaction: t,
        });
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        if (transaction.status === "PENDING") {
            if (status === "REJECTED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing transaction rejection");
                await handleWalletRejection(wallet, t);
            }
            else if (status === "COMPLETED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing transaction completion");
                await handleWalletCompletion(transaction, wallet, t);
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving transaction");
        await transaction.save({ transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit transaction updated successfully");
        return { message: "Transaction updated successfully" };
    });
};
function parseMetadata(metadataString) {
    let metadata = {};
    try {
        metadataString = metadataString.replace(/\\/g, "");
        metadata = JSON.parse(metadataString) || {};
    }
    catch (e) {
        console_1.logger.error("DEPOSIT", "Invalid JSON in metadata", e);
    }
    return metadata;
}
async function handleWalletRejection(_wallet, _t) {
}
async function handleWalletCompletion(transaction, wallet, t) {
    const depositAmount = Number(transaction.amount) - Number(transaction.fee);
    if (depositAmount > 0) {
        const idempotencyKey = `admin_deposit_approve_${transaction.id}`;
        await wallet_1.walletService.credit({
            idempotencyKey,
            userId: transaction.userId,
            walletId: wallet.id,
            walletType: wallet.type,
            currency: wallet.currency,
            amount: depositAmount,
            operationType: "DEPOSIT",
            referenceId: transaction.id,
            description: `Deposit approved - ${depositAmount} ${wallet.currency}`,
            metadata: {
                transactionId: transaction.id,
                fee: transaction.fee,
            },
            transaction: t,
        });
    }
}
