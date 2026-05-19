"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.updateUserWalletBalance = updateUserWalletBalance;
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
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
    var _a;
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
        if (transaction.status !== "PENDING") {
            throw (0, error_1.createError)({ statusCode: 400, message: "Transaction is not pending" });
        }
        const { walletId } = transaction;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating transaction status to rejected");
        await db_1.models.transaction.update({
            status: "REJECTED",
            metadata: {
                ...transaction.metadata,
                note: message || "Withdrawal request rejected",
            },
        }, {
            where: {
                id,
            },
        });
        const updatedTransaction = await db_1.models.transaction.findOne({
            where: {
                id,
            },
        });
        if (!updatedTransaction) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to update transaction status" });
        }
        const trx = updatedTransaction.get({ plain: true });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding wallet balance");
        const updatedWallet = (await updateUserWalletBalance(walletId, Number(trx.amount), Number(trx.fee), "REFUND_WITHDRAWAL", ctx));
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending rejection email");
            const user = await db_1.models.user.findOne({
                where: { id: transaction.userId },
            });
            await (0, emails_1.sendTransactionStatusUpdateEmail)(user, trx, updatedWallet, updatedWallet.balance, ((_a = trx.metadata) === null || _a === void 0 ? void 0 : _a.note) || "Withdrawal request rejected");
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
async function updateUserWalletBalance(id, amount, fee, type, ctx) {
    var _a, _b, _c, _d, _e;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating wallet balance: ${id} (${type})`);
    const wallet = await db_1.models.wallet.findOne({
        where: {
            id,
        },
    });
    if (!wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Wallet not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    const idempotencyKey = `admin_wallet_${id}_${type}`;
    let totalAmount;
    let operationType;
    switch (type) {
        case "WITHDRAWAL":
            totalAmount = amount + fee;
            operationType = "WITHDRAW";
            if (wallet.balance < totalAmount) {
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Insufficient balance");
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient balance" });
            }
            await wallet_1.walletService.debit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: totalAmount,
                operationType,
                description: `Admin withdrawal - ${amount} + ${fee} fee`,
            });
            break;
        case "DEPOSIT":
            totalAmount = amount - fee;
            operationType = "DEPOSIT";
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: totalAmount,
                operationType,
                description: `Admin deposit - ${amount} - ${fee} fee`,
            });
            break;
        case "REFUND_WITHDRAWAL":
            totalAmount = amount + fee;
            operationType = "REFUND_WITHDRAWAL";
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: totalAmount,
                operationType,
                description: `Withdrawal refund - ${amount} + ${fee} fee`,
            });
            break;
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid operation type" });
    }
    const updatedWallet = await db_1.models.wallet.findOne({
        where: {
            id: wallet.id,
        },
    });
    if (!updatedWallet) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Failed to update wallet balance");
        throw (0, error_1.createError)({
            message: "Failed to update wallet balance",
            statusCode: 500,
        });
    }
    (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, `Wallet balance updated: ${updatedWallet.id} - ${updatedWallet.balance}`);
    return updatedWallet;
}
