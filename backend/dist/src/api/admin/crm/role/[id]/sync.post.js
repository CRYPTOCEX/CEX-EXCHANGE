"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.syncPermissions = syncPermissions;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Syncs roles with the database",
    operationId: "syncRoles",
    tags: ["Admin", "CRM", "Role"],
    logModule: "ADMIN_CRM",
    logTitle: "Sync role permissions",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the role to update",
            required: true,
            schema: {
                type: "number",
            },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "number",
                            description: "ID of the role to sync",
                        },
                        permissionIds: {
                            type: "array",
                            items: {
                                type: "number",
                            },
                            description: "Array of permission IDs to sync with the role",
                        },
                    },
                },
            },
        },
    },
    permission: "edit.role",
    responses: {
        200: {
            description: "Role permissions synced successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: {
                                type: "number",
                                description: "ID of the role",
                            },
                            name: {
                                type: "string",
                                description: "Name of the role",
                            },
                            permissions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: {
                                            type: "number",
                                            description: "ID of the permission",
                                        },
                                        name: {
                                            type: "string",
                                            description: "Name of the permission",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, admin permission required",
        },
        500: {
            description: "Internal server error",
        },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Syncing role permissions");
    const response = await syncPermissions(data.params.id, data.body.permissionIds);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating roles cache");
    await (0, utils_1.cacheRoles)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return {
        ...response.get({ plain: true }),
        message: "Role permissions synced successfully",
    };
};
async function syncPermissions(roleId, permissionIds) {
    return db_1.sequelize
        .transaction(async (transaction) => {
        const role = await db_1.models.role.findByPk(roleId, { transaction });
        if (!role) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Role not found" });
        }
        const currentPermissions = await role.getPermissions({ transaction });
        const currentPermissionIds = currentPermissions.map((p) => p.id);
        const toAdd = permissionIds.filter((id) => !currentPermissionIds.includes(id));
        const toRemove = currentPermissions.filter((p) => !permissionIds.includes(p.id));
        for (const permId of toAdd) {
            const permissionToAdd = await db_1.models.permission.findByPk(permId, { transaction });
            if (permissionToAdd) {
                await role.addPermission(permissionToAdd, { transaction });
            }
        }
        for (const permission of toRemove) {
            await role.removePermission(permission, { transaction });
        }
        const updatedRole = await db_1.models.role.findByPk(roleId, {
            include: [
                {
                    model: db_1.models.permission,
                    as: "permissions",
                    through: { attributes: [] },
                    attributes: ["id", "name"],
                },
            ],
            transaction,
        });
        return updatedRole;
    })
        .catch((error) => {
        console_1.logger.error("ROLE", "Transaction failed", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to sync role permissions" });
    });
}
