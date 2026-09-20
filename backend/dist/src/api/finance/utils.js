"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSettlementFee = void 0;
exports.processFiatDeposit = processFiatDeposit;
exports.processSpotDeposit = processSpotDeposit;
exports.processSpotWithdrawal = processSpotWithdrawal;
exports.refundSpotWithdrawal = refundSpotWithdrawal;
exports.processEcoDeposit = processEcoDeposit;
exports.processEcoWithdrawal = processEcoWithdrawal;
exports.parseTransactionMetadata = parseTransactionMetadata;
exports.collectWithdrawalFeeOnSettlement = collectWithdrawalFeeOnSettlement;
exports.updateTransaction = updateTransaction;
const db_1 = require("@b/db");
const fees_1 = require("@b/utils/fees");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const refund_safety_1 = require("@b/api/finance/withdraw/refund-safety");
Object.defineProperty(exports, "resolveSettlementFee", { enumerable: true, get: function () { return refund_safety_1.resolveSettlementFee; } });
async function processFiatDeposit({ userId, currency, amount, fee, referenceId, method, description, metadata, idempotencyKey, ctx, transaction, }) {
    var _a, _b, _c;
    amount = Number(amount);
    fee = Number(fee || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Deposit amount must be a positive finite number" });
    }
    if (!Number.isFinite(fee) || fee < 0 || fee >= amount) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Deposit fee must be finite, non-negative, and less than the deposit amount" });
    }
    if (typeof currency !== "string" || !currency.trim()) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Deposit currency is required" });
    }
    currency = currency.trim().toUpperCase();
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing fiat deposit via wallet service");
    const wallet = await wallet_1.walletCreationService.getOrCreateWallet(userId, "FIAT", currency, transaction);
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
        transaction,
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
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Collecting platform fee");
        await (0, fees_1.collectPlatformFee)({
            userId,
            currency,
            walletType: "SPOT",
            chain,
            feeAmount: effectiveFee,
            type: "WITHDRAW",
            description: `Platform fee from user (${userId}) withdrawal of ${effectiveFee} ${currency} on ${chain}`,
            referenceId: result.transactionId,
            metadata: { chain, toAddress, userId },
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
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing withdrawal refund via wallet service");
    const wallet = await db_1.models.wallet.findOne({
        where: { userId, currency, type: "SPOT" },
    });
    if (!wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `${currency} SPOT wallet not found for refund`);
        throw new wallet_1.WalletError("WALLET_NOT_FOUND", `${currency} wallet not found`);
    }
    throw new wallet_1.WalletError("REFUND_NOT_SUPPORTED_HERE", "Refund a spot withdrawal through the admin reject door " +
        "(admin/finance/wallet/{id}/withdraw/reject), which refunds and flips the status in one " +
        "transaction and refuses a payout already dispatched. This helper does neither.");
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
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Collecting platform fee");
        await (0, fees_1.collectPlatformFee)({
            userId,
            currency,
            walletType: "ECO",
            chain,
            feeAmount: effectiveFee,
            type: "DEPOSIT",
            description: `Platform fee from ECO deposit of ${effectiveFee} ${currency} on ${chain} for user (${userId})`,
            referenceId: result.transactionId,
            metadata: { chain, userId },
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
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Collecting platform fee");
        await (0, fees_1.collectPlatformFee)({
            userId,
            currency,
            walletType: "ECO",
            chain,
            feeAmount: effectiveFee,
            type: "WITHDRAW",
            description: `Platform fee from ECO withdrawal of ${effectiveFee} ${currency} on ${chain} for user (${userId})`,
            referenceId: result.transactionId,
            metadata: { chain, toAddress, userId },
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
function parseTransactionMetadata(raw) {
    if (!raw)
        return {};
    if (typeof raw === "object")
        return raw;
    if (typeof raw !== "string")
        return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (_a) {
        return {};
    }
}
async function collectWithdrawalFeeOnSettlement(transaction, ctx) {
    var _a;
    if (!transaction)
        return;
    const metadata = parseTransactionMetadata(transaction.metadata);
    const feeAmount = (0, refund_safety_1.resolveSettlementFee)(transaction);
    if (feeAmount <= 0)
        return;
    const wallet = await db_1.models.wallet.findByPk(transaction.walletId);
    if (!wallet)
        return;
    const walletType = wallet.type;
    if (walletType !== "FIAT" && walletType !== "SPOT" && walletType !== "ECO") {
        return;
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Collecting platform fee for settled withdrawal");
    const booked = await (0, fees_1.collectPlatformFee)({
        userId: transaction.userId,
        currency: wallet.currency,
        walletType,
        ...(metadata.chain ? { chain: String(metadata.chain) } : {}),
        feeAmount,
        type: "WITHDRAW",
        description: `Platform fee from settled withdrawal of ${feeAmount} ${wallet.currency}${metadata.method ? ` via ${metadata.method}` : ""}`,
        referenceId: transaction.id,
        metadata: {
            userId: transaction.userId,
            ...(metadata.method ? { method: metadata.method } : {}),
            ...(metadata.chain ? { chain: metadata.chain } : {}),
            ...(metadata.toAddress ? { toAddress: metadata.toAddress } : {}),
        },
    });
    if (!booked) {
        console_1.logger.error("PLATFORM_FEE", `[CRITICAL] Settled withdrawal ${transaction.id} charged ${feeAmount} ` +
            `${wallet.currency} in platform fees and NOTHING was booked — the customer ` +
            `was debited and the house was not credited. userId=${transaction.userId} ` +
            `walletId=${transaction.walletId} walletType=${walletType}` +
            `${metadata.chain ? ` chain=${metadata.chain}` : ""}. Expected credit ` +
            `referenceId="${transaction.id}_fee".`);
    }
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
