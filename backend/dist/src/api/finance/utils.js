"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFiatDeposit = processFiatDeposit;
exports.processSpotDeposit = processSpotDeposit;
exports.processSpotWithdrawal = processSpotWithdrawal;
exports.refundSpotWithdrawal = refundSpotWithdrawal;
exports.processEcoDeposit = processEcoDeposit;
exports.processEcoWithdrawal = processEcoWithdrawal;
exports.updateTransaction = updateTransaction;
const db_1 = require("@b/db");
const fees_1 = require("@b/utils/fees");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
async function processFiatDeposit({ userId, currency, amount, fee, referenceId, method, description, metadata, idempotencyKey, ctx, }) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing fiat deposit via wallet service");
    const wallet = await wallet_1.walletCreationService.getOrCreateWallet(userId, "FIAT", currency);
    const operationKey = idempotencyKey || `fiat_deposit_${referenceId}`;
    const isAdmin = await (0, fees_1.isSuperAdmin)(userId);
    const effectiveFee = isAdmin ? 0 : fee;
    const netAmount = amount - effectiveFee;
    const result = await wallet_1.walletService.credit({
        idempotencyKey: operationKey,
        userId,
        walletId: wallet.id,
        walletType: "FIAT",
        currency,
        amount: netAmount,
        operationType: "DEPOSIT",
        fee: effectiveFee,
        referenceId,
        description: description || `Deposit of ${amount} ${currency} via ${method}`,
        metadata: {
            method,
            originalAmount: amount,
            fee: effectiveFee,
            ...metadata,
        },
    });
    if (effectiveFee > 0) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Collecting platform fee");
        await (0, fees_1.collectPlatformFee)({
            userId,
            currency,
            walletType: "FIAT",
            feeAmount: effectiveFee,
            type: "DEPOSIT",
            description: `Platform fee from ${method} deposit of ${effectiveFee} ${currency}`,
            referenceId: result.transactionId,
            metadata: { method, userId },
        });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Fiat deposit completed: ${netAmount} ${currency}`);
    return {
        transactionId: result.transactionId,
        walletId: result.walletId,
        newBalance: result.newBalance,
        amount: netAmount,
        fee: effectiveFee,
        currency,
    };
}
async function processSpotDeposit({ userId, currency, amount, fee, referenceId, chain, description, metadata, idempotencyKey, ctx, }) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing spot deposit via wallet service");
    const wallet = await wallet_1.walletCreationService.getOrCreateWallet(userId, "SPOT", currency);
    const operationKey = idempotencyKey || `spot_deposit_${referenceId}`;
    const isAdmin = await (0, fees_1.isSuperAdmin)(userId);
    const effectiveFee = isAdmin ? 0 : fee;
    const netAmount = amount - effectiveFee;
    const result = await wallet_1.walletService.credit({
        idempotencyKey: operationKey,
        userId,
        walletId: wallet.id,
        walletType: "SPOT",
        currency,
        amount: netAmount,
        operationType: "DEPOSIT",
        fee: effectiveFee,
        referenceId,
        description: description || `Deposit of ${amount} ${currency} via ${chain}`,
        metadata: {
            chain,
            originalAmount: amount,
            fee: effectiveFee,
            ...metadata,
        },
    });
    if (effectiveFee > 0) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Collecting platform fee");
        await (0, fees_1.collectPlatformFee)({
            userId,
            currency,
            walletType: "SPOT",
            feeAmount: effectiveFee,
            type: "DEPOSIT",
            description: `Platform fee from spot deposit of ${effectiveFee} ${currency}`,
            referenceId: result.transactionId,
            metadata: { chain, userId },
        });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Spot deposit completed: ${netAmount} ${currency}`);
    return {
        transactionId: result.transactionId,
        walletId: result.walletId,
        newBalance: result.newBalance,
        amount: netAmount,
        fee: effectiveFee,
        currency,
    };
}
async function processSpotWithdrawal({ userId, currency, amount, fee, toAddress, chain, memo, description, metadata, idempotencyKey, ctx, }) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing spot withdrawal via wallet service");
    const wallet = await db_1.models.wallet.findOne({
        where: { userId, currency, type: "SPOT" },
    });
    if (!wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `${currency} SPOT wallet not found`);
        throw new wallet_1.WalletError("WALLET_NOT_FOUND", `${currency} wallet not found in your spot wallets`);
    }
    const isAdmin = await (0, fees_1.isSuperAdmin)(userId);
    const effectiveFee = isAdmin ? 0 : fee;
    const totalDeduction = amount + effectiveFee;
    const result = await wallet_1.walletService.debit({
        idempotencyKey,
        userId,
        walletId: wallet.id,
        walletType: "SPOT",
        currency,
        amount: totalDeduction,
        operationType: "WITHDRAW",
        fee: effectiveFee,
        description: description ||
            `Withdrawal of ${amount} ${currency} to ${toAddress} via ${chain}`,
        metadata: {
            chain,
            toAddress,
            memo,
            originalAmount: amount,
            fee: effectiveFee,
            ...metadata,
        },
    });
    if (effectiveFee > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Recording admin profit");
        await db_1.models.adminProfit.create({
            amount: effectiveFee,
            currency,
            type: "WITHDRAW",
            transactionId: result.transactionId,
            chain,
            description: `Admin profit from user (${userId}) withdrawal fee of ${effectiveFee} ${currency} on ${chain}`,
        });
    }
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Spot withdrawal initiated: ${amount} ${currency}`);
    return {
        transactionId: result.transactionId,
        walletId: result.walletId,
        newBalance: result.newBalance,
        amount,
        fee: effectiveFee,
        currency,
    };
}
async function refundSpotWithdrawal({ userId, currency, amount, fee, originalTransactionId, reason, idempotencyKey, ctx, }) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing withdrawal refund via wallet service");
    const wallet = await db_1.models.wallet.findOne({
        where: { userId, currency, type: "SPOT" },
    });
    if (!wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `${currency} SPOT wallet not found for refund`);
        throw new wallet_1.WalletError("WALLET_NOT_FOUND", `${currency} wallet not found`);
    }
    const refundAmount = amount + fee;
    const result = await wallet_1.walletService.credit({
        idempotencyKey,
        userId,
        walletId: wallet.id,
        walletType: "SPOT",
        currency,
        amount: refundAmount,
        operationType: "REFUND_WITHDRAWAL",
        description: `Refund of failed withdrawal: ${reason}`,
        metadata: {
            originalTransactionId,
            reason,
            originalAmount: amount,
            originalFee: fee,
        },
    });
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Withdrawal refund completed: ${refundAmount} ${currency}`);
    return {
        transactionId: result.transactionId,
        walletId: result.walletId,
        newBalance: result.newBalance,
        amount: refundAmount,
        currency,
    };
}
async function processEcoDeposit({ userId, currency, amount, fee, referenceId, chain, description, metadata, idempotencyKey, ctx, }) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing ECO deposit via wallet service");
    const wallet = await wallet_1.walletCreationService.getOrCreateWallet(userId, "ECO", currency);
    const operationKey = idempotencyKey || `eco_deposit_${referenceId}`;
    const isAdmin = await (0, fees_1.isSuperAdmin)(userId);
    const effectiveFee = isAdmin ? 0 : fee;
    const netAmount = amount - effectiveFee;
    const result = await wallet_1.walletService.credit({
        idempotencyKey: operationKey,
        userId,
        walletId: wallet.id,
        walletType: "ECO",
        currency,
        amount: netAmount,
        operationType: "DEPOSIT",
        fee: effectiveFee,
        referenceId,
        description: description || `ECO Deposit of ${amount} ${currency} via ${chain}`,
        metadata: {
            chain,
            originalAmount: amount,
            fee: effectiveFee,
            ...metadata,
        },
    });
    if (effectiveFee > 0) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Recording admin profit");
        await db_1.models.adminProfit.create({
            amount: effectiveFee,
            currency,
            type: "DEPOSIT",
            transactionId: result.transactionId,
            chain,
            description: `Admin profit from ECO deposit fee of ${effectiveFee} ${currency} on ${chain} for user (${userId})`,
        });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `ECO deposit completed: ${netAmount} ${currency}`);
    return {
        transactionId: result.transactionId,
        walletId: result.walletId,
        newBalance: result.newBalance,
        amount: netAmount,
        fee: effectiveFee,
        currency,
    };
}
async function processEcoWithdrawal({ userId, currency, amount, fee, toAddress, chain, memo, description, metadata, idempotencyKey, ctx, }) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing ECO withdrawal via wallet service");
    const wallet = await db_1.models.wallet.findOne({
        where: { userId, currency, type: "ECO" },
    });
    if (!wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `${currency} ECO wallet not found`);
        throw new wallet_1.WalletError("WALLET_NOT_FOUND", `${currency} ECO wallet not found`);
    }
    const isAdmin = await (0, fees_1.isSuperAdmin)(userId);
    const effectiveFee = isAdmin ? 0 : fee;
    const totalDeduction = amount + effectiveFee;
    const result = await wallet_1.walletService.debit({
        idempotencyKey,
        userId,
        walletId: wallet.id,
        walletType: "ECO",
        currency,
        amount: totalDeduction,
        operationType: "WITHDRAW",
        fee: effectiveFee,
        description: description ||
            `ECO Withdrawal of ${amount} ${currency} to ${toAddress} via ${chain}`,
        metadata: {
            chain,
            toAddress,
            memo,
            originalAmount: amount,
            fee: effectiveFee,
            ...metadata,
        },
    });
    if (effectiveFee > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Recording admin profit");
        await db_1.models.adminProfit.create({
            amount: effectiveFee,
            currency,
            type: "WITHDRAW",
            transactionId: result.transactionId,
            chain,
            description: `Admin profit from ECO withdrawal fee of ${effectiveFee} ${currency} on ${chain} for user (${userId})`,
        });
    }
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `ECO withdrawal initiated: ${amount} ${currency}`);
    return {
        transactionId: result.transactionId,
        walletId: result.walletId,
        newBalance: result.newBalance,
        amount,
        fee: effectiveFee,
        currency,
    };
}
async function updateTransaction(id, data, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating transaction ${id}`);
    await db_1.models.transaction.update({
        ...data,
    }, {
        where: {
            id,
        },
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Fetching updated transaction ${id}`);
    const updatedTransaction = await db_1.models.transaction.findByPk(id, {
        include: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["id", "currency"],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    if (!updatedTransaction) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Transaction not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    }
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Transaction ${id} updated successfully`);
    return updatedTransaction.get({
        plain: true,
    });
}
