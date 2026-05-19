"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get P2P Trading Activity",
    description: "Retrieves recent trading activity for the authenticated user.",
    operationId: "getP2PTradingActivity",
    tags: ["P2P", "Dashboard"],
    logModule: "P2P",
    logTitle: "Get trading activity",
    responses: {
        200: { description: "Trading activity retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent trades");
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
            ],
            order: [["updatedAt", "DESC"]],
            limit: 10,
        });
        const activities = trades.map((trade) => {
            var _a, _b;
            const tradeData = trade.get({ plain: true });
            const isBuyer = tradeData.buyerId === user.id;
            const actionType = isBuyer ? "BUY" : "SELL";
            return {
                id: tradeData.id,
                type: actionType,
                status: tradeData.status,
                amount: tradeData.amount,
                currency: tradeData.currency || ((_a = tradeData.offer) === null || _a === void 0 ? void 0 : _a.currency) || "Unknown",
                total: tradeData.total,
                paymentMethodName: ((_b = tradeData.paymentMethodDetails) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
                counterpartyId: isBuyer ? tradeData.sellerId : tradeData.buyerId,
                timestamp: tradeData.updatedAt,
                createdAt: tradeData.createdAt,
            };
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${activities.length} activity records`);
        return activities;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve trading activity");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
