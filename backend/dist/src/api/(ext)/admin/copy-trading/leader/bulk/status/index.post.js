"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
exports.metadata = {
    summary: "Bulk Update Leader Status",
    description: "Updates the status of multiple leaders at once.",
    operationId: "adminBulkUpdateCopyTradingLeaderStatus",
    tags: ["Admin", "Copy Trading", "Leaders"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Bulk update leader status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        leaderIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of leader IDs to update",
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
                            description: "New status for all leaders",
                        },
                        reason: {
                            type: "string",
                            description: "Reason for the status change",
                        },
                    },
                    required: ["leaderIds", "status", "reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Leaders updated successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { leaderIds, status, reason } = body || {};
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request data");
    if (!leaderIds || !Array.isArray(leaderIds) || leaderIds.length === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Leader IDs array is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Leader IDs array is required" });
    }
    if (!status) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Status is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Status is required" });
    }
    if (!reason) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Reason is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Reason is required" });
    }
    const validStatuses = ["ACTIVE", "SUSPENDED", "INACTIVE"];
    if (!validStatuses.includes(status)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid status: ${status}`);
        throw (0, error_1.createError)({ statusCode: 400, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${leaderIds.length} leaders`);
    const leaders = await db_1.models.copyTradingLeader.findAll({
        where: { id: leaderIds },
    });
    if (leaders.length === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No leaders found");
        throw (0, error_1.createError)({ statusCode: 404, message: "No leaders found" });
    }
    const results = [];
    const errors = [];
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing bulk status update to ${status}`);
    await db_1.sequelize.transaction(async (transaction) => {
        for (const leader of leaders) {
            try {
                const oldStatus = leader.status;
                if (oldStatus === status) {
                    results.push({
                        id: leader.id,
                        displayName: leader.displayName,
                        status: "skipped",
                        message: `Already ${status}`,
                    });
                    continue;
                }
                if (status === "ACTIVE" && oldStatus === "PENDING") {
                    errors.push({
                        id: leader.id,
                        displayName: leader.displayName,
                        error: "Use approve endpoint for pending leaders",
                    });
                    continue;
                }
                await leader.update({ status }, { transaction });
                if (status === "SUSPENDED") {
                    await db_1.models.copyTradingFollower.update({ status: "PAUSED" }, { where: { leaderId: leader.id, status: "ACTIVE" }, transaction });
                }
                if (status === "ACTIVE" && oldStatus === "SUSPENDED") {
                }
                await (0, utils_1.createAuditLog)({
                    entityType: "LEADER",
                    entityId: leader.id,
                    action: `BULK_${status}`,
                    oldValue: { status: oldStatus },
                    newValue: { status },
                    adminId: user.id,
                    reason,
                });
                results.push({
                    id: leader.id,
                    displayName: leader.displayName,
                    status: "updated",
                    oldStatus,
                    newStatus: status,
                });
            }
            catch (err) {
                errors.push({
                    id: leader.id,
                    displayName: leader.displayName,
                    error: err.message,
                });
            }
        }
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating statistics for affected leaders");
    for (const result of results.filter((r) => r.status === "updated")) {
        try {
            await (0, utils_1.updateLeaderStats)(result.id);
        }
        catch (_a) { }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Processed ${leaders.length} leaders: ${results.filter((r) => r.status === "updated").length} updated, ${results.filter((r) => r.status === "skipped").length} skipped, ${errors.length} failed`);
    return {
        message: `Processed ${leaders.length} leaders`,
        updated: results.filter((r) => r.status === "updated").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        failed: errors.length,
        results,
        errors,
    };
};
