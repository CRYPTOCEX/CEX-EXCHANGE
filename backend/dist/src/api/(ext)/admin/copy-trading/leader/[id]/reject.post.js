"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
exports.metadata = {
    summary: "Reject Leader Application (Admin)",
    description: "Rejects a pending leader application.",
    operationId: "adminRejectCopyTradingLeader",
    tags: ["Admin", "Copy Trading"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Reject copy trading leader",
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
                        reason: {
                            type: "string",
                            description: "Reason for rejection",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Leader rejected successfully" },
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
    const { reason } = body;
    if (!(0, utils_1.isValidUUID)(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid leader ID format" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating rejection reason");
    if (!reason) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Rejection reason is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Rejection reason is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader application");
    const leader = await db_1.models.copyTradingLeader.findByPk(id);
    if (!leader) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Leader not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating leader status");
    if (leader.status !== "PENDING") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot reject leader with status: ${leader.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot reject leader with status: ${leader.status}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Rejecting leader application");
    const oldStatus = leader.status;
    await leader.update({ status: "REJECTED", rejectionReason: reason });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: id,
        action: "REJECT",
        oldValue: { status: oldStatus },
        newValue: { status: "REJECTED", rejectionReason: reason },
        adminId: user === null || user === void 0 ? void 0 : user.id,
        reason,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending rejection notification");
    await (0, utils_1.notifyLeaderApplicationEvent)(leader.userId, id, "REJECTED", { rejectionReason: reason }, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Leader rejected successfully");
    return {
        message: "Leader rejected successfully",
        leader: leader.toJSON(),
    };
};
