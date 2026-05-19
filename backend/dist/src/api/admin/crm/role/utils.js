"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleStoreSchema = exports.roleUpdateSchema = exports.baseRoleSchema = void 0;
exports.cacheRoles = cacheRoles;
exports.getRoles = getRoles;
exports.getRole = getRole;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const redis = redis_1.RedisSingleton.getInstance();
async function cacheRoles() {
    try {
        const roles = await getRoles();
        await redis.set("roles", JSON.stringify(roles), "EX", 3600);
    }
    catch (error) {
        console_1.logger.error("ROLE", "Redis error", error);
    }
}
cacheRoles();
async function getRoles() {
    const roles = await db_1.models.role.findAll({
        include: [
            {
                model: db_1.models.permission,
                as: "permissions",
                through: { attributes: [] },
            },
        ],
    });
    return roles.map((role) => role.get({ plain: true }));
}
async function getRole(id) {
    const role = await db_1.models.role.findOne({
        where: { id },
        include: [
            {
                model: db_1.models.permission,
                as: "permissions",
                through: { attributes: [] },
            },
        ],
    });
    return role ? role.get({ plain: true }) : null;
}
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the role");
const name = (0, schema_1.baseStringSchema)("Name of the role");
const permissions = {
    type: "array",
    items: {
        type: "string",
        description: "ID of the permission",
    },
};
exports.baseRoleSchema = {
    id,
    name,
    permissions,
};
exports.roleUpdateSchema = {
    type: "object",
    properties: {
        name,
        permissions,
    },
    required: ["name", "permissions"],
};
exports.roleStoreSchema = {
    description: "Role created or updated successfully",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseRoleSchema,
            },
        },
    },
};
