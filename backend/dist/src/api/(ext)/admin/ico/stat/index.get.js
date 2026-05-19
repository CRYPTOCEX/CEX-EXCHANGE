"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Admin Stats",
    description: "Retrieves aggregated statistics for the ICO admin dashboard.",
    operationId: "getAdminStats",
    tags: ["ICO", "Admin", "Stats"],
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Get ICO Stats",
    responses: {
        200: {
            description: "Admin stats retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalOfferings: { type: "number" },
                            pendingOfferings: { type: "number" },
                            activeOfferings: { type: "number" },
                            completedOfferings: { type: "number" },
                            rejectedOfferings: { type: "number" },
                            totalRaised: { type: "number" },
                            offeringGrowth: { type: "number" },
                            raiseGrowth: { type: "number" },
                            successRate: { type: "number" },
                            successRateGrowth: { type: "number" },
                            recentActivity: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        type: { type: "string" },
                                        offeringId: { type: "string" },
                                        offeringName: { type: "string" },
                                        admin: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                avatar: { type: "string" },
                                            },
                                        },
                                        timestamp: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized – Admin privileges required." },
        500: { description: "Internal Server Error" },
    },
    permission: "access.ico.stat",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const [offeringsStats, totalRaisedRow, offeringsGrowthStats, raiseGrowthStats, successRateStats, recentActivities,] = (await Promise.all([
        db_1.models.icoTokenOffering.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "totalOfferings"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END")),
                    "pendingOfferings",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END")),
                    "activeOfferings",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END")),
                    "completedOfferings",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END")),
                    "rejectedOfferings",
                ],
            ],
            raw: true,
        }),
        db_1.models.icoTransaction.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "totalReleased"]],
            where: { status: { [sequelize_1.Op.not]: ["REJECTED"] } },
            raw: true,
        }),
        db_1.models.icoTokenOffering.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`)),
                    "currentOfferings",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`)),
                    "previousOfferings",
                ],
            ],
            raw: true,
        }),
        db_1.models.icoTransaction.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`)),
                    "currentInvested",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`)),
                    "previousInvested",
                ],
            ],
            raw: true,
        }),
        db_1.models.icoTokenOffering.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`)),
                    "currentTotal",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status = 'ACTIVE' THEN 1 ELSE 0 END`)),
                    "currentActive",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`)),
                    "previousTotal",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status = 'ACTIVE' THEN 1 ELSE 0 END`)),
                    "previousActive",
                ],
            ],
            raw: true,
        }),
        db_1.models.icoAdminActivity.findAll({
            include: [
                {
                    model: db_1.models.user,
                    as: "admin",
                    attributes: ["firstName", "lastName", "avatar"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 5,
            raw: true,
        }),
    ]));
    const totalOfferings = parseInt(offeringsStats.totalOfferings, 10) || 0;
    const pendingOfferings = parseInt(offeringsStats.pendingOfferings, 10) || 0;
    const activeOfferings = parseInt(offeringsStats.activeOfferings, 10) || 0;
    const completedOfferings = parseInt(offeringsStats.completedOfferings, 10) || 0;
    const rejectedOfferings = parseInt(offeringsStats.rejectedOfferings, 10) || 0;
    const totalRaised = parseFloat(totalRaisedRow.totalReleased) || 0;
    const currentOfferings = parseInt(offeringsGrowthStats.currentOfferings, 10) || 0;
    const previousOfferings = parseInt(offeringsGrowthStats.previousOfferings, 10) || 0;
    const offeringGrowth = previousOfferings > 0
        ? Math.round(((currentOfferings - previousOfferings) / previousOfferings) * 100)
        : 0;
    const currentInvested = parseFloat(raiseGrowthStats.currentInvested) || 0;
    const previousInvested = parseFloat(raiseGrowthStats.previousInvested) || 0;
    const raiseGrowth = previousInvested > 0
        ? Math.round(((currentInvested - previousInvested) / previousInvested) * 100)
        : 0;
    const successRate = totalOfferings > 0
        ? Math.round((activeOfferings / totalOfferings) * 100)
        : 0;
    const currentTotal = parseInt(successRateStats.currentTotal, 10) || 0;
    const currentActive = parseInt(successRateStats.currentActive, 10) || 0;
    const previousTotal = parseInt(successRateStats.previousTotal, 10) || 0;
    const previousActive = parseInt(successRateStats.previousActive, 10) || 0;
    const currentSuccessRate = currentTotal > 0 ? Math.round((currentActive / currentTotal) * 100) : 0;
    const previousSuccessRate = previousTotal > 0 ? Math.round((previousActive / previousTotal) * 100) : 0;
    const successRateGrowth = previousSuccessRate
        ? currentSuccessRate - previousSuccessRate
        : 0;
    const recentActivity = recentActivities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        offeringId: activity.offeringId,
        offeringName: activity.offeringName,
        adminId: activity.adminId,
        admin: {
            name: `${activity["admin.firstName"]} ${activity["admin.lastName"]}`,
            avatar: activity["admin.avatar"],
        },
        timestamp: activity.createdAt,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Stats retrieved successfully");
    return {
        totalOfferings,
        pendingOfferings,
        activeOfferings,
        completedOfferings,
        rejectedOfferings,
        totalRaised,
        offeringGrowth,
        raiseGrowth,
        successRate,
        successRateGrowth,
        recentActivity,
    };
};
