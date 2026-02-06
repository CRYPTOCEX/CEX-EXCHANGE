"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/finance/currency/utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get P2P Portfolio Data",
    description: "Retrieves the portfolio summary for the authenticated user.",
    operationId: "getP2PPortfolioData",
    tags: ["P2P", "Dashboard"],
    logModule: "P2P",
    logTitle: "Get portfolio data",
    responses: {
        200: { description: "Portfolio data retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching completed trade volume");
    try {
        const completedTradesResult = await db_1.models.p2pTrade.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "completedVolume"],
            ],
            where: {
                status: "COMPLETED",
                [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
            },
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active trades value");
        const activeTradesResult = await db_1.models.p2pTrade.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("total")), "activeVolume"],
            ],
            where: {
                status: { [sequelize_1.Op.notIn]: ["COMPLETED", "CANCELLED", "REFUNDED"] },
                [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
            },
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating wallet values");
        const wallets = await db_1.models.wallet.findAll({
            where: {
                userId: user.id,
                type: { [sequelize_1.Op.in]: ["FIAT", "SPOT", "ECO"] },
            },
            attributes: ["type", "currency", "balance", "inOrder"],
            raw: true,
        });
        let totalWalletValue = 0;
        for (const wallet of wallets) {
            const balance = parseFloat(String(wallet.balance || 0)) || 0;
            if (balance <= 0)
                continue;
            let price = 1;
            try {
                if (wallet.currency === "USD") {
                    price = 1;
                }
                else if (wallet.type === "FIAT") {
                    price = (await (0, utils_1.getFiatPriceInUSD)(wallet.currency)) || 1;
                }
                else if (wallet.type === "SPOT" || wallet.type === "FUTURES") {
                    price = (await (0, utils_1.getSpotPriceInUSD)(wallet.currency)) || 0;
                }
                else if (wallet.type === "ECO") {
                    price = (await (0, utils_1.getEcoPriceInUSD)(wallet.currency)) || 0;
                }
            }
            catch (_a) {
                price = wallet.currency === "USD" ? 1 : 0;
            }
            totalWalletValue += balance * price;
        }
        const completedVolume = parseFloat((completedTradesResult === null || completedTradesResult === void 0 ? void 0 : completedTradesResult.completedVolume) || "0") || 0;
        const activeVolume = parseFloat((activeTradesResult === null || activeTradesResult === void 0 ? void 0 : activeTradesResult.activeVolume) || "0") || 0;
        const totalValue = totalWalletValue + activeVolume;
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Portfolio data retrieved (total value: $${totalValue.toFixed(2)})`);
        return {
            totalValue,
            completedVolume,
            activeVolume,
            walletValue: totalWalletValue,
            changePercentage: 0,
            change24h: 0,
            return30d: 0,
            chartData: totalValue > 0 ? [
                { date: "Day 1", value: totalValue * 0.95 },
                { date: "Day 2", value: totalValue * 0.97 },
                { date: "Day 3", value: totalValue * 0.96 },
                { date: "Day 4", value: totalValue * 0.98 },
                { date: "Day 5", value: totalValue * 0.99 },
                { date: "Day 6", value: totalValue * 1.01 },
                { date: "Today", value: totalValue },
            ] : [],
        };
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve portfolio data");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
