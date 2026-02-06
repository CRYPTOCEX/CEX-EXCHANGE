"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get ICO Platform Statistics",
    description: "Retrieves ICO platform statistics including total raised funds, growth percentage, successful offerings count, total investors, and average ROI. Calculations are now based on all non-rejected transactions and monthly comparisons.",
    operationId: "getIcoStats",
    tags: ["ICO", "Stats"],
    logModule: "ICO",
    logTitle: "Get ICO Stats",
    requiresAuth: false,
    responses: {
        200: {
            description: "ICO platform statistics retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            projectsLaunched: { type: "number" },
                            totalRaised: { type: "number" },
                            totalInvestors: { type: "number" },
                            raisedGrowth: { type: "number" },
                            successfulOfferings: { type: "number" },
                            offeringsGrowth: { type: "number" },
                            investorsGrowth: { type: "number" },
                            averageROI: { type: "number" },
                            roiGrowth: { type: "number" },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ICO stats");
    if (!db_1.models.icoTransaction || !db_1.models.icoTokenOffering) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Model(s) missing: ` +
                (!db_1.models.icoTransaction ? "icoTransaction " : "") +
                (!db_1.models.icoTokenOffering ? "icoTokenOffering " : ""),
        });
    }
    const investmentModel = db_1.models.icoTransaction;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const [transactionStats, offeringsStats, investorStats] = await Promise.all([
        db_1.models.icoTransaction.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status NOT IN ('REJECTED') THEN price * amount ELSE 0 END")),
                    "totalRaised",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`)),
                    "currentRaised",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`)),
                    "previousRaised",
                ],
            ],
            raw: true,
        }),
        db_1.models.icoTokenOffering.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END")),
                    "successfulOfferings",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status = 'SUCCESS' THEN 1 ELSE 0 END`)),
                    "currentSuccessfulOfferings",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status = 'SUCCESS' THEN 1 ELSE 0 END`)),
                    "previousSuccessfulOfferings",
                ],
            ],
            raw: true,
        }),
        investmentModel.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT userId")), "totalInvestors"],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`DISTINCT CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN userId ELSE NULL END`)),
                    "currentInvestors",
                ],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`DISTINCT CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN userId ELSE NULL END`)),
                    "previousInvestors",
                ],
            ],
            raw: true,
        }),
    ]);
    const transactionStatsData = transactionStats;
    const totalRaised = parseFloat((_a = transactionStatsData === null || transactionStatsData === void 0 ? void 0 : transactionStatsData.totalRaised) !== null && _a !== void 0 ? _a : '0') || 0;
    const currentRaised = parseFloat((_b = transactionStatsData === null || transactionStatsData === void 0 ? void 0 : transactionStatsData.currentRaised) !== null && _b !== void 0 ? _b : '0') || 0;
    const previousRaised = parseFloat((_c = transactionStatsData === null || transactionStatsData === void 0 ? void 0 : transactionStatsData.previousRaised) !== null && _c !== void 0 ? _c : '0') || 0;
    const raisedGrowth = previousRaised > 0
        ? Math.round(((currentRaised - previousRaised) / previousRaised) * 100)
        : 0;
    const offeringsStatsData = offeringsStats;
    const successfulOfferings = parseInt((_d = offeringsStatsData === null || offeringsStatsData === void 0 ? void 0 : offeringsStatsData.successfulOfferings) !== null && _d !== void 0 ? _d : '0', 10) || 0;
    const currentSuccessfulOfferings = parseInt((_e = offeringsStatsData === null || offeringsStatsData === void 0 ? void 0 : offeringsStatsData.currentSuccessfulOfferings) !== null && _e !== void 0 ? _e : '0', 10) || 0;
    const previousSuccessfulOfferings = parseInt((_f = offeringsStatsData === null || offeringsStatsData === void 0 ? void 0 : offeringsStatsData.previousSuccessfulOfferings) !== null && _f !== void 0 ? _f : '0', 10) || 0;
    const offeringsGrowth = previousSuccessfulOfferings > 0
        ? Math.round(((currentSuccessfulOfferings - previousSuccessfulOfferings) /
            previousSuccessfulOfferings) *
            100)
        : 0;
    const investorStatsData = investorStats;
    const totalInvestors = parseInt((_g = investorStatsData === null || investorStatsData === void 0 ? void 0 : investorStatsData.totalInvestors) !== null && _g !== void 0 ? _g : '0', 10) || 0;
    const currentInvestors = parseInt((_h = investorStatsData === null || investorStatsData === void 0 ? void 0 : investorStatsData.currentInvestors) !== null && _h !== void 0 ? _h : '0', 10) || 0;
    const previousInvestors = parseInt((_j = investorStatsData === null || investorStatsData === void 0 ? void 0 : investorStatsData.previousInvestors) !== null && _j !== void 0 ? _j : '0', 10) || 0;
    const investorsGrowth = previousInvestors > 0
        ? Math.round(((currentInvestors - previousInvestors) / previousInvestors) * 100)
        : 0;
    const averageROI = 0;
    const roiGrowth = 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Stats retrieved successfully");
    return {
        projectsLaunched: successfulOfferings,
        totalRaised,
        totalInvestors,
        raisedGrowth,
        successfulOfferings,
        offeringsGrowth,
        investorsGrowth,
        averageROI,
        roiGrowth,
    };
};
