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
const withdraw_limits_1 = require("@b/api/(ext)/forex/account/withdraw-limits");
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
    if (transaction.type !== "FOREX_WITHDRAW") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This endpoint settles forex withdrawals; transaction ${id} is a ${transaction.type}.`,
        });
    }
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Only pending transactions can be updated",
        });
    }
    if (status !== "COMPLETED" && status !== "REJECTED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A pending withdrawal can only be COMPLETED or REJECTED",
        });
    }
    if (typeof description === "string")
        transaction.description = description;
    if (amount != null && Number(amount) !== Number(transaction.amount)) {
        console_1.logger.warn("ADMIN_FOREX", `Ignoring an attempt to change withdrawal ${transaction.id} from ` +
            `${transaction.amount} to ${amount} while approving it.`);
    }
    return await db_1.sequelize.transaction(async (t) => {
        var _a, _b, _c, _d;
        const locked = await db_1.models.transaction.findOne({
            where: { id },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!locked) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        if (locked.status !== "PENDING") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `This withdrawal has already been ${String(locked.status).toLowerCase()}. Refresh the list before deciding again.`,
            });
        }
        const metadata = (0, utils_2.parseMetadata)(locked.metadata);
        const cost = Number(transaction.amount);
        const storedFeeAmount = Number(metadata.feeAmount) || Number(transaction.fee) || 0;
        const storedGrossAmount = metadata.grossAmount != null
            ? Number(metadata.grossAmount)
            : Number(transaction.amount) + storedFeeAmount;
        if (transaction.status === "PENDING") {
            const account = metadata.forexAccountId
                ? await db_1.models.forexAccount.findByPk(metadata.forexAccountId, {
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                })
                : await db_1.models.forexAccount.findOne({
                    where: { userId: transaction.userId, type: "LIVE" },
                    order: [["createdAt", "ASC"]],
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });
            if (!account) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "The forex account this withdrawal was made from no longer exists",
                });
            }
            if (account.userId !== transaction.userId) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "This withdrawal references a forex account belonging to another user",
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
                const now = new Date();
                const limitCheck = (0, withdraw_limits_1.checkWithdrawLimits)(account, storedGrossAmount, now);
                if (!limitCheck.allowed) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Approving this withdrawal would breach the user's limits — ${limitCheck.reason}`,
                    });
                }
                await account.update((0, withdraw_limits_1.consumeWithdrawAllowance)(account, storedGrossAmount, now), { transaction: t });
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
