"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const token_1 = require("@b/utils/token");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Bulk deletes users by UUIDs",
    operationId: "bulkDeleteUsers",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Bulk delete users",
    parameters: (0, query_1.commonBulkDeleteParams)("Users"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of user UUIDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Users"),
    requiresAuth: true,
    permission: "delete.user",
};
exports.default = async (data) => {
    const { body, query, user, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    const userPk = await db_1.models.user.findByPk(user.id, {
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!userPk || !userPk.role || userPk.role.name !== "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - Only Super Admins can bulk delete users",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating target users");
    (0, system_accounts_1.assertNoneAreSystemAccounts)(ids, "deleted, restored or purged");
    const targetUsers = await db_1.models.user.findAll({
        where: { id: ids },
        include: [{ model: db_1.models.role, as: "role" }],
    });
    const targetedSuperAdminIds = targetUsers
        .filter((targetUser) => { var _a; return ((_a = targetUser.role) === null || _a === void 0 ? void 0 : _a.name) === "Super Admin"; })
        .map((targetUser) => targetUser.id);
    if (targetedSuperAdminIds.length > 0) {
        const remainingSuperAdmins = await db_1.models.user.count({
            where: { id: { [sequelize_1.Op.notIn]: targetedSuperAdminIds } },
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    where: { name: "Super Admin" },
                    required: true,
                },
            ],
        });
        if (remainingSuperAdmins === 0) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Forbidden - This selection would delete every Super Admin account. Leave at least one in place.",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} users`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "user",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Ending those users' sessions");
    await Promise.all(ids.map((id) => (0, token_1.deleteAllUserSessions)(id).catch((error) => console_1.logger.error("ADMIN_CRM", `Deleted user ${id} but could not end their sessions: ${error === null || error === void 0 ? void 0 : error.message}`))));
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
