"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isForce = isForce;
exports.assertNotInUseByInvestments = assertNotInUseByInvestments;
exports.assertInvestmentsAreSafeToDelete = assertInvestmentsAreSafeToDelete;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
function isForce(query) {
    return (query === null || query === void 0 ? void 0 : query.force) === true || (query === null || query === void 0 ? void 0 : query.force) === "true";
}
const COLUMN = {
    plan: "planId",
    duration: "durationId",
};
async function assertNotInUseByInvestments(scope, ids, force = false) {
    if (!(ids === null || ids === void 0 ? void 0 : ids.length))
        return;
    const hardDelete = force || scope === "duration";
    const where = { [COLUMN[scope]]: { [sequelize_1.Op.in]: ids } };
    if (!hardDelete)
        where.status = "ACTIVE";
    const blocking = await db_1.models.forexInvestment.findAll({
        where,
        attributes: ["id", "status", COLUMN[scope]],
        paranoid: false,
    });
    if (!blocking.length)
        return;
    const active = blocking.filter((i) => i.status === "ACTIVE").length;
    throw (0, error_1.createError)({
        statusCode: 400,
        message: hardDelete
            ? `This ${scope} is referenced by ${blocking.length} investment${blocking.length === 1 ? "" : "s"} ` +
                `(${active} still active). Permanently deleting it would cascade those rows out of the database ` +
                `along with the record of the money they moved.`
            : `This ${scope} is in use by ${active} active investment${active === 1 ? "" : "s"}. ` +
                `Settle or cancel them first — cancelling returns each user's principal — then delete it.`,
    });
}
async function assertInvestmentsAreSafeToDelete(ids) {
    if (!(ids === null || ids === void 0 ? void 0 : ids.length))
        return;
    const active = await db_1.models.forexInvestment.findAll({
        where: { id: { [sequelize_1.Op.in]: ids }, status: "ACTIVE" },
        attributes: ["id", "amount"],
    });
    if (!active.length)
        return;
    const total = active.reduce((sum, i) => { var _a; return sum + Number((_a = i.amount) !== null && _a !== void 0 ? _a : 0); }, 0);
    throw (0, error_1.createError)({
        statusCode: 400,
        message: `${active.length} of these investment${active.length === 1 ? " is" : "s are"} still active and ` +
            `hold${active.length === 1 ? "s" : ""} ${total} of user principal. Deleting ` +
            `${active.length === 1 ? "it" : "them"} would take ${active.length === 1 ? "it" : "them"} out of the ` +
            `settlement cron's reach and the money would never come back. Cancel ` +
            `${active.length === 1 ? "it" : "them"} first — that refunds the principal — then delete.`,
    });
}
