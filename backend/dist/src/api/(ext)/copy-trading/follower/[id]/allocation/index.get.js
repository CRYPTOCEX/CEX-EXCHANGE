"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
exports.metadata = {
    summary: "Get Subscription Allocations",
    description: "Retrieves all market allocations for a subscription.",
    operationId: "getSubscriptionAllocations",
    tags: ["Copy Trading", "Followers", "Allocations"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get allocations",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Subscription (follower) ID",
        },
    ],
    responses: {
        200: {
            description: "Allocations retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: { type: "object" },
                    },
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
    if (!(0, security_1.isValidUUID)(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid subscription ID" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id);
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching allocations");
    const allocations = await db_1.models.copyTradingFollowerAllocation.findAll({
        where: { followerId: id },
        order: [["symbol", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Found ${allocations.length} allocations`);
    return allocations.map((a) => a.toJSON());
};
