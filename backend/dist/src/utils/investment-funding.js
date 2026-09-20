"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFundingWallet = resolveFundingWallet;
exports.fundingRefusalMessage = fundingRefusalMessage;
exports.shouldAlertUnsettleable = shouldAlertUnsettleable;
exports.resetUnsettleableAlerts = resetUnsettleableAlerts;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
async function ensureWallet(userId, type, currency, transaction) {
    const existing = await db_1.models.wallet.findOne({
        where: { userId, type, currency },
        transaction,
        lock: sequelize_1.Transaction.LOCK.UPDATE,
    });
    if (existing)
        return existing;
    const created = await wallet_1.walletCreationService.getOrCreateWallet(userId, type, currency, transaction);
    return await db_1.models.wallet.findByPk(created.id, {
        transaction,
        lock: sequelize_1.Transaction.LOCK.UPDATE,
    });
}
async function resolveFundingWallet(params) {
    const { referenceId, fundingType, expectedUserId, fallback, transaction } = params;
    const funding = await db_1.models.transaction.findOne({
        where: { referenceId, type: fundingType },
        order: [["createdAt", "ASC"]],
        paranoid: false,
        transaction,
    });
    if (!funding)
        return { ok: false, refusal: "NEVER_FUNDED" };
    let recreated = false;
    let wallet = null;
    if (funding.walletId) {
        wallet = await db_1.models.wallet.findByPk(funding.walletId, {
            transaction,
            lock: sequelize_1.Transaction.LOCK.UPDATE,
        });
        if (!wallet) {
            const archived = await db_1.models.wallet.findByPk(funding.walletId, {
                transaction,
                paranoid: false,
            });
            if (archived) {
                wallet = await ensureWallet(archived.userId, archived.type, archived.currency, transaction);
                recreated = true;
            }
        }
    }
    if (!wallet && (fallback === null || fallback === void 0 ? void 0 : fallback.currency) && (fallback === null || fallback === void 0 ? void 0 : fallback.walletType)) {
        const owner = expectedUserId !== null && expectedUserId !== void 0 ? expectedUserId : funding.userId;
        if (owner) {
            wallet = await ensureWallet(owner, fallback.walletType, fallback.currency, transaction);
            recreated = true;
        }
    }
    if (!wallet)
        return { ok: false, refusal: "NEVER_FUNDED" };
    if (expectedUserId && wallet.userId !== expectedUserId) {
        return { ok: false, refusal: "OWNER_MISMATCH" };
    }
    return { ok: true, value: { wallet, funding, recreated } };
}
function fundingRefusalMessage(refusal) {
    if (refusal === "OWNER_MISMATCH") {
        return ("the funding transaction names a wallet belonging to another user, so no payout " +
            "can be made from it. This needs manual reconciliation.");
    }
    return ("no funding transaction exists for it, so its principal was never debited from a " +
        "wallet and there is nothing to pay back. Rows created directly in the admin " +
        "investment table are the usual source: settling one would credit money the " +
        "platform never received.");
}
const alerted = new Set();
function shouldAlertUnsettleable(investmentId) {
    if (alerted.has(investmentId))
        return false;
    alerted.add(investmentId);
    return true;
}
function resetUnsettleableAlerts() {
    alerted.clear();
}
