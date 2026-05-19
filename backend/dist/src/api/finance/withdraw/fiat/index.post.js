"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
exports.metadata = {
    summary: "Performs a custom fiat withdraw transaction",
    description: "Initiates a custom fiat withdraw transaction for the currently authenticated user",
    operationId: "createCustomFiatWithdraw",
    tags: ["Wallets"],
    requiresAuth: true,
    logModule: "FIAT_WITHDRAW",
    logTitle: "Process fiat withdrawal",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        methodId: { type: "string", description: "Withdraw method ID" },
                        amount: { type: "number", description: "Amount to withdraw" },
                        currency: { type: "string", description: "Currency to withdraw" },
                        customFields: {
                            type: "object",
                            description: "Custom data for the withdraw",
                        },
                    },
                    required: ["methodId", "amount", "currency", "customFields"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Custom withdraw transaction initiated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            transaction: { type: "object" },
                            currency: { type: "string" },
                            method: { type: "string" },
                            balance: { type: "number" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Withdraw Method"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { methodId, amount, currency, customFields } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal method");
    const method = await db_1.models.withdrawMethod.findByPk(methodId);
    if (!method) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Withdrawal method not found: ${methodId}`);
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Withdraw method not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
    const currencyData = await db_1.models.currency.findOne({
        where: { id: currency },
    });
    if (!currencyData) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Currency not found: ${currency}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating withdrawal fees");
    const totalWithdrawAmount = Math.abs(parseFloat(amount));
    const fixedFee = method.fixedFee || 0;
    const percentageFee = method.percentageFee || 0;
    const isAdmin = await (0, fees_1.isSuperAdmin)(user.id);
    const feeAmount = isAdmin ? 0 : parseFloat(Math.max((totalWithdrawAmount * percentageFee) / 100 + fixedFee, 0).toFixed(2));
    const netReceiveAmount = parseFloat((totalWithdrawAmount - feeAmount).toFixed(2));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing withdrawal transaction");
    const result = await db_1.sequelize.transaction(async (t) => {
        var _a, _b;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Locking user wallet for update");
        const wallet = await db_1.models.wallet.findOne({
            where: { userId: user.id, currency: currency, type: "FIAT" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!wallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${currency} FIAT wallet not found`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet balance");
        const availableBalance = wallet.balance - ((_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0);
        if (availableBalance < totalWithdrawAmount) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient balance: available=${availableBalance} (balance=${wallet.balance}, inOrder=${(_b = wallet.inOrder) !== null && _b !== void 0 ? _b : 0}) < ${totalWithdrawAmount}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deducting funds from wallet via wallet service");
        const idempotencyKey = `fiat_withdraw_${user.id}_${currency}_${totalWithdrawAmount}`;
        const walletResult = await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: "FIAT",
            currency,
            amount: totalWithdrawAmount,
            operationType: "WITHDRAW",
            description: `Withdrawal of ${netReceiveAmount} ${currency} (fee: ${feeAmount}) via ${method.title}`,
            metadata: {
                method: method.title,
                totalAmount: totalWithdrawAmount,
                netAmount: netReceiveAmount,
                fee: feeAmount,
                ...customFields,
            },
            transaction: t,
        });
        wallet.balance -= totalWithdrawAmount;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording admin profit from fees");
        await (0, fees_1.collectPlatformFee)({
            userId: user.id,
            currency: wallet.currency,
            walletType: "FIAT",
            feeAmount,
            type: "WITHDRAW",
            description: `Platform fee from fiat withdrawal of ${feeAmount} ${wallet.currency} via ${method.title}`,
            referenceId: walletResult.transactionId,
            metadata: { userId: user.id, method: method.title },
            transaction: t,
        });
        const trx = await db_1.models.transaction.findByPk(walletResult.transactionId, { transaction: t });
        return {
            transaction: trx,
            currency: wallet.currency,
            method: method.title,
            balance: wallet.balance,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Withdrawn ${totalWithdrawAmount} ${currency} (net: ${netReceiveAmount}) via ${method.title}`);
    return result;
};
