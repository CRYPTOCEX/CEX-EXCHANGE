"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/finance/currency/utils");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get P2P Dashboard Stats",
    description: "Retrieves various trade counts and stats for the authenticated user.",
    operationId: "getP2PDashboardStats",
    tags: ["P2P", "Dashboard"],
    logModule: "P2P",
    logTitle: "Get dashboard stats",
    responses: {
        200: { description: "Dashboard stats retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return {
            statusCode: 401,
            message: "Unauthorized",
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating P2P extension");
    try {
        if (!db_1.models.p2pTrade) {
            return {
                statusCode: 500,
                message: "P2P extension is not properly installed or configured",
            };
        }
        let totalTrades = 0;
        let activeTrades = 0;
        let completedTrades = 0;
        let wallets = [];
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trade statistics");
        try {
            totalTrades = await db_1.models.p2pTrade.count({
                where: {
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
            });
        }
        catch (error) {
            console_1.logger.error("P2P", `Error fetching total trades: ${error}`);
        }
        try {
            activeTrades = await db_1.models.p2pTrade.count({
                where: {
                    status: "PENDING",
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
            });
        }
        catch (error) {
            console_1.logger.error("P2P", `Error fetching active trades: ${error}`);
        }
        try {
            completedTrades = await db_1.models.p2pTrade.count({
                where: {
                    status: "COMPLETED",
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
            });
        }
        catch (error) {
            console_1.logger.error("P2P", `Error fetching completed trades: ${error}`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user wallets");
        try {
            wallets = await db_1.models.wallet.findAll({
                where: {
                    userId: user.id,
                    type: { [sequelize_1.Op.in]: ["FIAT", "SPOT", "ECO"] },
                },
                attributes: [
                    "id",
                    "type",
                    "currency",
                    "balance",
                    "inOrder",
                    "status",
                ],
                raw: true,
            });
        }
        catch (error) {
            console_1.logger.error("P2P", `Error fetching user wallets: ${error}`);
            wallets = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating total balance");
        let totalBalance = 0;
        for (const wallet of wallets) {
            try {
                const availableBalance = parseFloat(wallet.balance || 0) - parseFloat(wallet.inOrder || 0);
                if (availableBalance <= 0)
                    continue;
                let priceInUSD = 1;
                if (wallet.currency === "USD") {
                    totalBalance += availableBalance;
                    continue;
                }
                try {
                    switch (wallet.type) {
                        case "FIAT":
                            priceInUSD = await (0, utils_1.getFiatPriceInUSD)(wallet.currency);
                            break;
                        case "SPOT":
                            priceInUSD = await (0, utils_1.getSpotPriceInUSD)(wallet.currency);
                            break;
                        case "ECO":
                            priceInUSD = await (0, utils_1.getEcoPriceInUSD)(wallet.currency);
                            break;
                    }
                }
                catch (priceError) {
                    console_1.logger.error("P2P", `Error getting price for ${wallet.type} ${wallet.currency}: ${priceError}`);
                    continue;
                }
                totalBalance += availableBalance * priceInUSD;
            }
            catch (error) {
                console_1.logger.error("P2P", `Error processing wallet ${wallet.id}: ${error}`);
            }
        }
        const successRate = totalTrades > 0
            ? Math.round((completedTrades / totalTrades) * 100)
            : 0;
        const stats = [
            {
                title: "Total Balance",
                value: `$${totalBalance.toFixed(2)}`,
                change: `${wallets.length} wallet${wallets.length !== 1 ? 's' : ''} available`,
                changeType: "neutral",
                icon: "wallet",
                gradient: "from-blue-500 to-blue-700",
            },
            {
                title: "Trading Volume",
                value: `$${totalBalance.toFixed(2)}`,
                change: `${totalTrades} total trade${totalTrades !== 1 ? 's' : ''}`,
                changeType: totalTrades > 0 ? "positive" : "neutral",
                icon: "trending-up",
                gradient: "from-green-500 to-green-700",
            },
            {
                title: "Active Trades",
                value: activeTrades.toString(),
                change: `${activeTrades} pending completion`,
                changeType: activeTrades > 0 ? "positive" : "neutral",
                icon: "bar-chart",
                gradient: "from-violet-500 to-violet-700",
            },
            {
                title: "Success Rate",
                value: `${successRate}%`,
                change: `Based on ${totalTrades} trade${totalTrades !== 1 ? 's' : ''}`,
                changeType: successRate >= 80 ? "positive" : successRate >= 50 ? "neutral" : "negative",
                icon: "shield-check",
                gradient: "from-amber-500 to-amber-700",
            },
        ];
        const result = {
            stats,
            totalTrades,
            activeTrades,
            completedTrades,
            wallets: wallets.map((wallet) => ({
                id: wallet.id,
                type: wallet.type,
                currency: wallet.currency,
                balance: parseFloat(wallet.balance || 0),
                inOrder: parseFloat(wallet.inOrder || 0),
                availableBalance: parseFloat(wallet.balance || 0) - parseFloat(wallet.inOrder || 0),
                status: wallet.status,
            })),
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Stats retrieved (${totalTrades} total trades, ${completedTrades} completed)`);
        return result;
    }
    catch (err) {
        console_1.logger.error("P2P", `Dashboard Stats API Error: ${err.message}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve dashboard stats");
        return {
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        };
    }
};
