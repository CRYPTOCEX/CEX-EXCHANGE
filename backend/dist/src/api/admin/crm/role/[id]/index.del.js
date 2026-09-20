"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Deletes a role",
    operationId: "deleteRole",
    tags: ["Admin", "CRM", "Role"],
    logModule: "ADMIN_CRM",
    logTitle: "Delete role",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the role to delete",
            required: true,
            schema: {
                type: "number",
            },
        },
    ],
    permission: "delete.role",
    responses: (0, query_1.deleteRecordResponses)("Role"),
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { params, user, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    const authenticatedUser = await db_1.models.user.findByPk(user.id, {
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!authenticatedUser || ((_a = authenticatedUser.role) === null || _a === void 0 ? void 0 : _a.name) !== "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - Only Super Admins can delete roles",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating role");
    const roleToDelete = await db_1.models.role.findByPk(id);
    if (!roleToDelete) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Role not found" });
    }
    if (roleToDelete.name === "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - Cannot delete the Super Admin role",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting role and permissions");
        await db_1.sequelize.transaction(async (transaction) => {
            await db_1.models.rolePermission.destroy({
                where: {
                    roleId: id,
                },
                transaction,
            });
            await db_1.models.role.destroy({
                where: {
                    id,
                },
                transaction,
            });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Rebuilding roles cache");
        await (0, utils_1.cacheRoles)();
        ctx === null || ctx === void 0 ? void 0 : ctx.success();
        return {
            message: "Role removed successfully",
        };
    }
    catch (error) {
        console_1.logger.error("ROLE", "Transaction failed", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to remove the role" });
    }
};
