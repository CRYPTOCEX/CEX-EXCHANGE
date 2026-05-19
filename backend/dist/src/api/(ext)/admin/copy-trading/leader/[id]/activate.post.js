"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Activate Leader (Admin)",
    description: "Reactivates a suspended leader.",
    operationId: "adminActivateCopyTradingLeader",
    tags: ["Admin", "Copy Trading"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Activate copy trading leader",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Leader activated successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Leader not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader");
    const leader = await db_1.models.copyTradingLeader.findByPk(id);
    if (!leader) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Leader not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating leader status");
    if (leader.status !== "SUSPENDED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Can only activate suspended leaders. Current status: ${leader.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Can only activate suspended leaders. Current status: ${leader.status}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Activating leader");
    const oldStatus = leader.status;
    await leader.update({ status: "ACTIVE" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: id,
        action: "ACTIVATE",
        oldValue: { status: oldStatus },
        newValue: { status: "ACTIVE" },
        adminId: user === null || user === void 0 ? void 0 : user.id,
    });
    try {
        await (0, notifications_1.createNotification)({
            userId: leader.userId,
            relatedId: leader.id,
            type: "system",
            title: "Copy Trading Account Reactivated",
            message: "An administrator has reactivated your copy trading leader account. You can resume leading trades.",
            link: `/user/copy-trading/leader`,
            actions: [
                {
                    label: "View Leader Dashboard",
                    link: `/user/copy-trading/leader`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifErr) {
        console_1.logger.error("ADMIN_COPY", `Failed to send leader activation notification for leader ${leader.id}`, notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Leader activated successfully");
    return {
        message: "Leader activated successfully",
        leader: leader.toJSON(),
    };
};
