"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get computed trading analytics",
    operationId: "getTradingAnalytics",
    tags: ["Trading", "Analytics"],
    parameters: [
        {
            name: "period",
            in: "query",
            schema: { type: "string", enum: ["day", "week", "month", "all"] },
            description: "Time period for analytics",
        },
        {
            name: "marketType",
            in: "query",
            schema: { type: "string", enum: ["spot", "futures", "eco"] },
            description: "Market type filter",
        },
    ],
    responses: {
        200: {
            description: "Computed analytics data",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalTrades: { type: "integer" },
                            winningTrades: { type: "integer" },
                            losingTrades: { type: "integer" },
                            winRate: { type: "number" },
                            totalPnl: { type: "number" },
                            avgWin: { type: "number" },
                            avgLoss: { type: "number" },
                            profitFactor: { type: "number" },
                            totalVolume: { type: "number" },
                            bySymbol: { type: "object" },
                            byMarketType: { type: "object" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query } = data;
    const { period = "all", marketType } = query;
    const dateFilter = getDateFilter(period);
    const analytics = await computeAnalytics(user.id, dateFilter, marketType);
    return analytics;
};
function getDateFilter(period) {
    const now = new Date();
    switch (period) {
        case "day":
            return { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
        case "week":
            return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        case "month":
            return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        default:
            return {};
    }
}
async function computeAnalytics(userId, dateFilter, marketType) {
    const whereClause = {
        userId,
        status: "CLOSED",
    };
    if (dateFilter.gte) {
        whereClause.createdAt = { [sequelize_1.Op.gte]: dateFilter.gte };
    }
    let orders = [];
    if (!marketType || marketType === "spot") {
        try {
            const spotOrders = await db_1.models.exchangeOrder.findAll({
                where: whereClause,
                raw: true,
            });
            orders = orders.concat(spotOrders.map((o) => ({ ...o, marketType: "spot" })));
        }
        catch (error) {
            console.warn("[Trading Analytics] Spot orders not available");
        }
    }
    if (!marketType || marketType === "futures") {
        try {
            const futuresModel = db_1.models.futuresOrder;
            if (futuresModel) {
                const futuresOrders = await futuresModel.findAll({
                    where: whereClause,
                    raw: true,
                });
                orders = orders.concat(futuresOrders.map((o) => ({ ...o, marketType: "futures" })));
            }
        }
        catch (error) {
            console.warn("[Trading Analytics] Futures orders not available");
        }
    }
    if (!marketType || marketType === "eco") {
        try {
            const { getOrdersByUserId } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
            const { fromBigInt } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/blockchain")));
            const ecoOrders = await getOrdersByUserId(userId);
            const filteredEcoOrders = ecoOrders
                .filter((o) => {
                const isClosed = o.status === "CLOSED" || o.status === "FILLED";
                if (!dateFilter.gte)
                    return isClosed;
                return isClosed && new Date(o.createdAt) >= dateFilter.gte;
            })
                .map((o) => ({
                ...o,
                marketType: "eco",
                amount: fromBigInt(o.amount),
                price: fromBigInt(o.price),
                cost: fromBigInt(o.cost),
                fee: fromBigInt(o.fee),
                filled: fromBigInt(o.filled),
                remaining: fromBigInt(o.remaining),
            }));
            orders = orders.concat(filteredEcoOrders);
        }
        catch (error) {
            console.warn("[Trading Analytics] Ecosystem orders not available:", error.message);
        }
    }
    const totalTrades = orders.length;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    let totalVolume = 0;
    const bySymbol = {};
    const byMarketType = {};
    for (const order of orders) {
        const pnl = Number(order.pnl || 0);
        const volume = Number(order.amount || 0) * Number(order.price || 0);
        totalVolume += volume;
        if (pnl > 0) {
            winningTrades++;
            totalWinAmount += pnl;
        }
        else if (pnl < 0) {
            losingTrades++;
            totalLossAmount += Math.abs(pnl);
        }
        const symbol = order.symbol || "UNKNOWN";
        if (!bySymbol[symbol]) {
            bySymbol[symbol] = { trades: 0, pnl: 0, volume: 0 };
        }
        bySymbol[symbol].trades++;
        bySymbol[symbol].pnl += pnl;
        bySymbol[symbol].volume += volume;
        const mType = order.marketType || "unknown";
        if (!byMarketType[mType]) {
            byMarketType[mType] = { trades: 0, pnl: 0, volume: 0 };
        }
        byMarketType[mType].trades++;
        byMarketType[mType].pnl += pnl;
        byMarketType[mType].volume += volume;
    }
    const totalPnl = totalWinAmount - totalLossAmount;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount;
    return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        avgWin: Math.round(avgWin * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        bySymbol,
        byMarketType,
    };
}
