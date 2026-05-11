"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePrivateLedger = updatePrivateLedger;
exports.getCurrencyData = getCurrencyData;
exports.calculateTransferFee = calculateTransferFee;
exports.requiresPrivateLedgerUpdate = requiresPrivateLedgerUpdate;
exports.updateWalletBalances = updateWalletBalances;
exports.calculateNewBalance = calculateNewBalance;
exports.getSortedChainBalances = getSortedChainBalances;
exports.recordAdminProfit = recordAdminProfit;
exports.createTransferTransaction = createTransferTransaction;
exports.sendTransferEmails = sendTransferEmails;
exports.performTransfer = performTransfer;
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
async function updatePrivateLedger(walletId, index, currency, chain, amount, transaction) {
    await wallet_1.ledgerService.updateLedger({
        walletId,
        index,
        currency,
        chain: chain,
        amount,
        transaction,
    });
}
async function getCurrencyData(fromType, currency) {
    switch (fromType) {
        case "FIAT":
            return await db_1.models.currency.findOne({ where: { id: currency } });
        case "SPOT":
            return await db_1.models.exchangeCurrency.findOne({ where: { currency } });
        case "ECO":
        case "FUTURES":
            return await db_1.models.ecosystemToken.findOne({ where: { currency } });
    }
}
function calculateTransferFee(amount, feePercentage) {
    return (amount * feePercentage) / 100;
}
function requiresPrivateLedgerUpdate(transferType, fromType, toType) {
    return ((transferType === "client" && (fromType === "ECO" || toType === "ECO")) ||
        (fromType === "ECO" && toType === "FUTURES") ||
        (fromType === "FUTURES" && toType === "ECO"));
}
async function updateWalletBalances(fromWallet, toWallet, parsedAmount, targetReceiveAmount, precision, t, idempotencyKey) {
    const fromResult = await wallet_1.walletService.debit({
        idempotencyKey: `${idempotencyKey}_from`,
        userId: fromWallet.userId,
        walletId: fromWallet.id,
        walletType: fromWallet.type,
        currency: fromWallet.currency,
        amount: parsedAmount,
        operationType: "OUTGOING_TRANSFER",
        description: `Transfer to wallet ${toWallet.id}`,
        relatedWalletId: toWallet.id,
        metadata: {
            targetWalletId: toWallet.id,
            targetUserId: toWallet.userId,
            targetAmount: targetReceiveAmount,
        },
        transaction: t,
    });
    const toResult = await wallet_1.walletService.credit({
        idempotencyKey: `${idempotencyKey}_to`,
        userId: toWallet.userId,
        walletId: toWallet.id,
        walletType: toWallet.type,
        currency: toWallet.currency,
        amount: targetReceiveAmount,
        operationType: "INCOMING_TRANSFER",
        description: `Transfer from wallet ${fromWallet.id}`,
        relatedWalletId: fromWallet.id,
        metadata: {
            sourceWalletId: fromWallet.id,
            sourceUserId: fromWallet.userId,
            sourceAmount: parsedAmount,
        },
        transaction: t,
    });
    return {
        fromTransactionId: fromResult.transactionId,
        toTransactionId: toResult.transactionId,
    };
}
function calculateNewBalance(current, change, precision) {
    const currentBalance = isNaN(current) ? 0 : current;
    const changeAmount = isNaN(change) ? 0 : change;
    let precisionValue = 8;
    if (typeof precision === "number" && precision >= 0 && precision <= 18) {
        precisionValue = Math.floor(precision);
    }
    else if (precision &&
        typeof precision === "object" &&
        typeof precision.precision === "number") {
        precisionValue = Math.floor(precision.precision);
    }
    let newBalance;
    if (changeAmount >= 0) {
        newBalance = (0, wallet_1.safeAdd)(currentBalance, changeAmount, "DEFAULT");
    }
    else {
        newBalance = (0, wallet_1.safeSubtract)(currentBalance, Math.abs(changeAmount), "DEFAULT");
    }
    const finalBalance = Math.max(0, newBalance);
    return parseFloat(finalBalance.toFixed(precisionValue));
}
function getSortedChainBalances(fromAddresses) {
    return Object.entries(fromAddresses)
        .filter(([_, chainInfo]) => chainInfo.balance > 0)
        .sort(([, a], [, b]) => b.balance - a.balance);
}
async function recordAdminProfit({ userId, transferFeeAmount, fromCurrency, fromType, toType, transactionId, t, }) {
    const walletType = fromType === "FIAT" ? "FIAT" : fromType === "ECO" ? "ECO" : "SPOT";
    await (0, fees_1.collectPlatformFee)({
        userId,
        currency: fromCurrency,
        walletType,
        feeAmount: transferFeeAmount,
        type: "TRANSFER",
        description: `Platform fee from transfer of ${transferFeeAmount} ${fromCurrency} from ${fromType} to ${toType}`,
        referenceId: transactionId,
        metadata: { userId, fromType, toType },
        transaction: t,
    });
}
async function createTransferTransaction(userId, walletId, type, amount, fee, fromCurrency, toCurrency, fromWalletId, toWalletId, description, status, transaction) {
    return await db_1.models.transaction.create({
        userId,
        walletId,
        type,
        amount,
        fee,
        status,
        metadata: JSON.stringify({
            fromWallet: fromWalletId,
            toWallet: toWalletId,
            fromCurrency,
            toCurrency,
        }),
        description,
    }, { transaction });
}
async function sendTransferEmails(user, toUser, fromWallet, toWallet, amount, transaction) {
    try {
        await (0, emails_1.sendOutgoingTransferEmail)(user, toUser, fromWallet, amount, transaction.fromTransfer.id);
        await (0, emails_1.sendIncomingTransferEmail)(toUser, user, toWallet, amount, transaction.toTransfer.id);
    }
    catch (error) {
        console_1.logger.error("FINANCE", "Error sending transfer email", error);
    }
}
async function performTransfer(fromUserId, toUserId, fromWalletType, toWalletType, currency, amount, feePercentage = 0, description, idempotencyKey) {
    const result = await wallet_1.walletService.transfer({
        idempotencyKey,
        fromUserId,
        toUserId,
        fromWalletType,
        toWalletType,
        fromCurrency: currency,
        toCurrency: currency,
        amount,
        feePercentage,
        description,
    });
    return {
        fromWallet: {
            id: result.fromResult.walletId,
            balance: result.fromResult.newBalance,
            inOrder: result.fromResult.newInOrder,
        },
        toWallet: {
            id: result.toResult.walletId,
            balance: result.toResult.newBalance,
            inOrder: result.toResult.newInOrder,
        },
        fee: result.fee,
        fromTransactionId: result.fromResult.transactionId,
        toTransactionId: result.toResult.transactionId,
    };
}
