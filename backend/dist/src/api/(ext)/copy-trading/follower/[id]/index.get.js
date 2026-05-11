"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Subscription Details",
    description: "Retrieves detailed information about a specific subscription.",
    operationId: "getCopyTradingSubscription",
    tags: ["Copy Trading", "Followers"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get subscription details",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Subscription ID",
        },
    ],
    responses: {
        200: {
            description: "Subscription details retrieved successfully",
            content: {
                "application/json": {
                    schema: { type: "object" },
                },
            },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Subscription not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id, {
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
        ],
    });
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent trades");
    const recentTrades = await db_1.models.copyTradingTrade.findAll({
        where: { followerId: id },
        order: [["createdAt", "DESC"]],
        limit: 20,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching transactions");
    const transactions = await db_1.models.copyTradingTransaction.findAll({
        where: { followerId: id },
        order: [["createdAt", "DESC"]],
        limit: 20,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription details retrieved");
    return {
        ...subscription.toJSON(),
        recentTrades: recentTrades.map((t) => t.toJSON()),
        transactions: transactions.map((t) => t.toJSON()),
    };
};
