"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const token_1 = require("@b/utils/token");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Bulk updates the status of users",
    operationId: "bulkUpdateUserStatus",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Bulk update user status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of user IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            description: "New status to apply",
                            enum: ["ACTIVE", "INACTIVE", "BANNED"],
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("User"),
    requiresAuth: true,
    permission: "edit.user",
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating target users");
    (0, system_accounts_1.assertNoneAreSystemAccounts)(ids, "suspended, banned or deactivated");
    if (Array.isArray(ids) && ids.includes(user.id)) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You cannot change your own status",
        });
    }
    if (Array.isArray(ids) && ids.length > 0) {
        const superAdminTarget = await db_1.models.user.findOne({
            where: { id: ids },
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    where: { name: "Super Admin" },
                    required: true,
                },
            ],
        });
        if (superAdminTarget) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Cannot change the status of a Super Admin account",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} users to ${status}`);
    const result = await (0, query_1.updateStatus)("user", ids, status);
    if (status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Revoking sessions for the affected users");
        await Promise.all(ids.map((id) => (0, token_1.deleteAllUserSessions)(id)));
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
