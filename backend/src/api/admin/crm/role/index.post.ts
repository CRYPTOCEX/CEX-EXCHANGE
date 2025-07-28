import { roleStoreSchema, cacheRoles, baseRoleSchema } from "./utils";
import { models } from "@b/db";
import { storeRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Stores a new role",
  operationId: "storeRole",
  tags: ["Admin", "CRM", "Role"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: baseRoleSchema,
          required: ["name", "permissions"],
        },
      },
    },
  },
  responses: storeRecordResponses(roleStoreSchema, "Role"),
  requiresAuth: true,
  permission: "create.role",
};

export default async (data: Handler) => {
  const { body, user } = data;
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
      message: "Forbidden - Only Super Admins can create new roles",
    });
  }

  // Create a new role
  const role = await models.role.create({ name });

  // Map permission IDs (accepting both string and number) to numbers
  const permissionIds = permissions.map((permissionId: string | number) =>
    Number(permissionId)
  );
  await role.setPermissions(permissionIds);

  // Refetch the created role with its permissions
  const newRole = await models.role.findByPk(role.id, {
    include: [{ model: models.permission, as: "permissions" }],
  });

  // Update the cache for roles
  await cacheRoles();

  return { message: "Role created successfully", role: newRole };
};
