import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Unblock a user account",
  description: "Unblock a user account and restore access",
  operationId: "unblockUser",
  tags: ["Admin", "CRM", "User"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the user to unblock",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "User unblocked successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Bad request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "User not found" },
  },
  requiresAuth: true,
  permission: "edit.user",
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

  // Find the target user
  const targetUser = await models.user.findOne({
    where: { id },
    include: [
      {
        model: models.role,
        as: "role",
        attributes: ["name"],
      },
    ],
  });

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Check if user is currently blocked
  const activeBlock = await models.userBlock.findOne({
    where: {
      userId: id,
      isActive: true,
      [Op.or]: [
        { isTemporary: false },
        {
          isTemporary: true,
          blockedUntil: {
            [Op.gt]: new Date(),
          },
        },
      ],
    },
  });

  if (!activeBlock) {
    throw createError({
      statusCode: 400,
      message: "User is not currently blocked",
    });
  }

  // Deactivate the block record
  await models.userBlock.update(
    { isActive: false },
    { where: { id: activeBlock.id } }
  );

  // Update user status back to ACTIVE
  await models.user.update(
    { status: "ACTIVE" },
    { where: { id } }
  );

  return {
    message: "User unblocked successfully",
  };
}; 