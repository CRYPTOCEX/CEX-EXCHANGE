"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
exports.metadata = {
    summary: "Update Leader (Admin)",
    description: "Updates leader profile and settings.",
    operationId: "adminUpdateCopyTradingLeader",
    tags: ["Admin", "Copy Trading"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Update copy trading leader",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        displayName: { type: "string" },
                        bio: { type: "string" },
                        tradingStyle: { type: "string" },
                        riskLevel: { type: "string" },
                        profitSharePercent: { type: "number" },
                        minFollowAmount: { type: "number" },
                        maxFollowers: { type: "number" },
                        isPublic: { type: "boolean" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Leader updated successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Leader not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    const { id } = params;
    if (!(0, utils_1.isValidUUID)(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid leader ID format" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader");
    const leader = await db_1.models.copyTradingLeader.findByPk(id);
    if (!leader) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Leader not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing update data");
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
    const updateData = {};
    const oldValues = {};
    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            oldValues[field] = leader[field];
            updateData[field] = body[field];
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating leader");
    await leader.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: id,
        action: "UPDATE",
        oldValue: oldValues,
        newValue: updateData,
        adminId: user === null || user === void 0 ? void 0 : user.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Leader updated successfully");
    return {
        message: "Leader updated successfully",
        leader: leader.toJSON(),
    };
};
