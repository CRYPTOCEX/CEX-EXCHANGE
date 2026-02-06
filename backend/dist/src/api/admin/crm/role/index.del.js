"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Bulk deletes roles",
    operationId: "deleteBulkRoles",
    tags: ["Admin", "CRM", "Role"],
    logModule: "ADMIN_CRM",
    logTitle: "Bulk delete roles",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: {
                                type: "number",
                            },
                            description: "Array of role IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    permission: "delete.role",
    responses: (0, query_1.commonBulkDeleteResponses)("Roles"),
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { body, user, ctx } = data;
    const { ids } = body;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating role deletion permissions");
    const superAdminRole = await db_1.models.role.findOne({
        where: {
            name: "Super Admin",
        },
    });
    if (superAdminRole && ids.includes(superAdminRole.id)) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - Cannot delete Super Admin role",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} roles`);
        await db_1.sequelize.transaction(async (transaction) => {
            await db_1.models.rolePermission.destroy({
                where: {
                    roleId: ids,
                },
                transaction,
            });
            await db_1.models.role.destroy({
                where: {
                    id: ids,
                },
                transaction,
            });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Rebuilding roles cache");
        await (0, utils_1.cacheRoles)();
        ctx === null || ctx === void 0 ? void 0 : ctx.success();
        return {
            message: "Roles removed successfully",
        };
    }
    catch (error) {
        console_1.logger.error("ROLE", "Failed to remove roles", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to remove roles" });
    }
};
