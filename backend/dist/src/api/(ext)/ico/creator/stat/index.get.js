"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Creator Stats",
    description: "Retrieves aggregated statistics (counts, growth metrics) for the authenticated creator's ICO offerings, " +
        "and calculates total raised and raise growth from all transactions except those with a 'REJECTED' status.",
    operationId: "getCreatorStatsStats",
    tags: ["ICO", "Creator", "Stats"],
    logModule: "ICO",
    logTitle: "Get Creator Stats",
    requiresAuth: true,
    responses: {
        200: {
            description: "Creator statistics retrieved successfully",
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
                            currentRaised: { type: "number" },
                            previousRaised: { type: "number" },
                            offeringsGrowth: { type: "number" },
                            activeGrowth: { type: "number" },
                            raiseGrowth: { type: "number" }
                        }
                    }
                }
            }
        },
        401: {
            description: "Unauthorized"
        },
        500: {
            description: "Internal server error"
        }
    }
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching creator stats");
    const userId = user.id;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const offeringStatsPromise = db_1.models.icoTokenOffering.findOne({
        attributes: [
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "totalOfferings"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`status\` = 'PENDING' THEN 1 ELSE 0 END`)),
                "pendingOfferings",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`status\` = 'ACTIVE' THEN 1 ELSE 0 END`)),
                "activeOfferings",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`status\` = 'SUCCESS' THEN 1 ELSE 0 END`)),
                "completedOfferings",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`status\` = 'REJECTED' THEN 1 ELSE 0 END`)),
                "rejectedOfferings",
            ],
        ],
        where: { userId },
        raw: true,
    });
    const monthStatsPromise = db_1.models.icoTokenOffering.findOne({
        attributes: [
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`)),
                "currentOfferingsCount",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' AND \`icoTokenOffering\`.\`status\` = 'ACTIVE' THEN 1 ELSE 0 END`)),
                "currentActive",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`)),
                "currentTotal",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`)),
                "previousOfferingsCount",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND \`icoTokenOffering\`.\`status\` = 'ACTIVE' THEN 1 ELSE 0 END`)),
                "previousActive",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTokenOffering\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`)),
                "previousTotal",
            ],
        ],
        where: { userId },
        raw: true,
    });
    const transactionStatsPromise = db_1.models.icoTransaction.findOne({
        attributes: [
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTransaction\`.\`status\` NOT IN ('REJECTED') THEN \`icoTransaction\`.\`price\` * \`icoTransaction\`.\`amount\` ELSE 0 END`)),
                "totalRaised",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTransaction\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' AND \`icoTransaction\`.\`status\` NOT IN ('REJECTED') THEN \`icoTransaction\`.\`price\` * \`icoTransaction\`.\`amount\` ELSE 0 END`)),
                "currentRaised",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN \`icoTransaction\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND \`icoTransaction\`.\`status\` NOT IN ('REJECTED') THEN \`icoTransaction\`.\`price\` * \`icoTransaction\`.\`amount\` ELSE 0 END`)),
                "previousRaised",
            ],
        ],
        include: [
            {
                model: db_1.models.icoTokenOffering,
                as: "offering",
                attributes: [],
                where: { userId },
            },
        ],
        raw: true,
    });
    const [offeringStatsResult, monthStatsResult, transactionStatsResult] = await Promise.all([
        offeringStatsPromise,
        monthStatsPromise,
        transactionStatsPromise,
    ]);
    const offeringStats = offeringStatsResult;
    const monthStats = monthStatsResult;
    const transactionStats = transactionStatsResult;
    const totalOfferings = parseInt((_a = offeringStats === null || offeringStats === void 0 ? void 0 : offeringStats.totalOfferings) !== null && _a !== void 0 ? _a : "0", 10) || 0;
    const pendingOfferings = parseInt((_b = offeringStats === null || offeringStats === void 0 ? void 0 : offeringStats.pendingOfferings) !== null && _b !== void 0 ? _b : "0", 10) || 0;
    const activeOfferings = parseInt((_c = offeringStats === null || offeringStats === void 0 ? void 0 : offeringStats.activeOfferings) !== null && _c !== void 0 ? _c : "0", 10) || 0;
    const completedOfferings = parseInt((_d = offeringStats === null || offeringStats === void 0 ? void 0 : offeringStats.completedOfferings) !== null && _d !== void 0 ? _d : "0", 10) || 0;
    const rejectedOfferings = parseInt((_e = offeringStats === null || offeringStats === void 0 ? void 0 : offeringStats.rejectedOfferings) !== null && _e !== void 0 ? _e : "0", 10) || 0;
    const currentOfferingsCount = parseInt((_f = monthStats === null || monthStats === void 0 ? void 0 : monthStats.currentOfferingsCount) !== null && _f !== void 0 ? _f : "0", 10) || 0;
    const previousOfferingsCount = parseInt((_g = monthStats === null || monthStats === void 0 ? void 0 : monthStats.previousOfferingsCount) !== null && _g !== void 0 ? _g : "0", 10) || 0;
    const currentActive = parseInt((_h = monthStats === null || monthStats === void 0 ? void 0 : monthStats.currentActive) !== null && _h !== void 0 ? _h : "0", 10) || 0;
    const previousActive = parseInt((_j = monthStats === null || monthStats === void 0 ? void 0 : monthStats.previousActive) !== null && _j !== void 0 ? _j : "0", 10) || 0;
    const currentTotal = parseInt((_k = monthStats === null || monthStats === void 0 ? void 0 : monthStats.currentTotal) !== null && _k !== void 0 ? _k : "0", 10) || 0;
    const previousTotal = parseInt((_l = monthStats === null || monthStats === void 0 ? void 0 : monthStats.previousTotal) !== null && _l !== void 0 ? _l : "0", 10) || 0;
    const totalRaised = parseFloat((_m = transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.totalRaised) !== null && _m !== void 0 ? _m : "0") || 0;
    const currentRaised = parseFloat((_o = transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.currentRaised) !== null && _o !== void 0 ? _o : "0") || 0;
    const previousRaised = parseFloat((_p = transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.previousRaised) !== null && _p !== void 0 ? _p : "0") || 0;
    const offeringGrowth = previousOfferingsCount > 0
        ? Math.round(((currentOfferingsCount - previousOfferingsCount) /
            previousOfferingsCount) *
            100)
        : 0;
    const raiseGrowth = previousRaised > 0
        ? Math.round(((currentRaised - previousRaised) / previousRaised) * 100)
        : 0;
    const currentSuccessRate = currentTotal > 0 ? Math.round((currentActive / currentTotal) * 100) : 0;
    const previousSuccessRate = previousTotal > 0 ? Math.round((previousActive / previousTotal) * 100) : 0;
    const successRate = totalOfferings > 0
        ? Math.round((activeOfferings / totalOfferings) * 100)
        : 0;
    const successRateGrowth = previousSuccessRate
        ? currentSuccessRate - previousSuccessRate
        : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Creator Stats retrieved successfully");
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
    };
};
