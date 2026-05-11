"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Copy Trade Details",
    description: "Retrieves detailed information about a specific copy trade.",
    operationId: "getCopyTradeDetails",
    tags: ["Copy Trading", "Trades"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get trade details",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Trade ID",
        },
    ],
    responses: {
        200: {
            description: "Trade details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Trade not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, params, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trade");
    const trade = await db_1.models.copyTradingTrade.findByPk(id, {
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: ["id", "displayName", "userId", "profitSharePercent"],
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
            {
                model: db_1.models.copyTradingFollower,
                as: "follower",
                attributes: ["id", "userId", "allocatedAmount", "currency", "copyMode"],
            },
        ],
    });
    if (!trade) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
    }
    const isFollower = ((_a = trade.follower) === null || _a === void 0 ? void 0 : _a.userId) === user.id;
    const isLeader = ((_b = trade.leader) === null || _b === void 0 ? void 0 : _b.userId) === user.id;
    if (!isFollower && !isLeader) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching related transactions");
    const transactions = await db_1.models.copyTradingTransaction.findAll({
        where: { tradeId: id },
        order: [["createdAt", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader trade");
    let leaderTradeData = null;
    if (trade.leaderTradeId) {
        const leaderTrade = await db_1.models.copyTradingTrade.findByPk(trade.leaderTradeId, {
            attributes: ["id", "symbol", "side", "type", "amount", "price", "cost", "status", "createdAt"],
        });
        if (leaderTrade) {
            leaderTradeData = leaderTrade.toJSON();
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Trade details retrieved");
    return {
        ...trade.toJSON(),
        transactions: transactions.map((t) => t.toJSON()),
        leaderTrade: leaderTradeData,
        viewerRole: isLeader ? "leader" : "follower",
    };
};
