"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update copy trading follower subscription",
    description: "Updates configuration settings for a specific copy trading follower subscription. Allows modification of allocation amounts, copy mode, risk management parameters, and subscription status. Creates an audit log entry for tracking administrative changes.",
    operationId: "updateCopyTradingFollower",
    tags: ["Admin", "Copy Trading", "Follower"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Update Copy Trading Follower Subscription",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the follower subscription",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        copyMode: {
                            type: "string",
                            enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
                            description: "Copy trading mode to use",
                        },
                        fixedAmount: {
                            type: "number",
                            description: "Fixed amount per trade (for FIXED_AMOUNT mode, min: 0)",
                        },
                        fixedRatio: {
                            type: "number",
                            description: "Fixed ratio multiplier (for FIXED_RATIO mode, min: 0)",
                        },
                        maxTradeAmount: {
                            type: "number",
                            description: "Maximum amount per trade (min: 0)",
                        },
                        riskMultiplier: {
                            type: "number",
                            description: "Risk multiplier for position sizing (min: 0)",
                        },
                        stopLossPercent: {
                            type: "number",
                            description: "Stop loss percentage (0-100)",
                        },
                        takeProfitPercent: {
                            type: "number",
                            description: "Take profit percentage (min: 0)",
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "PAUSED", "STOPPED"],
                            description: "Subscription status",
                        },
                    },
                    description: "All fields are optional - only provided fields will be updated",
                },
            },
        },
    },
    responses: {
        200: {
            description: "Follower subscription updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Follower updated successfully",
                            },
                            follower: {
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
                                        description: "Fixed amount per trade",
                                    },
                                    fixedRatio: {
                                        type: "number",
                                        nullable: true,
                                        description: "Fixed ratio multiplier",
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
                                    },
                                    leader: {
                                        type: "object",
                                        description: "Leader details",
                                    },
                                },
                            },
                        },
                        required: ["message", "follower"],
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Follower"),
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching follower subscription");
    const follower = await db_1.models.copyTradingFollower.findByPk(id);
    if (!follower) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Follower not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Follower not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing update data");
    const allowedFields = [
        "copyMode",
        "fixedAmount",
        "fixedRatio",
        "maxTradeAmount",
        "riskMultiplier",
        "stopLossPercent",
        "takeProfitPercent",
        "status",
    ];
    const updates = {};
    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updates[field] = body[field];
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating follower subscription");
    await follower.update(updates);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
    await db_1.models.copyTradingAuditLog.create({
        userId: user.id,
        action: "ADMIN_UPDATE",
        entityType: "copyTradingFollower",
        entityId: id,
        newValue: updates,
        ipAddress: ((_a = data.request) === null || _a === void 0 ? void 0 : _a.ip) || "unknown",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching updated follower data");
    const updatedFollower = await db_1.models.copyTradingFollower.findByPk(id, {
        include: [
            { model: db_1.models.user, as: "user" },
            { model: db_1.models.copyTradingLeader, as: "leader" },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Follower updated successfully");
    return {
        message: "Follower updated successfully",
        follower: updatedFollower,
    };
};
