"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesManager = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
class RolesManager {
    constructor() {
        this.roles = new Map();
        if (!RolesManager.instance) {
            RolesManager.instance = this;
        }
        return RolesManager.instance;
    }
    async initialize() {
        await this.loadRoles();
    }
    async loadRoles() {
        try {
            if (!db_1.models.role || !db_1.models.permission) {
                console_1.logger.debug("ROLES", "Models not yet initialized, skipping role loading");
                return;
            }
            const rolesWithPermissions = (await db_1.models.role.findAll({
                include: {
                    model: db_1.models.permission,
                    as: "permissions",
                    through: { attributes: [] },
                },
            }));
            rolesWithPermissions.forEach((role) => {
                this.roles.set(role.id, {
                    name: role.name,
                    permissions: role.permissions.map((rp) => rp.name),
                });
            });
        }
        catch (error) {
            if (error instanceof sequelize_1.DatabaseError) {
                console_1.logger.error("ROLES", "Failed to load roles - table not found", error);
            }
            else {
                console_1.logger.error("ROLES", "Failed to load roles and permissions", error);
            }
        }
    }
}
exports.rolesManager = new RolesManager();
