"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const utils_2 = require("@b/api/finance/utils");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const utils_3 = require("@b/api/finance/utils");
const refund_safety_1 = require("@b/api/finance/withdraw/refund-safety");
const refund_1 = require("../refund");
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
    if (status === "COMPLETED" &&
        (typeof referenceId !== "string" || referenceId.trim() === "")) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "referenceId (transaction hash or wire reference) is required to complete a withdrawal",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching transaction");
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    (0, system_accounts_1.assertNotSystemAccount)(transaction.userId, "paid out or refunded by hand (the settlement engine moves that account's money)");
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
    }
    if (status === "REJECTED" && (0, refund_safety_1.wasDispatched)(transaction)) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This withdrawal has already been handed to the payout provider, so rejecting it would refund money that is also leaving the platform. " +
                "It must be resolved by the withdrawal reconciler, which settles it against what the provider actually did." +
                (transaction.referenceId ? ` Provider reference: ${transaction.referenceId}.` : ""),
        });
    }
    if (amount !== undefined && amount !== null && amount !== "") {
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid amount: must be a positive finite number",
            });
        }
        transaction.amount = parsedAmount;
    }
    if (fee !== undefined && fee !== null && fee !== "") {
        const parsedFee = Number(fee);
        if (!Number.isFinite(parsedFee) || parsedFee < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid fee: must be zero or a positive finite number",
            });
        }
        transaction.fee = parsedFee;
    }
    if (description !== undefined) {
        transaction.description = description;
    }
    let duplicateReference = null;
    if (referenceId !== undefined) {
        const existing = await db_1.models.transaction.findOne({
            where: { referenceId },
            attributes: ["id"],
        });
        if (existing && existing.id !== transaction.id) {
            duplicateReference = String(referenceId);
            console_1.logger.warn("WITHDRAW", `Reference "${referenceId}" is already recorded against transaction ${existing.id}; ` +
                `storing it in metadata for ${transaction.id} rather than failing the settlement`);
        }
        else {
            transaction.referenceId = referenceId;
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating transaction and processing wallet changes");
    const result = await db_1.sequelize.transaction(async (t) => {
        var _a;
        const metadata = parseMetadata(transaction.metadata);
        if (duplicateReference) {
            metadata.settlementReference = duplicateReference;
        }
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
            transaction: t,
        });
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        if (requestMetadata) {
            metadata.message = requestMetadata.message;
        }
        assertNotProviderExecuted(transaction, status);
        if (status === "REJECTED") {
            await handleWalletRejection(transaction, wallet, t);
        }
        else if (status === "COMPLETED") {
            await handleWalletCompletion(wallet, t);
        }
        transaction.status = status;
        transaction.metadata = JSON.stringify(metadata);
        const [claimed] = await db_1.models.transaction.update({
            status,
            metadata: transaction.metadata,
            amount: transaction.amount,
            fee: transaction.fee,
            description: transaction.description,
            referenceId: transaction.referenceId,
        }, { where: { id: transaction.id, status: "PENDING" }, transaction: t });
        if (claimed === 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This withdrawal was settled, rejected or claimed by another request while you were editing it. Nothing was changed — reload and check its current status.",
            });
        }
        if (status === "COMPLETED") {
            await (0, utils_2.collectWithdrawalFeeOnSettlement)(transaction, ctx);
        }
        const settledWallet = await db_1.models.wallet.findOne({
            where: { id: wallet.id },
            transaction: t,
        });
        const newBalance = Number((_a = settledWallet === null || settledWallet === void 0 ? void 0 : settledWallet.balance) !== null && _a !== void 0 ? _a : wallet.balance) || 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending status update email");
        const user = await db_1.models.user.findOne({
            where: { id: transaction.userId },
        });
        if (user) {
            await (0, emails_1.sendTransactionStatusUpdateEmail)(user, transaction, wallet, Number(newBalance.toFixed(8)), metadata.message || null);
        }
        return { message: "Transaction updated successfully" };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw log updated successfully");
    return result;
};
function parseMetadata(metadataString) {
    return (0, utils_3.parseTransactionMetadata)(metadataString);
}
async function handleWalletRejection(transaction, wallet, t) {
    const decision = (0, refund_1.computeWithdrawalRefund)(transaction);
    if (!decision.ok) {
        throw (0, error_1.createError)({ statusCode: 400, message: decision.reason });
    }
    const refundAmount = decision.refund;
    if (decision.capped) {
        console_1.logger.warn("WITHDRAW", `Refund for transaction ${transaction.id} capped at the original debit ${decision.originalDebit} ` +
            `(amount ${transaction.amount} + fee ${transaction.fee})`);
    }
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
function assertNotProviderExecuted(transaction, status) {
    if (status !== "COMPLETED")
        return;
    let meta = {};
    try {
        meta =
            typeof transaction.metadata === "string"
                ? JSON.parse(transaction.metadata || "{}")
                : transaction.metadata || {};
    }
    catch (_a) {
        meta = {};
    }
    const dispatched = !!meta.transfiOrderId || /^OR-/.test(String(transaction.referenceId || ""));
    if (!dispatched)
        return;
    throw (0, error_1.createError)({
        statusCode: 409,
        message: "This withdrawal is being executed by TransFi and cannot be completed by hand. " +
            "Its status is set by the provider webhook or the payout reconciler. " +
            `Provider reference: ${meta.transfiOrderId || transaction.referenceId}.`,
    });
}
