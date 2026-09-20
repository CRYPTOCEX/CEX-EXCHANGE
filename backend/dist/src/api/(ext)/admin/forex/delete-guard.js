"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWithdrawalsAreSafeToDelete = assertWithdrawalsAreSafeToDelete;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
async function assertWithdrawalsAreSafeToDelete(ids) {
    if (!(ids === null || ids === void 0 ? void 0 : ids.length))
        return;
    const open = await db_1.models.transaction.findAll({
        where: {
            id: { [sequelize_1.Op.in]: ids },
            type: "FOREX_WITHDRAW",
            status: "PENDING",
        },
        attributes: ["id", "amount"],
    });
    if (!open.length)
        return;
    const listed = open
        .map((t) => `${t.id} (${t.amount})`)
        .join(", ");
    throw (0, error_1.createError)({
        statusCode: 400,
        message: `${open.length} of these withdrawals ${open.length === 1 ? "is" : "are"} still pending: ${listed}. ` +
            `The amount has already left the user's forex account and is waiting on your decision — ` +
            `reject ${open.length === 1 ? "it" : "them"} to return the money, then delete.`,
    });
}
