"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRestore = isRestore;
exports.assertForexAccountsAreSafeToDelete = assertForexAccountsAreSafeToDelete;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("../utils");
const delete_decision_1 = require("./delete-decision");
function isRestore(query) {
    return (query === null || query === void 0 ? void 0 : query.restore) === true || (query === null || query === void 0 ? void 0 : query.restore) === "true";
}
async function assertForexAccountsAreSafeToDelete(ids) {
    if (!(ids === null || ids === void 0 ? void 0 : ids.length))
        return;
    const accounts = (await db_1.models.forexAccount.findAll({
        where: { id: { [sequelize_1.Op.in]: ids } },
        attributes: ["id", "userId", "type", "balance", "currency", "accountId"],
        paranoid: false,
    }));
    if (!accounts.length)
        return;
    const userIds = [
        ...new Set(accounts.map((a) => a.userId).filter(Boolean)),
    ];
    const withdrawalRows = userIds.length
        ? await db_1.models.transaction.findAll({
            where: {
                userId: { [sequelize_1.Op.in]: userIds },
                type: "FOREX_WITHDRAW",
                status: "PENDING",
            },
            attributes: ["id", "userId", "amount", "metadata"],
        })
        : [];
    const pendingWithdrawals = withdrawalRows.map((row) => { var _a; var _b; return ({
        id: row.id,
        userId: row.userId,
        amount: row.amount,
        forexAccountId: (_b = (_a = (0, utils_1.parseMetadata)(row.metadata)) === null || _a === void 0 ? void 0 : _a.forexAccountId) !== null && _b !== void 0 ? _b : null,
    }); });
    const liveUserIds = [
        ...new Set(accounts
            .filter((a) => a.type === "LIVE" && a.userId)
            .map((a) => a.userId)),
    ];
    const activeInvestments = liveUserIds.length
        ? await db_1.models.forexInvestment.findAll({
            where: { userId: { [sequelize_1.Op.in]: liveUserIds }, status: "ACTIVE" },
            attributes: ["id", "userId", "amount"],
        })
        : [];
    const blockers = (0, delete_decision_1.blockersForForexAccountDelete)(accounts, pendingWithdrawals, activeInvestments);
    if (!blockers.length)
        return;
    throw (0, error_1.createError)({
        statusCode: 400,
        message: (0, delete_decision_1.describeAccountDeleteBlockers)(blockers),
    });
}
