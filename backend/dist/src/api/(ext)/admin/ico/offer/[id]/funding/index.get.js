"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Funding Chart Data for an Offering",
    description: "Retrieves funding chart data (daily aggregated amounts with cumulative totals) for a specific ICO offering based on the specified time range. The data now includes valid funds (from all non-rejected transactions) and rejected funds.",
    operationId: "getAdminFundingChartData",
    tags: ["ICO", "Admin", "FundingChart"],
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Get ICO Offer Funding",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "The ID of the ICO offering.",
        },
        {
            index: 1,
            name: "range",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Time range for chart data: '7d' for current week, '30d' for current month, '90d' for three full months, or 'all' for all time (monthly, ensuring at least 12 months).",
        },
    ],
    responses: {
        200: {
            description: "Funding chart data retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                date: { type: "string" },
                                validAmount: { type: "number" },
                                validCumulative: { type: "number" },
                                rejectedAmount: { type: "number" },
                                rejectedCumulative: { type: "number" },
                                totalAmount: { type: "number" },
                                totalCumulative: { type: "number" },
                            },
                        },
                        description: "Array of funding data points including breakdown of valid and rejected funds.",
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "ICO offering not found" },
        500: { description: "Internal Server Error" },
    },
    permission: "view.ico.offer",
};
async function getDailyChartData(offerId, start, end) {
    const validRows = (await db_1.models.icoTransaction.findAll({
        attributes: [
            [
                (0, sequelize_1.literal)("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')"),
                "period",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), "raised"],
        ],
        where: {
            offeringId: offerId,
            createdAt: { [sequelize_1.Op.between]: [start, end] },
            status: { [sequelize_1.Op.not]: ["REJECTED"] },
        },
        group: ["period"],
        order: [["period", "ASC"]],
        raw: true,
    }));
    const rejectedRows = (await db_1.models.icoTransaction.findAll({
        attributes: [
            [
                (0, sequelize_1.literal)("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')"),
                "period",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), "raised"],
        ],
        where: {
            offeringId: offerId,
            createdAt: { [sequelize_1.Op.between]: [start, end] },
            status: "REJECTED",
        },
        group: ["period"],
        order: [["period", "ASC"]],
        raw: true,
    }));
    const validMap = validRows.reduce((acc, row) => {
        acc[row.period] = parseFloat(row.raised);
        return acc;
    }, {});
    const rejectedMap = rejectedRows.reduce((acc, row) => {
        acc[row.period] = parseFloat(row.raised);
        return acc;
    }, {});
    const chartData = [];
    let cumulativeValid = 0;
    let cumulativeRejected = 0;
    let cumulativeTotal = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const valid = validMap[dateStr] || 0;
        const rejected = rejectedMap[dateStr] || 0;
        const total = valid + rejected;
        cumulativeValid += valid;
        cumulativeRejected += rejected;
        cumulativeTotal += total;
        chartData.push({
            date: dateStr,
            validAmount: valid,
            validCumulative: cumulativeValid,
            rejectedAmount: rejected,
            rejectedCumulative: cumulativeRejected,
            totalAmount: total,
            totalCumulative: cumulativeTotal,
        });
    }
    return chartData;
}
async function getMonthlyChartData(offerId, start, end) {
    const validRows = (await db_1.models.icoTransaction.findAll({
        attributes: [
            [
                (0, sequelize_1.literal)("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')"),
                "period",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), "raised"],
        ],
        where: {
            offeringId: offerId,
            createdAt: { [sequelize_1.Op.gte]: start },
            status: { [sequelize_1.Op.not]: ["REJECTED"] },
        },
        group: ["period"],
        order: [["period", "ASC"]],
        raw: true,
    }));
    const rejectedRows = (await db_1.models.icoTransaction.findAll({
        attributes: [
            [
                (0, sequelize_1.literal)("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')"),
                "period",
            ],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), "raised"],
        ],
        where: {
            offeringId: offerId,
            createdAt: { [sequelize_1.Op.gte]: start },
            status: "REJECTED",
        },
        group: ["period"],
        order: [["period", "ASC"]],
        raw: true,
    }));
    const validMap = validRows.reduce((acc, row) => {
        acc[row.period] = parseFloat(row.raised);
        return acc;
    }, {});
    const rejectedMap = rejectedRows.reduce((acc, row) => {
        acc[row.period] = parseFloat(row.raised);
        return acc;
    }, {});
    const chartMonths = [];
    let cumulativeValid = 0;
    let cumulativeRejected = 0;
    let cumulativeTotal = 0;
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const dateStr = `${year}-${month}-01`;
        const valid = validMap[dateStr] || 0;
        const rejected = rejectedMap[dateStr] || 0;
        const total = valid + rejected;
        cumulativeValid += valid;
        cumulativeRejected += rejected;
        cumulativeTotal += total;
        chartMonths.push({
            date: dateStr,
            validAmount: valid,
            validCumulative: cumulativeValid,
            rejectedAmount: rejected,
            rejectedCumulative: cumulativeRejected,
            totalAmount: total,
            totalCumulative: cumulativeTotal,
        });
    }
    while (chartMonths.length < 12) {
        const first = chartMonths[0];
        const firstDate = new Date(first.date);
        firstDate.setMonth(firstDate.getMonth() - 1);
        const year = firstDate.getFullYear();
        const month = String(firstDate.getMonth() + 1).padStart(2, "0");
        const dateStr = `${year}-${month}-01`;
        chartMonths.unshift({
            date: dateStr,
            validAmount: 0,
            validCumulative: first.validCumulative,
            rejectedAmount: 0,
            rejectedCumulative: first.rejectedCumulative,
            totalAmount: 0,
            totalCumulative: first.totalCumulative,
        });
    }
    return chartMonths;
}
exports.default = async (data) => {
    const { user, params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const offerId = params.id;
    const offering = await db_1.models.icoTokenOffering.findOne({
        where: { id: offerId },
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "ICO offering not found." });
    }
    const now = new Date();
    const range = query.range || "30d";
    let chartData = [];
    if (range === "7d") {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() + diffToMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        chartData = await getDailyChartData(offerId, startOfWeek, endOfWeek);
    }
    else if (range === "30d") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        chartData = await getDailyChartData(offerId, startOfMonth, endOfMonth);
    }
    else if (range === "90d") {
        const startRange = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endRange = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        chartData = await getDailyChartData(offerId, startRange, endRange);
    }
    else {
        const earliestTx = (await db_1.models.icoTransaction.findOne({
            attributes: [
                [(0, sequelize_1.fn)("MIN", (0, sequelize_1.literal)("icoTransaction.createdAt")), "minDate"],
            ],
            where: { offeringId: offerId },
            raw: true,
        }));
        let startDateAll;
        if (earliestTx && earliestTx.minDate) {
            startDateAll = new Date(earliestTx.minDate);
        }
        else {
            startDateAll = new Date();
            startDateAll.setFullYear(startDateAll.getFullYear() - 1);
        }
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        if (startDateAll > twelveMonthsAgo) {
            startDateAll = twelveMonthsAgo;
        }
        chartData = await getMonthlyChartData(offerId, startDateAll, now);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Offer Funding retrieved successfully");
    return chartData;
};
