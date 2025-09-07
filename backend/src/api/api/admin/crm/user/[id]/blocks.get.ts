import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get user block history",
  description: "Retrieve the block history for a specific user",
  operationId: "getUserBlocks",
  tags: ["Admin", "CRM", "User"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the user",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "User block history retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    reason: { type: "string" },
                    isTemporary: { type: "boolean" },
                    duration: { type: "number" },
                    blockedUntil: { type: "string" },
                    isActive: { type: "boolean" },
                    createdAt: { type: "string" },
                    admin: {
                      type: "object",
                      properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "User not found" },
  },
  requiresAuth: true,
  permission: "view.user",
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

  // Check if target user exists
  const targetUser = await models.user.findByPk(id);
  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Get all blocks for this user
  const blocks = await models.userBlock.findAll({
    where: { userId: id },
    include: [
      {
        model: models.user,
        as: "admin",
        attributes: ["firstName", "lastName", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return {
    data: blocks,
  };
}; 