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
    summary: "Deletes a specific user by UUID",
    operationId: "deleteUserByUuid",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Delete user",
    parameters: (0, query_1.deleteRecordParams)("user"),
    responses: (0, query_1.deleteRecordResponses)("User"),
    requiresAuth: true,
    permission: "delete.user",
};
exports.default = async (data) => {
    var _a;
    const { params, query, user, ctx } = data;
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
            message: "Forbidden - Only Super Admins can delete users",
        });
    }
    const { id } = params;
    (0, system_accounts_1.assertNotSystemAccount)(id, "deleted, restored or purged");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating target user");
    const targetUser = await db_1.models.user.findOne({
        where: { id },
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (((_a = targetUser === null || targetUser === void 0 ? void 0 : targetUser.role) === null || _a === void 0 ? void 0 : _a.name) === "Super Admin") {
        const remainingSuperAdmins = await db_1.models.user.count({
            where: { id: { [sequelize_1.Op.ne]: id } },
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
                message: "Forbidden - This is the only Super Admin account. Promote another user to Super Admin before deleting it.",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting user");
    const result = await (0, query_1.handleSingleDelete)({
        model: "user",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Ending the user's sessions");
    await (0, token_1.deleteAllUserSessions)(id).catch((error) => console_1.logger.error("ADMIN_CRM", `Deleted user ${id} but could not end their sessions: ${error === null || error === void 0 ? void 0 : error.message}`));
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
