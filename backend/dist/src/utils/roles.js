"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesManager = void 0;
exports.refreshRolesNow = refreshRolesNow;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const REFRESH_MS = 60000;
class RolesManager {
    constructor() {
        this.roles = new Map();
        this.timer = null;
        if (!RolesManager.instance) {
            RolesManager.instance = this;
        }
        return RolesManager.instance;
    }
    async initialize() {
        await this.loadRoles();
        this.startAutoRefresh();
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
            const seen = new Set();
            rolesWithPermissions.forEach((role) => {
                seen.add(role.id);
                this.roles.set(role.id, {
                    name: role.name,
                    permissions: role.permissions.map((rp) => rp.name),
                });
            });
            for (const id of [...this.roles.keys()]) {
                if (!seen.has(id))
                    this.roles.delete(id);
            }
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
    startAutoRefresh(intervalMs = REFRESH_MS) {
        var _a, _b;
        if (this.timer)
            return;
        this.timer = setInterval(() => {
            void this.loadRoles();
        }, intervalMs);
        (_b = (_a = this.timer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    stopAutoRefresh() {
        if (!this.timer)
            return;
        clearInterval(this.timer);
        this.timer = null;
    }
}
exports.rolesManager = new RolesManager();
async function refreshRolesNow() {
    await exports.rolesManager.loadRoles();
}
