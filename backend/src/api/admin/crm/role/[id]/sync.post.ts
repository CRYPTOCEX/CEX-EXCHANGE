import { models, sequelize } from "@b/db";
import { cacheRoles } from "../utils";

export const metadata: OperationObject = {
  summary: "Syncs roles with the database",
  operationId: "syncRoles",
  tags: ["Admin", "CRM", "Role"],
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
              // NOTE: Changed from "rolePermission" to "permissions" to match our association.
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

export default async (data) => {
  const response = await syncPermissions(
    data.params.id,
    data.body.permissionIds
  );
  await cacheRoles(); // Assuming this function is implemented correctly elsewhere
  return {
    ...response.get({ plain: true }),
    message: "Role permissions synced successfully",
  };
};

export async function syncPermissions(
  roleId: number,
  permissionIds: number[]
): Promise<any> {
  return sequelize
    .transaction(async (transaction) => {
      const role = await models.role.findByPk(roleId, { transaction });
      if (!role) {
        throw new Error("Role not found");
      }

      // Retrieve current permissions using the belongsToMany association (alias "permissions")
      const currentPermissions = await role.getPermissions({ transaction });
      const currentPermissionIds = currentPermissions.map((p) => p.id);

      // Calculate which permissions to add and which to remove
      const toAdd = permissionIds.filter(
        (id) => !currentPermissionIds.includes(id)
      );
      const toRemove = currentPermissions.filter(
        (p) => !permissionIds.includes(p.id)
      );

      // Add new permissions
      for (const permId of toAdd) {
        await role.addPermission(permId, { transaction });
      }

      // Remove obsolete permissions
      for (const permission of toRemove) {
        await role.removePermission(permission, { transaction });
      }

      // Fetch and return the updated role, including its current permissions
      const updatedRole = await models.role.findByPk(roleId, {
        include: [
          {
            model: models.permission,
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
      console.error("Transaction failed:", error);
      throw new Error("Failed to sync role permissions");
    });
}
