"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWalletTypeEnabled = assertWalletTypeEnabled;
exports.assertCurrencyEnabled = assertCurrencyEnabled;
exports.resolveEnabledDepositMethod = resolveEnabledDepositMethod;
exports.resolveEnabledWithdrawMethod = resolveEnabledWithdrawMethod;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
async function assertWalletTypeEnabled(walletType, action, ctx) {
    const cacheManager = cache_1.CacheManager.getInstance();
    if (walletType === "FIAT") {
        if (!(await cacheManager.getSettingBool("fiatWallets", true))) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("FIAT wallets are disabled");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: `Fiat wallets are currently disabled, so you cannot ${action}.`,
            });
        }
        return;
    }
    if (walletType === "SPOT") {
        if (!(await cacheManager.getSettingBool("spotWallets", true))) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("SPOT wallets are disabled");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: `Spot wallets are currently disabled, so you cannot ${action}.`,
            });
        }
        return;
    }
    const extensions = await cacheManager.getExtensions();
    if (!extensions.has("ecosystem")) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ecosystem extension is not enabled");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `Ecosystem wallets are not available, so you cannot ${action}.`,
        });
    }
}
async function assertCurrencyEnabled(walletType, code, ctx) {
    let row = null;
    switch (walletType) {
        case "FIAT":
            row = await db_1.models.currency.findOne({ where: { id: code } });
            break;
        case "SPOT":
            row = await db_1.models.exchangeCurrency.findOne({ where: { currency: code } });
            break;
        case "ECO":
        case "FUTURES":
            row = await db_1.models.ecosystemToken.findOne({ where: { currency: code } });
            break;
        default:
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid wallet type: ${walletType}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid wallet type" });
    }
    if (!row) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Currency not found: ${code}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
    }
    if (!row.status) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Currency is disabled: ${code}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${code} is not currently available on this platform.`,
        });
    }
    return row;
}
async function resolveEnabledDepositMethod(methodId, ctx) {
    const method = methodId
        ? await db_1.models.depositMethod.findByPk(methodId)
        : null;
    if (method) {
        if (!method.status) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Deposit method is disabled: ${method.title}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${method.title} is not currently accepting deposits.`,
            });
        }
        return method;
    }
    const gateway = methodId
        ? await db_1.models.depositGateway.findByPk(methodId)
        : null;
    if (gateway) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Gateway id posted to the manual deposit route: ${gateway.alias}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${gateway.title} is a payment gateway and cannot be used to submit a ` +
                `manual deposit request. Pay through the gateway itself; your wallet is ` +
                `credited when the payment is confirmed.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.fail("Deposit method not found");
    throw (0, error_1.createError)({ statusCode: 404, message: "Deposit method not found" });
}
async function resolveEnabledWithdrawMethod(methodId, ctx) {
    const method = methodId
        ? await db_1.models.withdrawMethod.findByPk(methodId)
        : null;
    if (!method) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Withdrawal method not found: ${methodId}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Withdraw method not found" });
    }
    if (!method.status) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Withdrawal method is disabled: ${method.title}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${method.title} is not currently accepting withdrawals.`,
        });
    }
    return method;
}
