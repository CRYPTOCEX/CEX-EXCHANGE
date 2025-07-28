// rolesManager.js

import { models } from "@b/db";
import { DatabaseError } from "sequelize";
import { logError } from "@b/utils/logger";

class RolesManager {
  static instance;
  roles = new Map();

  constructor() {
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
      // Access Sequelize models from your singleton

      // Perform a query to get roles along with their permissions
      const rolesWithPermissions = (await models.role.findAll({
        include: {
          model: models.permission,
          as: "permissions",
          through: { attributes: [] },
        },
      })) as any;

      rolesWithPermissions.forEach((role) => {
        this.roles.set(role.id, {
          name: role.name,
          permissions: role.permissions.map((rp) => rp.name),
        });
      });
    } catch (error) {
      if (error instanceof DatabaseError) {
        logError("rolesManager", error, __filename);
        console.error(
          "Failed to load roles and permissions. Table not found:",
          error.message
        );
      } else {
        logError("rolesManager", error, __filename);
        console.error("Failed to load roles and permissions:", error);
      }
    }
  }
}

export const rolesManager = new RolesManager();
