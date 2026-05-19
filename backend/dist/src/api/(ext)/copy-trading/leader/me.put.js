"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
exports.metadata = {
    summary: "Update My Leader Profile",
    description: "Updates the current user's leader profile settings.",
    operationId: "updateMyLeaderProfile",
    tags: ["Copy Trading", "Leaders"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Update leader profile",
    middleware: ["copyTradingLeaderUpdate"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        displayName: { type: "string", minLength: 2, maxLength: 100 },
                        bio: { type: "string", maxLength: 1000 },
                        avatar: { type: "string" },
                        tradingStyle: {
                            type: "string",
                            enum: ["SCALPING", "DAY_TRADING", "SWING", "POSITION"],
                        },
                        riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                        profitSharePercent: { type: "number", minimum: 0, maximum: 50 },
                        minFollowAmount: { type: "number", minimum: 0 },
                        maxFollowers: { type: "number", minimum: 1 },
                        isPublic: { type: "boolean" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Profile updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            leader: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Not a leader" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request");
    const validation = (0, security_1.validateLeaderUpdate)(body);
    if (!validation.valid) {
        (0, security_1.throwValidationError)(validation);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader profile");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id },
    });
    if (!leader) {
        throw (0, error_1.createError)({ statusCode: 404, message: "You are not a leader" });
    }
    if (leader.status !== "ACTIVE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Only active leaders can update their profile",
        });
    }
    const updateData = {};
    const oldValues = {};
    const allowedFields = [
        "displayName",
        "bio",
        "tradingStyle",
        "riskLevel",
        "profitSharePercent",
        "minFollowAmount",
        "maxFollowers",
        "isPublic",
    ];
    for (const field of allowedFields) {
        if (validation.sanitized[field] !== undefined) {
            oldValues[field] = leader[field];
            updateData[field] = validation.sanitized[field];
        }
    }
    if (body.avatar !== undefined) {
        oldValues.avatar = leader.avatar;
        updateData.avatar = body.avatar;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking constraints");
    if (updateData.maxFollowers !== undefined) {
        const activeFollowerCount = await db_1.models.copyTradingFollower.count({
            where: { leaderId: leader.id, status: "ACTIVE" },
        });
        if (updateData.maxFollowers < activeFollowerCount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot set max followers below current count (${activeFollowerCount})`,
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating leader profile");
    await leader.update(updateData);
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: leader.id,
        action: "UPDATE",
        oldValue: oldValues,
        newValue: updateData,
        userId: user.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Leader profile updated");
    return {
        message: "Profile updated successfully",
        leader: leader.toJSON(),
    };
};
