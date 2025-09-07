import { updateRecordResponses } from "@b/utils/query";
import { roleUpdateSchema } from "../utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { cacheRoles } from "../utils"; // Ensure you import cacheRoles if not already available

export const metadata: OperationObject = {
  summary: "Updates an existing role",
  operationId: "updateRole",
  tags: ["Admin", "CRM", "Role"],
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
        schema: roleUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Role"),
  requiresAuth: true,
  permission: "edit.role",
};

export default async (data: Handler) => {
  const { body, params, user } = data;
  const { id } = params;
  const { name, permissions } = body;

  // Ensure the request is made by an authenticated user
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Validate that the authenticated user is a Super Admin
  const authenticatedUser = await models.user.findByPk(user.id, {
    include: [{ model: models.role, as: "role" }],
  });

  if (
    !authenticatedUser ||
    !authenticatedUser.role ||
    authenticatedUser.role.name !== "Super Admin"
  ) {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Only Super Admins can update roles",
    });
  }

  // Fetch the role by id, including its current permissions
  const role = await models.role.findByPk(id, {
    include: [{ model: models.permission, as: "permissions" }],
  });
  if (!role) {
    throw createError({
      statusCode: 404,
      message: "Role not found",
    });
  }

  // Update role name if provided and changed
  if (name && role.name !== name) {
    await role.update({ name });
  }

  // Update permissions if provided
  if (permissions) {
    // Convert permission IDs (accepting both string and number) to numbers
    const permissionIds = permissions.map((permissionId: string | number) =>
      Number(permissionId)
    );
    // Update role's permissions using the belongsToMany association
    await role.setPermissions(permissionIds);
  }

  // Refetch the updated role with its permissions
  const updatedRole = await models.role.findByPk(id, {
    include: [{ model: models.permission, as: "permissions" }],
  });

  // Update the roles cache
  await cacheRoles();

  return { message: "Role updated successfully", role: updatedRole };
};
