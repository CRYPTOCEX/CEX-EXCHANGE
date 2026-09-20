"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.updateUserWalletBalance = updateUserWalletBalance;
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("@b/api/finance/utils");
const refund_safety_1 = require("@b/api/finance/withdraw/refund-safety");
const refund_1 = require("@b/api/admin/finance/withdraw/log/refund");
exports.metadata = {
    summary: "Rejects a spot wallet withdrawal request",
    operationId: "rejectSpotWalletWithdrawal",
    tags: ["Admin", "Wallets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the withdrawal transaction to reject",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Reason for rejecting the withdrawal request",
                        },
                    },
                    required: ["message"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Withdrawal request rejected successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet"),
        500: query_1.serverErrorResponse,
    },
    permission: "edit.wallet",
    requiresAuth: true,
    logModule: "ADMIN_FIN",
    logTitle: "Reject Withdrawal",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { message } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching transaction");
        const transaction = (await db_1.models.transaction.findOne({
            where: { id },
        }));
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        (0, system_accounts_1.assertNotSystemAccount)(transaction.userId, "refunded by hand (the settlement engine moves that account's money)");
        if (!["PENDING", "PROCESSING", "TIMEOUT"].includes(transaction.status)) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Transaction cannot be rejected (status: ${transaction.status})` });
        }
        if ((0, refund_safety_1.wasDispatched)(transaction)) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This withdrawal has already been sent to the exchange or broadcast on-chain (or its broadcast could not be verified), so rejecting it would refund money that has also left the platform. " +
                    "Leave it for reconciliation, which settles it against what the exchange or the network actually did.",
            });
        }
        const { walletId } = transaction;
        const decision = (0, refund_1.computeWithdrawalRefund)(transaction);
        if (!decision.ok) {
            throw (0, error_1.createError)({ statusCode: 400, message: decision.reason });
        }
        if (decision.capped) {
            console_1.logger.warn("WALLET", `Rejecting ${id}: amount+fee exceeds the recorded debit ${decision.originalDebit}; refunding ${decision.refund}`);
        }
        const wallet = await db_1.models.wallet.findOne({ where: { id: walletId } });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        const note = message || "Withdrawal request rejected";
        const rejectedMetadata = JSON.stringify({
            ...(0, utils_1.parseTransactionMetadata)(transaction.metadata),
            note,
            refunded: decision.refund,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Rejecting and refunding atomically");
        await db_1.sequelize.transaction(async (t) => {
            const [flipped] = await db_1.models.transaction.update({ status: "REJECTED", metadata: rejectedMetadata }, { where: { id, status: transaction.status }, transaction: t });
            if (flipped === 0) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: `This withdrawal changed state (it was ${transaction.status} when read) while being rejected — ` +
                        "a worker may be broadcasting it. Reload and check its current status before rejecting.",
                });
            }
            if (wallet.type === "ECO") {
                const metadata = (0, utils_1.parseTransactionMetadata)(transaction.metadata);
                const idempotencyKey = `admin_eco_refund_${transaction.id}`;
                await wallet_1.walletService.ecoRefund({
                    idempotencyKey,
                    userId: wallet.userId,
                    walletId: wallet.id,
                    currency: wallet.currency,
                    chain: metadata === null || metadata === void 0 ? void 0 : metadata.chain,
                    amount: decision.refund,
                    operationType: "ECO_REFUND",
                    description: `Admin refund: ${note}`,
                    referenceId: transaction.id,
                    metadata: { originalTransactionId: transaction.id, reason: "admin_rejection" },
                    transaction: t,
                });
            }
            else {
                const fee = Math.max(0, Number(transaction.fee) || 0);
                const principal = decision.refund >= fee ? decision.refund - fee : decision.refund;
                await updateUserWalletBalance(walletId, principal, decision.refund >= fee ? fee : 0, "REFUND_WITHDRAWAL", ctx, `admin_refund_withdrawal_${transaction.id}`, t);
            }
        });
        const updatedTransaction = await db_1.models.transaction.findOne({ where: { id } });
        if (!updatedTransaction) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to update transaction status" });
        }
        const trx = updatedTransaction.get({ plain: true });
        const updatedWallet = (await db_1.models.wallet.findOne({ where: { id: walletId } }));
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending rejection email");
            const user = await db_1.models.user.findOne({
                where: { id: transaction.userId },
            });
            await (0, emails_1.sendTransactionStatusUpdateEmail)(user, trx, updatedWallet, updatedWallet.balance, (0, utils_1.parseTransactionMetadata)(trx.metadata).note || "Withdrawal request rejected");
        }
        catch (error) {
            console_1.logger.error("WALLET", "Error sending withdrawal rejection email", error);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdrawal rejected successfully");
        return {
            message: "Withdrawal rejected successfully",
        };
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: error.statusCode || 500, message: error.message });
    }
};
async function updateUserWalletBalance(id, amount, fee, type, ctx, idempotencyKey, transaction) {
    var _a, _b, _c, _d, _e, _f;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating wallet balance: ${id} (${type})`);
    const wallet = await db_1.models.wallet.findOne({
        where: {
            id,
        },
        ...(transaction ? { transaction } : {}),
    });
    if (!wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Wallet not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    if (!idempotencyKey) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Missing idempotencyKey");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "updateUserWalletBalance requires a stable idempotencyKey scoped to the originating transaction row id; a per-wallet key silently swallows every refund after the first.",
        });
    }
    const operationKey = idempotencyKey;
    let totalAmount;
    let operationType;
    switch (type) {
        case "WITHDRAWAL":
            totalAmount = amount + fee;
            operationType = "WITHDRAW";
            if (wallet.balance < totalAmount) {
                (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Insufficient balance");
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient balance" });
            }
            await wallet_1.walletService.debit({
                idempotencyKey: operationKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: totalAmount,
                operationType,
                description: `Admin withdrawal - ${amount} + ${fee} fee`,
                transaction,
            });
            break;
        case "DEPOSIT":
            totalAmount = amount - fee;
            operationType = "DEPOSIT";
            await wallet_1.walletService.credit({
                idempotencyKey: operationKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: totalAmount,
                operationType,
                description: `Admin deposit - ${amount} - ${fee} fee`,
                transaction,
            });
            break;
        case "REFUND_WITHDRAWAL":
            totalAmount = amount + fee;
            operationType = "REFUND_WITHDRAWAL";
            await wallet_1.walletService.credit({
                idempotencyKey: operationKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: totalAmount,
                operationType,
                description: `Withdrawal refund - ${amount} + ${fee} fee`,
                transaction,
            });
            break;
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid operation type" });
    }
    const updatedWallet = await db_1.models.wallet.findOne({
        where: {
            id: wallet.id,
        },
        ...(transaction ? { transaction } : {}),
    });
    if (!updatedWallet) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, "Failed to update wallet balance");
        throw (0, error_1.createError)({
            message: "Failed to update wallet balance",
            statusCode: 500,
        });
    }
    (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, `Wallet balance updated: ${updatedWallet.id} - ${updatedWallet.balance}`);
    return updatedWallet;
}
