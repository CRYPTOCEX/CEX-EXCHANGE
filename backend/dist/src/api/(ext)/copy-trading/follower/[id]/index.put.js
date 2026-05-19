"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
exports.metadata = {
    summary: "Update Subscription Settings",
    description: "Updates the settings for a subscription.",
    operationId: "updateCopyTradingSubscription",
    tags: ["Copy Trading", "Followers"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Update subscription",
    middleware: ["copyTradingFollowerAction"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Subscription ID",
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
                        },
                        fixedAmount: { type: "number", minimum: 0.01 },
                        fixedRatio: { type: "number", minimum: 0.01, maximum: 10 },
                        maxDailyLoss: { type: "number", minimum: 0, maximum: 100 },
                        maxPositionSize: { type: "number", minimum: 0, maximum: 100 },
                        stopLossPercent: { type: "number", minimum: 0, maximum: 100 },
                        takeProfitPercent: { type: "number", minimum: 0, maximum: 1000 },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Subscription updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            subscription: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Subscription not found" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, params, body, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!(0, security_1.isValidUUID)(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid subscription ID" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request");
    const validation = (0, security_1.validateSubscriptionUpdate)(body);
    if (!validation.valid) {
        (0, security_1.throwValidationError)(validation);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id);
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    if (subscription.status === "STOPPED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot update a stopped subscription",
        });
    }
    const updateData = {};
    const oldValues = {};
    const allowedFields = [
        "copyMode",
        "fixedAmount",
        "fixedRatio",
        "maxDailyLoss",
        "maxPositionSize",
        "stopLossPercent",
        "takeProfitPercent",
    ];
    for (const field of allowedFields) {
        if (validation.sanitized[field] !== undefined) {
            oldValues[field] = subscription[field];
            updateData[field] = validation.sanitized[field];
        }
    }
    const newCopyMode = (_a = updateData.copyMode) !== null && _a !== void 0 ? _a : subscription.copyMode;
    if (newCopyMode === "FIXED_AMOUNT") {
        const fixedAmt = (_b = updateData.fixedAmount) !== null && _b !== void 0 ? _b : subscription.fixedAmount;
        if (!fixedAmt || fixedAmt <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Fixed amount is required for FIXED_AMOUNT mode",
            });
        }
    }
    if (newCopyMode === "FIXED_RATIO") {
        const fixedR = (_c = updateData.fixedRatio) !== null && _c !== void 0 ? _c : subscription.fixedRatio;
        if (!fixedR || fixedR <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Fixed ratio is required for FIXED_RATIO mode",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating subscription");
    await subscription.update(updateData);
    await (0, utils_1.createAuditLog)({
        entityType: "FOLLOWER",
        entityId: id,
        action: "UPDATE",
        oldValue: oldValues,
        newValue: updateData,
        userId: user.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Subscription updated");
    return {
        message: "Subscription updated successfully",
        subscription: subscription.toJSON(),
    };
};
