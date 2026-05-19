"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
exports.metadata = {
    summary: "Suspend Leader (Admin)",
    description: "Suspends an active leader. All followers will be paused.",
    operationId: "adminSuspendCopyTradingLeader",
    tags: ["Admin", "Copy Trading"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Suspend copy trading leader",
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
                            description: "Reason for suspension",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Leader suspended successfully" },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating suspension reason");
    if (!reason) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Suspension reason is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Suspension reason is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader");
    const leader = await db_1.models.copyTradingLeader.findByPk(id);
    if (!leader) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Leader not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating leader status");
    if (leader.status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot suspend leader with status: ${leader.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot suspend leader with status: ${leader.status}`,
        });
    }
    const oldStatus = leader.status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Suspending leader");
    await leader.update({ status: "SUSPENDED" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Pausing all active followers");
    await db_1.models.copyTradingFollower.update({ status: "PAUSED" }, { where: { leaderId: id, status: "ACTIVE" } });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: id,
        action: "SUSPEND",
        oldValue: { status: oldStatus },
        newValue: { status: "SUSPENDED" },
        adminId: user === null || user === void 0 ? void 0 : user.id,
        reason,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating leader statistics");
    await (0, utils_1.updateLeaderStats)(id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending suspension notification to leader");
    await (0, utils_1.notifyLeaderApplicationEvent)(leader.userId, id, "SUSPENDED", { reason }, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Notifying affected followers");
    const affectedFollowers = await db_1.models.copyTradingFollower.findAll({
        where: { leaderId: id },
        attributes: ["id", "userId"],
    });
    for (const follower of affectedFollowers) {
        await (0, utils_1.notifyFollowerSubscriptionEvent)(follower.id, "PAUSED", { reason: `Leader suspended: ${reason}` }, ctx);
    }
    await (0, utils_1.notifyCopyTradingAdmins)("LEADER_SUSPENDED", {
        leaderId: id,
        leaderName: `User ${leader.userId}`,
        reason,
    }, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Leader suspended successfully");
    return {
        message: "Leader suspended successfully",
        leader: leader.toJSON(),
    };
};
