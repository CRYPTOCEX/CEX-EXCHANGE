"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Creator Chart Data",
    description: "Retrieves chart data (daily, weekly, or monthly performance) for the authenticated creator's ICO offerings based on a specified time range.",
    operationId: "getCreatorStatsChart",
    tags: ["ICO", "Creator", "Stats"],
    logModule: "ICO",
    logTitle: "Get Creator Performance",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "range",
            in: "query",
            description: "Time range for chart data: '7d' for current week (Monday–Sunday), '30d' for current month (daily), '90d' for 3 full months (from start of two months before current month till end of current month), or 'all' for all time (monthly, extended to at least 12 months).",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Creator chart data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                amount: { type: "number", description: "Amount raised for that period" }
                            }
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
const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const formatMonth = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
};
async function getCreatorDailyChartData(userId, start, end) {
    const dailyFormat = "DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')";
    const rows = (await db_1.models.icoTransaction.findAll({
        attributes: [
            [(0, sequelize_1.literal)(dailyFormat), "period"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), "raised"],
        ],
        include: [
            {
                model: db_1.models.icoTokenOffering,
                as: "offering",
                attributes: [],
                where: { userId },
            },
        ],
        where: {
            createdAt: { [sequelize_1.Op.between]: [start, end] },
            status: { [sequelize_1.Op.in]: ["PENDING", "RELEASED"] },
        },
        group: [dailyFormat],
        order: [[(0, sequelize_1.literal)("period"), "ASC"]],
        raw: true,
    }));
    const data = [];
    for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
        const dateStr = formatDate(current);
        const row = rows.find((r) => r.period === dateStr);
        data.push({ date: dateStr, amount: row ? parseFloat(row.raised) : 0 });
    }
    return data;
}
async function getCreatorMonthlyChartData(userId, start, end) {
    const monthFormat = "DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')";
    const rows = (await db_1.models.icoTransaction.findAll({
        attributes: [
            [(0, sequelize_1.literal)(monthFormat), "period"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), "raised"],
        ],
        include: [
            {
                model: db_1.models.icoTokenOffering,
                as: "offering",
                attributes: [],
                where: { userId },
            },
        ],
        where: {
            createdAt: { [sequelize_1.Op.gte]: start },
            status: { [sequelize_1.Op.not]: ["REJECTED"] },
        },
        group: [monthFormat],
        order: [[(0, sequelize_1.literal)("period"), "ASC"]],
        raw: true,
    }));
    const data = [];
    const current = new Date(start);
    while (current <= end) {
        const dateStr = formatMonth(current);
        const row = rows.find((r) => r.period === dateStr);
        data.push({ date: dateStr, amount: row ? parseFloat(row.raised) : 0 });
        current.setMonth(current.getMonth() + 1);
    }
    while (data.length < 12) {
        const firstDate = new Date(data[0].date);
        firstDate.setMonth(firstDate.getMonth() - 1);
        data.unshift({ date: formatMonth(firstDate), amount: 0 });
    }
    return data;
}
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching get creator performance");
    const userId = user.id;
    const now = new Date();
    const range = (query === null || query === void 0 ? void 0 : query.range) || "30d";
    let chartData = [];
    if (range === "7d") {
        const currentDay = now.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() + diffToMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        chartData = await getCreatorDailyChartData(userId, startOfWeek, endOfWeek);
    }
    else if (range === "30d") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        chartData = await getCreatorDailyChartData(userId, startOfMonth, endOfMonth);
    }
    else if (range === "90d") {
        const startRange = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endRange = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        chartData = await getCreatorDailyChartData(userId, startRange, endRange);
    }
    else if (range === "all") {
        const earliestTx = (await db_1.models.icoTransaction.findOne({
            include: [
                {
                    model: db_1.models.icoTokenOffering,
                    as: "offering",
                    attributes: [],
                    where: { userId },
                },
            ],
            attributes: [
                [(0, sequelize_1.fn)("MIN", (0, sequelize_1.literal)("icoTransaction.createdAt")), "minDate"],
            ],
            raw: true,
        }));
        let startDate;
        if (earliestTx && earliestTx.minDate) {
            startDate = new Date(earliestTx.minDate);
        }
        else {
            startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);
        }
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        if (startDate > twelveMonthsAgo) {
            startDate = twelveMonthsAgo;
        }
        chartData = await getCreatorMonthlyChartData(userId, startDate, now);
    }
    else {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid range parameter" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${chartData.length} data points for ${range} period`);
    return chartData;
};
