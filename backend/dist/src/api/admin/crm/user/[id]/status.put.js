"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const token_1 = require("@b/utils/token");
const db_1 = require("@b/db");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Updates the status of a user",
    operationId: "updateUserStatus",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Update user status",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user to update",
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
                        status: {
                            type: "string",
                            description: "New status to apply",
                            enum: ["ACTIVE", "INACTIVE", "BANNED"],
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("User"),
    requiresAuth: true,
    permission: "edit.user",
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating target user");
    const targetUser = await db_1.models.user.findOne({
        where: { id },
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!targetUser) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    (0, system_accounts_1.assertNotSystemAccount)(targetUser, "suspended, banned or deactivated");
    if (targetUser.role && targetUser.role.name === "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Cannot change the status of a Super Admin account",
        });
    }
    if (targetUser.id === user.id) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You cannot change your own status",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating user status to ${status}`);
    const result = await (0, query_1.updateStatus)("user", id, status);
    if (status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Revoking active sessions");
        await (0, token_1.deleteAllUserSessions)(id);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
