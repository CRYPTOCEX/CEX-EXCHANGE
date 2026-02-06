"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cachePermissions = cachePermissions;
exports.getPermissions = getPermissions;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const redis = redis_1.RedisSingleton.getInstance();
async function cachePermissions() {
    try {
        const permissions = await getPermissions();
        await redis.set("permissions", JSON.stringify(permissions), "EX", 3600);
    }
    catch (error) {
        console_1.logger.error("PERMISSION", "Redis error", error);
    }
}
cachePermissions();
async function getPermissions() {
    return (await db_1.models.permission.findAll({
        include: [
            {
                model: db_1.models.role,
                as: "roles",
                through: { attributes: [] },
            },
        ],
    })).map((permission) => permission.get({ plain: true }));
}
