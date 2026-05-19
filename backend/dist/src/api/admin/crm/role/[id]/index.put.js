"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_2 = require("../utils");
exports.metadata = {
    summary: "Updates an existing role",
    operationId: "updateRole",
    tags: ["Admin", "CRM", "Role"],
    logModule: "ADMIN_CRM",
    logTitle: "Update role",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the role to update",
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the role",
        content: {
            "application/json": {
                schema: utils_1.roleUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Role"),
    requiresAuth: true,
    permission: "edit.role",
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    const { id } = params;
    const { name, permissions } = body;
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
    if (!authenticatedUser ||
        !authenticatedUser.role ||
        authenticatedUser.role.name !== "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - Only Super Admins can update roles",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching role");
    const role = await db_1.models.role.findByPk(id, {
        include: [{ model: db_1.models.permission, as: "permissions" }],
    });
    if (!role) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Role not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating role details");
    if (name && role.name !== name) {
        await role.update({ name });
    }
    if (permissions) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating role permissions");
        const permissionIds = permissions.map((permissionId) => Number(permissionId));
        await role.setPermissions(permissionIds);
    }
    const updatedRole = await db_1.models.role.findByPk(id, {
        include: [{ model: db_1.models.permission, as: "permissions" }],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating roles cache");
    await (0, utils_2.cacheRoles)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return { message: "Role updated successfully", role: updatedRole };
};
