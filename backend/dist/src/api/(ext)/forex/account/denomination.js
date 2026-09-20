"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertLiveAccount = assertLiveAccount;
exports.assertAccountDenomination = assertAccountDenomination;
exports.accountDenomination = accountDenomination;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
function assertLiveAccount(account) {
    var _a;
    if ((account === null || account === void 0 ? void 0 : account.type) !== "LIVE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This is a ${(_a = account === null || account === void 0 ? void 0 : account.type) !== null && _a !== void 0 ? _a : "non-live"} account. Only a LIVE forex account can move real funds.`,
        });
    }
}
async function assertAccountDenomination(account, requested, transaction) {
    var _a, _b;
    const currency = String((_a = requested.currency) !== null && _a !== void 0 ? _a : "").trim();
    const walletType = String((_b = requested.walletType) !== null && _b !== void 0 ? _b : "").trim();
    if (!currency || !walletType) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A currency and wallet type are required",
        });
    }
    const boundCurrency = account.currency ? String(account.currency) : null;
    const boundWalletType = account.walletType ? String(account.walletType) : null;
    if (!boundCurrency || !boundWalletType) {
        await db_1.models.forexAccount.update({ currency, walletType }, { where: { id: account.id }, transaction });
        account.currency = currency;
        account.walletType = walletType;
        return;
    }
    if (boundCurrency !== currency || boundWalletType !== walletType) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This forex account holds ${boundWalletType} ${boundCurrency}. ` +
                `Withdraw the remaining balance before funding it with ${walletType} ${currency}, ` +
                `or use a separate account.`,
        });
    }
}
function accountDenomination(account) {
    if (!(account === null || account === void 0 ? void 0 : account.currency) || !(account === null || account === void 0 ? void 0 : account.walletType))
        return null;
    return {
        currency: String(account.currency),
        walletType: String(account.walletType),
    };
}
