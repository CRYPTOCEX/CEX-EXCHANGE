"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get copy trading follower details",
    description: "Retrieves a specific copy trading follower subscription with its user, its leader, its per-market allocations, and the COUNT of its trades and transactions. The rows themselves are not returned: the detail page pages through /admin/copy-trading/trade and /admin/copy-trading/transaction scoped to this subscription, so shipping them here was 100 rows nothing rendered — and a count capped at 50 that the page displayed as if it were the total.",
    operationId: "getCopyTradingFollowerById",
    tags: ["Admin", "Copy Trading", "Follower"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Follower Details",
    permission: "view.copy_trading",
    demoMask: ["user.email"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the follower subscription",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "Follower details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...errors_1.commonFields,
                            userId: {
                                type: "string",
                                format: "uuid",
                                description: "ID of the user following the leader",
                            },
                            leaderId: {
                                type: "string",
                                format: "uuid",
                                description: "ID of the leader being followed",
                            },
                            copyMode: {
                                type: "string",
                                enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
                                description: "Copy trading mode",
                            },
                            fixedAmount: {
                                type: "number",
                                nullable: true,
                                description: "Fixed amount per trade (if using FIXED_AMOUNT mode)",
                            },
                            fixedRatio: {
                                type: "number",
                                nullable: true,
                                description: "Fixed ratio multiplier (if using FIXED_RATIO mode)",
                            },
                            maxDailyLoss: {
                                type: "number",
                                nullable: true,
                                description: "Maximum daily loss limit",
                            },
                            maxPositionSize: {
                                type: "number",
                                nullable: true,
                                description: "Maximum position size limit",
                            },
                            stopLossPercent: {
                                type: "number",
                                nullable: true,
                                description: "Stop loss percentage",
                            },
                            takeProfitPercent: {
                                type: "number",
                                nullable: true,
                                description: "Take profit percentage",
                            },
                            totalProfit: {
                                type: "number",
                                description: "Total profit/loss from all trades",
                            },
                            totalTrades: {
                                type: "integer",
                                description: "Total number of trades executed",
                            },
                            winRate: {
                                type: "number",
                                description: "Win rate percentage",
                            },
                            roi: {
                                type: "number",
                                description: "Return on investment percentage",
                            },
                            status: {
                                type: "string",
                                enum: ["ACTIVE", "PAUSED", "STOPPED"],
                                description: "Current subscription status",
                            },
                            user: {
                                type: "object",
                                description: "User details",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    firstName: { type: "string" },
                                    lastName: { type: "string" },
                                    email: { type: "string", format: "email" },
                                    avatar: { type: "string", nullable: true },
                                },
                            },
                            leader: {
                                type: "object",
                                description: "Leader details",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    displayName: { type: "string" },
                                    avatar: { type: "string", nullable: true },
                                    tradingStyle: { type: "string", nullable: true },
                                    riskLevel: { type: "string", nullable: true },
                                    profitSharePercent: { type: "number", nullable: true },
                                },
                            },
                            allocations: {
                                type: "array",
                                description: "Per-market allocations. This is where a subscription's money actually sits — stopping a subscription does not release it.",
                                items: {
                                    type: "object",
                                    properties: {
                                        ...errors_1.commonFields,
                                        symbol: { type: "string" },
                                        marketType: { type: "string", enum: ["SPOT", "BINARY"] },
                                        baseAmount: { type: "number" },
                                        baseUsedAmount: {
                                            type: "number",
                                            description: "Base currently locked in open trades",
                                        },
                                        quoteAmount: { type: "number" },
                                        quoteUsedAmount: {
                                            type: "number",
                                            description: "Quote currently locked in open trades",
                                        },
                                        isActive: { type: "boolean" },
                                    },
                                },
                            },
                            tradeCount: {
                                type: "integer",
                                description: "Total trades on this subscription (not capped)",
                            },
                            transactionCount: {
                                type: "integer",
                                description: "Total transactions on this subscription (not capped)",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Follower"),
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Follower");
    const follower = await db_1.models.copyTradingFollower.findByPk(id, {
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                attributes: [
                    "id",
                    "displayName",
                    "avatar",
                    "tradingStyle",
                    "riskLevel",
                    "profitSharePercent",
                    "status",
                ],
            },
            {
                model: db_1.models.copyTradingFollowerAllocation,
                as: "allocations",
                required: false,
            },
        ],
    });
    if (!follower) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Follower not found" });
    }
    const [tradeCount, transactionCount] = await Promise.all([
        db_1.models.copyTradingTrade.count({ where: { followerId: id } }),
        db_1.models.copyTradingTransaction.count({ where: { followerId: id } }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Copy Trading Follower retrieved successfully");
    return {
        ...follower.get({ plain: true }),
        tradeCount,
        transactionCount,
    };
};
