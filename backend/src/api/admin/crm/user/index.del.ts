import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Bulk deletes users by UUIDs",
  operationId: "bulkDeleteUsers",
  tags: ["Admin", "CRM", "User"],
  parameters: commonBulkDeleteParams("Users"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of user UUIDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Users"),
  requiresAuth: true,
  permission: "delete.user",
};

export default async (data: Handler) => {
  const { body, query, user } = data;
  const { ids } = body;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Check if the request is from a Super Admin
  const userPk = await models.user.findByPk(user.id, {
    include: [{ model: models.role, as: "role" }],
  });
  if (!userPk || !userPk.role || userPk.role.name !== "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Only Super Admins can bulk delete users",
    });
  }

  // If desired, you can also verify that none of the target users
  // is a super admin to add further restrictions:
  const targetUsers = await models.user.findAll({
    where: { id: ids },
    include: [{ model: models.role, as: "role" }],
  });
  for (const targetUser of targetUsers) {
    if (targetUser.role && targetUser.role.name === "Super Admin") {
      throw createError({
        statusCode: 403,
        message: "Forbidden - You cannot delete Super Admin accounts",
      });
    }
  }

  return handleBulkDelete({
    model: "user",
    ids,
    query,
  });
};
