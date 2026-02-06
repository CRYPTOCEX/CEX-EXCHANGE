"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get P2P Dashboard Data",
    description: "Retrieves dashboard data including notifications, portfolio, stats, trading activity, and transactions for the authenticated user.",
    operationId: "getP2PDashboardData",
    tags: ["P2P", "Dashboard"],
    logModule: "P2P",
    logTitle: "Get dashboard data",
    responses: {
        200: { description: "Dashboard data retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing dashboard data fetch");
    try {
        const notifications = 0;
        let portfolioResult = null;
        let statsResult = null;
        let activity = [];
        let transactions = [];
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user wallets");
        let wallets = [];
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
        catch (walletsError) {
            console_1.logger.error("P2P", `Error fetching user wallets: ${walletsError}`);
            wallets = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating portfolio data");
        try {
            portfolioResult = await db_1.models.p2pTrade.findOne({
                attributes: [
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")),
                        "totalValue",
                    ],
                ],
                where: {
                    status: "COMPLETED",
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                raw: true,
            });
        }
        catch (portfolioError) {
            console_1.logger.error("P2P", `Error fetching portfolio data: ${portfolioError}`);
            portfolioResult = { totalValue: 0 };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating dashboard statistics");
        try {
            const tradeStats = await db_1.models.p2pTrade.findOne({
                attributes: [
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "tradeCount"],
                    [
                        (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN 1 END")),
                        "completedCount"
                    ],
                ],
                where: {
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                raw: true,
            });
            const totalTrades = parseInt((tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.tradeCount) || "0");
            const completedTrades = parseInt((tradeStats === null || tradeStats === void 0 ? void 0 : tradeStats.completedCount) || "0");
            const successRate = totalTrades > 0 ? ((completedTrades / totalTrades) * 100).toFixed(1) : "0";
            let totalBalance = 0;
            for (const wallet of wallets) {
                try {
                    const balance = parseFloat(wallet.balance || "0") || 0;
                    const type = wallet.type || 'SPOT';
                    if (balance <= 0)
                        continue;
                    let price = 1;
                    try {
                        if (wallet.currency === 'USD') {
                            price = 1;
                        }
                        else if (type === 'FIAT') {
                            price = await (0, utils_1.getFiatPriceInUSD)(wallet.currency) || 1;
                        }
                        else if (type === 'SPOT' || type === 'FUTURES') {
                            price = await (0, utils_1.getSpotPriceInUSD)(wallet.currency) || 0;
                        }
                        else if (type === 'ECO') {
                            price = await (0, utils_1.getEcoPriceInUSD)(wallet.currency) || 0;
                        }
                    }
                    catch (priceError) {
                        console_1.logger.warn("P2P", `Failed to fetch price for ${wallet.currency} (${type}): ${priceError.message || priceError}`);
                        price = wallet.currency === 'USD' ? 1 : 0;
                    }
                    totalBalance += balance * price;
                }
                catch (walletCalcError) {
                    console_1.logger.warn("P2P", `Error calculating wallet balance: ${walletCalcError.message || walletCalcError}`);
                }
            }
            statsResult = [
                {
                    title: "Total Balance",
                    value: `$${totalBalance.toFixed(2)}`,
                    change: "+0.0% from last month",
                    changeType: "neutral",
                    icon: "wallet",
                    gradient: "from-blue-500 to-blue-700",
                },
                {
                    title: "Trading Volume",
                    value: `$${((portfolioResult === null || portfolioResult === void 0 ? void 0 : portfolioResult.totalValue) || 0)}`,
                    change: "+0.0% from last month",
                    changeType: "neutral",
                    icon: "trending-up",
                    gradient: "from-green-500 to-green-700",
                },
                {
                    title: "Active Trades",
                    value: totalTrades.toString(),
                    change: `${completedTrades} completed`,
                    changeType: "neutral",
                    icon: "bar-chart",
                    gradient: "from-violet-500 to-violet-700",
                },
                {
                    title: "Success Rate",
                    value: `${successRate}%`,
                    change: `Based on ${totalTrades} trades`,
                    changeType: "neutral",
                    icon: "shield-check",
                    gradient: "from-amber-500 to-amber-700",
                },
            ];
        }
        catch (statsError) {
            console_1.logger.error("P2P", `Error fetching stats data: ${statsError}`);
            statsResult = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trading activity");
        try {
            const trades = await db_1.models.p2pTrade.findAll({
                where: {
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                include: [
                    {
                        model: db_1.models.p2pOffer,
                        as: "offer",
                        attributes: ["currency"],
                    },
                    {
                        model: db_1.models.p2pPaymentMethod,
                        as: "paymentMethodDetails",
                        attributes: ["name"],
                    },
                    {
                        model: db_1.models.user,
                        as: "buyer",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                    {
                        model: db_1.models.user,
                        as: "seller",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
                order: [["updatedAt", "DESC"]],
                limit: 10,
            });
            activity = await Promise.all(trades.map(async (trade) => {
                var _a, _b;
                const tradeData = trade.get({ plain: true });
                const isBuyer = tradeData.buyerId === user.id;
                const actionType = isBuyer ? "BUY" : "SELL";
                const counterparty = isBuyer ? tradeData.seller : tradeData.buyer;
                let avgRating = 0;
                try {
                    const reviews = await db_1.models.p2pReview.findAll({
                        where: { revieweeId: counterparty === null || counterparty === void 0 ? void 0 : counterparty.id },
                        attributes: ["rating"],
                        raw: true,
                    });
                    if (reviews.length > 0) {
                        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
                        avgRating = Math.round((totalRating / reviews.length) * 10) / 10;
                    }
                }
                catch (e) {
                }
                return {
                    id: tradeData.id,
                    type: actionType,
                    status: tradeData.status,
                    amount: tradeData.amount,
                    currency: tradeData.currency || ((_a = tradeData.offer) === null || _a === void 0 ? void 0 : _a.currency) || "Unknown",
                    total: tradeData.total,
                    paymentMethodName: ((_b = tradeData.paymentMethodDetails) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
                    counterpartyId: counterparty === null || counterparty === void 0 ? void 0 : counterparty.id,
                    counterpartyName: counterparty ? `${counterparty.firstName || ""} ${counterparty.lastName || ""}`.trim() || "Unknown" : "Unknown",
                    counterpartyAvatar: counterparty === null || counterparty === void 0 ? void 0 : counterparty.avatar,
                    counterpartyRating: avgRating,
                    timestamp: tradeData.updatedAt,
                    createdAt: tradeData.createdAt,
                };
            }));
        }
        catch (activityError) {
            console_1.logger.error("P2P", `Error fetching activity data: ${activityError}`);
            activity = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent transactions");
        try {
            transactions = await db_1.models.p2pTrade.findAll({
                where: {
                    [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
                },
                order: [["createdAt", "DESC"]],
                limit: 10,
                raw: true,
            });
        }
        catch (transactionsError) {
            console_1.logger.error("P2P", `Error fetching transactions data: ${transactionsError}`);
            transactions = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Dashboard data retrieved successfully");
        return {
            notifications,
            portfolio: portfolioResult || { totalValue: 0 },
            stats: statsResult || [],
            tradingActivity: activity || [],
            transactions: transactions || [],
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
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve dashboard data");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
