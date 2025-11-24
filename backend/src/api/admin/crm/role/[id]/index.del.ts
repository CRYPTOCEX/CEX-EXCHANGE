import { models, sequelize } from "@b/db";
import { cacheRoles } from "../utils";
import { deleteRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Deletes a role",
  operationId: "deleteRole",
  tags: ["Admin", "CRM", "Role"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the role to delete",
      required: true,
      schema: {
        type: "number",
      },
    },
  ],
  permission: "delete.role",
  responses: deleteRecordResponses("Role"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, user } = data;
  const { id } = params;

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

  // Optionally, prevent deleting a "Super Admin" role if such a special role exists.
  // For example, if the "Super Admin" role has an ID or name that should never be deleted:
  const roleToDelete = await models.role.findByPk(id);
  if (!roleToDelete) {
    throw createError({ statusCode: 404, message: "Role not found" });
  }
  if (roleToDelete.name === "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Cannot delete the Super Admin role",
    });
  }

  try {
    await sequelize.transaction(async (transaction) => {
      await models.rolePermission.destroy({
        where: {
          roleId: id,
        },
        transaction,
      });

      await models.role.destroy({
        where: {
          id,
        },
        transaction,
      });
    });

    await cacheRoles();

    return {
      message: "Role removed successfully",
    };
  } catch (error: any) {
    console.error("Transaction failed:", error);
    throw new Error("Failed to remove the role");
  }
};
