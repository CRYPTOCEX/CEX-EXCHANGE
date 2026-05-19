"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseTransactionSchema = exports.baseWalletSchema = void 0;
exports.getWallet = getWallet;
exports.getWalletSafe = getWalletSafe;
exports.getWalletById = getWalletById;
exports.getTransactions = getTransactions;
exports.getOrCreateWallet = getOrCreateWallet;
exports.getUserWallets = getUserWallets;
const db_1 = require("@b/db");
const schema_1 = require("@b/utils/schema");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
exports.baseWalletSchema = {
    id: (0, schema_1.baseStringSchema)("ID of the wallet"),
    userId: (0, schema_1.baseStringSchema)("ID of the user who owns the wallet"),
    type: (0, schema_1.baseStringSchema)("Type of the wallet"),
    currency: (0, schema_1.baseStringSchema)("Currency of the wallet"),
    balance: (0, schema_1.baseNumberSchema)("Current balance of the wallet"),
    inOrder: (0, schema_1.baseNumberSchema)("Amount currently in order"),
    address: (0, schema_1.baseStringSchema)("Address associated with the wallet"),
    status: (0, schema_1.baseBooleanSchema)("Status of the wallet"),
    createdAt: (0, schema_1.baseDateTimeSchema)("Date and time when the wallet was created"),
    updatedAt: (0, schema_1.baseDateTimeSchema)("Date and time when the wallet was last updated"),
};
exports.baseTransactionSchema = {
    id: (0, schema_1.baseStringSchema)("ID of the transaction"),
    userId: (0, schema_1.baseStringSchema)("ID of the user who created the transaction"),
    walletId: (0, schema_1.baseStringSchema)("ID of the wallet associated with the transaction"),
    type: (0, schema_1.baseStringSchema)("Type of the transaction"),
    status: (0, schema_1.baseStringSchema)("Status of the transaction"),
    amount: (0, schema_1.baseNumberSchema)("Amount of the transaction"),
    fee: (0, schema_1.baseNumberSchema)("Fee charged for the transaction"),
    description: (0, schema_1.baseStringSchema)("Description of the transaction"),
    metadata: (0, schema_1.baseObjectSchema)("Metadata of the transaction"),
    referenceId: (0, schema_1.baseStringSchema)("Reference ID of the transaction"),
    createdAt: (0, schema_1.baseDateTimeSchema)("Date and time when the transaction was created"),
    updatedAt: (0, schema_1.baseDateTimeSchema)("Date and time when the transaction was last updated"),
};
async function getWallet(userId, type, currency, hasTransactions = false, ctx) {
    var _a;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching wallet for user ${userId}, type ${type}, currency ${currency}`);
    const include = hasTransactions
        ? [
            {
                model: db_1.models.transaction,
                as: "transactions",
            },
        ]
        : [];
    const response = await db_1.models.wallet.findOne({
        where: {
            userId,
            currency,
            type,
        },
        include,
        order: hasTransactions ? [["transactions.createdAt", "DESC"]] : [],
    });
    if (!response) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    return response.get({ plain: true });
}
async function getWalletSafe(userId, type, currency, hasTransactions = false, ctx) {
    var _a;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Safely fetching wallet for user ${userId}, type ${type}, currency ${currency}`);
    const include = hasTransactions
        ? [
            {
                model: db_1.models.transaction,
                as: "transactions",
            },
        ]
        : [];
    const response = await db_1.models.wallet.findOne({
        where: {
            userId,
            currency,
            type,
        },
        include,
        order: hasTransactions ? [["transactions.createdAt", "DESC"]] : [],
    });
    if (!response) {
        return null;
    }
    return response.get({ plain: true });
}
async function getWalletById(id, ctx) {
    var _a;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching wallet by ID: ${id}`);
    const wallet = await wallet_1.walletCreationService.getWalletById(id);
    if (!wallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    return wallet;
}
async function getTransactions(id, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching transactions for wallet ID: ${id}`);
    const wallet = await db_1.models.wallet.findOne({
        where: { id },
    });
    if (!wallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Fetching transaction records for wallet ${wallet.id}`);
    return (await db_1.models.transaction.findAll({
        where: { walletId: wallet.id },
        order: [["createdAt", "DESC"]],
    })).map((transaction) => transaction.get({ plain: true }));
}
async function getOrCreateWallet(userId, type, currency, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Getting or creating ${type} wallet for user ${userId}, currency ${currency}`);
    const result = await wallet_1.walletCreationService.getOrCreateWallet(userId, type, currency);
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Wallet ready: ${result.wallet.id}`);
    return result.wallet;
}
async function getUserWallets(userId, type, ctx) {
    var _a;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching wallets for user ${userId}${type ? `, type ${type}` : ""}`);
    return await wallet_1.walletCreationService.getUserWallets(userId, type);
}
