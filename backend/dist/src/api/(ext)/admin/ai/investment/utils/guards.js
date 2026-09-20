"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIVE_INVESTMENT_STATUSES = void 0;
exports.assertPlansDeletable = assertPlansDeletable;
exports.assertDurationsDeletable = assertDurationsDeletable;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.LIVE_INVESTMENT_STATUSES = ["ACTIVE"];
const HISTORICAL_INVESTMENT_STATUSES = ["COMPLETED", "CANCELLED", "REJECTED"];
async function countDependents(column, ids) {
    if (!ids.length)
        return { live: 0, historical: 0 };
    const live = await db_1.models.aiInvestment.count({
        where: { [column]: { [sequelize_1.Op.in]: ids }, status: { [sequelize_1.Op.in]: exports.LIVE_INVESTMENT_STATUSES } },
        paranoid: false,
    });
    const historical = await db_1.models.aiInvestment.count({
        where: {
            [column]: { [sequelize_1.Op.in]: ids },
            status: { [sequelize_1.Op.in]: HISTORICAL_INVESTMENT_STATUSES },
        },
        paranoid: false,
    });
    return { live, historical };
}
function refuse(what, report, cascades) {
    const parts = [];
    if (report.live) {
        parts.push(`${report.live} active investment${report.live === 1 ? "" : "s"} still hold${report.live === 1 ? "s" : ""} user funds`);
    }
    if (report.historical) {
        parts.push(`${report.historical} completed or cancelled investment${report.historical === 1 ? "" : "s"} reference${report.historical === 1 ? "s" : ""} it`);
    }
    throw (0, error_1.createError)({
        statusCode: 409,
        message: `Cannot delete this ${what}: ${parts.join(", ")}. ` +
            (cascades
                ? `Deleting it would permanently destroy those investment records and the funds they represent. `
                : `Those investments could no longer be settled. `) +
            `Deactivate the ${what} instead so it stops being offered while existing investments run their course.`,
    });
}
async function assertPlansDeletable(ids) {
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    const report = await countDependents("planId", list);
    if (report.live || report.historical)
        refuse("plan", report, false);
}
async function assertDurationsDeletable(ids) {
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    const report = await countDependents("durationId", list);
    if (report.live || report.historical)
        refuse("duration", report, true);
}
