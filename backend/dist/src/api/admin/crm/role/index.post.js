"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Stores a new role",
    operationId: "storeRole",
    tags: ["Admin", "CRM", "Role"],
    logModule: "ADMIN_CRM",
    logTitle: "Create role",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: utils_1.baseRoleSchema,
                    required: ["name", "permissions"],
                },
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.roleStoreSchema, "Role"),
    requiresAuth: true,
    permission: "create.role",
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
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
            message: "Forbidden - Only Super Admins can create new roles",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new role");
    const role = await db_1.models.role.create({ name });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Assigning permissions to role");
    const permissionIds = permissions.map((permissionId) => Number(permissionId));
    await role.setPermissions(permissionIds);
    const newRole = await db_1.models.role.findByPk(role.id, {
        include: [{ model: db_1.models.permission, as: "permissions" }],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating roles cache");
    await (0, utils_1.cacheRoles)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return { message: "Role created successfully", role: newRole };
};
