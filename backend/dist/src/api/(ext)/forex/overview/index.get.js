"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = { summary: "Get Forex User Dashboard Data",
    description: "Retrieves user-specific dashboard data including overview statistics, chart data, plan distribution, and recent investments.",
    operationId: "getForexUserDashboardData",
    tags: ["Forex", "Dashboard", "User"],
    requiresAuth: true,
    logModule: "FOREX",
    logTitle: "Get Forex Overview",
    parameters: [
        { name: "timeframe",
            in: "query",
            description: "Timeframe for chart data: 1m, 3m, or 1y",
            required: false,
            schema: { type: "string", enum: ["1m", "3m", "1y"] },
        },
    ],
    responses: { 200: { description: "User dashboard data retrieved successfully.",
            content: { "application/json": { schema: { type: "object",
                        properties: { overview: { type: "object",
                                properties: { totalInvested: { type: "number" },
                                    totalProfit: { type: "number" },
                                    profitPercentage: { type: "number" },
                                    activeInvestments: { type: "number" },
                                    completedInvestments: { type: "number" },
                                },
                            },
                            chartData: { type: "array",
                                items: { type: "object",
                                    properties: { name: { type: "string" },
                                        value: { type: "number" },
                                    },
                                },
                            },
                            planDistribution: { type: "array",
                                items: { type: "object",
                                    properties: { name: { type: "string" },
                                        value: { type: "number" },
                                        percentage: { type: "number" },
                                    },
                                },
                            },
                            recentInvestments: { type: "array",
                                items: { type: "object",
                                    properties: { id: { type: "string" },
                                        plan: { type: "string" },
                                        amount: { type: "number" },
                                        createdAt: { type: "string", format: "date-time" },
                                        status: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const userId = user.id;
    const { timeframe = "1y" } = query;
    const now = new Date();
    let startDate, endDate, groupFormat, intervals;
    if (timeframe === "1m") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        groupFormat = "%d";
        const daysInMonth = endDate.getDate();
        intervals = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    }
    else if (timeframe === "3m") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        groupFormat = "%Y-%u";
        const intervalsArr = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            intervalsArr.push(`${current.getFullYear()}-${getWeekNumber(current)}`);
            current.setDate(current.getDate() + 7);
        }
        intervals = intervalsArr;
    }
    else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        groupFormat = "%b";
        intervals = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
    }
    const investments = await db_1.models.forexInvestment.findAll({ where: { userId,
            status: { [sequelize_1.Op.ne]: "REJECTED" },
        },
        raw: true,
    });
    const totalInvested = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const totalProfit = investments.reduce((sum, inv) => sum + (Number(inv.profit) || 0), 0);
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    const activeInvestments = investments.filter((inv) => inv.status === "ACTIVE").length;
    const completedInvestments = investments.filter((inv) => inv.status === "COMPLETED").length;
    const overview = { totalInvested,
        totalProfit,
        profitPercentage,
        activeInvestments,
        completedInvestments,
    };
    const chartDataRaw = await db_1.models.forexInvestment.findAll({ attributes: [
            [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), groupFormat), "period"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalInvested"],
        ],
        where: { userId,
            status: { [sequelize_1.Op.ne]: "REJECTED" },
            createdAt: { [sequelize_1.Op.between]: [startDate, endDate] },
        },
        group: ["period"],
        raw: true,
    });
    const chartDataMap = {};
    chartDataRaw.forEach((item) => {
        chartDataMap[item.period] = parseFloat(item.totalInvested) || 0;
    });
    const chartData = intervals.map((interval) => ({ name: interval,
        value: chartDataMap[interval] || 0,
    }));
    const planDistributionRaw = await db_1.models.forexPlan.findAll({ attributes: [
            "name",
            [
                (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("investments.amount")), 0),
                "totalInvested",
            ],
        ],
        include: [
            { model: db_1.models.forexInvestment,
                as: "investments",
                attributes: [],
                where: { userId, status: { [sequelize_1.Op.ne]: "REJECTED" } },
                required: false,
            },
        ],
        group: ["forexPlan.id"],
        raw: true,
    });
    const planDistribution = planDistributionRaw.map((plan) => {
        const invested = parseFloat(plan.totalInvested) || 0;
        const percentage = totalInvested > 0 ? (invested / totalInvested) * 100 : 0;
        return { name: plan.name,
            value: invested,
            percentage,
        };
    });
    const recentInvestmentsRaw = await db_1.models.forexInvestment.findAll({ where: { userId },
        include: [
            {
                model: db_1.models.forexPlan,
                as: "plan",
                attributes: ["name", "title"],
            },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
    });
    const recentInvestments = recentInvestmentsRaw.map((inv) => {
        var _a, _b;
        return ({ id: inv.id,
            plan: ((_a = inv.plan) === null || _a === void 0 ? void 0 : _a.title) || ((_b = inv.plan) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
            amount: inv.amount,
            createdAt: inv.createdAt,
            status: inv.status, });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { overview,
        chartData,
        planDistribution,
        recentInvestments,
    };
};
