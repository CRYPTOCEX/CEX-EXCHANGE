"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Reverses a Forex deposit",
    description: "Reverses a completed Forex deposit: the amount is taken back out of the forex account and the full amount plus the fee is returned to the wallet it came from. Forex deposits settle instantly, so this is the only way to undo one.",
    operationId: "reverseForexDeposit",
    tags: ["Admin", "Forex", "Deposit"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the deposit transaction to reverse",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "The reversal request",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["REJECTED", "REFUNDED"],
                            description: "Send REJECTED to reverse the deposit",
                        },
                        metadata: {
                            type: "object",
                            description: "Optional note recorded against the reversal",
                            properties: {
                                message: { type: "string" },
                            },
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "edit.forex.deposit",
    logModule: "ADMIN_FOREX",
    logTitle: "Reverse forex deposit",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, metadata: requestMetadata } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex deposit ${id}`);
    const transaction = await db_1.models.transaction.findOne({ where: { id } });
    if (!transaction) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    }
    if (transaction.type !== "FOREX_DEPOSIT") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "That transaction is not a forex deposit",
        });
    }
    if (status !== "REJECTED" && status !== "REFUNDED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A forex deposit settles immediately, so it can only be reversed. Send status REJECTED to return the money to the user's wallet.",
        });
    }
    if (transaction.status === "REJECTED" || transaction.status === "REFUNDED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This deposit has already been reversed",
        });
    }
    if (transaction.status !== "COMPLETED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Only a completed deposit can be reversed (this one is ${transaction.status})`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reversing the deposit");
    return await db_1.sequelize.transaction(async (t) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const metadata = (0, utils_1.parseMetadata)(transaction.metadata);
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
                message: "The forex account this deposit credited no longer exists",
            });
        }
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        const amount = Number(transaction.amount);
        const fee = Number((_a = transaction.fee) !== null && _a !== void 0 ? _a : 0);
        if (Number((_b = account.balance) !== null && _b !== void 0 ? _b : 0) + 1e-9 < amount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `This deposit credited ${amount} to the forex account, which now holds only ` +
                    `${Number((_c = account.balance) !== null && _c !== void 0 ? _c : 0)}. Reversing it would leave a negative balance.`,
            });
        }
        await (0, utils_1.updateForexAccountBalance)(account, amount, false, t, ctx);
        await wallet_1.walletService.credit({
            idempotencyKey: `forex_deposit_reversal_${transaction.id}`,
            userId: transaction.userId,
            walletId: wallet.id,
            walletType: wallet.type,
            currency: wallet.currency,
            amount: amount + fee,
            operationType: "REFUND",
            referenceId: `${transaction.id}_deposit_reversal`,
            description: `Reversal of forex deposit to account ${(_e = (_d = metadata.accountId) !== null && _d !== void 0 ? _d : account.accountId) !== null && _e !== void 0 ? _e : account.id}`,
            metadata: {
                reversedTransactionId: transaction.id,
                forexAccountId: account.id,
                refundedFee: fee,
            },
            transaction: t,
        });
        if (fee > 0) {
            const depositorIsTreasury = await (0, fees_1.isSuperAdmin)(transaction.userId);
            if (!depositorIsTreasury) {
                await (0, fees_1.recordPlatformLoss)({
                    currency: wallet.currency,
                    walletType: (metadata.walletType || wallet.type),
                    chain: metadata.chain,
                    lossAmount: fee,
                    type: "FOREX_DEPOSIT",
                    description: `Reversal of forex deposit fee for account ${(_g = (_f = metadata.accountId) !== null && _f !== void 0 ? _f : account.accountId) !== null && _g !== void 0 ? _g : account.id}`,
                    referenceId: `${transaction.id}_deposit_reversal_fee`,
                    metadata: {
                        reversedTransactionId: transaction.id,
                        forexAccountId: account.id,
                        refundedFee: fee,
                    },
                    transaction: t,
                });
            }
        }
        if (requestMetadata === null || requestMetadata === void 0 ? void 0 : requestMetadata.message) {
            metadata.message = requestMetadata.message;
        }
        metadata.reversedAt = new Date().toISOString();
        metadata.reversedAmount = amount + fee;
        transaction.metadata = JSON.stringify(metadata);
        transaction.status = "REJECTED";
        await transaction.save({ transaction: t });
        console_1.logger.info("ADMIN_FOREX", `Reversed forex deposit ${transaction.id}: ${amount} taken back from forex account ` +
            `${account.id} and ${amount + fee} returned to wallet ${wallet.id}`);
        const user = await db_1.models.user.findOne({
            where: { id: transaction.userId },
        });
        if (user) {
            await (0, emails_1.sendForexTransactionEmail)(user, transaction, account, wallet.currency, transaction.type, ctx);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Forex deposit reversed; ${amount + fee} returned to the user's wallet`);
        return {
            message: `Deposit reversed. ${amount + fee} ${wallet.currency} has been returned to the user's wallet.`,
        };
    });
};
