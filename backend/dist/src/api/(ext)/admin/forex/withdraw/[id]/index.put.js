"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const fees_1 = require("@b/utils/fees");
const console_1 = require("@b/utils/console");
const utils_2 = require("../../utils");
exports.metadata = {
    summary: "Updates a Forex withdrawal transaction",
    description: "Updates a pending Forex withdrawal transaction including status, amount, fee, and description. Handles balance adjustments and sends notification emails based on status changes (COMPLETED or REJECTED).",
    operationId: "updateForexWithdrawal",
    tags: ["Admin", "Forex", "Withdraw"],
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
    permission: "edit.forex.withdraw",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex withdrawal",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId, metadata: requestMetadata, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating record ${id}`);
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Transaction not found",
        });
    }
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Only pending transactions can be updated",
        });
    }
    transaction.amount = amount;
    transaction.fee = fee;
    transaction.description = description;
    transaction.referenceId = referenceId;
    return await db_1.sequelize.transaction(async (t) => {
        var _a, _b, _c, _d;
        const metadata = (0, utils_2.parseMetadata)(transaction.metadata);
        const cost = Number(transaction.amount) * Number(metadata.price);
        const storedFeeAmount = Number(metadata.feeAmount) || Number(transaction.fee) || 0;
        const storedGrossAmount = metadata.grossAmount != null
            ? Number(metadata.grossAmount)
            : Number(transaction.amount) + storedFeeAmount;
        if (transaction.status === "PENDING") {
            const account = await db_1.models.forexAccount.findOne({
                where: { userId: transaction.userId, type: "LIVE" },
                transaction: t,
            });
            if (!account) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Forex account not found",
                });
            }
            const wallet = await db_1.models.wallet.findOne({
                where: { id: transaction.walletId },
                transaction: t,
            });
            if (!wallet) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Wallet not found",
                });
            }
            if (status === "REJECTED") {
                metadata.rejectRefundKey = `forex_withdraw_reject_refund_${transaction.id}`;
                metadata.refundedAmount = storedGrossAmount;
                await (0, utils_2.updateForexAccountBalance)(account, storedGrossAmount, true, t, ctx);
            }
            else if (status === "COMPLETED") {
                await (0, utils_2.updateWalletBalance)(wallet, cost, true, t, ctx, transaction.id);
                const lockedAccount = await db_1.models.forexAccount.findByPk(account.id, {
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });
                if (lockedAccount) {
                    const now = new Date();
                    const lastReset = lockedAccount.lastWithdrawReset
                        ? new Date(lockedAccount.lastWithdrawReset)
                        : new Date(0);
                    const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
                    let dailyWithdrawn = lockedAccount.dailyWithdrawn || 0;
                    let monthlyWithdrawn = lockedAccount.monthlyWithdrawn || 0;
                    if (daysSinceReset >= 1) {
                        dailyWithdrawn = 0;
                        if (daysSinceReset >= 30)
                            monthlyWithdrawn = 0;
                    }
                    const dailyLimit = lockedAccount.dailyWithdrawLimit || 5000;
                    const monthlyLimit = lockedAccount.monthlyWithdrawLimit || 50000;
                    if (dailyWithdrawn + storedGrossAmount > dailyLimit) {
                        throw (0, error_1.createError)({
                            statusCode: 400,
                            message: `Approving this withdrawal would exceed the user's daily withdraw limit (${dailyLimit}). Already withdrawn today: ${dailyWithdrawn}.`,
                        });
                    }
                    if (monthlyWithdrawn + storedGrossAmount > monthlyLimit) {
                        throw (0, error_1.createError)({
                            statusCode: 400,
                            message: `Approving this withdrawal would exceed the user's monthly withdraw limit (${monthlyLimit}). Already withdrawn this month: ${monthlyWithdrawn}.`,
                        });
                    }
                    await lockedAccount.update({
                        dailyWithdrawn: dailyWithdrawn + storedGrossAmount,
                        monthlyWithdrawn: monthlyWithdrawn + storedGrossAmount,
                        lastWithdrawReset: daysSinceReset >= 1 ? now : lockedAccount.lastWithdrawReset,
                    }, { transaction: t });
                }
                if (storedFeeAmount > 0) {
                    try {
                        await (0, fees_1.collectPlatformFee)({
                            userId: transaction.userId,
                            currency: wallet.currency,
                            walletType: (metadata.walletType || wallet.type),
                            chain: metadata.chain,
                            feeAmount: storedFeeAmount,
                            type: "FOREX_WITHDRAW",
                            description: `Forex withdraw fee for account ${(_b = (_a = metadata.accountId) !== null && _a !== void 0 ? _a : account.accountId) !== null && _b !== void 0 ? _b : account.id}`,
                            referenceId: transaction.id,
                            metadata: {
                                forexAccountId: (_c = metadata.forexAccountId) !== null && _c !== void 0 ? _c : account.id,
                                accountId: (_d = metadata.accountId) !== null && _d !== void 0 ? _d : account.accountId,
                                walletType: metadata.walletType || wallet.type,
                                chain: metadata.chain,
                            },
                            transaction: t,
                        });
                    }
                    catch (feeErr) {
                        console_1.logger.warn("ADMIN_FOREX", `Forex withdraw fee collection failed (non-fatal) for tx ${transaction.id}: ${feeErr.message}`);
                    }
                }
            }
            const user = await db_1.models.user.findOne({
                where: { id: transaction.userId },
            });
            if (user) {
                await (0, emails_1.sendForexTransactionEmail)(user, transaction, account, wallet.currency, transaction.type, ctx);
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
};
