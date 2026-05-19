"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMetadata = parseMetadata;
exports.updateForexAccountBalance = updateForexAccountBalance;
exports.updateWalletBalance = updateWalletBalance;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
function parseMetadata(metadataString) {
    let metadata = {};
    if (!metadataString) {
        return metadata;
    }
    try {
        const cleanedString = metadataString.replace(/\\/g, "");
        metadata = JSON.parse(cleanedString) || {};
    }
    catch (e) {
        console_1.logger.error("FOREX", "Invalid JSON in metadata", e);
    }
    return metadata;
}
async function updateForexAccountBalance(account, cost, refund, t, ctx) {
    var _a, _b, _c, _d, _e, _f;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating forex account");
        if (!account || !account.id) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid forex account provided",
            });
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `${refund ? "Refunding" : "Deducting"} ${cost} from forex account balance`);
        let balance = Number(account.balance) || 0;
        balance = refund ? balance + cost : balance - cost;
        if (balance < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Insufficient forex account balance",
            });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Updating forex account balance in database");
        await db_1.models.forexAccount.update({ balance }, { where: { id: account.id }, transaction: t });
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Fetching updated forex account");
        const updatedAccount = await db_1.models.forexAccount.findOne({
            where: { id: account.id },
            transaction: t,
        });
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, "Forex account balance updated successfully");
        return updatedAccount;
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message);
        throw error;
    }
}
async function updateWalletBalance(wallet, cost, refund, t, ctx, originatingId) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating wallet");
        if (!wallet || !wallet.id) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid wallet provided",
            });
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `${refund ? "Refunding" : "Deducting"} ${cost} from wallet balance via wallet service`);
        if (!refund) {
            const walletBalance = Number(wallet.balance) || 0;
            if (walletBalance < cost) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Insufficient wallet balance",
                });
            }
        }
        if (!originatingId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "updateWalletBalance (forex) requires an originatingId (stable admin-action id) to produce a retry-safe idempotency key.",
            });
        }
        const scopeId = originatingId;
        const idempotencyKey = `admin_forex_wallet_${wallet.id}_${refund ? 'credit' : 'debit'}_${scopeId}`;
        if (refund) {
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: cost,
                operationType: "REFUND",
                description: `Admin forex withdrawal refund - ${cost} ${wallet.currency}`,
                metadata: {
                    source: "admin_forex",
                    action: "refund",
                },
                transaction: t,
            });
        }
        else {
            await wallet_1.walletService.debit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: cost,
                operationType: "FOREX_WITHDRAW",
                description: `Admin forex withdrawal - ${cost} ${wallet.currency}`,
                metadata: {
                    source: "admin_forex",
                    action: "debit",
                },
                transaction: t,
            });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Wallet balance updated successfully");
        return wallet;
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
}
