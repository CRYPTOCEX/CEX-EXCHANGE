"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Notification Analytics",
    description: "Retrieve time-series analytics data for notification charts",
    operationId: "getNotificationAnalytics",
    tags: ["Admin", "Notification", "Analytics"],
    requiresAuth: true,
    permission: "access.notification.settings",
    parameters: [
        {
            name: "timeframe",
            in: "query",
            description: "Time range for analytics",
            schema: {
                type: "string",
                enum: ["24h", "7d", "30d", "90d"],
                default: "7d",
            },
        },
    ],
    responses: {
        200: {
            description: "Analytics data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            timeframe: { type: "string" },
                            timestamp: { type: "string" },
                            kpis: { type: "array" },
                            charts: { type: "object" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
function generateTimeSeries(timeframe, startDate, endDate) {
    const series = [];
    if (timeframe === "24h") {
        for (let i = 0; i < 24; i++) {
            const date = (0, date_fns_1.addHours)(startDate, i);
            series.push({
                date,
                total: 0,
                sent: 0,
                failed: 0,
                read: 0,
                inApp: 0,
                email: 0,
                sms: 0,
                push: 0,
            });
        }
    }
    else {
        const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
        for (let i = 0; i < days; i++) {
            const date = (0, date_fns_1.addDays)(startDate, i);
            series.push({
                date,
                total: 0,
                sent: 0,
                failed: 0,
                read: 0,
                inApp: 0,
                email: 0,
                sms: 0,
                push: 0,
            });
        }
    }
    return series;
}
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { query, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Calculating notification analytics");
        const timeframe = query.timeframe || "7d";
        const now = new Date();
        let startDate;
        let interval;
        let dateFormat;
        switch (timeframe) {
            case "24h":
                startDate = (0, date_fns_1.startOfHour)((0, date_fns_1.subHours)(now, 23));
                interval = "hour";
                dateFormat = "%Y-%m-%d %H:00:00";
                break;
            case "7d":
                startDate = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 6));
                interval = "day";
                dateFormat = "%Y-%m-%d 00:00:00";
                break;
            case "30d":
                startDate = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 29));
                interval = "day";
                dateFormat = "%Y-%m-%d 00:00:00";
                break;
            case "90d":
                startDate = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 89));
                interval = "day";
                dateFormat = "%Y-%m-%d 00:00:00";
                break;
            default:
                startDate = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 6));
                interval = "day";
                dateFormat = "%Y-%m-%d 00:00:00";
        }
        const endDate = (0, date_fns_1.endOfDay)(now);
        const timeSeries = generateTimeSeries(timeframe, startDate, endDate);
        if (!db_1.models.notification) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.warn) === null || _b === void 0 ? void 0 : _b.call(ctx, "Notification model not available, returning sample data");
            const sampleData = timeSeries.map((dp, i) => ({
                ...dp,
                total: Math.floor(Math.random() * 100) + 20,
                sent: Math.floor(Math.random() * 80) + 15,
                failed: Math.floor(Math.random() * 10),
                read: Math.floor(Math.random() * 60) + 10,
                inApp: Math.floor(Math.random() * 40) + 10,
                email: Math.floor(Math.random() * 30) + 5,
                sms: Math.floor(Math.random() * 10),
                push: Math.floor(Math.random() * 20) + 5,
            }));
            return formatResponse(timeframe, sampleData);
        }
        const rows = await db_1.models.notification.findAll({
            where: {
                createdAt: { [sequelize_1.Op.between]: [startDate, endDate] },
            },
            attributes: [
                [
                    sequelize_1.Sequelize.fn("DATE_FORMAT", sequelize_1.Sequelize.col("createdAt"), dateFormat),
                    "dateGroup",
                ],
                [sequelize_1.Sequelize.fn("COUNT", "*"), "total"],
                [sequelize_1.Sequelize.fn("COUNT", "*"), "sent"],
                [sequelize_1.Sequelize.literal("0"), "failed"],
                [
                    sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal("CASE WHEN `read` = 1 THEN 1 ELSE 0 END")),
                    "readCount",
                ],
                [
                    sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal("CASE WHEN JSON_CONTAINS(channels, '\"IN_APP\"') OR channels IS NULL THEN 1 ELSE 0 END")),
                    "inApp",
                ],
                [
                    sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal("CASE WHEN JSON_CONTAINS(channels, '\"EMAIL\"') THEN 1 ELSE 0 END")),
                    "email",
                ],
                [
                    sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal("CASE WHEN JSON_CONTAINS(channels, '\"SMS\"') THEN 1 ELSE 0 END")),
                    "sms",
                ],
                [
                    sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal("CASE WHEN JSON_CONTAINS(channels, '\"PUSH\"') THEN 1 ELSE 0 END")),
                    "push",
                ],
            ],
            group: ["dateGroup"],
            raw: true,
        });
        const formatKey = (date) => {
            if (interval === "hour") {
                return (0, date_fns_1.format)(date, "yyyy-MM-dd HH:00:00");
            }
            return (0, date_fns_1.format)(date, "yyyy-MM-dd");
        };
        const dataMap = new Map(timeSeries.map((dp) => [formatKey(dp.date), dp]));
        rows.forEach((row) => {
            const key = interval === "hour"
                ? row.dateGroup
                : row.dateGroup.split(" ")[0];
            if (dataMap.has(key)) {
                const dp = dataMap.get(key);
                dp.total = Number(row.total) || 0;
                dp.sent = Number(row.sent) || 0;
                dp.failed = Number(row.failed) || 0;
                dp.read = Number(row.readCount) || 0;
                dp.inApp = Number(row.inApp) || 0;
                dp.email = Number(row.email) || 0;
                dp.sms = Number(row.sms) || 0;
                dp.push = Number(row.push) || 0;
            }
        });
        const finalData = Array.from(dataMap.values());
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Notification analytics calculated");
        return formatResponse(timeframe, finalData);
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
};
function formatResponse(timeframe, data) {
    const totalNotifications = data.reduce((sum, dp) => sum + dp.total, 0);
    const totalSent = data.reduce((sum, dp) => sum + dp.sent, 0);
    const totalFailed = data.reduce((sum, dp) => sum + dp.failed, 0);
    const totalRead = data.reduce((sum, dp) => sum + dp.read, 0);
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    const firstHalfTotal = firstHalf.reduce((sum, dp) => sum + dp.total, 0);
    const secondHalfTotal = secondHalf.reduce((sum, dp) => sum + dp.total, 0);
    const totalChange = firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : secondHalfTotal > 0 ? 100 : 0;
    const firstHalfFailed = firstHalf.reduce((sum, dp) => sum + dp.failed, 0);
    const secondHalfFailed = secondHalf.reduce((sum, dp) => sum + dp.failed, 0);
    const failedChange = firstHalfFailed > 0
        ? ((secondHalfFailed - firstHalfFailed) / firstHalfFailed) * 100
        : secondHalfFailed > 0 ? 100 : 0;
    const successRate = totalNotifications > 0
        ? ((totalSent / totalNotifications) * 100).toFixed(1)
        : "100.0";
    const readRate = totalSent > 0
        ? ((totalRead / totalSent) * 100).toFixed(1)
        : "0.0";
    return {
        timeframe,
        timestamp: new Date().toISOString(),
        kpis: [
            {
                id: "totalNotifications",
                title: "Total Notifications",
                value: totalNotifications,
                change: Math.round(totalChange * 10) / 10,
                trend: data.map((dp) => ({
                    date: dp.date.toISOString(),
                    value: dp.total,
                })),
                icon: "Bell",
            },
            {
                id: "successRate",
                title: "Success Rate",
                value: `${successRate}%`,
                change: 0,
                trend: data.map((dp) => ({
                    date: dp.date.toISOString(),
                    value: dp.total > 0 ? Math.round((dp.sent / dp.total) * 100) : 100,
                })),
                icon: "CheckCircle2",
            },
            {
                id: "totalFailed",
                title: "Failed",
                value: totalFailed,
                change: Math.round(failedChange * 10) / 10,
                trend: data.map((dp) => ({
                    date: dp.date.toISOString(),
                    value: dp.failed,
                })),
                icon: "XCircle",
            },
            {
                id: "readRate",
                title: "Read Rate",
                value: `${readRate}%`,
                change: 0,
                trend: data.map((dp) => ({
                    date: dp.date.toISOString(),
                    value: dp.sent > 0 ? Math.round((dp.read / dp.sent) * 100) : 0,
                })),
                icon: "Eye",
            },
        ],
        charts: {
            notificationsOverTime: data.map((dp) => ({
                date: dp.date.toISOString(),
                total: dp.total,
                sent: dp.sent,
                failed: dp.failed,
            })),
            channelBreakdown: data.map((dp) => ({
                date: dp.date.toISOString(),
                "In-App": dp.inApp,
                Email: dp.email,
                SMS: dp.sms,
                Push: dp.push,
            })),
            statusBreakdown: [
                { name: "Sent", value: totalSent, color: "#22c55e" },
                { name: "Failed", value: totalFailed, color: "#ef4444" },
                { name: "Read", value: totalRead, color: "#3b82f6" },
                { name: "Pending", value: Math.max(0, totalNotifications - totalSent - totalFailed), color: "#f59e0b" },
            ],
            channelTotals: [
                { name: "In-App", value: data.reduce((sum, dp) => sum + dp.inApp, 0), color: "#3b82f6" },
                { name: "Email", value: data.reduce((sum, dp) => sum + dp.email, 0), color: "#22c55e" },
                { name: "SMS", value: data.reduce((sum, dp) => sum + dp.sms, 0), color: "#f59e0b" },
                { name: "Push", value: data.reduce((sum, dp) => sum + dp.push, 0), color: "#a855f7" },
            ],
        },
    };
}
