"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWalletsNotSystemOwned = assertWalletsNotSystemOwned;
exports.assertWalletsAreEmpty = assertWalletsAreEmpty;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
async function assertWalletsNotSystemOwned(ids, action) {
    if (!ids || ids.length === 0)
        return;
    const wallets = await db_1.models.wallet.findAll({
        where: { id: { [sequelize_1.Op.in]: ids } },
        attributes: ["id", "userId", "currency", "type"],
        paranoid: false,
    });
    const system = wallets.filter((w) => (0, system_accounts_1.isSystemAccountId)(w.userId));
    if (system.length === 0)
        return;
    const detail = system.map((w) => `${w.type} ${w.currency}`).join("; ");
    throw (0, error_1.createError)({
        statusCode: 403,
        message: `This wallet belongs to ${(0, system_accounts_1.describeSystemAccount)(system[0].userId)} (${detail}); ` +
            `it cannot be ${action}. The pool-backing treasury and the AI market maker pool are ` +
            `operated only by the settlement engine and the market maker; their wallets hold real ` +
            `keys and margin and are never deleted, frozen or edited by hand.`,
    });
}
async function assertWalletsAreEmpty(ids) {
    if (!ids || ids.length === 0)
        return;
    await assertWalletsNotSystemOwned(ids, "deleted, restored or purged");
    const wallets = await db_1.models.wallet.findAll({
        where: { id: { [sequelize_1.Op.in]: ids } },
        attributes: ["id", "userId", "currency", "type", "balance", "inOrder"],
        paranoid: false,
    });
    const funded = wallets.filter((w) => {
        const balance = Number(w.balance) || 0;
        const inOrder = Number(w.inOrder) || 0;
        return balance > 0 || inOrder > 0;
    });
    if (funded.length === 0)
        return;
    const detail = funded
        .map((w) => {
        const balance = Number(w.balance) || 0;
        const inOrder = Number(w.inOrder) || 0;
        const held = inOrder > 0 ? ` (${inOrder} held in orders)` : "";
        return `${w.type} ${w.currency}: ${balance}${held}`;
    })
        .join("; ");
    throw (0, error_1.createError)({
        statusCode: 400,
        message: `Cannot delete ${funded.length} wallet(s) that still hold funds — ${detail}. ` +
            `Deleting a funded wallet makes the balance unreachable and blocks the user ` +
            `from ever holding that currency again. Move the balance out first ` +
            `(withdraw, transfer, or an admin balance adjustment), then delete.`,
    });
}
