import { models, sequelize } from "@b/db";
import { cacheRoles } from "./utils";
import { commonBulkDeleteResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
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
  responses: commonBulkDeleteResponses("Roles"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, user, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating user authorization");
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Check if the request is from a Super Admin
  const authenticatedUser = await models.user.findByPk(user.id, {
    include: [{ model: models.role, as: "role" }],
  });

  if (!authenticatedUser || authenticatedUser.role.name !== "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Only Super Admins can delete roles",
    });
  }

  ctx?.step("Validating role deletion permissions");

  // Optionally, prevent deletion of any Super Admin role if you have such a concept.
  // If roles have a special "Super Admin" role that shouldn't be deleted, you can check here.
  const superAdminRole = await models.role.findOne({
    where: {
      name: "Super Admin",
    },
  });

  if (ids.includes(superAdminRole.id)) {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Cannot delete Super Admin role",
    });
  }

  try {
    ctx?.step(`Deleting ${ids.length} roles`);
    // Wrap operations in a transaction block
    await sequelize.transaction(async (transaction) => {
      // Delete role permissions for the specified roles
      await models.rolePermission.destroy({
        where: {
          roleId: ids,
        },
        transaction,
      });

      // Delete the roles
      await models.role.destroy({
        where: {
          id: ids,
        },
        transaction,
      });
    });

    ctx?.step("Rebuilding roles cache");
    await cacheRoles(); // Rebuild the roles cache

    ctx?.success();
    return {
      message: "Roles removed successfully",
    };
  } catch (error) {
    logger.error("ROLE", "Failed to remove roles", error);
    throw new Error("Failed to remove roles");
  }
};
