"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
let scyllaQuery;
try {
    const module = require("@b/api/(ext)/ecosystem/utils/scylla/query");
    scyllaQuery = module;
}
catch (e) {
}
exports.metadata = {
    summary: "Get futures dashboard analytics",
    operationId: "getFuturesDashboard",
    tags: ["Admin", "Futures", "Dashboard"],
    description: "Retrieves comprehensive futures trading dashboard data including position statistics, market overview, volume metrics, and recent activity.",
    parameters: [
        {
            name: "timeRange",
            in: "query",
            description: "Time range for analytics (24h, 7d, 30d)",
            required: false,
            schema: { type: "string", default: "7d" },
        },
    ],
    responses: {
        200: {
            description: "Dashboard data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            overview: {
                                type: "object",
                                properties: {
                                    totalMarkets: { type: "number" },
                                    activeMarkets: { type: "number" },
                                    totalPositions: { type: "number" },
                                    activePositions: { type: "number" },
                                    closedPositions: { type: "number" },
                                    liquidatedPositions: { type: "number" },
                                    totalVolume: { type: "number" },
                                    totalPnl: { type: "number" },
                                    longPositions: { type: "number" },
                                    shortPositions: { type: "number" },
                                },
                            },
                            recentPositions: {
                                type: "array",
                                items: { type: "object" },
                            },
                            topMarkets: {
                                type: "array",
                                items: { type: "object" },
                            },
                            chartData: {
                                type: "object",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.futures.market",
    logModule: "ADMIN_FUTURES",
    logTitle: "Get Futures Dashboard",
};
const keyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
exports.default = async (data) => {
    const { query, ctx } = data;
    const timeRange = query.timeRange || "7d";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching futures dashboard data");
    const endDate = new Date();
    const startDate = new Date();
    switch (timeRange) {
        case "24h":
            startDate.setDate(endDate.getDate() - 1);
            break;
        case "7d":
            startDate.setDate(endDate.getDate() - 7);
            break;
        case "30d":
            startDate.setDate(endDate.getDate() - 30);
            break;
        default:
            startDate.setDate(endDate.getDate() - 7);
    }
    const markets = await db_1.models.futuresMarket.findAll({
        attributes: ["id", "currency", "pair", "status", "isTrending", "isHot", "metadata"],
    });
    const totalMarkets = markets.length;
    const activeMarkets = markets.filter((m) => m.status === true).length;
    let positionStats = {
        total: 0,
        active: 0,
        closed: 0,
        liquidated: 0,
        cancelled: 0,
        longPositions: 0,
        shortPositions: 0,
        totalPnl: 0,
        totalVolume: 0,
    };
    let recentPositions = [];
    let chartData = {
        labels: [],
        datasets: [],
    };
    if (scyllaQuery === null || scyllaQuery === void 0 ? void 0 : scyllaQuery.getFiltered) {
        try {
            const positionsResult = await scyllaQuery.getFiltered({
                table: "position",
                query: {},
                sortField: "createdAt",
                sortOrder: "DESC",
                perPage: 1000,
                allowFiltering: true,
                keyspace,
                partitionKeys: ["userId"],
                transformColumns: [
                    "entryPrice",
                    "amount",
                    "leverage",
                    "unrealizedPnl",
                ],
            });
            const positions = (positionsResult === null || positionsResult === void 0 ? void 0 : positionsResult.items) || [];
            positionStats.total = positions.length;
            positions.forEach((pos) => {
                var _a, _b;
                const status = ((_a = pos.status) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || "";
                if (status === "OPEN" || status === "ACTIVE")
                    positionStats.active++;
                else if (status === "CLOSED")
                    positionStats.closed++;
                else if (status === "LIQUIDATED")
                    positionStats.liquidated++;
                else if (status === "CANCELLED")
                    positionStats.cancelled++;
                const side = ((_b = pos.side) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || "";
                if (side === "BUY" || side === "LONG")
                    positionStats.longPositions++;
                else if (side === "SELL" || side === "SHORT")
                    positionStats.shortPositions++;
                const pnl = parseFloat(pos.unrealizedPnl || "0");
                if (!isNaN(pnl))
                    positionStats.totalPnl += pnl;
                const amount = parseFloat(pos.amount || "0");
                const entryPrice = parseFloat(pos.entryPrice || "0");
                if (!isNaN(amount) && !isNaN(entryPrice)) {
                    positionStats.totalVolume += amount * entryPrice;
                }
            });
            recentPositions = positions.slice(0, 10).map((pos) => ({
                id: pos.id,
                symbol: pos.symbol,
                side: pos.side,
                status: pos.status,
                entryPrice: parseFloat(pos.entryPrice || "0"),
                amount: parseFloat(pos.amount || "0"),
                leverage: parseFloat(pos.leverage || "1"),
                unrealizedPnl: parseFloat(pos.unrealizedPnl || "0"),
                createdAt: pos.createdAt,
                userId: pos.userId,
            }));
            const days = timeRange === "24h" ? 24 : timeRange === "7d" ? 7 : 30;
            const labels = [];
            const positionCounts = [];
            const volumeData = [];
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                if (timeRange === "24h") {
                    date.setHours(date.getHours() - i);
                    labels.push(date.toLocaleTimeString("en-US", { hour: "2-digit" }));
                }
                else {
                    date.setDate(date.getDate() - i);
                    labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
                }
                const dayPositions = positions.filter((pos) => {
                    if (!pos.createdAt)
                        return false;
                    const posDate = new Date(pos.createdAt);
                    if (timeRange === "24h") {
                        return posDate.getHours() === date.getHours() &&
                            posDate.getDate() === date.getDate();
                    }
                    return posDate.toDateString() === date.toDateString();
                });
                positionCounts.push(dayPositions.length);
                let dayVolume = 0;
                dayPositions.forEach((pos) => {
                    const amount = parseFloat(pos.amount || "0");
                    const entryPrice = parseFloat(pos.entryPrice || "0");
                    if (!isNaN(amount) && !isNaN(entryPrice)) {
                        dayVolume += amount * entryPrice;
                    }
                });
                volumeData.push(dayVolume);
            }
            chartData = {
                labels,
                datasets: [
                    {
                        label: "Positions",
                        data: positionCounts,
                        borderColor: "#f59e0b",
                        backgroundColor: "rgba(245, 158, 11, 0.1)",
                    },
                    {
                        label: "Volume",
                        data: volumeData,
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                    },
                ],
            };
        }
        catch (error) {
            console.error("Error fetching position data from ScyllaDB:", error);
        }
    }
    const topMarkets = markets
        .filter((m) => m.status === true)
        .slice(0, 5)
        .map((m) => ({
        id: m.id,
        symbol: `${m.currency}/${m.pair}`,
        currency: m.currency,
        pair: m.pair,
        isTrending: m.isTrending,
        isHot: m.isHot,
        metadata: m.metadata,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dashboard data retrieved successfully");
    return {
        overview: {
            totalMarkets,
            activeMarkets,
            totalPositions: positionStats.total,
            activePositions: positionStats.active,
            closedPositions: positionStats.closed,
            liquidatedPositions: positionStats.liquidated,
            cancelledPositions: positionStats.cancelled,
            longPositions: positionStats.longPositions,
            shortPositions: positionStats.shortPositions,
            totalPnl: positionStats.totalPnl,
            totalVolume: positionStats.totalVolume,
        },
        recentPositions,
        topMarkets,
        chartData,
        timeRange,
    };
};
