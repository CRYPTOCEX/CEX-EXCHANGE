"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Portfolio Performance Data",
    description: "Generates historical performance data and calculates metrics for the user's ICO portfolio based on real transactions and token offering data. The timeframe (e.g. '1W', '1M', '3M', '1Y', 'ALL') specifies the period to compute over. Additionally, a metric for rejected investments is provided.",
    operationId: "getPortfolioPerformanceData",
    tags: ["ICO", "Portfolio", "Performance"],
    logModule: "ICO",
    logTitle: "Get Portfolio Performance",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "timeframe",
            in: "query",
            required: false,
            schema: {
                type: "string",
                description: "Timeframe for performance data (e.g. '1W', '1M', '3M', '1Y', 'ALL').",
            },
        },
    ],
    responses: {
        200: {
            description: "Portfolio performance data retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            performanceData: {
                                type: "array",
                                description: "Array of daily performance data points.",
                            },
                            metrics: {
                                type: "object",
                                description: "Calculated portfolio performance metrics.",
                                properties: {
                                    initialValue: { type: "number" },
                                    currentValue: { type: "number" },
                                    absoluteChange: { type: "number" },
                                    percentageChange: { type: "number" },
                                    bestDay: {
                                        type: "object",
                                        properties: {
                                            date: { type: "string" },
                                            change: { type: "number" },
                                        },
                                    },
                                    worstDay: {
                                        type: "object",
                                        properties: {
                                            date: { type: "string" },
                                            change: { type: "number" },
                                        },
                                    },
                                    volatility: { type: "number" },
                                    sharpeRatio: { type: "number" },
                                    rejectedInvested: { type: "number" },
                                    allocation: {
                                        type: "object",
                                        properties: {
                                            byToken: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        name: { type: "string" },
                                                        percentage: { type: "number" },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching get portfolio performance");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const timeframe = query.timeframe || "1M";
    let days;
    switch (timeframe) {
        case "1W":
            days = 7;
            break;
        case "1M":
            days = 30;
            break;
        case "3M":
            days = 90;
            break;
        case "1Y":
            days = 365;
            break;
        case "ALL":
            days = 3650;
            break;
        default:
            days = 30;
    }
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days);
    const performanceData = await (0, utils_1.getUserPortfolioHistory)(user.id, startDate, endDate, ctx);
    if (!performanceData || performanceData.length === 0) {
        throw (0, error_1.createError)({ statusCode: 404, message: "No performance data available" });
    }
    const initialValue = performanceData[0].value;
    const finalValue = performanceData[performanceData.length - 1].value;
    const absoluteChange = finalValue - initialValue;
    const percentageChange = initialValue > 0 ? (absoluteChange / initialValue) * 100 : 0;
    let bestDayReturn = Number.NEGATIVE_INFINITY;
    let bestDayDate = "";
    let worstDayReturn = Number.POSITIVE_INFINITY;
    let worstDayDate = "";
    const dailyReturns = [];
    for (let i = 1; i < performanceData.length; i++) {
        const prev = performanceData[i - 1].value;
        const curr = performanceData[i].value;
        const ret = prev > 0 ? (curr - prev) / prev : 0;
        dailyReturns.push(ret);
        if (ret > bestDayReturn) {
            bestDayReturn = ret;
            bestDayDate = performanceData[i].date;
        }
        if (ret < worstDayReturn) {
            worstDayReturn = ret;
            worstDayDate = performanceData[i].date;
        }
    }
    let annualizedVolatility = 0;
    let sharpeRatio = 0;
    if (dailyReturns.length > 0) {
        const meanReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
            dailyReturns.length;
        const stdDev = Math.sqrt(variance);
        annualizedVolatility = stdDev * Math.sqrt(252) * 100;
        const annualizedReturn = initialValue > 0
            ? Math.pow(finalValue / initialValue, 365 / days) - 1
            : 0;
        const riskFreeRate = 0.02;
        sharpeRatio =
            annualizedVolatility !== 0
                ? (annualizedReturn - riskFreeRate) / (annualizedVolatility / 100)
                : 0;
    }
    const { allocationByToken } = await (0, utils_1.getAllocationByToken)(user.id, endDate, ctx);
    const rejectedTransactions = await db_1.models.icoTransaction.findAll({
        where: {
            userId: user.id,
            createdAt: { [sequelize_1.Op.lte]: endDate },
            status: "REJECTED",
        },
        raw: true,
    });
    const rejectedInvested = rejectedTransactions.reduce((sum, tx) => {
        return sum + tx.amount * tx.price;
    }, 0);
    const metrics = {
        initialValue,
        currentValue: finalValue,
        absoluteChange,
        percentageChange,
        bestDay: { date: bestDayDate, change: bestDayReturn * 100 },
        worstDay: { date: worstDayDate, change: worstDayReturn * 100 },
        volatility: annualizedVolatility,
        sharpeRatio,
        allocation: {
            byToken: allocationByToken,
        },
        rejectedInvested,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Portfolio Performance retrieved successfully");
    return { performanceData, metrics };
};
