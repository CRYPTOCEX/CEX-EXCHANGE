"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETION_DISCLOSURE = void 0;
exports.getDeletionPreconditions = getDeletionPreconditions;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
function isPositive(value) {
    if (value === null || value === undefined)
        return false;
    const text = String(value).trim();
    if (text === "")
        return false;
    return /[1-9]/.test(text.replace(/[^0-9]/g, ""));
}
async function getDeletionPreconditions(userId) {
    const [wallets, openOrders, pending] = await Promise.all([
        db_1.models.wallet.findAll({
            where: { userId },
            attributes: ["currency", "type", "balance", "inOrder"],
        }),
        db_1.models.exchangeOrder.count({ where: { userId, status: "OPEN" } }),
        db_1.models.transaction.count({
            where: { userId, status: { [sequelize_1.Op.in]: ["PENDING", "PROCESSING"] } },
        }),
    ]);
    const held = wallets
        .map((w) => w.get({ plain: true }))
        .filter((w) => isPositive(w.balance) || isPositive(w.inOrder))
        .map((w) => ({
        currency: String(w.currency),
        type: String(w.type),
        balance: String(w.balance),
        inOrder: String(w.inOrder),
    }))
        .sort((a, b) => a.type === b.type ? a.currency.localeCompare(b.currency) : a.type.localeCompare(b.type));
    const blockers = [];
    if (openOrders > 0) {
        blockers.push({ kind: "OPEN_ORDERS", count: openOrders, route: "/trade/orders" });
    }
    const warnings = [];
    if (held.length > 0)
        warnings.push({ kind: "BALANCE", balances: held });
    if (pending > 0)
        warnings.push({ kind: "PENDING_TRANSACTIONS", count: pending });
    return {
        blockers,
        warnings,
        acknowledgementRequired: warnings.length > 0,
    };
}
exports.DELETION_DISCLOSURE = {
    removed: [
        "Access to the account: every active session is ended immediately.",
        "Your name, email address, phone number, profile picture and any linked wallet address.",
        "Google and wallet sign-in links, so neither can be used to reach the account again.",
        "Your public username, which is released for someone else to use.",
        "Push notification tokens, so no further notifications reach your devices.",
    ],
    retained: [
        "Transaction and wallet records, which financial regulations require be kept.",
        "Identity verification documents and their review history, for the same reason.",
        "Support tickets and their messages.",
    ],
};
