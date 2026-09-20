"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
function mapEventToActivityType(event) {
    const eventUpper = (event || '').toUpperCase().replace(/\s+/g, '_');
    if (eventUpper.includes('INITIATED') || eventUpper.includes('CREATED') || eventUpper.includes('STARTED')) {
        return 'TRADE_CREATED';
    }
    if (eventUpper.includes('PAYMENT') && eventUpper.includes('SENT')) {
        return 'PAYMENT_CONFIRMED';
    }
    if (eventUpper.includes('COMPLETED') || eventUpper.includes('RELEASED')) {
        return 'TRADE_COMPLETED';
    }
    if (eventUpper.includes('DISPUTED')) {
        return 'TRADE_DISPUTED';
    }
    if (eventUpper.includes('CANCELLED')) {
        return 'TRADE_CANCELLED';
    }
    return 'TRADE_UPDATE';
}
function formatActivityMessage(event, currency, amount) {
    const eventUpper = (event || '').toUpperCase().replace(/\s+/g, '_');
    const amountStr = `${amount || 0} ${currency || 'N/A'}`;
    if (eventUpper.includes('INITIATED') || eventUpper.includes('CREATED') || eventUpper.includes('STARTED')) {
        return `Trade initiated for ${amountStr}`;
    }
    if (eventUpper.includes('PAYMENT') && eventUpper.includes('SENT')) {
        return `Payment confirmed for ${amountStr}`;
    }
    if (eventUpper.includes('COMPLETED')) {
        return `Trade completed for ${amountStr}`;
    }
    if (eventUpper.includes('RELEASED')) {
        return `Funds released for ${amountStr}`;
    }
    if (eventUpper.includes('DISPUTED')) {
        return `Trade disputed for ${amountStr}`;
    }
    if (eventUpper.includes('CANCELLED')) {
        return `Trade cancelled for ${amountStr}`;
    }
    const formattedEvent = event.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return `${formattedEvent} - ${amountStr}`;
}
exports.metadata = {
    summary: "Get Trade Dashboard Data",
    description: "Retrieves aggregated trade data for the authenticated user.",
    operationId: "getP2PTradeDashboardData",
    tags: ["P2P", "Trade"],
    logModule: "P2P",
    logTitle: "Get trade dashboard",
    responses: {
        200: { description: "Trade dashboard data retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trade statistics and activity");
    try {
        const [totalTrades, completedTrades, disputedTrades, activeTrades, pendingTrades, cancelledTrades, trades,] = await Promise.all([
            db_1.models.p2pTrade.count({
                where: { [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] },
            }),
            db_1.models.p2pTrade.count({
                where: {
                    status: "COMPLETED",
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
            }),
            db_1.models.p2pTrade.findAll({
                where: {
                    status: "DISPUTED",
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                include: [
                    {
                        association: "paymentMethodDetails",
                        attributes: ["id", "name", "icon"],
                        required: false
                    },
                    {
                        association: "offer",
                        attributes: ["id", "priceCurrency"],
                        required: false
                    }
                ],
                limit: 7,
                order: [["updatedAt", "DESC"]],
            }),
            db_1.models.p2pTrade.findAll({
                where: {
                    status: {
                        [sequelize_1.Op.in]: ["PENDING", "PAYMENT_SENT"],
                    },
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                include: [
                    {
                        association: "paymentMethodDetails",
                        attributes: ["id", "name", "icon"],
                        required: false
                    },
                    {
                        association: "offer",
                        attributes: ["id", "priceCurrency"],
                        required: false
                    }
                ],
                order: [["updatedAt", "DESC"]],
            }),
            db_1.models.p2pTrade.findAll({
                where: {
                    status: "PENDING",
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                include: [
                    {
                        association: "paymentMethodDetails",
                        attributes: ["id", "name", "icon"],
                        required: false
                    },
                    {
                        association: "offer",
                        attributes: ["id", "priceCurrency"],
                        required: false
                    }
                ],
                order: [["createdAt", "DESC"]],
            }),
            db_1.models.p2pTrade.findAll({
                where: {
                    status: "CANCELLED",
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                include: [
                    {
                        association: "paymentMethodDetails",
                        attributes: ["id", "name", "icon"],
                        required: false
                    },
                    {
                        association: "offer",
                        attributes: ["id", "priceCurrency"],
                        required: false
                    }
                ],
                order: [["updatedAt", "DESC"]],
            }),
            db_1.models.p2pTrade.findAll({
                where: { [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] },
                include: [
                    {
                        association: "offer",
                        attributes: ["id", "priceCurrency"],
                        required: false
                    }
                ],
                order: [["updatedAt", "DESC"]],
            }),
        ]);
        const recentActivity = [];
        const recentTrades = trades.slice(0, 10);
        for (const trade of recentTrades) {
            const tradeData = trade.toJSON ? trade.toJSON() : trade;
            let timeline = tradeData.timeline || [];
            if (typeof timeline === 'string') {
                try {
                    timeline = JSON.parse(timeline);
                }
                catch (e) {
                    timeline = [];
                }
            }
            if (!Array.isArray(timeline))
                timeline = [];
            for (const event of timeline) {
                if (event.event === 'MESSAGE')
                    continue;
                const eventTime = event.timestamp || event.createdAt || event.time;
                if (!eventTime)
                    continue;
                recentActivity.push({
                    id: `${tradeData.id}-${eventTime}`,
                    tradeId: tradeData.id,
                    type: mapEventToActivityType(event.event),
                    message: formatActivityMessage(event.event, tradeData.currency, tradeData.amount),
                    time: eventTime,
                    createdAt: new Date(eventTime),
                });
            }
        }
        recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const limitedActivity = recentActivity.slice(0, 5);
        const totalVolume = trades.reduce((sum, t) => sum + (t.total || t.fiatAmount || 0), 0);
        const avgCompletionTime = (() => {
            const completed = trades.filter((t) => t.status === "COMPLETED" && t.completedAt && t.createdAt);
            if (!completed.length)
                return null;
            const totalMs = completed.reduce((sum, t) => sum +
                (new Date(t.completedAt).getTime() - new Date(String(t.createdAt)).getTime()), 0);
            const avgMs = totalMs / completed.length;
            const hours = Math.floor(avgMs / 3600000);
            const minutes = Math.floor((avgMs % 3600000) / 60000);
            return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
        })();
        const successRate = totalTrades
            ? Math.round((completedTrades / totalTrades) * 100)
            : 0;
        const getCounterparty = (trade) => {
            return trade.buyerId === user.id
                ? trade.sellerName || `User #${trade.sellerId}`
                : trade.buyerName || `User #${trade.buyerId}`;
        };
        function formatTrade(trade) {
            var _a, _b;
            const tradeData = trade.toJSON ? trade.toJSON() : trade;
            let status = tradeData.status;
            if (status === 'PENDING' && tradeData.expiresAt) {
                const now = new Date();
                const expiresAt = new Date(tradeData.expiresAt);
                if (expiresAt < now) {
                    status = 'EXPIRED';
                }
            }
            return {
                id: tradeData.id,
                type: tradeData.buyerId === user.id ? "BUY" : "SELL",
                coin: tradeData.currency || tradeData.coin || tradeData.crypto || "N/A",
                amount: tradeData.amount,
                fiatAmount: tradeData.total || tradeData.fiatAmount || 0,
                price: tradeData.price,
                counterparty: getCounterparty(tradeData),
                status: status,
                date: tradeData.updatedAt || tradeData.createdAt,
                paymentMethod: ((_a = tradeData.paymentMethodDetails) === null || _a === void 0 ? void 0 : _a.name) || tradeData.paymentMethod || null,
                priceCurrency: ((_b = tradeData.offer) === null || _b === void 0 ? void 0 : _b.priceCurrency) || "USD",
            };
        }
        const availableCurrencies = [...new Set(trades
                .map((t) => t.currency)
                .filter((c) => c))].sort();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Trade dashboard retrieved (${totalTrades} total trades, ${completedTrades} completed)`);
        return {
            tradeStats: {
                activeCount: activeTrades.length,
                completedCount: completedTrades,
                totalVolume,
                avgCompletionTime,
                successRate,
            },
            recentActivity: limitedActivity,
            activeTrades: activeTrades.map(formatTrade),
            pendingTrades: pendingTrades.map(formatTrade),
            completedTrades: trades
                .filter((t) => t.status === "COMPLETED")
                .sort((a, b) => new Date(String(b.updatedAt)).getTime() - new Date(String(a.updatedAt)).getTime())
                .slice(0, 7)
                .map(formatTrade),
            disputedTrades: disputedTrades.map(formatTrade),
            cancelledTrades: cancelledTrades.map(formatTrade),
            availableCurrencies,
        };
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve trade dashboard");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
