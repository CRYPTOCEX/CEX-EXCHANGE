"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTransactionFees = calculateTransactionFees;
exports.validateAccountOwnership = validateAccountOwnership;
exports.getUserWallet = getUserWallet;
exports.createForexTransaction = createForexTransaction;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cron_1 = require("@b/cron");
async function calculateTransactionFees(type, currency, chain, amount, transaction, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Calculating transaction fees for ${type} currency ${currency}`);
        let currencyData;
        let taxAmount = 0;
        let precision = 8;
        switch (type) {
            case "FIAT":
                (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Fetching FIAT currency data");
                currencyData = await db_1.models.currency.findOne({
                    where: { id: currency },
                    transaction,
                });
                if (!currencyData || !currencyData.price) {
                    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Currency data not found, fetching FIAT prices");
                    await (0, cron_1.fetchFiatCurrencyPrices)();
                    currencyData = await db_1.models.currency.findOne({
                        where: { id: currency },
                        transaction,
                    });
                    if (!currencyData || !currencyData.price)
                        throw (0, error_1.createError)({ statusCode: 500, message: "Currency processing failed" });
                }
                precision = 2;
                if (currencyData.fee) {
                    taxAmount = parseFloat(Math.max((amount * currencyData.fee) / 100, 0).toFixed(2));
                }
                break;
            case "SPOT":
                (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Fetching SPOT currency data");
                currencyData = await db_1.models.exchangeCurrency.findOne({
                    where: { currency: currency },
                    transaction,
                });
                if (!currencyData || !currencyData.price) {
                    (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Currency data not found, processing currencies prices");
                    await (0, cron_1.processCurrenciesPrices)();
                    currencyData = await db_1.models.exchangeCurrency.findOne({
                        where: { currency: currency },
                        transaction,
                    });
                    if (!currencyData || !currencyData.price)
                        throw (0, error_1.createError)({ statusCode: 500, message: "Currency processing failed" });
                }
                (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, "Starting exchange manager");
                const exchange = await exchange_1.default.startExchange(ctx);
                const provider = await exchange_1.default.getProvider();
                if (!exchange)
                    throw (0, error_1.createError)(500, "Exchange not found");
                (_g = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _g === void 0 ? void 0 : _g.call(ctx, "Fetching exchange currencies");
                const currencies = await exchange.fetchCurrencies();
                const isXt = provider === "xt";
                const exchangeCurrency = Object.values(currencies).find((c) => isXt ? c.code === currency : c.id === currency);
                if (!exchangeCurrency)
                    throw (0, error_1.createError)(404, "Currency not found");
                (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, "Calculating transaction fees");
                let fixedFee = 0;
                switch (provider) {
                    case "binance":
                    case "kucoin":
                        if (chain && exchangeCurrency.networks) {
                            fixedFee =
                                ((_j = exchangeCurrency.networks[chain]) === null || _j === void 0 ? void 0 : _j.fee) ||
                                    ((_l = (_k = exchangeCurrency.networks[chain]) === null || _k === void 0 ? void 0 : _k.fees) === null || _l === void 0 ? void 0 : _l.withdraw) ||
                                    0;
                        }
                        break;
                    default:
                        break;
                }
                const parsedAmount = parseFloat(amount.toString());
                const percentageFee = currencyData.fee || 0;
                taxAmount = parseFloat(Math.max((parsedAmount * percentageFee) / 100 + fixedFee, 0).toFixed(2));
                precision = currencyData.precision || 8;
                break;
            default:
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid wallet type" });
        }
        const total = amount + taxAmount;
        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _m === void 0 ? void 0 : _m.call(ctx, `Transaction fees calculated successfully: ${taxAmount}`);
        return {
            currencyData,
            taxAmount,
            total,
            precision,
        };
    }
    catch (error) {
        (_o = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _o === void 0 ? void 0 : _o.call(ctx, error.message);
        throw error;
    }
}
async function validateAccountOwnership(accountId, userId, transaction, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Validating account ownership for account ${accountId}`);
        const account = await db_1.models.forexAccount.findByPk(accountId, {
            transaction,
        });
        if (!account) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Account not found" });
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Checking account ownership");
        if (account.userId !== userId) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Access denied: You can only access your own forex accounts"
            });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Account ownership validated successfully");
        return account;
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
}
async function getUserWallet(userId, type, currency, transaction, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching wallet for user ${userId} (${type} ${currency})`);
        const wallet = await db_1.models.wallet.findOne({
            where: { userId, type, currency },
            transaction,
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Wallet fetched successfully");
        return wallet;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function createForexTransaction(userId, walletId, type, amount, fee, accountId, metadata, transaction, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Creating ${type} transaction for account ${accountId}`);
        const description = type === "FOREX_DEPOSIT"
            ? `Deposit to Forex account ${accountId}`
            : `Withdraw from Forex account ${accountId}`;
        const result = await db_1.models.transaction.create({
            userId,
            walletId,
            type,
            status: "PENDING",
            amount,
            fee,
            description,
            metadata: JSON.stringify(metadata),
        }, { transaction });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Forex transaction created successfully");
        return result;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
