"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const utils_2 = require("@b/api/finance/utils");
const fees_1 = require("@b/utils/fees");
const emails_1 = require("@b/utils/emails");
async function getLastCandles() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
        return module.getLastCandles();
    }
    catch (error) {
        return [];
    }
}
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
    permission: "edit.transfer",
    logModule: "ADMIN_FIN",
    logTitle: "Update Transfer",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId, metadata: requestMetadata, } = body;
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    (0, system_accounts_1.assertNotSystemAccount)(transaction.userId, "settled or refunded by hand (the settlement engine moves that account's money)");
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
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
    if (referenceId !== undefined) {
        transaction.referenceId = referenceId;
    }
    return await db_1.sequelize.transaction(async (t) => {
        var _a;
        const lockedTxn = await db_1.models.transaction.findOne({
            where: { id: transaction.id },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!lockedTxn) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        if (lockedTxn.status !== "PENDING") {
            throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
        }
        const metadata = parseMetadata(transaction.metadata);
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        if (status === "COMPLETED") {
            const targetWalletId = (_a = metadata.targetWalletId) !== null && _a !== void 0 ? _a : metadata.toWallet;
            const targetAmount = Number(metadata.targetAmount);
            if (!targetWalletId) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Pending transfer is missing its destination wallet; cannot approve",
                });
            }
            if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Pending transfer is missing its converted destination amount; cannot approve",
                });
            }
            const targetWallet = await db_1.models.wallet.findOne({
                where: { id: targetWalletId },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!targetWallet)
                throw (0, error_1.createError)({ statusCode: 404, message: "Destination wallet not found" });
            const idempotencyKey = `admin_transfer_approve_${transaction.id}`;
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: targetWallet.userId,
                walletId: targetWallet.id,
                walletType: targetWallet.type,
                currency: targetWallet.currency,
                amount: targetAmount,
                operationType: "INCOMING_TRANSFER",
                referenceId: transaction.id,
                description: `Transfer approved - ${targetAmount} ${targetWallet.currency}`,
                metadata: {
                    transactionId: transaction.id,
                    originalAmount: transaction.amount,
                    fromCurrency: metadata.fromCurrency,
                    sourceWalletId: wallet.id,
                },
                transaction: t,
            });
        }
        else if (status === "REJECTED" || status === "CANCELLED") {
            const fromWalletId = metadata.fromWallet || transaction.walletId;
            if (fromWalletId) {
                const fromWallet = await db_1.models.wallet.findOne({
                    where: { id: fromWalletId },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (fromWallet) {
                    let refundAmount = Number(transaction.amount);
                    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
                        throw (0, error_1.createError)({
                            statusCode: 400,
                            message: `Cannot refund: transaction amount is invalid (${transaction.amount}).`,
                        });
                    }
                    const originalDebit = Number(metadata.totalDebit);
                    if (Number.isFinite(originalDebit) &&
                        originalDebit > 0 &&
                        refundAmount > originalDebit) {
                        console_1.logger.warn("TRANSFER", `Refund for transaction ${transaction.id} capped at the original debit ${originalDebit} (requested ${refundAmount})`);
                        refundAmount = originalDebit;
                    }
                    await wallet_1.walletService.credit({
                        idempotencyKey: `transfer_reject_${transaction.id}`,
                        userId: fromWallet.userId,
                        walletId: fromWallet.id,
                        walletType: fromWallet.type,
                        currency: fromWallet.currency,
                        amount: refundAmount,
                        operationType: "REFUND_TRANSFER",
                        referenceId: transaction.id,
                        description: `Transfer ${status.toLowerCase()} - refund ${refundAmount} ${fromWallet.currency}`,
                        metadata: {
                            transactionId: transaction.id,
                            reason: status.toLowerCase(),
                            originalDestinationWalletId: transaction.walletId,
                        },
                        transaction: t,
                    });
                    const platformFee = Number(metadata.platformFee);
                    if (Number.isFinite(platformFee) && platformFee > 0) {
                        const feeWalletType = fromWallet.type === "FIAT"
                            ? "FIAT"
                            : fromWallet.type === "ECO"
                                ? "ECO"
                                : "SPOT";
                        const feeCurrency = metadata.platformFeeCurrency || fromWallet.currency;
                        const reversal = await (0, fees_1.recordPlatformLoss)({
                            currency: feeCurrency,
                            walletType: feeWalletType,
                            lossAmount: platformFee,
                            type: "TRANSFER",
                            referenceId: transaction.id,
                            description: `Platform fee reversed - transfer ${transaction.id} ${status.toLowerCase()}`,
                            metadata: {
                                transactionId: transaction.id,
                                reason: status.toLowerCase(),
                                refundedWalletId: fromWallet.id,
                                refundedUserId: fromWallet.userId,
                            },
                            transaction: t,
                        });
                        if (!(reversal === null || reversal === void 0 ? void 0 : reversal.transactionId)) {
                            console_1.logger.error("TRANSFER", `Fee reversal for ${status.toLowerCase()} transfer ${transaction.id} did NOT debit the treasury: ` +
                                `${platformFee} ${feeCurrency} (${feeWalletType}) is still owed back. ` +
                                `The sender's refund of ${refundAmount} ${fromWallet.currency} was completed.`);
                        }
                    }
                }
                else {
                    console_1.logger.error("TRANSFER", `Refund skipped for transaction ${transaction.id}: sender wallet ${fromWalletId} not found`);
                }
            }
            else {
                console_1.logger.error("TRANSFER", `Refund skipped for transaction ${transaction.id}: metadata.fromWallet missing`);
            }
        }
        if (requestMetadata) {
            metadata.message = requestMetadata.message;
        }
        transaction.metadata = JSON.stringify(metadata);
        transaction.status = status;
        await transaction.save({ transaction: t });
        void notifyTransferDecision({
            transaction,
            status,
            metadata,
            sourceWallet: wallet,
            ctx,
        }).catch((error) => console_1.logger.error("TRANSFER", `Notification failed for transaction ${transaction.id}: ${error === null || error === void 0 ? void 0 : error.message}`));
        return { message: "Transaction updated successfully" };
    });
};
async function notifyTransferDecision({ transaction, status, metadata, sourceWallet, ctx, }) {
    var _a, _b, _c, _d;
    const senderId = (_a = sourceWallet === null || sourceWallet === void 0 ? void 0 : sourceWallet.userId) !== null && _a !== void 0 ? _a : transaction.userId;
    if (!senderId)
        return;
    const sender = await db_1.models.user.findByPk(senderId);
    if (!(sender === null || sender === void 0 ? void 0 : sender.email))
        return;
    if (status === "COMPLETED") {
        const targetWalletId = (_b = metadata === null || metadata === void 0 ? void 0 : metadata.targetWalletId) !== null && _b !== void 0 ? _b : metadata === null || metadata === void 0 ? void 0 : metadata.toWallet;
        const targetWallet = targetWalletId
            ? await db_1.models.wallet.findByPk(targetWalletId)
            : null;
        const recipient = (targetWallet === null || targetWallet === void 0 ? void 0 : targetWallet.userId)
            ? await db_1.models.user.findByPk(targetWallet.userId)
            : null;
        if (recipient) {
            await (0, emails_1.sendOutgoingTransferEmail)(sender, recipient, sourceWallet, Number(transaction.amount), transaction.id, ctx);
            if (targetWallet && recipient.email) {
                await (0, emails_1.sendIncomingTransferEmail)(recipient, sender, targetWallet, Number((_c = metadata === null || metadata === void 0 ? void 0 : metadata.targetAmount) !== null && _c !== void 0 ? _c : transaction.amount), transaction.id, ctx);
            }
        }
        return;
    }
    await (0, emails_1.sendTransactionStatusUpdateEmail)(sender, transaction, sourceWallet, Number((_d = sourceWallet === null || sourceWallet === void 0 ? void 0 : sourceWallet.balance) !== null && _d !== void 0 ? _d : 0), (metadata === null || metadata === void 0 ? void 0 : metadata.message) || "No reason provided", ctx);
}
function parseMetadata(metadataString) {
    return (0, utils_2.parseTransactionMetadata)(metadataString);
}
